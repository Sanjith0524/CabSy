import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    await initDb();
    const session = getAuthUser();
    if (!session) {
      return NextResponse.json({ user: null });
    }

    const userRes = await db.execute({
      sql: "SELECT uid, email, displayName, photoURL, college FROM users WHERE uid = ?",
      args: [session.uid],
    });
    const user = userRes.rows[0];
    return NextResponse.json({ user: user ?? null });
  } catch {
    return NextResponse.json({ user: null });
  }
}
