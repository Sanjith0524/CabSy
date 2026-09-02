import { NextRequest, NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { runSweep } from "@/lib/sweep";

export const dynamic = "force-dynamic";

/**
 * Backstop for the opportunistic sweep in GET /api/rides — runs on a Vercel
 * cron schedule (see vercel.json) so housekeeping still happens when no one is
 * using the app. Vercel sends `Authorization: Bearer $CRON_SECRET` automatically
 * when CRON_SECRET is set on the project.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  await initDb();
  await runSweep({ force: true });
  return NextResponse.json({ ok: true, ran: new Date().toISOString() });
}
