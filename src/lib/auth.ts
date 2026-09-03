import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const IS_PROD = process.env.NODE_ENV === "production";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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

/**
 * Issue a session: record it in the `sessions` allowlist, then sign a JWT that
 * carries its id (`jti`). A token whose row has been deleted is dead, even
 * before it expires.
 */
export async function signSession(user: SessionUser): Promise<string> {
  const jti = randomUUID();
  const now = Date.now();
  await db.execute({
    sql: "INSERT INTO sessions (jti, uid, createdAt, expiresAt) VALUES (?, ?, ?, ?)",
    args: [jti, user.uid, now, now + SESSION_TTL_MS],
  });
  return jwt.sign(
    { uid: user.uid, email: user.email, displayName: user.displayName, jti },
    jwtSecret(),
    { expiresIn: "7d" }
  );
}

/**
 * Read + verify the session cookie AND confirm the session hasn't been revoked.
 * Returns null if missing, malformed, expired, or revoked.
 */
export async function getAuthUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, jwtSecret()) as jwt.JwtPayload;
  } catch {
    return null;
  }
  if (!payload?.uid || !payload?.email || !payload?.jti) return null;

  try {
    const res = await db.execute({
      sql: "SELECT expiresAt FROM sessions WHERE jti = ?",
      args: [payload.jti as string],
    });
    const row = res.rows[0] as unknown as { expiresAt: number } | undefined;
    if (!row) return null; // revoked, or never issued
    if (Number(row.expiresAt) < Date.now()) return null;
  } catch {
    return null;
  }

  return {
    uid: payload.uid as string,
    email: payload.email as string,
    displayName: (payload.displayName as string) ?? "Student",
  };
}

/** Revoke one session given its token — used on logout. Best effort. */
export async function revokeSession(token: string): Promise<void> {
  try {
    const payload = jwt.verify(token, jwtSecret()) as jwt.JwtPayload;
    if (payload?.jti) {
      await db.execute({
        sql: "DELETE FROM sessions WHERE jti = ?",
        args: [payload.jti as string],
      });
    }
  } catch {
    /* invalid token — nothing to revoke */
  }
}

/** Revoke every session for a user — used after a password reset. */
export async function revokeAllSessions(uid: string): Promise<void> {
  await db.execute({ sql: "DELETE FROM sessions WHERE uid = ?", args: [uid] });
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
