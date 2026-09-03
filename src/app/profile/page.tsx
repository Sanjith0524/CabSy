"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { subscribeToRides } from "@/lib/api";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import { Ride } from "@/types";
import { LogOut, ShieldCheck, Mail, CheckCircle2, Sun, Moon, Bell } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
        checked ? "bg-primary" : "bg-surface-container-high"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-surface shadow-sm transition-transform ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

export default function ProfilePage() {
  const { user, signOut, updatePreferences } = useAuth();
  const { theme, setTheme } = useTheme();
  const [myRides, setMyRides] = useState<Ride[]>([]);
  const [pendingEmail, setPendingEmail] = useState<boolean | null>(null);
  const [pendingChat, setPendingChat] = useState<boolean | null>(null);

  const notifyEmail = (user?.notifyEmail ?? 1) === 1;
  const notifyChat = (user?.notifyChat ?? 1) === 1;

  useEffect(() => {
    const unsub = subscribeToRides((rides) => {
      setMyRides(rides.filter((r) => r.creatorUid === user?.uid));
    });
    return () => unsub();
  }, [user]);

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <ProtectedLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <span className="eyebrow text-primary mb-1.5">Your account</span>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-on-background">
            Profile
          </h1>
          <p className="text-on-surface-variant mt-2">
            Your verified student details and ride history.
          </p>
        </div>

        {/* Profile Card */}
        <div className="card p-6 mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {user?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt={user.displayName ?? ""}
              className="w-20 h-20 rounded-2xl border border-surface-variant object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-primary-container flex items-center justify-center text-2xl font-display font-bold text-on-primary-container flex-shrink-0">
              {initials}
            </div>
          )}

          <div className="text-center sm:text-left flex-1 min-w-0">
            <h2 className="font-display font-bold text-2xl text-on-surface leading-tight">
              {user?.displayName ?? "Student"}
            </h2>
            <p className="text-sm text-on-surface-variant flex items-center justify-center sm:justify-start gap-1.5 mt-1.5 truncate">
              <Mail size={14} className="text-primary flex-shrink-0" />
              {user?.email}
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card p-5">
            <span className="font-display font-bold text-3xl text-on-surface block leading-none">{myRides.length}</span>
            <span className="text-[13px] text-on-surface-variant block mt-2.5">Rides posted</span>
          </div>
          <div className="card p-5">
            <span className="font-display font-bold text-3xl text-primary block leading-none">
              {myRides.filter((r) => r.status === "open").length}
            </span>
            <span className="text-[13px] text-on-surface-variant block mt-2.5">Open requests</span>
          </div>
        </div>

        {/* Appearance */}
        <div className="card p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-[15px] font-semibold text-on-surface">Appearance</h4>
            <p className="text-sm text-on-surface-variant mt-0.5">How CabSy looks on this device.</p>
          </div>
          <div className="flex items-center rounded-full bg-surface-container-low p-1 flex-shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTheme("light")}
              aria-pressed={theme === "light"}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold transition-colors ${
                theme === "light" ? "bg-surface text-primary shadow-sm" : "text-on-surface-variant"
              }`}
            >
              <Sun size={14} /> Light
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              aria-pressed={theme === "dark"}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold transition-colors ${
                theme === "dark" ? "bg-surface text-primary shadow-sm" : "text-on-surface-variant"
              }`}
            >
              <Moon size={14} /> Dark
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="card p-5 mb-6">
          <h4 className="text-[15px] font-semibold text-on-surface flex items-center gap-2 mb-1">
            <Bell size={16} className="text-primary" /> Notifications
          </h4>
          <p className="text-sm text-on-surface-variant mb-4">
            In-app alerts always show in the bell. These control the extras.
          </p>

          <div className="flex items-center justify-between py-3 border-t border-surface-variant">
            <div className="min-w-0 pr-4">
              <p className="text-sm font-medium text-on-surface">Email alerts</p>
              <p className="text-[13px] text-on-surface-variant mt-0.5">
                When someone joins, a ride is cancelled, or you&apos;re removed.
              </p>
            </div>
            <Toggle
              checked={pendingEmail ?? notifyEmail}
              label="Email alerts"
              onChange={(v) => {
                setPendingEmail(v);
                updatePreferences({ notifyEmail: v }).finally(() => setPendingEmail(null));
              }}
            />
          </div>

          <div className="flex items-center justify-between py-3 border-t border-surface-variant">
            <div className="min-w-0 pr-4">
              <p className="text-sm font-medium text-on-surface">Ride chat activity</p>
              <p className="text-[13px] text-on-surface-variant mt-0.5">
                A bell alert when there are new messages in a ride you&apos;re in.
              </p>
            </div>
            <Toggle
              checked={pendingChat ?? notifyChat}
              label="Ride chat activity"
              onChange={(v) => {
                setPendingChat(v);
                updatePreferences({ notifyChat: v }).finally(() => setPendingChat(null));
              }}
            />
          </div>
        </div>

        {/* Privacy guidelines */}
        <div className="card p-6 mb-6">
          <h4 className="text-[15px] font-semibold text-on-surface flex items-center gap-2 mb-4">
            <ShieldCheck size={16} className="text-primary" /> Your privacy
          </h4>

          <ul className="text-sm text-on-surface-variant leading-relaxed space-y-3">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={14} className="text-primary mt-0.5 flex-shrink-0" />
              <span>Your full email stays hidden in listings — only your verified status shows.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={14} className="text-primary mt-0.5 flex-shrink-0" />
              <span>Rider lists are visible only to people in the same ride.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={14} className="text-primary mt-0.5 flex-shrink-0" />
              <span>Chat messages are deleted automatically after the travel date.</span>
            </li>
          </ul>
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="btn-danger-outline w-full py-4"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>

    </ProtectedLayout>
  );
}

