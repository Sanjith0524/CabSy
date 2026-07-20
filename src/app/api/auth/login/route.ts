import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import { sendOTPEmail } from "@/lib/mailer";

const JWT_SECRET = process.env.JWT_SECRET || "cabsy_secret_key_12345";

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
    }

    // Find user in database
    const userRes = await db.execute({
      sql: "SELECT * FROM users WHERE email = ?",
      args: [email],
    });
    const user = userRes.rows[0] as any;
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    // Check if email is verified
    if (Number(user.isEmailVerified) === 0) {
      // Generate 6-digit OTP to complete registration verification
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

      // Save to database
      await db.execute({
        sql: "INSERT OR REPLACE INTO user_otps (email, otp, expiresAt) VALUES (?, ?, ?)",
        args: [email, otp, expiresAt],
      });

      // Log to local file and console for testing
      try {
        const otpLogPath = path.resolve(process.cwd(), "otp-debug.log");
        fs.writeFileSync(otpLogPath, `[2FA OTP] Verification code for ${email} is: ${otp}\n`);
      } catch (_) {
        console.warn("Could not write OTP to local debug file (read-only environment)");
      }
      console.log(`[2FA OTP] Code for ${email} is: ${otp}`);

      // Send real email OTP
      try {
        await sendOTPEmail(email, otp, "login");
      } catch (mailErr: any) {
        console.error("Failed to send OTP email:", mailErr);
      }

      return NextResponse.json({
        requiresOTP: true,
        email,
        error: "Please verify your email address first."
      });
    }

    // Verified user - direct login
    // Create session token
    const token = jwt.sign(
      { uid: user.uid, email: user.email, displayName: user.displayName },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Set cookie
    cookies().set("cabsy_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        college: user.college,
      },
    });
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Authentication failed. Please try again." }, { status: 500 });
  }
}
