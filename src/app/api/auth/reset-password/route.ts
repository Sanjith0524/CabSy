import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import bcrypt from "bcryptjs";
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
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !code || !password) {
      return NextResponse.json(
        { error: "Email, code and new password are required" },
        { status: 400 }
      );
    }
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const ip = clientIp(request);
    const limited = rateLimit(`reset:${ip}:${email}`, 10, 15 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Request a new code and try again." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
      );
    }

    const otpRes = await db.execute({
      sql: "SELECT * FROM user_otps WHERE email = ? AND purpose = 'reset'",
      args: [email],
    });
    const otpRecord = otpRes.rows[0] as any;
    if (!otpRecord) {
      return NextResponse.json(
        { error: "No pending reset request. Please start again." },
        { status: 400 }
      );
    }

    if (Date.now() > Number(otpRecord.expiresAt)) {
      await db.execute({ sql: "DELETE FROM user_otps WHERE email = ?", args: [email] });
      return NextResponse.json(
        { error: "Reset code expired. Please start again." },
        { status: 400 }
      );
    }

    if (Number(otpRecord.attempts ?? 0) >= MAX_ATTEMPTS) {
      await db.execute({ sql: "DELETE FROM user_otps WHERE email = ?", args: [email] });
      return NextResponse.json(
        { error: "Too many incorrect codes. Please start again." },
        { status: 400 }
      );
    }

    if (String(otpRecord.otp) !== code) {
      const attempts = Number(otpRecord.attempts ?? 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await db.execute({ sql: "DELETE FROM user_otps WHERE email = ?", args: [email] });
        return NextResponse.json(
          { error: "Too many incorrect codes. Please start again." },
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

    const userRes = await db.execute({
      sql: "SELECT * FROM users WHERE email = ?",
      args: [email],
    });
    const user = userRes.rows[0] as any;
    if (!user) {
      await db.execute({ sql: "DELETE FROM user_otps WHERE email = ?", args: [email] });
      return NextResponse.json({ error: "Account not found." }, { status: 400 });
    }

    // Valid — set the new password, consume the code. Proving control of the
    // inbox also confirms the address, so mark it verified.
    const passwordHash = await bcrypt.hash(password, 10);
    await db.execute({
      sql: "UPDATE users SET passwordHash = ?, isEmailVerified = 1 WHERE email = ?",
      args: [passwordHash, email],
    });
    await db.execute({ sql: "DELETE FROM user_otps WHERE email = ?", args: [email] });

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
    console.error("Reset password error:", err);
    return NextResponse.json(
      { error: "Password reset failed. Please try again." },
      { status: 500 }
    );
  }
}
