import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    await initDb();
    const user = getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [listRes, countRes] = await Promise.all([
      db.execute({
        sql: "SELECT id, type, rideId, title, body, readAt, createdAt FROM notifications WHERE uid = ? ORDER BY createdAt DESC LIMIT 30",
        args: [user.uid],
      }),
      db.execute({
        sql: "SELECT COUNT(*) AS c FROM notifications WHERE uid = ? AND readAt IS NULL",
        args: [user.uid],
      }),
    ]);

    return NextResponse.json({
      notifications: listRes.rows,
      unread: Number((countRes.rows[0] as any).c) || 0,
    });
  } catch (err) {
    console.error("Fetch notifications error:", err);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
