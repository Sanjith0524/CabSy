import { createClient, type Client } from "@libsql/client";

function resolveDbUrl(): string {
  const url = process.env.TURSO_DATABASE_URL;
  if (url) return url;
  // A local file on a serverless platform (Vercel, etc.) is ephemeral and
  // per-instance — data silently disappears. Refuse to run there.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    throw new Error(
      "TURSO_DATABASE_URL is not set. A hosted database is required on serverless."
    );
  }
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[db] TURSO_DATABASE_URL not set — using local file cabsy.db. " +
        "This only works if the filesystem is persistent (a VM/container, not serverless)."
    );
  }
  // Local dev or a persistent single-server host: a file is fine.
  return "file:cabsy.db";
}

// Prevent multiple instances of the client in development hot-reloads.
const globalForDb = global as unknown as { dbInstance?: Client };

let client: Client | undefined;

function getClient(): Client {
  if (client) return client;
  if (process.env.NODE_ENV !== "production" && globalForDb.dbInstance) {
    client = globalForDb.dbInstance;
    return client;
  }
  client = createClient({
    url: resolveDbUrl(),
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  if (process.env.NODE_ENV !== "production") globalForDb.dbInstance = client;
  return client;
}

/**
 * Lazy libSQL client. Nothing connects (or validates env vars) until the first
 * query — importing this module must stay side-effect-free so `next build`'s
 * page-data collection doesn't evaluate a live DB config.
 */
const db: Client = new Proxy({} as Client, {
  get(_target, prop) {
    const c = getClient() as unknown as Record<string | symbol, unknown>;
    const value = c[prop];
    return typeof value === "function" ? (value as Function).bind(c) : value;
  },
});

let isInitialized = false;

async function initDb() {
  if (isInitialized) return;
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        uid TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        displayName TEXT,
        photoURL TEXT,
        college TEXT,
        passwordHash TEXT NOT NULL,
        isEmailVerified INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT (datetime('now', 'localtime'))
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_otps (
        email TEXT PRIMARY KEY,
        otp TEXT NOT NULL,
        expiresAt INTEGER NOT NULL,
        attempts INTEGER DEFAULT 0,
        purpose TEXT DEFAULT 'verify'
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS rides (
        id TEXT PRIMARY KEY,
        pickup TEXT NOT NULL,
        destination TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        seatsTotal INTEGER NOT NULL,
        seatsTaken INTEGER DEFAULT 1,
        status TEXT DEFAULT 'open',
        creatorUid TEXT NOT NULL,
        creatorName TEXT NOT NULL,
        creatorEmail TEXT NOT NULL,
        notes TEXT,
        createdAt TEXT DEFAULT (datetime('now', 'localtime')),
        expiresAt TEXT
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS ride_members (
        rideId TEXT NOT NULL,
        uid TEXT NOT NULL,
        displayName TEXT NOT NULL,
        email TEXT NOT NULL,
        joinedAt TEXT DEFAULT (datetime('now', 'localtime')),
        PRIMARY KEY (rideId, uid)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        rideId TEXT NOT NULL,
        uid TEXT NOT NULL,
        displayName TEXT NOT NULL,
        text TEXT NOT NULL,
        createdAt TEXT DEFAULT (datetime('now', 'localtime'))
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        uid TEXT NOT NULL,
        type TEXT NOT NULL,
        rideId TEXT,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        readAt INTEGER,
        createdAt INTEGER NOT NULL
      )
    `);
    await db.execute(
      "CREATE INDEX IF NOT EXISTS idx_notifications_uid ON notifications (uid, createdAt DESC)"
    );

    // Small key/value store for cross-instance bookkeeping (e.g. last sweep time).
    await db.execute(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // Run migration alter tables to add columns for existing databases
    try {
      await db.execute("ALTER TABLE users ADD COLUMN isEmailVerified INTEGER DEFAULT 0");
    } catch (_) {}
    try {
      await db.execute("ALTER TABLE user_otps ADD COLUMN attempts INTEGER DEFAULT 0");
    } catch (_) {}
    try {
      await db.execute("ALTER TABLE user_otps ADD COLUMN purpose TEXT DEFAULT 'verify'");
    } catch (_) {}
    try {
      await db.execute("ALTER TABLE users ADD COLUMN notifyEmail INTEGER DEFAULT 1");
    } catch (_) {}
    try {
      await db.execute("ALTER TABLE users ADD COLUMN notifyChat INTEGER DEFAULT 1");
    } catch (_) {}
    try {
      await db.execute("ALTER TABLE rides ADD COLUMN reminderSent INTEGER DEFAULT 0");
    } catch (_) {}
    try {
      await db.execute("ALTER TABLE users ADD COLUMN isGuest INTEGER DEFAULT 0");
    } catch (_) {}

    isInitialized = true;
  } catch (err) {
    console.error("Database schema initialization failed:", err);
  }
}

export { db, initDb };
