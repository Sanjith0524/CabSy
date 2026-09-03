import { NextRequest, NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { cookies } from "next/headers";
import { signSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isDemoMode, ensureDemoSeed, createGuestUser, purgeStaleGuests } from "@/lib/demo";

export const dynamic = "force-dynamic";

/**
 * One-click guest access for the demo deployment. Mints a throwaway verified
 * account (no college-domain check, no OTP) so recruiters can explore the app.
 * Disabled unless NEXT_PUBLIC_DEMO_MODE=true.
 */
export async function POST(request: NextRequest) {
  if (!isDemoMode()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await initDb();

    const ip = clientIp(request);
    const limited = rateLimit(`demo:${ip}`, 8, 60 * 60 * 1000); // 8 / hour / IP
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many demo sessions from this network. Try again later." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
      );
    }

    await purgeStaleGuests();
    await ensureDemoSeed();

    const guest = await createGuestUser();
    const token = await signSession({
      uid: guest.uid,
      email: guest.email,
      displayName: guest.displayName,
    });
    cookies().set(SESSION_COOKIE, token, sessionCookieOptions);

    return NextResponse.json({
      user: {
        uid: guest.uid,
        email: guest.email,
        displayName: guest.displayName,
        photoURL: "",
        college: "demo.cabsy",
      },
    });
  } catch (err) {
    console.error("Demo login error:", err);
    return NextResponse.json(
      { error: "Could not start a demo session. Please try again." },
      { status: 500 }
    );
  }
}
