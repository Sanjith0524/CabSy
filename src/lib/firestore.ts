import type { Ride, RideMember, Message } from "@/types";

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

export function subscribeToMembers(
  rideId: string,
  callback: (members: RideMember[]) => void
): () => void {
  let active = true;
  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/rides/${rideId}/members`);
      if (!res.ok) return;
      const { members } = await res.json();
      if (active && members) {
        callback(
          members.map((m: any) => ({
            ...m,
            joinedAt: mapTimestamp(m.joinedAt),
          }))
        );
      }
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
    const { members } = await res.json();
    return members.some((m: any) => m.uid === uid);
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

