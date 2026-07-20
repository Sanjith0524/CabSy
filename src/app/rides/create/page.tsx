"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createRide } from "@/lib/firestore";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import { MapPin, Flag, Calendar, Clock, Users, FileText, AlertCircle, Sparkles } from "lucide-react";
import { format } from "date-fns";

export default function CreateRidePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    pickup: "",
    destination: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "",
    seatsTotal: 2,
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key: string, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!user) return;
    setError("");

    if (!form.pickup.trim() || !form.destination.trim()) {
      setError("Pickup and destination are required.");
      return;
    }
    if (!form.date || !form.time) {
      setError("Date and time are required.");
      return;
    }

    setSubmitting(true);
    try {
      const rideId = await createRide({
        creatorUid: user.uid,
        creatorName: user.displayName ?? "Student",
        creatorEmail: user.email ?? "",
        pickup: form.pickup.trim(),
        destination: form.destination.trim(),
        date: form.date,
        time: form.time,
        seatsTotal: form.seatsTotal,
        notes: form.notes.trim(),
      });
      router.push(`/rides/${rideId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create ride.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#d4af37]/15 border border-[#d4af37]/35 text-[10px] font-mono font-bold tracking-widest text-primary uppercase mb-3 animate-pulse">
            <Sparkles size={11} className="text-primary" /> Fast Post
          </span>
          <h1 className="font-sans font-bold text-4xl uppercase text-on-background">
            Post a Ride Request
          </h1>

          <p className="font-sans text-xs text-on-surface-variant mt-2">
            Publish a route to match and share a taxi/cab with verified students.
          </p>

        </div>

        {/* Card Form */}
        <div className="card p-6 md:p-8 flex flex-col gap-8">
          {/* Pickup */}
          <div>
            <label className="label flex items-center gap-1.5">
              <MapPin size={13} className="text-primary" />
              Pickup Location
            </label>
            <input
              className="input"
              placeholder="e.g. Campus Main Gate, Hostel Block 3"
              value={form.pickup}
              onChange={(e) => set("pickup", e.target.value)}
            />
          </div>

          {/* Destination */}
          <div>
            <label className="label flex items-center gap-1.5">
              <Flag size={13} className="text-primary" />
              Destination
            </label>
            <input
              className="input"
              placeholder="e.g. Airport Terminal 1, Central Railway Station"
              value={form.destination}
              onChange={(e) => set("destination", e.target.value)}
            />
          </div>

          {/* Date & Time Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <label className="label flex items-center gap-1.5">
                <Calendar size={13} className="text-primary" />
                Departure Date
              </label>
              <input
                type="date"
                className="input invert dark:invert-0"
                value={form.date}
                min={format(new Date(), "yyyy-MM-dd")}
                onChange={(e) => set("date", e.target.value)}
              />
            </div>
            <div>
              <label className="label flex items-center gap-1.5">
                <Clock size={13} className="text-primary" />
                Approximate Time
              </label>
              <input
                type="time"
                className="input invert dark:invert-0"
                value={form.time}
                onChange={(e) => set("time", e.target.value)}
              />
            </div>
          </div>

          {/* Seats Select */}
          <div>
            <label className="label flex items-center gap-1.5">
              <Users size={13} className="text-primary" />
              Total Seats (including you)
            </label>
            <div className="flex items-center gap-6 mt-2">
              <div className="flex items-center border border-surface-variant bg-surface-container-low">
                <button
                  type="button"
                  onClick={() => set("seatsTotal", Math.max(1, form.seatsTotal - 1))}
                  className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:bg-white/5 hover:text-on-surface border-r border-surface-variant font-semibold text-lg transition-colors focus:outline-none"
                >
                  −
                </button>
                <span className="w-12 text-center text-sm font-mono font-bold text-on-surface">
                  {form.seatsTotal}
                </span>
                <button
                  type="button"
                  onClick={() => set("seatsTotal", Math.min(4, form.seatsTotal + 1))}
                  className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:bg-white/5 hover:text-on-surface border-l border-surface-variant font-semibold text-lg transition-colors focus:outline-none"
                >
                  +
                </button>
              </div>

              <p className="text-xs text-on-surface-variant font-medium">Allows matching up to {form.seatsTotal} riders.</p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label flex items-center gap-1.5">
              <FileText size={13} className="text-[#ffe088]" />
              Additional notes
              <span className="text-[10px] text-on-surface-variant font-normal lowercase tracking-normal ml-1">
                (optional)
              </span>
            </label>
            <textarea
              className="input resize-none py-2"
              rows={3}
              placeholder="e.g. Flight leaves at 6PM, looking to book an Uber XL to share costs. Leaving on time."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              maxLength={300}
            />
            <div className="flex items-center justify-between mt-2 px-0.5 font-mono text-[9px] text-[#99907c]">
              <span>Max 300 characters</span>
              <span>
                {form.notes.length}/300
              </span>
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="flex items-start gap-2 bg-[#93000a]/20 border border-[#93000a] p-3">
              <AlertCircle size={15} className="text-[#ffb4ab] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[#ffb4ab] leading-normal font-semibold">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary w-full py-4 font-mono text-[10px] font-bold uppercase tracking-widest"
          >
            {submitting ? "Publishing ride..." : "Publish ride request"}
          </button>

          <p className="font-sans text-[10px] text-center text-on-surface-variant leading-relaxed">
            By publishing, your request will be visible to students logged in on your verified campus domain. Coordinate payment and routing directly in the ride chat.
          </p>
        </div>

      </div>
    </ProtectedLayout>
  );
}

