import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "cabsy_secret_key_12345";

function getAuthUser() {
  const token = cookies().get("cabsy_session")?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
}

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

    const { id: rideId } = params;
    const membersRes = await db.execute({
      sql: "SELECT * FROM ride_members WHERE rideId = ? ORDER BY joinedAt ASC",
      args: [rideId],
    });
    const members = membersRes.rows;
    return NextResponse.json({ members });
  } catch (err: any) {
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

    const { id: rideId } = params;

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
        sql: "SELECT * FROM ride_members WHERE rideId = ? AND uid = ?",
        args: [rideId, user.uid],
      });
      const existing = existingRes.rows[0];
      if (existing) throw new Error("Already joined this ride");

      // Insert member
      await tx.execute({
        sql: "INSERT INTO ride_members (rideId, uid, displayName, email, joinedAt) VALUES (?, ?, ?, ?, ?)",
        args: [rideId, user.uid, user.displayName, user.email, Date.now()],
      });

      const newTaken = Number(ride.seatsTaken) + 1;
      const newStatus = newTaken >= Number(ride.seatsTotal) ? "full" : "open";

      // Update seatsTaken & status
      await tx.execute({
        sql: "UPDATE rides SET seatsTaken = ?, status = ? WHERE id = ?",
        args: [newTaken, newStatus, rideId],
      });

      await tx.commit();
      return NextResponse.json({ success: true });
    } catch (e: any) {
      await tx.rollback();
      throw e;
    }
  } catch (err: any) {
    console.error("Join ride error:", err.message);
    return NextResponse.json({ error: err.message || "Failed to join ride" }, { status: 400 });
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

    const { id: rideId } = params;
    const url = new URL(request.url);
    const targetUid = url.searchParams.get("uid") || user.uid; // Default to self

    // Check if user is leaving themselves or if they are the creator removing someone else
    const rideRes = await db.execute({
      sql: "SELECT * FROM rides WHERE id = ?",
      args: [rideId],
    });
    const ride = rideRes.rows[0] as any;
    if (!ride) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }

    if (targetUid !== user.uid && ride.creatorUid !== user.uid) {
      return NextResponse.json({ error: "Forbidden: You cannot remove this member" }, { status: 403 });
    }

    const tx = await db.transaction("write");
    try {
      const existingRes = await tx.execute({
        sql: "SELECT * FROM ride_members WHERE rideId = ? AND uid = ?",
        args: [rideId, targetUid],
      });
      const existing = existingRes.rows[0];
      if (!existing) throw new Error("Member not found in this ride");

      // Delete member
      await tx.execute({
        sql: "DELETE FROM ride_members WHERE rideId = ? AND uid = ?",
        args: [rideId, targetUid],
      });

      const newTaken = Math.max(1, Number(ride.seatsTaken) - 1);
      
      // Update seatsTaken & reset status to open
      await tx.execute({
        sql: "UPDATE rides SET seatsTaken = ?, status = 'open' WHERE id = ?",
        args: [newTaken, rideId],
      });

      await tx.commit();
      return NextResponse.json({ success: true });
    } catch (e: any) {
      await tx.rollback();
      throw e;
    }
  } catch (err: any) {
    console.error("Leave ride error:", err.message);
    return NextResponse.json({ error: err.message || "Failed to leave ride" }, { status: 400 });
  }
}
