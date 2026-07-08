import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  increment,
  runTransaction,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Ride, RideMember, Message } from "@/types";

// ─── Rides ────────────────────────────────────────────────────────────────────

export async function createRide(
  data: Omit<Ride, "id" | "createdAt" | "expiresAt" | "seatsTaken" | "status">
): Promise<string> {
  // expiresAt = ride datetime + 2 hours
  const [year, month, day] = data.date.split("-").map(Number);
  const [hour, minute] = data.time.split(":").map(Number);
  const rideDate = new Date(year, month - 1, day, hour, minute);
  rideDate.setHours(rideDate.getHours() + 2);

  const ref = await addDoc(collection(db, "rides"), {
    ...data,
    seatsTaken: 1, // creator counts as 1
    status: "open",
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(rideDate),
  });

  // Add creator as first member
  await addDoc(collection(db, "rides", ref.id, "members"), {
    uid: data.creatorUid,
    displayName: data.creatorName,
    email: data.creatorEmail,
    joinedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function getRide(rideId: string): Promise<Ride | null> {
  const snap = await getDoc(doc(db, "rides", rideId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Ride;
}

export function subscribeToRides(
  callback: (rides: Ride[]) => void
): () => void {
  const q = query(
    collection(db, "rides"),
    where("status", "in", ["open", "full"]),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  return onSnapshot(q, (snap) => {
    const now = Timestamp.now();
    const rides = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Ride))
      .filter((r) => {
        // Hide expired rides
        if (r.expiresAt && r.expiresAt.toMillis() < now.toMillis()) {
          return false;
        }
        return true;
      });
    callback(rides);
  });
}

export async function cancelRide(rideId: string): Promise<void> {
  await updateDoc(doc(db, "rides", rideId), { status: "cancelled" });
}

// ─── Members ──────────────────────────────────────────────────────────────────

export async function joinRide(
  rideId: string,
  member: Omit<RideMember, "joinedAt">
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const rideRef = doc(db, "rides", rideId);
    const rideSnap = await tx.get(rideRef);
    if (!rideSnap.exists()) throw new Error("Ride not found");
    const ride = rideSnap.data() as Ride;
    if (ride.seatsTaken >= ride.seatsTotal) throw new Error("Ride is full");
    if (ride.status !== "open") throw new Error("Ride is not open");

    const membersSnap = await getDocs(
      query(
        collection(db, "rides", rideId, "members"),
        where("uid", "==", member.uid)
      )
    );
    if (!membersSnap.empty) throw new Error("Already joined");

    const memberRef = doc(collection(db, "rides", rideId, "members"));
    tx.set(memberRef, { ...member, joinedAt: serverTimestamp() });

    const newTaken = ride.seatsTaken + 1;
    tx.update(rideRef, {
      seatsTaken: increment(1),
      status: newTaken >= ride.seatsTotal ? "full" : "open",
    });
  });
}

export async function leaveRide(
  rideId: string,
  uid: string
): Promise<void> {
  const membersSnap = await getDocs(
    query(
      collection(db, "rides", rideId, "members"),
      where("uid", "==", uid)
    )
  );
  for (const memberDoc of membersSnap.docs) {
    await deleteDoc(memberDoc.ref);
  }
  await updateDoc(doc(db, "rides", rideId), {
    seatsTaken: increment(-1),
    status: "open",
  });
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
  const q = query(
    collection(db, "rides", rideId, "members"),
    orderBy("joinedAt", "asc")
  );
  return onSnapshot(q, (snap) => {
    const members = snap.docs.map((d) => ({ ...d.data() } as RideMember));
    callback(members);
  });
}

export async function isMember(rideId: string, uid: string): Promise<boolean> {
  const snap = await getDocs(
    query(
      collection(db, "rides", rideId, "members"),
      where("uid", "==", uid)
    )
  );
  return !snap.empty;
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
  // Count this user's messages in this ride
  const snap = await getDocs(
    query(
      collection(db, "rides", rideId, "messages"),
      where("uid", "==", uid)
    )
  );
  if (snap.size >= MESSAGE_LIMIT) {
    throw new Error("Message limit reached for this ride.");
  }
  await addDoc(collection(db, "rides", rideId, "messages"), {
    uid,
    displayName,
    text: text.trim(),
    createdAt: serverTimestamp(),
  });
}

export function subscribeToMessages(
  rideId: string,
  callback: (messages: Message[]) => void
): () => void {
  const q = query(
    collection(db, "rides", rideId, "messages"),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as Message)
    );
    callback(messages);
  });
}

export async function getUserMessageCount(
  rideId: string,
  uid: string
): Promise<number> {
  const snap = await getDocs(
    query(
      collection(db, "rides", rideId, "messages"),
      where("uid", "==", uid)
    )
  );
  return snap.size;
}
