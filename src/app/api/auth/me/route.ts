import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "cabsy_secret_key_12345";

export async function GET(request: NextRequest) {
  try {
    const token = cookies().get("cabsy_session")?.value;
    if (!token) {
      return NextResponse.json({ user: null });
    }

    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (!payload || !payload.uid) {
      return NextResponse.json({ user: null });
    }

    const user = db.prepare("SELECT uid, email, displayName, photoURL, college FROM users WHERE uid = ?").get(payload.uid) as any;
    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user });
  } catch (err) {
    return NextResponse.json({ user: null });
  }
}
