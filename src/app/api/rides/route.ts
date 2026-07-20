import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

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

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = Date.now();
    const rides = db.prepare(`
      SELECT * FROM rides 
      WHERE status IN ('open', 'full') AND expiresAt > ? 
      ORDER BY createdAt DESC 
      LIMIT 50
    `).all(now);
    
    return NextResponse.json({ rides });
  } catch (err: any) {
    console.error("Fetch rides error:", err);
    return NextResponse.json({ error: "Failed to fetch rides" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pickup, destination, date, time, seatsTotal, notes } = await request.json();

    if (!pickup || !destination || !date || !time || !seatsTotal) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const id = randomUUID();
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);
    const rideDate = new Date(year, month - 1, day, hour, minute);
    const expiresAt = rideDate.getTime() + 2 * 60 * 60 * 1000; // ride time + 2 hours
    const createdAt = Date.now();

    // Insert ride
    db.prepare(`
      INSERT INTO rides (id, pickup, destination, date, time, seatsTotal, seatsTaken, status, creatorUid, creatorName, creatorEmail, notes, createdAt, expiresAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      pickup,
      destination,
      date,
      time,
      seatsTotal,
      1,
      "open",
      user.uid,
      user.displayName,
      user.email,
      notes || null,
      createdAt,
      expiresAt
    );

    // Insert creator as first member
    db.prepare(`
      INSERT INTO ride_members (rideId, uid, displayName, email, joinedAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, user.uid, user.displayName, user.email, createdAt);

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    console.error("Create ride error:", err);
    return NextResponse.json({ error: "Failed to create ride" }, { status: 500 });
  }
}
