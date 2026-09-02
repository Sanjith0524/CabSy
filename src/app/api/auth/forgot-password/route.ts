import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { sendOTPEmail } from "@/lib/mailer";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const IS_PROD = process.env.NODE_ENV === "production";

export async function POST(request: NextRequest) {
  try {
    await initDb();

    const ip = clientIp(request);
    const limited = rateLimit(`forgot:${ip}`, 5, 15 * 60 * 1000); // 5 / 15 min / IP
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many requests. Try again in a few minutes." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
      );
    }

    const body = await request.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const userRes = await db.execute({
      sql: "SELECT uid, isEmailVerified FROM users WHERE email = ?",
      args: [email],
    });
    const user = userRes.rows[0] as any;

    // Only send a code to a real, verified account — but always return the same
    // response so this endpoint can't be used to probe which emails exist.
    if (user && Number(user.isEmailVerified) === 1) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

      await db.execute({
        sql: "INSERT OR REPLACE INTO user_otps (email, otp, expiresAt, attempts, purpose) VALUES (?, ?, ?, 0, 'reset')",
        args: [email, otp, expiresAt],
      });

      if (!IS_PROD) console.log(`[PASSWORD RESET OTP] ${email}: ${otp}`);
      try {
        await sendOTPEmail(email, otp, "reset");
      } catch (mailErr) {
        console.error("Failed to send reset email:", mailErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
