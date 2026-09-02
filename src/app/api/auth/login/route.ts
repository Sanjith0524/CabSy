import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { signSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { sendOTPEmail } from "@/lib/mailer";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const IS_PROD = process.env.NODE_ENV === "production";

export async function POST(request: NextRequest) {
  try {
    await initDb();

    const ip = clientIp(request);
    const limited = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000); // 10 / 15 min / IP
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Try again in a few minutes." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
      );
    }

    const body = await request.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
    }

    const userRes = await db.execute({
      sql: "SELECT * FROM users WHERE email = ?",
      args: [email],
    });
    const user = userRes.rows[0] as any;

    // Same response whether the email exists or not, to avoid enumeration.
    const valid = user
      ? await bcrypt.compare(password, user.passwordHash)
      : false;
    if (!user || !valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    // Enforce email verification. If they never verified, re-issue an OTP and
    // send them to the verification step instead of logging them in.
    if (!user.isEmailVerified) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000;
      await db.execute({
        sql: "INSERT OR REPLACE INTO user_otps (email, otp, expiresAt, attempts, purpose) VALUES (?, ?, ?, 0, 'verify')",
        args: [email, otp, expiresAt],
      });
      if (!IS_PROD) console.log(`[2FA OTP - LOGIN] ${email}: ${otp}`);
      try {
        await sendOTPEmail(email, otp, "login");
      } catch (mailErr) {
        console.error("Failed to send OTP email:", mailErr);
      }
      return NextResponse.json({ requiresOTP: true, email });
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
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Authentication failed. Please try again." },
      { status: 500 }
    );
  }
}
