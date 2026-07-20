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

    const { id } = params;
    const ride = db.prepare("SELECT * FROM rides WHERE id = ?").get(id) as any;
    
    if (!ride) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }
    
    return NextResponse.json({ ride });
  } catch (err: any) {
    console.error("Get ride error:", err);
    return NextResponse.json({ error: "Failed to fetch ride details" }, { status: 500 });
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

    const { id } = params;
    const ride = db.prepare("SELECT * FROM rides WHERE id = ?").get(id) as any;
    
    if (!ride) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }

    if (ride.creatorUid !== user.uid) {
      return NextResponse.json({ error: "Forbidden: You did not create this ride" }, { status: 403 });
    }

    db.prepare("UPDATE rides SET status = 'cancelled' WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Cancel ride error:", err);
    return NextResponse.json({ error: "Failed to cancel ride" }, { status: 500 });
  }
}
