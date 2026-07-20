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
} from "@/lib/firestore";
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
  ShieldCheck,
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
    const unsub = subscribeToMembers(id, setMembers);
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
          <Link href="/rides" className="text-primary text-[10px] font-mono uppercase tracking-widest mt-4 inline-flex items-center gap-1.5 hover:underline">
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
        className="inline-flex items-center gap-1.5 font-mono text-[9px] font-bold text-on-surface-variant hover:text-white uppercase tracking-wider mb-6"
      >
        <ArrowLeft size={12} /> Back to discover
      </Link>

      {/* Header */}
      <header className="mb-stack-lg flex flex-col md:flex-row md:items-end justify-between gap-stack-md">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`pulse-dot absolute inline-flex h-full w-full rounded-full opacity-75 ${ride.status === "open" ? "bg-primary" : "bg-[#99907c]"}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${ride.status === "open" ? "bg-primary" : "bg-[#99907c]"}`}></span>
            </span>
            <span className="font-mono text-[10px] text-primary tracking-[0.2em] uppercase">
              Live Ride Status: {ride.status.toUpperCase()}
            </span>
          </div>
          <h1 className="font-sans font-bold text-4xl uppercase text-on-background">
            Heading to {ride.destination}
          </h1>

          <p className="font-sans text-xs text-on-surface-variant max-w-xl mt-2">
            Route coordinates: {ride.pickup} to {ride.destination}.
          </p>
        </div>
        {joined && (
          <Link
            href={`/rides/${ride.id}/chat`}
            className="bg-primary text-on-primary px-8 py-3.5 font-mono text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-[#ffe088] transition-all"
          >
            <MessageCircle size={14} /> Join Group Chat
          </Link>
        )}
      </header>

      <div className="flex flex-col lg:flex-row items-start gap-8">
        {/* Main Details (Left 2/3) */}
        <div className="flex-1 w-full flex flex-col gap-6">
          {/* Main Card */}
          <div className="card p-6 md:p-8">
            
            {/* Header: Title / Status */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-surface-variant">
              <div>
                <span className="font-mono text-[9px] text-[#99907c] uppercase tracking-widest block mb-1">Ride Details</span>
                <h2 className="font-sans font-bold text-2xl uppercase text-on-surface">
                  Information Summary
                </h2>
              </div>


              <div className="flex items-center gap-2">
                <span
                  className={`font-mono text-[10px] uppercase tracking-wider px-3 py-1 border ${
                    ride.status === "open"
                      ? "bg-emerald-950/20 text-emerald-400 border-emerald-500/20"
                      : ride.status === "full"
                      ? "bg-surface-container-high text-on-surface-variant border-surface-variant"
                      : "bg-[#93000a]/20 text-[#ffb4ab] border-[#93000a]/40"
                  }`}
                >
                  {ride.status === "open"
                    ? `${seatsLeft} seat${seatsLeft !== 1 ? "s" : ""} left`
                    : ride.status === "full"
                    ? "Fully booked"
                    : "Cancelled"}
                </span>
                {isCreator && (
                  <span className="font-mono text-[10px] bg-primary-container text-white border border-[#ffe088]/20 px-3 py-1 uppercase tracking-wider font-semibold">
                    My post
                  </span>
                )}
              </div>
            </div>

            {/* Timeline connectors */}
            <div className="flex gap-4 mb-8">
              <div className="flex flex-col items-center justify-between py-1 relative">
                <div className="w-2 h-2 rounded-full bg-primary z-10" />
                <div className="w-px absolute top-3 bottom-3 bg-surface-variant z-0" />
                <div className="w-2 h-2 rounded-full bg-secondary z-10" />
              </div>
              <div className="flex-1 flex flex-col gap-6">
                <div>
                  <p className="font-mono text-[9px] text-[#99907c] uppercase tracking-wider mb-0.5">Pickup Location</p>
                  <p className="text-sm font-semibold text-on-surface leading-tight">{ride.pickup}</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] text-[#99907c] uppercase tracking-wider mb-0.5">Destination</p>
                  <p className="text-sm font-semibold text-on-surface leading-tight">{ride.destination}</p>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-surface-container-low p-4 border border-surface-variant">

              {[
                { icon: Calendar, label: "Date", value: dateLabel },
                { icon: Clock, label: "Time", value: ride.time },
                { icon: Users, label: "Capacity", value: `${ride.seatsTaken}/${ride.seatsTotal} filled` },
                { icon: Navigation, label: "Platform", value: "Uber / Ola / Taxi" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex flex-col">
                  <span className="font-mono text-[9px] text-[#99907c] uppercase tracking-wider flex items-center gap-1 mb-1">
                    <Icon size={11} className="text-[#99907c]" />
                    {label}
                  </span>
                  <span className="font-mono text-xs font-bold text-on-surface truncate">{value}</span>
                </div>
              ))}
            </div>

            {/* Notes */}
            {ride.notes && (
              <div className="mt-8 pt-6 border-t border-surface-variant">
                <h3 className="font-mono text-[9px] text-[#99907c] uppercase tracking-widest mb-2">Note from {ride.creatorName.split(" ")[0]}</h3>
                <p className="text-xs text-on-surface-variant bg-surface-container-low p-4 border border-surface-variant leading-relaxed font-normal italic">
                  &ldquo;{ride.notes}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Safety card */}
          <div className="card p-5 flex items-start gap-3.5">
            <Info className="text-primary flex-shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="font-mono text-[10px] text-on-surface uppercase tracking-widest">Safety & Coordination</h4>
              <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed font-medium">
                Coordinate and split the payment offline. Agree on pickup times and bag capacity prior to departure. Use the coordinate chat room inside the group for quick responses.
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar Container (Right 1/3) */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
          
          {/* Members Card */}
          <div className="card p-5">
            <h3 className="font-mono text-[10px] text-primary tracking-widest uppercase mb-4">Riders List ({members.length})</h3>
            
            <div className="flex flex-col gap-3">
              {members.map((m) => (
                <div key={m.uid} className="flex items-center justify-between py-2 border-b border-surface-variant/30 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 bg-surface-container-low flex items-center justify-center text-[10px] font-mono font-bold text-primary border border-surface-variant flex-shrink-0">
                      {m.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-on-surface truncate leading-tight font-medium">
                        {m.displayName}
                      </p>

                      <span className="inline-flex items-center gap-0.5 text-[8px] font-mono font-bold text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 px-1 py-0.5 mt-1 leading-none">
                        <ShieldCheck size={9} />
                        STUDENT
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {m.uid === ride.creatorUid && (
                      <span className="text-[8px] bg-primary-container text-white px-1.5 py-0.5 font-mono font-bold uppercase tracking-wide">
                        Creator
                      </span>
                    )}
                    {isCreator && m.uid !== user?.uid && (
                      <button
                        onClick={() => handleRemove(m.uid)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-950/20 p-1.5 transition-colors"
                        title="Remove member"
                      >
                        <UserMinus size={14} />
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
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2 font-mono text-[10px]"
                >
                  <MessageCircle size={14} />
                  Open Group Chat
                </Link>
              )}

              {!isCreator && !joined && ride.status === "open" && (
                <button
                  onClick={handleJoin}
                  disabled={actionLoading}
                  className="btn-accent w-full py-3 font-mono text-[10px]"
                >
                  {actionLoading ? "Joining..." : "Join group"}
                </button>
              )}

              {!isCreator && joined && (
                <button
                  onClick={handleLeave}
                  disabled={actionLoading}
                  className="btn-danger-outline w-full py-3 font-mono text-[10px]"
                >
                  {actionLoading ? "Leaving..." : "Leave group"}
                </button>
              )}

              {isCreator && (
                <button
                  onClick={handleCancel}
                  className="btn-danger-outline w-full py-3 flex items-center justify-center gap-2 font-mono text-[10px]"
                >
                  <Trash2 size={14} />
                  Cancel Ride Request
                </button>
              )}
            </div>
          )}

          {/* Error Notice */}
          {actionError && (
            <div className="flex items-start gap-2 bg-[#93000a]/20 border border-[#93000a] p-3">
              <AlertCircle size={15} className="text-[#ffb4ab] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[#ffb4ab] leading-normal font-semibold">{actionError}</p>
            </div>
          )}

        </div>
      </div>
    </ProtectedLayout>
  );
}

