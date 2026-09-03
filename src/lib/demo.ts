import { randomUUID } from "crypto";
import { db } from "@/lib/db";

export const DEMO_EMAIL_DOMAIN = "demo.cabsy";
export const GUEST_TTL_MS = 24 * 60 * 60 * 1000;

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

// ─── Seeded "residents" — fake students whose rides populate the demo feed ────

const RESIDENTS = [
  { key: "ananya", name: "Ananya Rao" },
  { key: "karthik", name: "Karthik Menon" },
  { key: "isha", name: "Isha Verma" },
  { key: "rahul", name: "Rahul Nair" },
  { key: "meera", name: "Meera Iyer" },
  { key: "dev", name: "Dev Patel" },
];

const email = (key: string) => `${key}@${DEMO_EMAIL_DOMAIN}`;

function dayOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function expiresAtFor(dateStr: string, timeStr: string): number {
  const [y, m, day] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, day, hh, mm).getTime() + 2 * 60 * 60 * 1000;
}

interface SeedRide {
  creator: string; // resident key
  pickup: string;
  destination: string;
  dayOffset: number;
  time: string;
  seatsTotal: number;
  notes?: string;
  joiners?: string[]; // resident keys who also joined
  chat?: { by: string; text: string }[];
}

const SEED_RIDES: SeedRide[] = [
  {
    creator: "ananya",
    pickup: "VIT Main Gate",
    destination: "Chennai Airport T1",
    dayOffset: 1,
    time: "05:30",
    seatsTotal: 4,
    notes: "Early flight — leaving sharp at 5:30, meet at the main gate.",
    joiners: ["karthik"],
    chat: [
      { by: "ananya", text: "Booking an Uber XL, split 4 ways works out cheap." },
      { by: "karthik", text: "Perfect, I'll be at the gate by 5:20." },
    ],
  },
  {
    creator: "karthik",
    pickup: "Hostel Block C",
    destination: "Katpadi Junction",
    dayOffset: 1,
    time: "17:45",
    seatsTotal: 3,
    notes: "Catching the 6:40 train to Chennai. One bag each please.",
  },
  {
    creator: "isha",
    pickup: "VIT Main Gate",
    destination: "Vellore Fort / Town",
    dayOffset: 2,
    time: "11:00",
    seatsTotal: 4,
    notes: "Weekend trip to town, back by evening.",
    joiners: ["meera", "dev"],
    chat: [{ by: "meera", text: "Can we stop at Phoenix mall on the way back?" }],
  },
  {
    creator: "rahul",
    pickup: "Pearl Research Park",
    destination: "Katpadi Junction",
    dayOffset: 2,
    time: "06:15",
    seatsTotal: 3,
  },
  {
    creator: "meera",
    pickup: "VIT Main Gate",
    destination: "Chennai Central",
    dayOffset: 3,
    time: "14:00",
    seatsTotal: 4,
    notes: "Heading home for the long weekend.",
    joiners: ["ananya"],
  },
  {
    creator: "dev",
    pickup: "Hostel Block A",
    destination: "Bangalore (KSR / Majestic)",
    dayOffset: 4,
    time: "22:30",
    seatsTotal: 4,
    notes: "Overnight cab to Bangalore, sharing fuel + toll.",
  },
  {
    creator: "ananya",
    pickup: "VIT Main Gate",
    destination: "Sri Sairam Temple, Chennai",
    dayOffset: 3,
    time: "07:00",
    seatsTotal: 3,
  },
];

async function wipeDemoData() {
  // Rides created by residents, and everything hanging off them.
  const rideIds = (
    await db.execute({
      sql: `SELECT id FROM rides WHERE creatorEmail LIKE '%@' || ?`,
      args: [DEMO_EMAIL_DOMAIN],
    })
  ).rows.map((r: any) => r.id as string);

  for (const id of rideIds) {
    await db.execute({ sql: "DELETE FROM messages WHERE rideId = ?", args: [id] });
    await db.execute({ sql: "DELETE FROM ride_members WHERE rideId = ?", args: [id] });
    await db.execute({ sql: "DELETE FROM notifications WHERE rideId = ?", args: [id] });
    await db.execute({ sql: "DELETE FROM rides WHERE id = ?", args: [id] });
  }
  await db.execute({
    sql: `DELETE FROM users WHERE email LIKE '%@' || ? AND isGuest = 1 AND email NOT LIKE 'guest-%'`,
    args: [DEMO_EMAIL_DOMAIN],
  });
}

/**
 * Make sure the demo feed has fresh, non-expired sample rides. Idempotent and
 * safe to call on every guest sign-in — it only does work when the seeded rides
 * are missing or have aged out, and takes a short lock so concurrent callers
 * don't double-seed.
 */
