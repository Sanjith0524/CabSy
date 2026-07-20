import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { db, initDb } from "@/lib/db";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "cabsy_secret_key_12345";

export async function GET(request: NextRequest) {
  try {
    await initDb();
    const token = cookies().get("cabsy_session")?.value;
    if (!token) {
      return NextResponse.json({ user: null });
    }

    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (!payload || !payload.uid) {
      return NextResponse.json({ user: null });
    }

    const userRes = await db.execute({
      sql: "SELECT uid, email, displayName, photoURL, college FROM users WHERE uid = ?",
      args: [payload.uid],
    });
    const user = userRes.rows[0];
    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user });
  } catch (err) {
    return NextResponse.json({ user: null });
  }
}
