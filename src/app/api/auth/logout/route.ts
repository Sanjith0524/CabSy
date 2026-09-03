import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { initDb } from "@/lib/db";
import { SESSION_COOKIE, sessionCookieOptions, revokeSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await initDb();
      await revokeSession(token); // kill it server-side, not just in this browser
    } catch (err) {
      console.error("Logout revoke error:", err);
    }
  }
  cookies().set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
  return NextResponse.json({ success: true });
}
