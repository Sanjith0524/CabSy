import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getAuthUser, isRideMember } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  notifyRideJoined,
  notifyRideFull,
  notifyRideLeft,
  notifyMemberRemoved,
  notifyRideCancelled,
  RideCtx,
} from "@/lib/notifications";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const user = getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const countRes = await db.execute({
      sql: "SELECT COUNT(*) AS c FROM ride_members WHERE rideId = ?",
      args: [params.id],
    });
    const count = Number((countRes.rows[0] as any).c) || 0;

    // The rider roster (names) is only visible to people in that ride. Everyone
    // else gets the headcount so the UI can still show how full it is.
    const member = await isRideMember(params.id, user.uid);
    if (!member) {
      return NextResponse.json({ members: [], count, restricted: true, joined: false });
    }

    // Email is intentionally excluded — the UI never shows it, and returning
    // it here let any member harvest addresses across every ride.
    const membersRes = await db.execute({
      sql: "SELECT rideId, uid, displayName, joinedAt FROM ride_members WHERE rideId = ? ORDER BY joinedAt ASC",
      args: [params.id],
    });
    return NextResponse.json({
      members: membersRes.rows,
      count,
      restricted: false,
      joined: true,
    });
  } catch (err) {
    console.error("Fetch members error:", err);
    return NextResponse.json({ error: "Failed to fetch ride members" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const user = getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = rateLimit(`join:${user.uid}`, 40, 60 * 60 * 1000); // 40 / hour
    if (!limited.ok) {
      return NextResponse.json(
        { error: "You're joining rides too quickly. Try again later." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
      );
    }

    const rideId = params.id;
    const tx = await db.transaction("write");
    try {
      const rideRes = await tx.execute({
        sql: "SELECT * FROM rides WHERE id = ?",
        args: [rideId],
      });
      const ride = rideRes.rows[0] as any;
      if (!ride) throw new Error("Ride not found");
      if (ride.status !== "open") throw new Error("Ride is not open for joining");
      if (Number(ride.seatsTaken) >= Number(ride.seatsTotal)) throw new Error("Ride is full");

      const existingRes = await tx.execute({
        sql: "SELECT 1 FROM ride_members WHERE rideId = ? AND uid = ?",
        args: [rideId, user.uid],
      });
      if (existingRes.rows[0]) throw new Error("Already joined this ride");

      await tx.execute({
        sql: "INSERT INTO ride_members (rideId, uid, displayName, email, joinedAt) VALUES (?, ?, ?, ?, ?)",
        args: [rideId, user.uid, user.displayName, user.email, Date.now()],
      });

      const newTaken = Number(ride.seatsTaken) + 1;
      const newStatus = newTaken >= Number(ride.seatsTotal) ? "full" : "open";
      await tx.execute({
        sql: "UPDATE rides SET seatsTaken = ?, status = ? WHERE id = ?",
        args: [newTaken, newStatus, rideId],
      });

      await tx.commit();

      const ctx: RideCtx = {
        id: rideId,
        destination: ride.destination,
        creatorUid: ride.creatorUid,
        creatorEmail: ride.creatorEmail,
      };
      await notifyRideJoined(ctx, user.displayName);
      if (newStatus === "full") await notifyRideFull(ctx);

      return NextResponse.json({ success: true });
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  } catch (err: any) {
    console.error("Join ride error:", err?.message);
    return NextResponse.json(
      { error: err?.message || "Failed to join ride" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const user = getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rideId = params.id;
    const targetUid =
      new URL(request.url).searchParams.get("uid") || user.uid;

    const rideRes = await db.execute({
      sql: "SELECT creatorUid, creatorEmail, destination, status FROM rides WHERE id = ?",
      args: [rideId],
    });
    const ride = rideRes.rows[0] as any;
    if (!ride) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }
    // You can remove yourself; only the creator can remove someone else.
    if (targetUid !== user.uid && ride.creatorUid !== user.uid) {
      return NextResponse.json(
        { error: "Forbidden: You cannot remove this member" },
        { status: 403 }
      );
    }

    // Host leaving their own ride cancels it — otherwise it's left with no owner.
    if (targetUid === user.uid && ride.creatorUid === user.uid) {
      if (ride.status !== "cancelled") {
        const membersRes = await db.execute({
          sql: "SELECT uid, email FROM ride_members WHERE rideId = ?",
          args: [rideId],
        });
        await db.execute({
          sql: "UPDATE rides SET status = 'cancelled' WHERE id = ?",
          args: [rideId],
        });
        await notifyRideCancelled(
          {
            id: rideId,
            destination: ride.destination,
            creatorUid: ride.creatorUid,
            creatorEmail: ride.creatorEmail,
          } as RideCtx,
          (membersRes.rows as any[]).map((m) => ({ uid: m.uid, email: m.email }))
        );
      }
      return NextResponse.json({ success: true, cancelled: true });
    }

    let removedEmail = "";
    const tx = await db.transaction("write");
    try {
      const existingRes = await tx.execute({
        sql: "SELECT email FROM ride_members WHERE rideId = ? AND uid = ?",
        args: [rideId, targetUid],
      });
      if (!existingRes.rows[0]) throw new Error("Member not found in this ride");
      removedEmail = String((existingRes.rows[0] as any).email ?? "");

      await tx.execute({
        sql: "DELETE FROM ride_members WHERE rideId = ? AND uid = ?",
        args: [rideId, targetUid],
      });

      const countRes = await tx.execute({
        sql: "SELECT COUNT(*) AS c FROM ride_members WHERE rideId = ?",
        args: [rideId],
      });
      const remaining = Number((countRes.rows[0] as any).c) || 0;
      // Don't resurrect a cancelled ride; otherwise it has seats again.
      const nextStatus = ride.status === "cancelled" ? "cancelled" : "open";
      await tx.execute({
        sql: "UPDATE rides SET seatsTaken = ?, status = ? WHERE id = ?",
        args: [Math.max(remaining, 0), nextStatus, rideId],
      });

      await tx.commit();

      const ctx: RideCtx = {
        id: rideId,
        destination: ride.destination,
        creatorUid: ride.creatorUid,
        creatorEmail: ride.creatorEmail,
      };
      if (targetUid === user.uid) {
        // Self-leave — tell the host (unless the host left their own ride).
        if (user.uid !== ride.creatorUid) {
          await notifyRideLeft(ctx, user.displayName);
        }
      } else {
        // Host removed someone.
        await notifyMemberRemoved(ctx, targetUid, removedEmail);
      }

      return NextResponse.json({ success: true });
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  } catch (err: any) {
    console.error("Leave ride error:", err?.message);
    return NextResponse.json(
      { error: err?.message || "Failed to leave ride" },
      { status: 400 }
    );
  }
}
