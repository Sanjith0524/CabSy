import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { sendOTPEmail } from "@/lib/mailer";

const JWT_SECRET = process.env.JWT_SECRET || "cabsy_secret_key_12345";
const ALLOWED_DOMAINS = ["vitstudent.ac.in", "vit.ac.in"];

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const domain = email.split("@")[1];
    if (!ALLOWED_DOMAINS.includes(domain)) {
      return NextResponse.json(
        { error: "Only college email addresses are allowed (@vitstudent.ac.in or @vit.ac.in)" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const uid = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const photoURL = ""; // Fallback avatar

    // Insert user (unverified by default)
    db.prepare(
      "INSERT INTO users (uid, email, displayName, photoURL, college, passwordHash, isEmailVerified) VALUES (?, ?, ?, ?, ?, ?, 0)"
    ).run(uid, email, name, photoURL, domain, passwordHash);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Save OTP to database
    db.prepare("INSERT OR REPLACE INTO user_otps (email, otp, expiresAt) VALUES (?, ?, ?)")
      .run(email, otp, expiresAt);

    // Log to local file and console for testing
    const otpLogPath = path.resolve(process.cwd(), "otp-debug.log");
    fs.writeFileSync(otpLogPath, `[2FA OTP - REGISTRATION] Verification code for ${email} is: ${otp}\n`);
    console.log(`[2FA OTP - REGISTRATION] Code for ${email} is: ${otp}`);

    // Send real email OTP
    try {
      await sendOTPEmail(email, otp, "signup");
    } catch (mailErr: any) {
      console.error("Failed to send OTP email:", mailErr);
      // Fallback: we still allow them to verify via the log file locally if SMTP fails
    }

    return NextResponse.json({
      requiresOTP: true,
      email,
    });
  } catch (err: any) {
    console.error("Signup error:", err);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
