import { createClient } from "@libsql/client";

let dbUrl = process.env.TURSO_DATABASE_URL;
if (!dbUrl) {
  // A local file on a serverless platform (Vercel, etc.) is ephemeral and
  // per-instance — data silently disappears. Refuse to run there.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    throw new Error(
      "TURSO_DATABASE_URL is not set. A hosted database is required on serverless."
    );
  }
  // Local dev or a persistent single-server host: a file is fine.
  dbUrl = "file:cabsy.db";
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[db] TURSO_DATABASE_URL not set — using local file cabsy.db. " +
        "This only works if the filesystem is persistent (a VM/container, not serverless)."
    );
  }
}
const dbAuthToken = process.env.TURSO_AUTH_TOKEN;

// Prevent multiple instances of the client in development hot-reloads
const globalForDb = global as unknown as { dbInstance: ReturnType<typeof createClient> };

let db: ReturnType<typeof createClient>;

if (process.env.NODE_ENV === "production") {
  db = createClient({
    url: dbUrl,
    authToken: dbAuthToken,
  });
} else {
  if (!globalForDb.dbInstance) {
    globalForDb.dbInstance = createClient({
      url: dbUrl,
      authToken: dbAuthToken,
    });
  }
  db = globalForDb.dbInstance;
}

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
        attempts INTEGER DEFAULT 0
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

    // Run migration alter tables to add columns for existing databases
    try {
      await db.execute("ALTER TABLE users ADD COLUMN isEmailVerified INTEGER DEFAULT 0");
    } catch (_) {}
    try {
      await db.execute("ALTER TABLE user_otps ADD COLUMN attempts INTEGER DEFAULT 0");
    } catch (_) {}

    isInitialized = true;
  } catch (err) {
    console.error("Database schema initialization failed:", err);
  }
}

export { db, initDb };
