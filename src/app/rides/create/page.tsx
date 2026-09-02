"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createRide } from "@/lib/firestore";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import { MapPin, Flag, Calendar, Clock, Users, FileText, AlertCircle } from "lucide-react";
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
        <div className="mb-6">
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-on-background">
            Post a ride request
          </h1>
          <p className="text-on-surface-variant mt-2">
            Share a cab with verified students heading the same way.
          </p>
        </div>

        {/* Card Form */}
        <div className="card p-6 md:p-8 flex flex-col gap-7">
          {/* Pickup */}
          <div>
            <label className="label flex items-center gap-1.5">
              <MapPin size={14} className="text-primary" />
              Pickup location
            </label>
            <input
              className="input"
              placeholder="e.g. VIT Main Gate, Hostel Block 3"
              value={form.pickup}
              onChange={(e) => set("pickup", e.target.value)}
            />
          </div>

          {/* Destination */}
          <div>
            <label className="label flex items-center gap-1.5">
              <Flag size={14} className="text-primary" />
              Destination
            </label>
            <input
              className="input"
              placeholder="e.g. Chennai Airport T1, Katpadi Junction"
              value={form.destination}
              onChange={(e) => set("destination", e.target.value)}
            />
          </div>

          {/* Date & Time Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="label flex items-center gap-1.5">
                <Calendar size={14} className="text-primary" />
                Departure date
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
                <Clock size={14} className="text-primary" />
                Approximate time
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
              <Users size={14} className="text-primary" />
              Total seats (including you)
            </label>
            <div className="flex items-center gap-5 mt-1">
              <div className="flex items-center rounded-full bg-surface-container-low p-1">
                <button
                  type="button"
                  onClick={() => set("seatsTotal", Math.max(1, form.seatsTotal - 1))}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface hover:text-on-surface font-semibold text-lg transition-colors focus:outline-none"
                >
                  −
                </button>
                <span className="w-10 text-center text-[15px] font-mono font-semibold text-on-surface tabular-nums">
                  {form.seatsTotal}
                </span>
                <button
                  type="button"
                  onClick={() => set("seatsTotal", Math.min(4, form.seatsTotal + 1))}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface hover:text-on-surface font-semibold text-lg transition-colors focus:outline-none"
                >
                  +
                </button>
              </div>

              <p className="text-sm text-on-surface-variant">Room for up to {form.seatsTotal} riders.</p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label flex items-center gap-1.5">
              <FileText size={14} className="text-primary" />
              Additional notes
              <span className="text-xs text-on-surface-variant font-normal ml-1">
                (optional)
              </span>
            </label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="e.g. Flight at 6 PM, planning to book an Uber XL and split the fare. Leaving on time."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              maxLength={300}
            />
            <div className="flex items-center justify-between mt-2 px-0.5 text-xs text-on-surface-variant">
              <span>Max 300 characters</span>
              <span className="tabular-nums">{form.notes.length}/300</span>
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="flex items-start gap-2 bg-error-container border border-error/20 p-3.5 rounded-xl">
              <AlertCircle size={15} className="text-error mt-0.5 flex-shrink-0" />
              <p className="text-sm text-on-error-container leading-normal font-medium">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary w-full py-4"
          >
            {submitting ? "Publishing…" : "Publish ride request"}
          </button>

          <p className="text-xs text-center text-on-surface-variant leading-relaxed">
            Your request is visible to students on your verified campus domain. Coordinate payment and pickup in the ride chat.
          </p>
        </div>

      </div>
    </ProtectedLayout>
  );
}

