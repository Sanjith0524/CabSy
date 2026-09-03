import { NextRequest, NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { runSweep } from "@/lib/sweep";

export const dynamic = "force-dynamic";

/**
 * Backstop for the opportunistic sweep in GET /api/rides — runs on a Vercel
 * cron schedule (see vercel.json) so housekeeping still happens when no one is
 * using the app.
 *
 * Auth: if CRON_SECRET is set, require `Authorization: Bearer $CRON_SECRET`
 * (Vercel sends this automatically). If it isn't set, only accept Vercel's own
 * cron trigger — never an arbitrary caller.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const isVercelCron = (request.headers.get("user-agent") || "").includes(
    "vercel-cron"
  );

  if (secret) {
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production" && !isVercelCron) {
    return NextResponse.json(
      { error: "Unauthorized — set CRON_SECRET to call this endpoint." },
      { status: 401 }
    );
  }

  await initDb();
  await runSweep({ force: true });
  return NextResponse.json({ ok: true, ran: new Date().toISOString() });
}
