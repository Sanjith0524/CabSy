import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { isDemoMode, ensureDemoSeed, purgeStaleGuests } from "@/lib/demo";

const HOURS_2 = 2 * 60 * 60 * 1000;
const REMINDER_WINDOW = 45 * 60 * 1000; // notify when departure is <= 45 min away
const MIN_INTERVAL = 90 * 1000; // don't actually sweep more than once every 90s
const NOTIF_TTL = 30 * 24 * 60 * 60 * 1000; // drop notifications after 30 days
const MSG_TTL_AFTER_DEPART = 2 * 24 * 60 * 60 * 1000; // drop chat 2 days after the trip

/**
 * Housekeeping that can't be driven by a user action: expire past rides, send
 * departure reminders, and prune old rows. Safe to call very often — it
 * self-throttles via the `meta` table and only one caller wins each interval.
 * Runs opportunistically off request traffic, with a daily Vercel cron backstop.
 */
export async function runSweep({ force = false }: { force?: boolean } = {}): Promise<void> {
  try {
    const now = Date.now();

    if (!force) {
      await db.execute({
        sql: "INSERT OR IGNORE INTO meta (key, value) VALUES ('lastSweepAt', '0')",
        args: [],
      });
      const claim = await db.execute({
        sql: "UPDATE meta SET value = ? WHERE key = 'lastSweepAt' AND CAST(value AS INTEGER) < ?",
        args: [String(now), now - MIN_INTERVAL],
      });
      if (claim.rowsAffected === 0) return; // another instance swept recently
    }

    // 1. Expire rides whose 2h travel window has fully elapsed.
    await db.execute({
      sql: "UPDATE rides SET status = 'expired' WHERE status IN ('open', 'full') AND CAST(expiresAt AS INTEGER) < ?",
      args: [now],
    });

    // 2. Departure reminders — for rides leaving within the next 45 minutes.
    const due = await db.execute({
      sql: `SELECT id, destination, time FROM rides
            WHERE status IN ('open', 'full')
              AND reminderSent = 0
              AND CAST(expiresAt AS INTEGER) - ? BETWEEN ? AND ?`,
      args: [HOURS_2, now, now + REMINDER_WINDOW],
    });

    for (const ride of due.rows as any[]) {
      const members = await db.execute({
        sql: "SELECT uid FROM ride_members WHERE rideId = ?",
        args: [ride.id],
      });
      for (const m of members.rows as any[]) {
        await db.execute({
          sql: "INSERT INTO notifications (id, uid, type, rideId, title, body, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
          args: [
            randomUUID(),
            m.uid,
            "ride_reminder",
            ride.id,
            "Your ride leaves soon",
            `Your ride to ${ride.destination} is scheduled for ${ride.time}. Confirm the pickup point in the group chat.`,
            now,
          ],
        });
      }
      await db.execute({
        sql: "UPDATE rides SET reminderSent = 1 WHERE id = ?",
        args: [ride.id],
      });
    }

    // 3. Prune old rows.
    await db.execute({
      sql: "DELETE FROM notifications WHERE createdAt < ?",
      args: [now - NOTIF_TTL],
    });
    await db.execute({
      sql: `DELETE FROM messages WHERE rideId IN (
              SELECT id FROM rides WHERE CAST(expiresAt AS INTEGER) < ?
            )`,
      args: [now - MSG_TTL_AFTER_DEPART],
    });
    await db.execute({
      sql: "DELETE FROM sessions WHERE expiresAt < ?",
      args: [now],
    });

    // 4. Demo deployment: retire stale guest visitors and keep the sample
    //    feed topped up with fresh, upcoming rides.
    if (isDemoMode()) {
      await purgeStaleGuests();
      await ensureDemoSeed();
    }
  } catch (err) {
    console.error("Sweep failed:", err);
  }
}
