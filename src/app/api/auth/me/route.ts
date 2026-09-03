import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

// Reads the session cookie — must run per-request, never statically prerendered.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await initDb();
    const session = await getAuthUser();
    if (!session) {
      return NextResponse.json({ user: null });
    }

    const userRes = await db.execute({
      sql: "SELECT uid, email, displayName, photoURL, college, notifyEmail, notifyChat FROM users WHERE uid = ?",
      args: [session.uid],
    });
    const user = userRes.rows[0];
    return NextResponse.json({ user: user ?? null });
  } catch {
    return NextResponse.json({ user: null });
  }
}

/** Update the signed-in user's notification preferences. */
export async function PATCH(request: NextRequest) {
  try {
    await initDb();
    const session = await getAuthUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const sets: string[] = [];
    const args: (number | string)[] = [];

    if (typeof body.notifyEmail === "boolean") {
      sets.push("notifyEmail = ?");
      args.push(body.notifyEmail ? 1 : 0);
    }
    if (typeof body.notifyChat === "boolean") {
      sets.push("notifyChat = ?");
      args.push(body.notifyChat ? 1 : 0);
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    args.push(session.uid);
    await db.execute({
      sql: `UPDATE users SET ${sets.join(", ")} WHERE uid = ?`,
      args,
    });

    const userRes = await db.execute({
      sql: "SELECT uid, email, displayName, photoURL, college, notifyEmail, notifyChat FROM users WHERE uid = ?",
      args: [session.uid],
    });
    return NextResponse.json({ user: userRes.rows[0] ?? null });
  } catch (err) {
    console.error("Update preferences error:", err);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
