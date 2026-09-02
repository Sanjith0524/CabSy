import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/mailer";

export type NotifType =
  | "ride_join"
  | "ride_leave"
  | "ride_removed"
  | "ride_cancelled"
  | "ride_full"
  | "chat_message"
  | "ride_reminder";

export interface RideCtx {
  id: string;
  destination: string;
  creatorUid: string;
  creatorEmail: string;
}

interface Prefs {
  email: string;
  notifyEmail: boolean;
  notifyChat: boolean;
}

async function insert(
  uid: string,
  type: NotifType,
  rideId: string | null,
  title: string,
  body: string
) {
  await db.execute({
    sql: "INSERT INTO notifications (id, uid, type, rideId, title, body, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [randomUUID(), uid, type, rideId, title, body, Date.now()],
  });
}

async function prefsFor(uid: string): Promise<Prefs | null> {
  const res = await db.execute({
    sql: "SELECT email, notifyEmail, notifyChat FROM users WHERE uid = ?",
    args: [uid],
  });
  const row = res.rows[0] as any;
  if (!row) return null;
  return {
    email: row.email,
    notifyEmail: Number(row.notifyEmail ?? 1) === 1,
    notifyChat: Number(row.notifyChat ?? 1) === 1,
  };
}

/** True when this user already has an unread notification of `type` for `rideId`. */
async function hasUnread(
  uid: string,
  rideId: string,
  type: NotifType
): Promise<boolean> {
  const res = await db.execute({
    sql: "SELECT 1 FROM notifications WHERE uid = ? AND rideId = ? AND type = ? AND readAt IS NULL LIMIT 1",
    args: [uid, rideId, type],
  });
  return res.rows.length > 0;
}

async function email(
  to: string,
  subject: string,
  heading: string,
  message: string,
  ride: RideCtx
) {
  try {
    await sendNotificationEmail({
      to,
      subject,
      heading,
      message,
      cta: { text: "Open ride", path: `/rides/${ride.id}` },
    });
  } catch (err) {
    console.error("Notification email failed:", err);
  }
}

// ─── Events ──────────────────────────────────────────────────────────────────
// Every helper swallows its own errors — a notification never breaks the action
// that triggered it.

export async function notifyRideJoined(ride: RideCtx, joinerName: string) {
  try {
    await insert(
      ride.creatorUid,
      "ride_join",
      ride.id,
      "Someone joined your ride",
      `${joinerName} joined your ride to ${ride.destination}.`
    );
    const p = await prefsFor(ride.creatorUid);
    if (p?.notifyEmail) {
      await email(
        p.email,
        "[CabSy] Someone joined your ride",
        "New rider on your trip",
        `${joinerName} just joined your ride to ${ride.destination}. Say hi in the group chat and sort out the pickup details.`,
        ride
      );
    }
  } catch (err) {
    console.error("notifyRideJoined failed:", err);
  }
}

export async function notifyRideFull(ride: RideCtx) {
  try {
    await insert(
      ride.creatorUid,
      "ride_full",
      ride.id,
      "Your ride is full",
      `All seats on your ride to ${ride.destination} are taken.`
    );
  } catch (err) {
    console.error("notifyRideFull failed:", err);
  }
}

export async function notifyRideLeft(ride: RideCtx, leaverName: string) {
  try {
    await insert(
      ride.creatorUid,
      "ride_leave",
      ride.id,
      "A rider left your ride",
      `${leaverName} left your ride to ${ride.destination}. A seat just opened up.`
    );
  } catch (err) {
    console.error("notifyRideLeft failed:", err);
  }
}

export async function notifyMemberRemoved(
  ride: RideCtx,
  removedUid: string,
  removedEmail: string
) {
  try {
    await insert(
      removedUid,
      "ride_removed",
      ride.id,
      "You were removed from a ride",
      `You were removed from the ride to ${ride.destination}.`
    );
    const p = await prefsFor(removedUid);
    if (p?.notifyEmail) {
      await email(
        removedEmail || p.email,
        "[CabSy] You were removed from a ride",
        "Removed from a ride",
        `The host removed you from the ride to ${ride.destination}. If you think this was a mistake, you can request to join again.`,
        ride
      );
    }
  } catch (err) {
    console.error("notifyMemberRemoved failed:", err);
  }
}

export async function notifyRideCancelled(
  ride: RideCtx,
  members: { uid: string; email: string }[]
) {
  for (const m of members) {
    if (m.uid === ride.creatorUid) continue;
    try {
      await insert(
        m.uid,
        "ride_cancelled",
        ride.id,
        "A ride was cancelled",
        `The host cancelled the ride to ${ride.destination}.`
      );
      const p = await prefsFor(m.uid);
      if (p?.notifyEmail) {
        await email(
          m.email || p.email,
          "[CabSy] A ride was cancelled",
          "Ride cancelled",
          `The host cancelled the ride to ${ride.destination}. Check CabSy for other rides heading the same way.`,
          ride
        );
      }
    } catch (err) {
      console.error("notifyRideCancelled failed for", m.uid, err);
    }
  }
}

export async function notifyNewMessage(
  ride: RideCtx,
  senderUid: string,
  senderName: string,
  memberUids: string[]
) {
  for (const uid of memberUids) {
    if (uid === senderUid) continue;
    try {
      if (await hasUnread(uid, ride.id, "chat_message")) continue;
      const p = await prefsFor(uid);
      if (p && !p.notifyChat) continue;
      await insert(
        uid,
        "chat_message",
        ride.id,
        "New message in a ride chat",
        `${senderName} sent a message in the chat for your ride to ${ride.destination}.`
      );
    } catch (err) {
      console.error("notifyNewMessage failed for", uid, err);
    }
  }
}
