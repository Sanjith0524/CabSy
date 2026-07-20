import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "cabsy_secret_key_12345";

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: "Missing email or code" }, { status: 400 });
    }

    // Find the OTP record
    const otpRecordRes = await db.execute({
      sql: "SELECT * FROM user_otps WHERE email = ?",
      args: [email],
    });
    const otpRecord = otpRecordRes.rows[0] as any;
    if (!otpRecord) {
      return NextResponse.json({ error: "No pending verification code found. Please sign in again." }, { status: 400 });
    }

    // Check expiration
    if (Date.now() > Number(otpRecord.expiresAt)) {
      await db.execute({
        sql: "DELETE FROM user_otps WHERE email = ?",
        args: [email],
      });
      return NextResponse.json({ error: "Verification code expired. Please sign in again." }, { status: 400 });
    }

    // Verify OTP code
    if (otpRecord.otp !== code.trim()) {
      return NextResponse.json({ error: "Invalid verification code. Please try again." }, { status: 400 });
    }

    // OTP is valid - delete it so it cannot be reused
    await db.execute({
      sql: "DELETE FROM user_otps WHERE email = ?",
      args: [email],
    });

    // Update user to verified
    await db.execute({
      sql: "UPDATE users SET isEmailVerified = 1 WHERE email = ?",
      args: [email],
    });

    // Get user details
    const userRes = await db.execute({
      sql: "SELECT * FROM users WHERE email = ?",
      args: [email],
    });
    const user = userRes.rows[0] as any;
    if (!user) {
      return NextResponse.json({ error: "User profile not found." }, { status: 400 });
    }

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
    console.error("OTP verification error:", err);
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 500 });
  }
}
