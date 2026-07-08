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
          <p className="text-gray-400 font-medium">Ride request not found.</p>
          <Link href="/rides" className="text-brand text-xs font-semibold mt-4 inline-flex items-center gap-1.5 hover:underline">
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
        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-700 uppercase tracking-wider mb-6"
      >
        <ArrowLeft size={14} /> Back to discover
      </Link>

      <div className="flex flex-col lg:flex-row items-start gap-8">
        {/* Main Details (Left 2/3) */}
        <div className="flex-1 w-full flex flex-col gap-6">
          {/* Main Card */}
          <div className="card p-6 md:p-8 border border-gray-200/80 bg-white">
            
            {/* Header: Title / Status */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-100">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Ride Details</span>
                <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
                  Heading to {ride.destination}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    ride.status === "open"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : ride.status === "full"
                      ? "bg-gray-50 text-gray-400 border-gray-200"
                      : "bg-red-50 text-red-600 border-red-100"
                  }`}
                >
                  {ride.status === "open"
                    ? `${seatsLeft} seat${seatsLeft !== 1 ? "s" : ""} left`
                    : ride.status === "full"
                    ? "Fully booked"
                    : "Cancelled"}
                </span>
                {isCreator && (
                  <span className="text-xs bg-brand-light text-brand border border-brand/10 px-2.5 py-1 rounded-full font-semibold">
                    My post
                  </span>
                )}
              </div>
            </div>

            {/* Timeline connectors */}
            <div className="flex gap-4 mb-8">
              <div className="flex flex-col items-center justify-between py-1 relative">
                <div className="w-3 h-3 rounded-full border-2 border-brand bg-white z-10" />
                <div className="w-0.5 absolute top-3.5 bottom-3.5 bg-gray-250 z-0" />
                <div className="w-3 h-3 rounded-full border-2 border-accent bg-white z-10" />
              </div>
              <div className="flex-1 flex flex-col gap-4">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Pickup Location</p>
                  <p className="text-sm font-semibold text-gray-800 leading-tight">{ride.pickup}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Destination</p>
                  <p className="text-sm font-semibold text-gray-800 leading-tight">{ride.destination}</p>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-200/40">
              {[
                { icon: Calendar, label: "Date", value: dateLabel },
                { icon: Clock, label: "Time", value: ride.time },
                { icon: Users, label: "Capacity", value: `${ride.seatsTaken}/${ride.seatsTotal} filled` },
                { icon: Navigation, label: "Platform", value: "Uber / Ola / Taxi" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex flex-col">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1 mb-1">
                    <Icon size={12} className="text-gray-400" />
                    {label}
                  </span>
                  <span className="text-xs font-bold text-gray-700 truncate">{value}</span>
                </div>
              ))}
            </div>

            {/* Notes */}
            {ride.notes && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Note from {ride.creatorName.split(" ")[0]}</h3>
                <p className="text-sm text-gray-600 bg-gray-50/50 p-4 rounded-lg border border-gray-200/40 leading-relaxed font-normal italic">
                  &ldquo;{ride.notes}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Safety card */}
          <div className="card p-5 border border-gray-200/80 bg-white flex items-start gap-3.5">
            <Info className="text-brand flex-shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-sm font-bold text-gray-800">Safety & Coordination</h4>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Coordinate and split the payment using cash/cards offline. Make sure to agree on timing and bag space prior to departure. Use the coordinate chat room inside the group for quick responses.
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar Container (Right 1/3) */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
          
          {/* Members Card */}
          <div className="card p-5 border border-gray-200/80 bg-white">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Riders List ({members.length})</h3>
            
            <div className="flex flex-col gap-3">
              {members.map((m) => (
                <div key={m.uid} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-brand-light flex items-center justify-center text-[10px] font-bold text-brand flex-shrink-0">
                      {m.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate leading-tight">
                        {m.displayName}
                      </p>
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 mt-1 leading-none">
                        <ShieldCheck size={9} />
                        @{m.email.split("@")[1]}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {m.uid === ride.creatorUid && (
                      <span className="text-[9px] bg-brand-light text-brand px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                        Creator
                      </span>
                    )}
                    {isCreator && m.uid !== user?.uid && (
                      <button
                        onClick={() => handleRemove(m.uid)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
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
                  className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                >
                  <MessageCircle size={15} />
                  Open Group Chat
                </Link>
              )}

              {!isCreator && !joined && ride.status === "open" && (
                <button
                  onClick={handleJoin}
                  disabled={actionLoading}
                  className="btn-accent w-full py-2.5 text-sm"
                >
                  {actionLoading ? "Joining group..." : "Join group"}
                </button>
              )}

              {!isCreator && joined && (
                <button
                  onClick={handleLeave}
                  disabled={actionLoading}
                  className="btn-danger-outline w-full py-2.5 text-sm"
                >
                  {actionLoading ? "Leaving group..." : "Leave group"}
                </button>
              )}

              {isCreator && (
                <button
                  onClick={handleCancel}
                  className="btn-danger-outline w-full py-2.5 flex items-center justify-center gap-2 text-sm"
                >
                  <Trash2 size={14} />
                  Cancel Ride Request
                </button>
              )}
            </div>
          )}

          {/* Error Notice */}
          {actionError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-3">
              <AlertCircle size={15} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700 leading-normal font-medium">{actionError}</p>
            </div>
          )}

        </div>
      </div>
    </ProtectedLayout>
  );
}
