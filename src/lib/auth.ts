import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const IS_PROD = process.env.NODE_ENV === "production";

/**
 * Resolve the JWT signing secret. In production a real secret MUST be
 * configured — we throw rather than fall back to a known value, which would
 * let anyone forge session tokens.
 */
function jwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (s && s.length >= 16) return s;
  if (IS_PROD) {
    throw new Error(
      "JWT_SECRET is not set (or too short). Refusing to run with an insecure fallback."
    );
  }
  return "dev-only-insecure-secret-change-me";
}

export const SESSION_COOKIE = "cabsy_session";

export const sessionCookieOptions = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: "/",
};

export interface SessionUser {
  uid: string;
  email: string;
  displayName: string;
}

export function signSession(user: SessionUser): string {
  return jwt.sign(
    { uid: user.uid, email: user.email, displayName: user.displayName },
    jwtSecret(),
    { expiresIn: "7d" }
  );
}

/** Read + verify the session cookie. Returns null if missing/invalid. */
export function getAuthUser(): SessionUser | null {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, jwtSecret()) as Partial<SessionUser>;
    if (!payload || !payload.uid || !payload.email) return null;
    return {
      uid: payload.uid,
      email: payload.email,
      displayName: payload.displayName ?? "Student",
    };
  } catch {
    return null;
  }
}

/** True when `uid` has joined `rideId`. Used to gate ride-private data. */
export async function isRideMember(
  rideId: string,
  uid: string
): Promise<boolean> {
  const res = await db.execute({
    sql: "SELECT 1 FROM ride_members WHERE rideId = ? AND uid = ? LIMIT 1",
    args: [rideId, uid],
  });
  return res.rows.length > 0;
}
