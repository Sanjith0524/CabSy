"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { subscribeToRides } from "@/lib/firestore";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import { Ride } from "@/types";
import { LogOut, ShieldCheck, Mail, CheckCircle2 } from "lucide-react";

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const [myRides, setMyRides] = useState<Ride[]>([]);

  useEffect(() => {
    const unsub = subscribeToRides((rides) => {
      setMyRides(rides.filter((r) => r.creatorUid === user?.uid));
    });
    return () => unsub();
  }, [user]);

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const domain = user?.email?.split("@")[1] ?? "";

  return (
    <ProtectedLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <span className="font-mono text-[10px] text-primary tracking-[0.2em] uppercase block mb-1">
            Access Credentials
          </span>
          <h1 className="font-sans font-bold text-4xl uppercase text-on-background">
            Account Profile
          </h1>

          <p className="font-sans text-xs text-on-surface-variant mt-2">
            Manage your verified student passenger credentials and ride logs.
          </p>
        </div>

        {/* Profile Card */}
        <div className="card p-6 mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {user?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt={user.displayName ?? ""}
              className="w-20 h-20 border-2 border-primary object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 bg-surface-container-low flex items-center justify-center text-2xl font-mono font-bold text-primary border border-surface-variant flex-shrink-0">
              {initials}
            </div>
          )}
          
          <div className="text-center sm:text-left flex-1 min-w-0">
            <h2 className="font-sans font-bold text-2xl uppercase text-on-surface leading-tight">
              {user?.displayName ?? "Student"}
            </h2>
            <p className="font-mono text-xs text-on-surface-variant flex items-center justify-center sm:justify-start gap-1.5 mt-2 font-medium truncate">
              <Mail size={13} className="text-primary" />
              {user?.email}
            </p>
            
            <div className="mt-4 flex justify-center sm:justify-start">
              <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 px-2.5 py-0.5 uppercase tracking-wider">
                <ShieldCheck size={11} />
                @{domain} verified student
              </span>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="card p-5">
            <span className="font-sans font-bold text-4xl text-primary block leading-none">{myRides.length}</span>
            <span className="font-mono text-[9px] text-[#99907c] font-bold uppercase tracking-wider block mt-3">Total Posted Requests</span>
          </div>
          <div className="card p-5">
            <span className="font-sans font-bold text-4xl text-[#ffe088] block leading-none">
              {myRides.filter((r) => r.status === "open").length}
            </span>
            <span className="font-mono text-[9px] text-[#99907c] font-bold uppercase tracking-wider block mt-3">Active Ride Requests</span>
          </div>
        </div>


        {/* Privacy guidelines */}
        <div className="card p-6 mb-8 border-l-4 border-l-primary">
          <h4 className="font-mono text-[10px] text-primary uppercase tracking-widest flex items-center gap-1.5 mb-4">
            <ShieldCheck size={14} className="text-primary" /> Privacy Guidelines
          </h4>

          <ul className="text-xs text-on-surface-variant leading-relaxed space-y-3 font-medium">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>Full email credentials remain concealed in listings to verify student status securely.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>Rider lists are strictly viewable by members inside the same route.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>Coordinated message logs are automatically deleted after departure dates.</span>
            </li>
          </ul>
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="btn-danger-outline w-full py-4 font-mono text-[10px] uppercase tracking-widest"
        >
          <LogOut size={13} />
          Sign out account
        </button>
      </div>

    </ProtectedLayout>
  );
}

