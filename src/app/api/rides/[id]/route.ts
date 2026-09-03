import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { notifyRideCancelled, RideCtx } from "@/lib/notifications";

const RIDE_COLUMNS =
  "id, pickup, destination, date, time, seatsTotal, seatsTaken, status, creatorUid, creatorName, notes, createdAt, expiresAt";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rideRes = await db.execute({
      sql: `SELECT ${RIDE_COLUMNS} FROM rides WHERE id = ?`,
      args: [params.id],
    });
    const ride = rideRes.rows[0];
    if (!ride) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }

    return NextResponse.json({ ride });
  } catch (err) {
    console.error("Get ride error:", err);
    return NextResponse.json({ error: "Failed to fetch ride details" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rideRes = await db.execute({
      sql: "SELECT creatorUid, creatorEmail, destination FROM rides WHERE id = ?",
      args: [params.id],
    });
    const ride = rideRes.rows[0] as any;
    if (!ride) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }
    if (ride.creatorUid !== user.uid) {
      return NextResponse.json(
        { error: "Forbidden: You did not create this ride" },
        { status: 403 }
      );
    }

    const membersRes = await db.execute({
      sql: "SELECT uid, email FROM ride_members WHERE rideId = ?",
      args: [params.id],
    });

    await db.execute({
      sql: "UPDATE rides SET status = 'cancelled' WHERE id = ?",
      args: [params.id],
    });

    await notifyRideCancelled(
      {
        id: params.id,
        destination: ride.destination,
        creatorUid: ride.creatorUid,
        creatorEmail: ride.creatorEmail,
      } as RideCtx,
      (membersRes.rows as any[]).map((m) => ({ uid: m.uid, email: m.email }))
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Cancel ride error:", err);
    return NextResponse.json({ error: "Failed to cancel ride" }, { status: 500 });
  }
}
