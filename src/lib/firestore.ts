import type { Ride, RideMember, Message, AppNotification } from "@/types";

const mapTimestamp = (val: any) => {
  if (!val) return undefined;
  const d = new Date(Number(val));
  return {
    toDate: () => d,
    toMillis: () => d.getTime(),
  } as any;
};

// ─── Rides ────────────────────────────────────────────────────────────────────

export async function createRide(
  data: Omit<Ride, "id" | "createdAt" | "expiresAt" | "seatsTaken" | "status">
): Promise<string> {
  const res = await fetch("/api/rides", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create ride");
  }
  const result = await res.json();
  return result.id;
}

export async function getRide(rideId: string): Promise<Ride | null> {
  try {
    const res = await fetch(`/api/rides/${rideId}`);
    if (!res.ok) return null;
    const { ride } = await res.json();
    if (!ride) return null;
    return {
      ...ride,
      createdAt: mapTimestamp(ride.createdAt),
      expiresAt: mapTimestamp(ride.expiresAt),
    } as any;
  } catch {
    return null;
  }
}

export function subscribeToRides(
  callback: (rides: Ride[]) => void
): () => void {
  let active = true;
  const fetchRides = async () => {
    try {
      const res = await fetch("/api/rides");
      if (!res.ok) return;
      const { rides } = await res.json();
      if (active && rides) {
        callback(
          rides.map((r: any) => ({
            ...r,
            createdAt: mapTimestamp(r.createdAt),
            expiresAt: mapTimestamp(r.expiresAt),
          }))
        );
      }
    } catch (err) {
      console.error("Fetch rides error:", err);
    }
  };

  fetchRides();
  const interval = setInterval(fetchRides, 3000); // Poll every 3 seconds

  return () => {
    active = false;
    clearInterval(interval);
  };
}

export async function cancelRide(rideId: string): Promise<void> {
  const res = await fetch(`/api/rides/${rideId}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to cancel ride");
  }
}

// ─── Members ──────────────────────────────────────────────────────────────────

export async function joinRide(
  rideId: string,
  member: Omit<RideMember, "joinedAt">
): Promise<void> {
  const res = await fetch(`/api/rides/${rideId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(member),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to join ride");
  }
}

export async function leaveRide(
  rideId: string,
  uid: string
): Promise<void> {
  const res = await fetch(`/api/rides/${rideId}/members?uid=${uid}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to leave ride");
  }
}

export async function removeMember(
  rideId: string,
  uid: string
): Promise<void> {
  await leaveRide(rideId, uid);
}

export interface MembersSnapshot {
  members: RideMember[];
  count: number;
  restricted: boolean; // true when the caller isn't in the ride (roster hidden)
}

export function subscribeToMembers(
  rideId: string,
  callback: (snap: MembersSnapshot) => void
): () => void {
  let active = true;
  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/rides/${rideId}/members`);
      if (!res.ok) return;
      const data = await res.json();
      if (!active) return;
      callback({
        members: (data.members ?? []).map((m: any) => ({
          ...m,
          joinedAt: mapTimestamp(m.joinedAt),
        })),
        count: Number(data.count) || 0,
        restricted: Boolean(data.restricted),
      });
    } catch (err) {
      console.error("Fetch members error:", err);
    }
  };

  fetchMembers();
  const interval = setInterval(fetchMembers, 3000);

  return () => {
    active = false;
    clearInterval(interval);
  };
}

export async function isMember(rideId: string, uid: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/rides/${rideId}/members`);
    if (!res.ok) return false;
    const data = await res.json();
    if (typeof data.joined === "boolean") return data.joined;
    return (data.members ?? []).some((m: any) => m.uid === uid);
  } catch {
    return false;
  }
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export const MESSAGE_LIMIT = 25;
export const MESSAGE_WARN_AT = 20;

export async function sendMessage(
  rideId: string,
  uid: string,
  displayName: string,
  text: string
): Promise<void> {
  const res = await fetch(`/api/rides/${rideId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to send message");
  }
}

export function subscribeToMessages(
  rideId: string,
  callback: (messages: Message[]) => void
): () => void {
  let active = true;
  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/rides/${rideId}/messages`);
      if (!res.ok) return;
      const { messages } = await res.json();
      if (active && messages) {
        callback(
          messages.map((msg: any) => ({
            ...msg,
            createdAt: mapTimestamp(msg.createdAt),
          }))
        );
      }
    } catch (err) {
      console.error("Fetch messages error:", err);
    }
  };

  fetchMessages();
  const interval = setInterval(fetchMessages, 2000); // Fast poll for chat messages

  return () => {
    active = false;
    clearInterval(interval);
  };
}

export async function getUserMessageCount(
  rideId: string,
  uid: string
): Promise<number> {
  try {
    const res = await fetch(`/api/rides/${rideId}/messages`);
    if (!res.ok) return 0;
    const { messages } = await res.json();
    return messages.filter((m: any) => m.uid === uid).length;
  } catch {
    return 0;
  }
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function subscribeToNotifications(
  callback: (data: { notifications: AppNotification[]; unread: number }) => void
): () => void {
  let active = true;
  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      if (active && data.notifications) {
        callback({
          notifications: data.notifications as AppNotification[],
          unread: Number(data.unread) || 0,
        });
      }
    } catch {
      /* transient — the next poll will retry */
    }
  };

  fetchNotifications();
  const interval = setInterval(fetchNotifications, 5000);

  return () => {
    active = false;
    clearInterval(interval);
  };
}

export async function markNotificationsRead(id?: string): Promise<void> {
  try {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : {}),
    });
  } catch {
    /* best effort */
  }
}

