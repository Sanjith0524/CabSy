import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

/**
 * Mark notifications read. Body: { id } to mark one, or {} to mark all.
 */
export async function POST(request: NextRequest) {
  try {
    await initDb();
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let id: string | null = null;
    try {
      const body = await request.json();
      if (typeof body?.id === "string") id = body.id;
    } catch {
      /* empty body → mark all */
    }

    const now = Date.now();
    if (id) {
      await db.execute({
        sql: "UPDATE notifications SET readAt = ? WHERE id = ? AND uid = ? AND readAt IS NULL",
        args: [now, id, user.uid],
      });
    } else {
      await db.execute({
        sql: "UPDATE notifications SET readAt = ? WHERE uid = ? AND readAt IS NULL",
        args: [now, user.uid],
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Mark notifications read error:", err);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
