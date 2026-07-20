import { createClient } from "@libsql/client";

let dbUrl = process.env.TURSO_DATABASE_URL;
if (!dbUrl) {
  if (process.env.VERCEL === "1" || process.env.NODE_ENV === "production") {
    dbUrl = "file:/tmp/cabsy.db";
  } else {
    dbUrl = "file:cabsy.db";
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
        expiresAt INTEGER NOT NULL
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

    // Run migration alter table to add column for existing databases
    try {
      await db.execute("ALTER TABLE users ADD COLUMN isEmailVerified INTEGER DEFAULT 0");
    } catch (_) {}

    isInitialized = true;
  } catch (err) {
    console.error("Database schema initialization failed:", err);
  }
}

export { db, initDb };
