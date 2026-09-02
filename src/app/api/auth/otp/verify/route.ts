import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { cookies } from "next/headers";
import { signSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  try {
    await initDb();

    const body = await request.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (!email || !code) {
      return NextResponse.json({ error: "Missing email or code" }, { status: 400 });
    }

    const ip = clientIp(request);
    const limited = rateLimit(`otp:${ip}:${email}`, 10, 15 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Sign in again to get a new code." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
      );
    }

    const otpRes = await db.execute({
      sql: "SELECT * FROM user_otps WHERE email = ?",
      args: [email],
    });
    const otpRecord = otpRes.rows[0] as any;
    if (!otpRecord) {
      return NextResponse.json(
        { error: "No pending verification code. Please sign in again." },
        { status: 400 }
      );
    }

    if (Date.now() > Number(otpRecord.expiresAt)) {
      await db.execute({ sql: "DELETE FROM user_otps WHERE email = ?", args: [email] });
      return NextResponse.json(
        { error: "Verification code expired. Please sign in again." },
        { status: 400 }
      );
    }

    if (Number(otpRecord.attempts ?? 0) >= MAX_ATTEMPTS) {
      await db.execute({ sql: "DELETE FROM user_otps WHERE email = ?", args: [email] });
      return NextResponse.json(
        { error: "Too many incorrect codes. Please sign in again." },
        { status: 400 }
      );
    }

    if (String(otpRecord.otp) !== code) {
      const attempts = Number(otpRecord.attempts ?? 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await db.execute({ sql: "DELETE FROM user_otps WHERE email = ?", args: [email] });
        return NextResponse.json(
          { error: "Too many incorrect codes. Please sign in again." },
          { status: 400 }
        );
      }
      await db.execute({
        sql: "UPDATE user_otps SET attempts = ? WHERE email = ?",
        args: [attempts, email],
      });
      return NextResponse.json(
        { error: `Invalid code. ${MAX_ATTEMPTS - attempts} attempt(s) left.` },
        { status: 400 }
      );
    }

    // Valid — consume the OTP and mark the account verified.
    await db.execute({ sql: "DELETE FROM user_otps WHERE email = ?", args: [email] });
    await db.execute({
      sql: "UPDATE users SET isEmailVerified = 1 WHERE email = ?",
      args: [email],
    });

    const userRes = await db.execute({
      sql: "SELECT * FROM users WHERE email = ?",
      args: [email],
    });
    const user = userRes.rows[0] as any;
    if (!user) {
      return NextResponse.json({ error: "User profile not found." }, { status: 400 });
    }

    const token = signSession({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    });
    cookies().set(SESSION_COOKIE, token, sessionCookieOptions);

    return NextResponse.json({
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        college: user.college,
      },
    });
  } catch (err) {
    console.error("OTP verification error:", err);
    return NextResponse.json(
      { error: "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}
