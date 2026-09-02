export interface Timestamp {
  toDate: () => Date;
  toMillis: () => number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  college: string; // derived from email domain
  createdAt: Timestamp;
}


export interface Ride {
  id: string;
  creatorUid: string;
  creatorName: string;
  creatorEmail: string;
  pickup: string;
  destination: string;
  date: string;       // "YYYY-MM-DD"
  time: string;       // "HH:MM"
  seatsTotal: number;
  seatsTaken: number;
  notes?: string;
  status: "open" | "full" | "cancelled" | "completed";
  createdAt: Timestamp;
  expiresAt: Timestamp; // ride date+time + 2h
}

export interface RideMember {
  uid: string;
  displayName: string;
  email: string;
  joinedAt: Timestamp;
}

export interface Message {
  id: string;
  uid: string;
  displayName: string;
  text: string;
  createdAt: Timestamp;
}

export type NotificationType =
  | "ride_join"
  | "ride_leave"
  | "ride_removed"
  | "ride_cancelled"
  | "ride_full"
  | "chat_message"
  | "ride_reminder";

export interface AppNotification {
  id: string;
  type: NotificationType;
  rideId: string | null;
  title: string;
  body: string;
  readAt: number | null;
  createdAt: number;
}
