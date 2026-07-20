import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
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
    const user = getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: rideId } = params;
    const members = db.prepare("SELECT * FROM ride_members WHERE rideId = ? ORDER BY joinedAt ASC").all(rideId);
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
    const user = getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: rideId } = params;

    // We can run inside a SQLite transaction
    const transaction = db.transaction(() => {
      const ride = db.prepare("SELECT * FROM rides WHERE id = ?").get(rideId) as any;
      if (!ride) throw new Error("Ride not found");
      if (ride.status !== "open") throw new Error("Ride is not open for joining");
      if (ride.seatsTaken >= ride.seatsTotal) throw new Error("Ride is full");

      const existing = db.prepare("SELECT * FROM ride_members WHERE rideId = ? AND uid = ?").get(rideId, user.uid);
      if (existing) throw new Error("Already joined this ride");

      // Insert member
      db.prepare(`
        INSERT INTO ride_members (rideId, uid, displayName, email, joinedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(rideId, user.uid, user.displayName, user.email, Date.now());

      const newTaken = ride.seatsTaken + 1;
      const newStatus = newTaken >= ride.seatsTotal ? "full" : "open";

      // Update seatsTaken & status
      db.prepare("UPDATE rides SET seatsTaken = ?, status = ? WHERE id = ?").run(newTaken, newStatus, rideId);
    });

    transaction();
    return NextResponse.json({ success: true });
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
    const user = getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: rideId } = params;
    const url = new URL(request.url);
    const targetUid = url.searchParams.get("uid") || user.uid; // Default to self

    // Check if user is leaving themselves or if they are the creator removing someone else
    const ride = db.prepare("SELECT * FROM rides WHERE id = ?").get(rideId) as any;
    if (!ride) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }

    if (targetUid !== user.uid && ride.creatorUid !== user.uid) {
      return NextResponse.json({ error: "Forbidden: You cannot remove this member" }, { status: 403 });
    }

    const transaction = db.transaction(() => {
      const existing = db.prepare("SELECT * FROM ride_members WHERE rideId = ? AND uid = ?").get(rideId, targetUid);
      if (!existing) throw new Error("Member not found in this ride");

      // Delete member
      db.prepare("DELETE FROM ride_members WHERE rideId = ? AND uid = ?").run(rideId, targetUid);

      const newTaken = Math.max(1, ride.seatsTaken - 1);
      
      // Update seatsTaken & reset status to open
      db.prepare("UPDATE rides SET seatsTaken = ?, status = 'open' WHERE id = ?").run(newTaken, rideId);
    });

    transaction();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Leave ride error:", err.message);
    return NextResponse.json({ error: err.message || "Failed to leave ride" }, { status: 400 });
  }
}
