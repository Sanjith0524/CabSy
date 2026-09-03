import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { sendOTPEmail } from "@/lib/mailer";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { generateOTP } from "@/lib/otp";

const ALLOWED_DOMAINS = ["vitstudent.ac.in", "vit.ac.in"];
const IS_PROD = process.env.NODE_ENV === "production";

export async function POST(request: NextRequest) {
  try {
    await initDb();

    const ip = clientIp(request);
    const limited = rateLimit(`signup:${ip}`, 5, 60 * 60 * 1000); // 5 / hour / IP
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many sign-up attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
      );
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (name.length > 80) {
      return NextResponse.json({ error: "Name is too long" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const domain = email.split("@")[1];
    if (!ALLOWED_DOMAINS.includes(domain)) {
      return NextResponse.json(
        { error: "Only college email addresses are allowed (@vitstudent.ac.in or @vit.ac.in)" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingRes = await db.execute({
      sql: "SELECT uid FROM users WHERE email = ?",
      args: [email],
    });
    if (existingRes.rows[0]) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const uid = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    await db.execute({
      sql: "INSERT INTO users (uid, email, displayName, photoURL, college, passwordHash, isEmailVerified) VALUES (?, ?, ?, ?, ?, ?, 0)",
      args: [uid, email, name, "", domain, passwordHash],
    });

    // Generate 6-digit OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    await db.execute({
      sql: "INSERT OR REPLACE INTO user_otps (email, otp, expiresAt, attempts, purpose) VALUES (?, ?, ?, 0, 'verify')",
      args: [email, otp, expiresAt],
    });

    // Dev-only: surface the code locally so you don't need a real inbox.
    if (!IS_PROD) {
      try {
        fs.writeFileSync(
          path.resolve(process.cwd(), "otp-debug.log"),
          `[2FA OTP - REGISTRATION] ${email}: ${otp}\n`
        );
      } catch (_) {}
      console.log(`[2FA OTP - REGISTRATION] ${email}: ${otp}`);
    }

    try {
      await sendOTPEmail(email, otp, "signup");
    } catch (mailErr) {
      console.error("Failed to send OTP email:", mailErr);
    }

    return NextResponse.json({ requiresOTP: true, email });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
