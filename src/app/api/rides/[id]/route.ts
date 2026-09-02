import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

const RIDE_COLUMNS =
  "id, pickup, destination, date, time, seatsTotal, seatsTaken, status, creatorUid, creatorName, notes, createdAt, expiresAt";

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
    const user = getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rideRes = await db.execute({
      sql: "SELECT creatorUid FROM rides WHERE id = ?",
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

    await db.execute({
      sql: "UPDATE rides SET status = 'cancelled' WHERE id = ?",
      args: [params.id],
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Cancel ride error:", err);
    return NextResponse.json({ error: "Failed to cancel ride" }, { status: 500 });
  }
}
