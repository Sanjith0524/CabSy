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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-light text-brand text-[10px] font-bold uppercase tracking-wider mb-2">
            <Sparkles size={10} /> Fast Post
          </span>
          <h1 className="font-display font-extrabold text-3xl text-brand tracking-tight">
            Post a Ride Request
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Publish a route to match and share a taxi/cab with verified students.
          </p>
        </div>

        {/* Card Form */}
        <div className="card p-6 md:p-8 border border-gray-200/80 bg-white flex flex-col gap-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          {/* Pickup */}
          <div>
            <label className="label flex items-center gap-1.5">
              <MapPin size={13} className="text-brand" />
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
              <Flag size={13} className="text-accent" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label flex items-center gap-1.5">
                <Calendar size={13} className="text-gray-400" />
                Departure Date
              </label>
              <input
                type="date"
                className="input"
                value={form.date}
                min={format(new Date(), "yyyy-MM-dd")}
                onChange={(e) => set("date", e.target.value)}
              />
            </div>
            <div>
              <label className="label flex items-center gap-1.5">
                <Clock size={13} className="text-gray-400" />
                Approximate Time
              </label>
              <input
                type="time"
                className="input"
                value={form.time}
                onChange={(e) => set("time", e.target.value)}
              />
            </div>
          </div>

          {/* Seats Select */}
          <div>
            <label className="label flex items-center gap-1.5">
              <Users size={13} className="text-gray-400" />
              Total Seats (including you)
            </label>
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50/50">
                <button
                  type="button"
                  onClick={() => set("seatsTotal", Math.max(1, form.seatsTotal - 1))}
                  className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-white hover:text-gray-900 border-r border-gray-200 font-semibold text-lg transition-colors"
                >
                  −
                </button>
                <span className="w-12 text-center text-sm font-bold text-gray-800">
                  {form.seatsTotal}
                </span>
                <button
                  type="button"
                  onClick={() => set("seatsTotal", Math.min(4, form.seatsTotal + 1))}
                  className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-white hover:text-gray-900 border-l border-gray-200 font-semibold text-lg transition-colors"
                >
                  +
                </button>
              </div>
              <p className="text-xs text-gray-400 font-medium">Allows matching up to {form.seatsTotal} riders.</p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label flex items-center gap-1.5">
              <FileText size={13} className="text-gray-400" />
              Additional notes
              <span className="text-[10px] text-gray-300 font-normal lowercase tracking-normal">
                (Optional)
              </span>
            </label>
            <textarea
              className="input resize-none py-2.5"
              rows={3}
              placeholder="e.g. Flight leaves at 6PM, looking to book an Uber XL to share costs. Leaving on time."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              maxLength={300}
            />
            <div className="flex items-center justify-between mt-1 px-0.5">
              <span className="text-[10px] text-gray-300">Max 300 characters</span>
              <span className="text-[10px] font-semibold text-gray-400">
                {form.notes.length}/300
              </span>
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-3">
              <AlertCircle size={15} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700 leading-normal font-medium">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary w-full py-3"
          >
            {submitting ? "Publishing ride..." : "Publish ride request"}
          </button>

          <p className="text-[11px] text-center text-gray-400 leading-normal">
            By publishing, your request will be visible to students logged in on your verified campus domain. Coordinate payment and routing directly in the ride chat.
          </p>
        </div>
      </div>
    </ProtectedLayout>
  );
}
