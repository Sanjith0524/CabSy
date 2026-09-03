import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { randomUUID } from "crypto";
import { getAuthUser, isRideMember } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { notifyNewMessage, RideCtx } from "@/lib/notifications";

const MESSAGE_LIMIT = 25;
const MAX_LENGTH = 500;

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
    if (!(await isRideMember(params.id, user.uid))) {
      return NextResponse.json(
        { error: "Forbidden: join this ride to see its chat" },
        { status: 403 }
      );
    }

    const messagesRes = await db.execute({
      sql: "SELECT id, rideId, uid, displayName, text, createdAt FROM messages WHERE rideId = ? ORDER BY createdAt ASC",
      args: [params.id],
    });
    return NextResponse.json({ messages: messagesRes.rows });
  } catch (err) {
    console.error("Fetch messages error:", err);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await isRideMember(params.id, user.uid))) {
      return NextResponse.json(
        { error: "Forbidden: join this ride to post in its chat" },
        { status: 403 }
      );
    }

    const limited = rateLimit(`msg:${user.uid}`, 30, 5 * 60 * 1000); // 30 / 5 min
    if (!limited.ok) {
      return NextResponse.json(
        { error: "You're sending messages too fast. Slow down a moment." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
      );
    }

    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }
    if (text.length > MAX_LENGTH) {
      return NextResponse.json(
        { error: `Messages must be under ${MAX_LENGTH} characters` },
        { status: 400 }
      );
    }

    const countRes = await db.execute({
      sql: "SELECT COUNT(*) AS count FROM messages WHERE rideId = ? AND uid = ?",
      args: [params.id, user.uid],
    });
    if (Number((countRes.rows[0] as any).count) >= MESSAGE_LIMIT) {
      return NextResponse.json(
        { error: "Message limit reached for this ride." },
        { status: 400 }
      );
    }

    await db.execute({
      sql: "INSERT INTO messages (id, rideId, uid, displayName, text, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
      args: [randomUUID(), params.id, user.uid, user.displayName, text, Date.now()],
    });

    const [rideRes, membersRes] = await Promise.all([
      db.execute({
        sql: "SELECT destination, creatorUid, creatorEmail FROM rides WHERE id = ?",
        args: [params.id],
      }),
      db.execute({
        sql: "SELECT uid FROM ride_members WHERE rideId = ?",
        args: [params.id],
      }),
    ]);
    const ride = rideRes.rows[0] as any;
    if (ride) {
      const ctx: RideCtx = {
        id: params.id,
        destination: ride.destination,
        creatorUid: ride.creatorUid,
        creatorEmail: ride.creatorEmail,
      };
      await notifyNewMessage(
        ctx,
        user.uid,
        user.displayName,
        (membersRes.rows as any[]).map((m) => m.uid)
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Send message error:", err);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
