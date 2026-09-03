"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getRide,
  subscribeToMembers,
  joinRide,
  leaveRide,
  cancelRide,
  removeMember,
  isMember,
} from "@/lib/api";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import { Ride, RideMember } from "@/types";
import {
  Calendar,
  Clock,
  Users,
  MessageCircle,
  AlertCircle,
  ArrowLeft,
  Trash2,
  UserMinus,
  Navigation,
  Info
} from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";

export default function RideDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [ride, setRide] = useState<Ride | null>(null);
  const [members, setMembers] = useState<RideMember[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [rosterRestricted, setRosterRestricted] = useState(false);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    getRide(id).then((r) => {
      setRide(r);
      setLoading(false);
    });
    const unsub = subscribeToMembers(id, (snap) => {
      setMembers(snap.members);
      setMemberCount(snap.count);
      setRosterRestricted(snap.restricted);
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    isMember(id, user.uid).then(setJoined);
  }, [user, id, members]);

  const isCreator = user?.uid === ride?.creatorUid;
  const seatsLeft = ride ? ride.seatsTotal - ride.seatsTaken : 0;

  const handleJoin = async () => {
    if (!user || !ride) return;
    setActionError("");
    setActionLoading(true);
    try {
      await joinRide(ride.id, {
        uid: user.uid,
        displayName: user.displayName ?? "Student",
        email: user.email ?? "",
      });
      setJoined(true);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to join.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!user || !ride) return;
    if (!confirm("Leave this ride? Your seat will open up for someone else.")) return;
    setActionError("");
    setActionLoading(true);
    try {
      await leaveRide(ride.id, user.uid);
      setJoined(false);
    } catch {
      setActionError("Failed to leave ride.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!ride || !confirm("Cancel this ride?")) return;
    await cancelRide(ride.id);
    router.push("/dashboard");
  };

  const handleRemove = async (uid: string) => {
    if (!ride || !confirm("Remove this member?")) return;
    await removeMember(ride.id, uid);
  };

  let dateLabel = ride?.date ?? "";
  try {
    if (ride?.date) dateLabel = format(parseISO(ride.date), "EEEE, MMM d, yyyy");
  } catch {}

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="max-w-5xl mx-auto flex flex-col gap-6">
          <div className="h-6 w-32 skeleton" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 h-96 skeleton" />
            <div className="h-60 skeleton" />
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  if (!ride) {
    return (
      <ProtectedLayout>
        <div className="card p-10 text-center max-w-md mx-auto">
          <p className="text-on-surface-variant font-medium">Ride request not found.</p>
          <Link href="/rides" className="text-primary text-[13px] font-semibold mt-4 inline-flex items-center gap-1.5 hover:underline">
            <ArrowLeft size={14} /> Back to rides
          </Link>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      {/* Back button */}
      <Link
        href="/rides"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-on-surface-variant hover:text-on-surface mb-6"
      >
        <ArrowLeft size={14} /> Back to rides
      </Link>

      {/* Header */}
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`pulse-dot absolute inline-flex h-full w-full rounded-full opacity-75 ${ride.status === "open" ? "bg-primary" : "bg-outline"}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${ride.status === "open" ? "bg-primary" : "bg-outline"}`}></span>
            </span>
            <span className="eyebrow text-primary">
              {ride.status === "open" ? "Open · looking for riders" : ride.status === "full" ? "Fully booked" : "Cancelled"}
            </span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-on-background">
            Heading to {ride.destination}
          </h1>

          <p className="text-on-surface-variant max-w-xl mt-2">
            {ride.pickup} → {ride.destination}
          </p>
        </div>
        {joined && (
          <Link
            href={`/rides/${ride.id}/chat`}
            className="btn-primary flex-shrink-0"
          >
            <MessageCircle size={15} /> Open group chat
          </Link>
        )}
      </header>

      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Main Details */}
        <div className="flex-1 w-full flex flex-col gap-5">
          {/* Main Card */}
          <div className="card p-6 md:p-8">

            {/* Header: Title / Status */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-surface-variant">
              <h2 className="font-display font-semibold text-xl text-on-surface">
                Ride details
              </h2>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[13px] font-semibold px-3 py-1 rounded-full ${
                    ride.status === "open"
                      ? "pill-success"
                      : ride.status === "full"
                      ? "bg-surface-container-high text-on-surface-variant"
                      : "bg-error-container text-on-error-container"
                  }`}
                >
                  {ride.status === "open"
                    ? `${seatsLeft} seat${seatsLeft !== 1 ? "s" : ""} left`
                    : ride.status === "full"
                    ? "Fully booked"
                    : "Cancelled"}
                </span>
                {isCreator && (
                  <span className="text-[13px] font-semibold bg-primary-container text-on-primary-container px-3 py-1 rounded-full">
                    Your post
                  </span>
                )}
              </div>
            </div>

            {/* Timeline connectors */}
            <div className="flex gap-4 mb-8">
              <div className="flex flex-col items-center justify-between py-1 relative">
                <div className="w-2.5 h-2.5 rounded-full bg-primary z-10" />
                <div className="w-0.5 absolute top-3.5 bottom-3.5 bg-surface-variant z-0" />
                <div className="w-2.5 h-2.5 rounded-full bg-outline z-10" />
              </div>
              <div className="flex-1 flex flex-col gap-6">
                <div>
                  <p className="text-xs text-on-surface-variant mb-0.5">Pickup</p>
                  <p className="text-[15px] font-semibold text-on-surface leading-tight">{ride.pickup}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant mb-0.5">Destination</p>
                  <p className="text-[15px] font-semibold text-on-surface leading-tight">{ride.destination}</p>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-surface-container-low p-4 rounded-2xl">

              {[
                { icon: Calendar, label: "Date", value: dateLabel },
                { icon: Clock, label: "Time", value: ride.time },
                { icon: Users, label: "Seats", value: `${ride.seatsTaken}/${ride.seatsTotal} filled` },
                { icon: Navigation, label: "Ride via", value: "Uber / Ola / Taxi" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex flex-col">
                  <span className="text-xs text-on-surface-variant flex items-center gap-1 mb-1">
                    <Icon size={12} />
                    {label}
                  </span>
                  <span className="text-[13px] font-semibold text-on-surface truncate">{value}</span>
                </div>
              ))}
            </div>

            {/* Notes */}
            {ride.notes && (
              <div className="mt-8 pt-6 border-t border-surface-variant">
                <h3 className="text-[13px] font-semibold text-on-surface-variant mb-2">Note from {ride.creatorName.split(" ")[0]}</h3>
                <p className="text-sm text-on-surface-variant bg-surface-container-low p-4 rounded-2xl leading-relaxed">
                  &ldquo;{ride.notes}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Safety card */}
          <div className="card p-5 flex items-start gap-3.5">
            <Info className="text-primary flex-shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-[15px] font-semibold text-on-surface">Before you go</h4>
              <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">
                Agree on the pickup time, split, and bag space in the group chat before departure. Book the cab together so everyone sees the fare.
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 flex flex-col gap-5">

          {/* Members Card */}
          <div className="card p-5">
            <h3 className="text-[15px] font-semibold text-on-surface mb-4">
              Riders ({rosterRestricted ? memberCount : members.length})
            </h3>

            {rosterRestricted && (
              <p className="text-[13px] text-on-surface-variant leading-relaxed">
                {memberCount === 1
                  ? "1 person is on this ride."
                  : `${memberCount} people are on this ride.`}{" "}
                Join to see who&apos;s going and open the group chat.
              </p>
            )}

            <div className="flex flex-col gap-1">
              {members.map((m) => (
                <div key={m.uid} className="flex items-center justify-between py-2.5 border-b border-surface-variant last:border-0 last:pb-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-[11px] font-bold text-on-surface-variant border border-surface-variant flex-shrink-0">
                      {m.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-on-surface truncate leading-tight">
                        {m.displayName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {m.uid === ride.creatorUid && (
                      <span className="text-[11px] font-semibold bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full">
                        Host
                      </span>
                    )}
                    {isCreator && m.uid !== user?.uid && (
                      <button
                        onClick={() => handleRemove(m.uid)}
                        className="text-error hover:bg-error-container p-1.5 rounded-full transition-colors"
                        title="Remove rider"
                      >
                        <UserMinus size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Panel */}
          {ride.status !== "cancelled" && (
            <div className="flex flex-col gap-3">
              {joined && (
                <Link
                  href={`/rides/${ride.id}/chat`}
                  className="btn-primary w-full py-3"
                >
                  <MessageCircle size={15} />
                  Open group chat
                </Link>
              )}

              {!isCreator && !joined && ride.status === "open" && (
                <button
                  onClick={handleJoin}
                  disabled={actionLoading}
                  className="btn-accent w-full py-3"
                >
                  {actionLoading ? "Joining…" : "Join this ride"}
                </button>
              )}

              {!isCreator && joined && (
                <button
                  onClick={handleLeave}
                  disabled={actionLoading}
                  className="btn-danger-outline w-full py-3"
                >
                  {actionLoading ? "Leaving…" : "Leave this ride"}
                </button>
              )}

              {isCreator && (
                <button
                  onClick={handleCancel}
                  className="btn-danger-outline w-full py-3"
                >
                  <Trash2 size={15} />
                  Cancel this ride
                </button>
              )}
            </div>
          )}

          {/* Error Notice */}
          {actionError && (
            <div className="flex items-start gap-2 bg-error-container border border-error/20 p-3.5 rounded-xl">
              <AlertCircle size={15} className="text-error mt-0.5 flex-shrink-0" />
              <p className="text-sm text-on-error-container leading-normal font-medium">{actionError}</p>
            </div>
          )}

        </div>
      </div>
    </ProtectedLayout>
  );
}

