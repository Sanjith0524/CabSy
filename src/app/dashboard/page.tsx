"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { subscribeToRides } from "@/lib/api";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import RideCard from "@/components/rides/RideCard";
import { Ride } from "@/types";
import { Search, MapPin, Calendar, Compass, TrendingUp } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  // Search local states
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const unsub = subscribeToRides((all) => {
      setRides(all);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const myRides = rides.filter((r) => r.creatorUid === user?.uid);
  const otherRides = rides.filter((r) => r.creatorUid !== user?.uid).slice(0, 5);

  const upcomingRide = myRides[0];
  const activeRides = myRides.slice(1);

  const domain = user?.email?.split("@")[1] ?? "";

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (from.trim()) params.set("from", from.trim());
    if (to.trim()) params.set("to", to.trim());
    if (date) params.set("date", date);
    router.push(`/rides?${params.toString()}`);
  };

  return (
    <ProtectedLayout>
      {/* Top Header Section */}
      <header className="mb-7">
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-on-background">
          Hey, {user?.displayName?.split(" ")[0] ?? "there"}
        </h1>
        <p className="text-on-surface-variant mt-2">
          {myRides.filter((r) => r.status === "open").length > 0
            ? "You've got an open request looking for riders."
            : "Find a ride heading your way, or post your own."}
        </p>
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <h3 className="text-sm font-medium text-on-surface-variant mb-1.5">Routes in your network</h3>
          <div className="font-display font-bold text-3xl text-on-surface">{rides.length}</div>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-on-surface-variant">
            <TrendingUp size={13} />
            <span>Updated just now</span>
          </div>
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-medium text-on-surface-variant mb-1.5">Your ride requests</h3>
          <div className="font-display font-bold text-3xl text-primary">
            {String(myRides.length).padStart(2, "0")}
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-on-surface-variant">
            <span>{myRides.filter(r => r.status === "open").length} still looking for riders</span>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="flex flex-col gap-6">

          {/* Find Your Next Ride */}
          <div className="card p-5">
            <h2 className="text-base font-semibold text-on-surface mb-4 flex items-center gap-2">
              <Search size={16} className="text-primary" />
              Find your next ride
            </h2>

            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1 w-full flex items-center gap-2.5 bg-surface-container-low rounded-xl px-3.5 py-3 border border-transparent focus-within:border-primary focus-within:bg-surface transition-colors">
                <MapPin size={16} className="text-outline flex-shrink-0" />
                <input
                  className="bg-transparent text-[15px] w-full focus:outline-none placeholder-outline text-on-surface"
                  placeholder="Pickup"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>

              <div className="flex-1 w-full flex items-center gap-2.5 bg-surface-container-low rounded-xl px-3.5 py-3 border border-transparent focus-within:border-primary focus-within:bg-surface transition-colors">
                <Compass size={16} className="text-outline flex-shrink-0" />
                <input
                  className="bg-transparent text-[15px] w-full focus:outline-none placeholder-outline text-on-surface"
                  placeholder="Destination"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>

              <div className="w-full md:w-44 flex items-center gap-2.5 bg-surface-container-low rounded-xl px-3.5 py-3 border border-transparent focus-within:border-primary focus-within:bg-surface transition-colors">
                <Calendar size={16} className="text-outline flex-shrink-0" />
                <input
                  type="date"
                  className="bg-transparent text-[15px] w-full focus:outline-none placeholder-outline text-on-surface"
                  min={format(new Date(), "yyyy-MM-dd")}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <button
                onClick={handleSearch}
                className="btn-primary w-full md:w-auto px-6 py-3 flex-shrink-0"
              >
                <Search size={15} /> Search
              </button>
            </div>
          </div>

          {/* Section: Your Upcoming Ride */}
          <section>
            <h3 className="text-base font-semibold text-on-surface mb-3">
              Your upcoming ride
            </h3>

            {!upcomingRide ? (
              <div className="card p-8 border-dashed flex flex-col items-center justify-center text-center">
                <div className="w-11 h-11 rounded-2xl bg-primary-container flex items-center justify-center mb-4">
                  <Calendar size={18} className="text-on-primary-container" />
                </div>
                <p className="text-[15px] font-semibold text-on-surface">No ride requests yet</p>
                <p className="text-sm text-on-surface-variant mt-1.5 max-w-[300px]">
                  Post a request or search for a ride heading your way.
                </p>
                <Link href="/rides/create" className="btn-outline mt-5">
                  Post a request
                </Link>
              </div>
            ) : (
              <RideCard ride={upcomingRide} />
            )}
          </section>

          {/* Section: Rides you can join */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-on-surface">
                Rides you can join
              </h3>
              {otherRides.length > 0 && (
                <Link href="/rides" className="text-[13px] font-semibold text-primary hover:underline">
                  View all rides →
                </Link>
              )}
            </div>

            {loading ? (
              <div className="flex flex-col gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-32 skeleton" />
                ))}
              </div>
            ) : otherRides.length === 0 ? (
              <div className="card p-10 flex flex-col items-center justify-center text-center border-dashed">
                <div className="w-11 h-11 rounded-2xl bg-surface-container-low flex items-center justify-center mb-4">
                  <Compass size={18} className="text-on-surface-variant" />
                </div>
                <p className="text-[15px] font-semibold text-on-surface">No matching rides right now</p>
                <p className="text-sm text-on-surface-variant mt-1.5 max-w-[300px]">
                  Be the first to post a ride for your campus.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {otherRides.map((ride) => (
                  <RideCard key={ride.id} ride={ride} />
                ))}
              </div>
            )}
          </section>

          {/* Section: My Active Ride requests */}
          {activeRides.length > 0 && (
            <section>
              <h3 className="text-base font-semibold text-on-surface mb-3">
                Your other active requests
              </h3>
              <div className="flex flex-col gap-4">
                {activeRides.map((ride) => (
                  <RideCard key={ride.id} ride={ride} />
                ))}
              </div>
            </section>
          )}

      </div>

    </ProtectedLayout>
  );
}

