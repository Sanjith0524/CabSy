import Database from "better-sqlite3";
import path from "path";

const dbPath = path.resolve(process.cwd(), "cabsy.db");

// Prevent multiple instances of Database in development hot-reloads
const globalForDb = global as unknown as { dbInstance: Database.Database };

let db: Database.Database;

if (process.env.NODE_ENV === "production") {
  db = new Database(dbPath);
} else {
  if (!globalForDb.dbInstance) {
    globalForDb.dbInstance = new Database(dbPath);
    // Initialize schemas
    globalForDb.dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS users (
        uid TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        displayName TEXT,
        photoURL TEXT,
        college TEXT,
        passwordHash TEXT NOT NULL,
        isEmailVerified INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS user_otps (
        email TEXT PRIMARY KEY,
        otp TEXT NOT NULL,
        expiresAt INTEGER NOT NULL
      );

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
        expiresAt TEXT,
        FOREIGN KEY(creatorUid) REFERENCES users(uid)
      );

      CREATE TABLE IF NOT EXISTS ride_members (
        rideId TEXT NOT NULL,
        uid TEXT NOT NULL,
        displayName TEXT NOT NULL,
        email TEXT NOT NULL,
        joinedAt TEXT DEFAULT (datetime('now', 'localtime')),
        PRIMARY KEY (rideId, uid),
        FOREIGN KEY(rideId) REFERENCES rides(id) ON DELETE CASCADE,
        FOREIGN KEY(uid) REFERENCES users(uid)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        rideId TEXT NOT NULL,
        uid TEXT NOT NULL,
        displayName TEXT NOT NULL,
        text TEXT NOT NULL,
        createdAt TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY(rideId) REFERENCES rides(id) ON DELETE CASCADE,
        FOREIGN KEY(uid) REFERENCES users(uid)
      );
    `);

    // Run migration alter table to add column for existing local databases
    try {
      globalForDb.dbInstance.exec("ALTER TABLE users ADD COLUMN isEmailVerified INTEGER DEFAULT 0");
    } catch (_) {}
  }
  db = globalForDb.dbInstance;
}

export { db };
