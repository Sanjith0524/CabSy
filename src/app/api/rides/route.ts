import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { randomUUID } from "crypto";
import { getAuthUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { runSweep } from "@/lib/sweep";

// Columns safe to expose in listings — deliberately excludes creatorEmail.
const RIDE_COLUMNS =
  "id, pickup, destination, date, time, seatsTotal, seatsTaken, status, creatorUid, creatorName, notes, createdAt, expiresAt";

export async function GET() {
  try {
    await initDb();
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Opportunistic housekeeping — self-throttled, so cheap to call on every poll.
    await runSweep();

    const now = Date.now();
    const ridesRes = await db.execute({
      sql: `SELECT ${RIDE_COLUMNS} FROM rides WHERE status IN ('open', 'full') AND expiresAt > ? ORDER BY createdAt DESC LIMIT 50`,
      args: [now.toString()],
    });

    return NextResponse.json({ rides: ridesRes.rows });
  } catch (err) {
    console.error("Fetch rides error:", err);
    return NextResponse.json({ error: "Failed to fetch rides" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = rateLimit(`ride-create:${user.uid}`, 12, 60 * 60 * 1000); // 12 / hour
    if (!limited.ok) {
      return NextResponse.json(
        { error: "You've posted too many rides in a short time. Try again later." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
      );
    }

    const body = await request.json();
    const pickup = typeof body.pickup === "string" ? body.pickup.trim() : "";
    const destination =
      typeof body.destination === "string" ? body.destination.trim() : "";
    const date = typeof body.date === "string" ? body.date : "";
    const time = typeof body.time === "string" ? body.time : "";
    const seatsTotal = Number(body.seatsTotal);
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    if (!pickup || !destination || !date || !time) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (pickup.length > 120 || destination.length > 120) {
      return NextResponse.json(
        { error: "Pickup and destination must be under 120 characters" },
        { status: 400 }
      );
    }
    if (notes.length > 300) {
      return NextResponse.json({ error: "Notes must be under 300 characters" }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ error: "Invalid date or time" }, { status: 400 });
    }
    if (!Number.isInteger(seatsTotal) || seatsTotal < 1 || seatsTotal > 4) {
      return NextResponse.json({ error: "Seats must be between 1 and 4" }, { status: 400 });
    }

    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);
    const rideDate = new Date(year, month - 1, day, hour, minute);
    if (Number.isNaN(rideDate.getTime())) {
      return NextResponse.json({ error: "Invalid date or time" }, { status: 400 });
    }
    const expiresAt = rideDate.getTime() + 2 * 60 * 60 * 1000;
    const createdAt = Date.now();
    const id = randomUUID();

    await db.execute({
      sql: "INSERT INTO rides (id, pickup, destination, date, time, seatsTotal, seatsTaken, status, creatorUid, creatorName, creatorEmail, notes, createdAt, expiresAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [
        id, pickup, destination, date, time, seatsTotal, 1, "open",
        user.uid, user.displayName, user.email, notes || null,
        createdAt, expiresAt.toString(),
      ],
    });

    await db.execute({
      sql: "INSERT INTO ride_members (rideId, uid, displayName, email, joinedAt) VALUES (?, ?, ?, ?, ?)",
      args: [id, user.uid, user.displayName, user.email, createdAt],
    });

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("Create ride error:", err);
    return NextResponse.json({ error: "Failed to create ride" }, { status: 500 });
  }
}
