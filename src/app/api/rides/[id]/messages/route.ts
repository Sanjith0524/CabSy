import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "cabsy_secret_key_12345";
const MESSAGE_LIMIT = 25;

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
    const messages = db.prepare("SELECT * FROM messages WHERE rideId = ? ORDER BY createdAt ASC").all(rideId);
    return NextResponse.json({ messages });
  } catch (err: any) {
    console.error("Fetch messages error:", err);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
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
    const { text } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    // Check message limit for this user in this ride
    const countRow = db.prepare("SELECT COUNT(*) as count FROM messages WHERE rideId = ? AND uid = ?").get(rideId, user.uid) as any;
    if (countRow && countRow.count >= MESSAGE_LIMIT) {
      return NextResponse.json({ error: "Message limit reached for this ride." }, { status: 400 });
    }

    const messageId = randomUUID();
    const createdAt = Date.now();

    // Insert message
    db.prepare(`
      INSERT INTO messages (id, rideId, uid, displayName, text, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(messageId, rideId, user.uid, user.displayName, text.trim(), createdAt);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Send message error:", err);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