export async function ensureDemoSeed(): Promise<void> {
  if (!isDemoMode()) return;
  try {
    const now = Date.now();

    const freshRes = await db.execute({
      sql: `SELECT COUNT(*) AS c FROM rides
            WHERE creatorEmail LIKE '%@' || ?
              AND status IN ('open', 'full')
              AND CAST(expiresAt AS INTEGER) > ?`,
      args: [DEMO_EMAIL_DOMAIN, now],
    });
    const fresh = Number((freshRes.rows[0] as any).c) || 0;
    if (fresh >= 4) return;

    // Lock: skip if someone seeded in the last 60s.
    await db.execute({
      sql: "INSERT OR IGNORE INTO meta (key, value) VALUES ('demoSeedAt', '0')",
      args: [],
    });
    const claim = await db.execute({
      sql: "UPDATE meta SET value = ? WHERE key = 'demoSeedAt' AND CAST(value AS INTEGER) < ?",
      args: [String(now), now - 60 * 1000],
    });
    if (claim.rowsAffected === 0) return;

    await wipeDemoData();

    const uids: Record<string, string> = {};
    for (const r of RESIDENTS) {
      const uid = randomUUID();
      uids[r.key] = uid;
      await db.execute({
        sql: "INSERT INTO users (uid, email, displayName, photoURL, college, passwordHash, isEmailVerified, isGuest) VALUES (?, ?, ?, ?, ?, ?, 1, 1)",
        args: [uid, email(r.key), r.name, "", DEMO_EMAIL_DOMAIN, "demo-no-login"],
      });
    }

    for (const ride of SEED_RIDES) {
      const dateStr = dayOffset(ride.dayOffset);
      const rideId = randomUUID();
      const creatorName = RESIDENTS.find((x) => x.key === ride.creator)!.name;
      const joiners = ride.joiners ?? [];
      const seatsTaken = 1 + joiners.length;
      const status = seatsTaken >= ride.seatsTotal ? "full" : "open";
      const createdAt = now - Math.floor(Math.random() * 6 * 60 * 60 * 1000);

      await db.execute({
        sql: "INSERT INTO rides (id, pickup, destination, date, time, seatsTotal, seatsTaken, status, creatorUid, creatorName, creatorEmail, notes, createdAt, expiresAt, reminderSent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
        args: [
          rideId,
          ride.pickup,
          ride.destination,
          dateStr,
          ride.time,
          ride.seatsTotal,
          seatsTaken,
          status,
          uids[ride.creator],
          creatorName,
          email(ride.creator),
          ride.notes ?? null,
          createdAt,
          String(expiresAtFor(dateStr, ride.time)),
        ],
      });

      for (const key of [ride.creator, ...joiners]) {
        const res = RESIDENTS.find((x) => x.key === key)!;
        await db.execute({
          sql: "INSERT INTO ride_members (rideId, uid, displayName, email, joinedAt) VALUES (?, ?, ?, ?, ?)",
          args: [rideId, uids[key], res.name, email(key), createdAt],
        });
      }

      let t = createdAt + 60 * 1000;
      for (const msg of ride.chat ?? []) {
        const res = RESIDENTS.find((x) => x.key === msg.by)!;
        await db.execute({
          sql: "INSERT INTO messages (id, rideId, uid, displayName, text, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
          args: [randomUUID(), rideId, uids[msg.by], res.name, msg.text, t],
        });
        t += 90 * 1000;
      }
    }
  } catch (err) {
    console.error("Demo seed failed:", err);
  }
}

/** Remove guest visitor accounts (and their traces) older than the TTL. */
export async function purgeStaleGuests(): Promise<void> {
  if (!isDemoMode()) return;
  try {
    const cutoff = Date.now() - GUEST_TTL_MS;
    const stale = (
      await db.execute({
        sql: "SELECT uid FROM users WHERE isGuest = 1 AND email LIKE 'guest-%' AND CAST(substr(email, 7, 13) AS INTEGER) < ?",
        args: [cutoff],
      })
    ).rows.map((r: any) => r.uid as string);

    for (const uid of stale) {
      const rideIds = (
        await db.execute({ sql: "SELECT id FROM rides WHERE creatorUid = ?", args: [uid] })
      ).rows.map((r: any) => r.id as string);
      for (const id of rideIds) {
        await db.execute({ sql: "DELETE FROM messages WHERE rideId = ?", args: [id] });
        await db.execute({ sql: "DELETE FROM ride_members WHERE rideId = ?", args: [id] });
        await db.execute({ sql: "DELETE FROM notifications WHERE rideId = ?", args: [id] });
        await db.execute({ sql: "DELETE FROM rides WHERE id = ?", args: [id] });
      }
      await db.execute({ sql: "DELETE FROM ride_members WHERE uid = ?", args: [uid] });
      await db.execute({ sql: "DELETE FROM messages WHERE uid = ?", args: [uid] });
      await db.execute({ sql: "DELETE FROM notifications WHERE uid = ?", args: [uid] });
      await db.execute({ sql: "DELETE FROM users WHERE uid = ?", args: [uid] });
    }
  } catch (err) {
    console.error("Guest purge failed:", err);
  }
}

/** Create a fresh guest visitor account. Email encodes the creation time. */
export async function createGuestUser(): Promise<{
  uid: string;
  email: string;
  displayName: string;
}> {
  const uid = randomUUID();
  const ts = Date.now(); // 13 digits — parsed back out in purgeStaleGuests
  const guestEmail = `guest-${ts}-${uid.slice(0, 8)}@${DEMO_EMAIL_DOMAIN}`;
  const displayName = `Guest ${uid.slice(0, 4).toUpperCase()}`;
  await db.execute({
    sql: "INSERT INTO users (uid, email, displayName, photoURL, college, passwordHash, isEmailVerified, isGuest, notifyEmail) VALUES (?, ?, ?, ?, ?, ?, 1, 1, 0)",
    args: [uid, guestEmail, displayName, "", DEMO_EMAIL_DOMAIN, "demo-no-login"],
  });
  return { uid, email: guestEmail, displayName };
}
