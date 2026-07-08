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
        <div className="mb-6">
          <h1 className="font-display font-extrabold text-3xl text-brand tracking-tight">
            Account Profile
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage your verified student passenger credentials and credentials logs.
          </p>
        </div>

        {/* Profile Card */}
        <div className="card p-6 border border-gray-200 bg-white mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          {user?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt={user.displayName ?? ""}
              className="w-16 h-16 rounded-full object-cover border-2 border-brand-light flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-brand-light flex items-center justify-center text-xl font-bold text-brand flex-shrink-0">
              {initials}
            </div>
          )}
          
          <div className="text-center sm:text-left flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-800 leading-tight">
              {user?.displayName ?? "Student"}
            </h2>
            <p className="text-xs text-gray-400 flex items-center justify-center sm:justify-start gap-1.5 mt-1.5 font-medium truncate">
              <Mail size={13} className="text-gray-400" />
              {user?.email}
            </p>
            
            <div className="mt-3.5 flex justify-center sm:justify-start">
              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                <ShieldCheck size={11} />
                @{domain} verified student
              </span>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card p-5 border border-gray-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
            <span className="text-3xl font-extrabold text-brand block leading-none">{myRides.length}</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mt-2">Total Posted Requests</span>
          </div>
          <div className="card p-5 border border-gray-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
            <span className="text-3xl font-extrabold text-accent block leading-none">
              {myRides.filter((r) => r.status === "open").length}
            </span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mt-2">Active Ride Requests</span>
          </div>
        </div>

        {/* Privacy guidelines */}
        <div className="card p-5 border border-gray-250 bg-white mb-6 border-l-4 border-l-brand">
          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-widest flex items-center gap-1.5 mb-3">
            <ShieldCheck size={14} className="text-brand" /> Privacy Guidelines
          </h4>
          <ul className="text-xs text-gray-500 leading-relaxed space-y-2 font-medium">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>Full email addresses are hidden from discovery listings to prevent spam.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>Rider lists are strictly viewable by members inside the same route.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>Chat history deletes automatically when a travel request date passes.</span>
            </li>
          </ul>
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="btn-danger-outline w-full py-3 flex items-center justify-center gap-2 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
        >
          <LogOut size={15} />
          Sign out account
        </button>
      </div>
    </ProtectedLayout>
  );
}
