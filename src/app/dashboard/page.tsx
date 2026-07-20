"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { subscribeToRides } from "@/lib/firestore";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import RideCard from "@/components/rides/RideCard";
import { Ride } from "@/types";
import { Plus, Search, MapPin, Calendar, Compass, ShieldAlert, ShieldCheck, HelpCircle, TrendingUp } from "lucide-react";
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
      <header className="mb-4">
        <h1 className="font-sans font-bold text-4xl uppercase text-on-background">
          yo, {user?.displayName}
        </h1>
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-gutter mb-stack-md">
        <div className="card p-6 relative overflow-hidden group">
          <h3 className="font-mono text-[10px] text-on-surface-variant tracking-wider uppercase mb-1">TOTAL NETWORK ROUTES</h3>
          <div className="font-sans font-bold text-3xl text-primary">{rides.length}</div>
          <div className="flex items-center gap-1 mt-4 font-mono text-[10px] text-secondary">
            <TrendingUp size={12} />
            <span>UPDATED JUST NOW</span>
          </div>
        </div>
        <div className="card p-6 relative overflow-hidden group border-l-4 border-l-primary">
          <h3 className="font-mono text-[10px] text-on-surface-variant tracking-wider uppercase mb-1">MY RIDE REQUESTS</h3>
          <div className="font-sans font-bold text-3xl text-on-surface">
            {String(myRides.length).padStart(2, "0")}
          </div>

          <div className="flex items-center gap-1 mt-4 font-mono text-[10px] text-primary">
            <span>{myRides.filter(r => r.status === "open").length} ACTIVE REQUESTS</span>
          </div>
        </div>
      </section>



      {/* Main Content Layout */}
      <div className="flex flex-col lg:flex-row items-start gap-8">
        
        {/* Main Content Area (Left 2/3) */}
        <div className="flex-1 w-full flex flex-col gap-8">
          
          {/* Find Your Next Ride Hero Search Box */}
          <div className="card p-6">
            <h2 className="font-mono text-[10px] text-primary tracking-widest uppercase mb-4">
              Find Your Next Ride
            </h2>
            
            <div className="flex flex-col md:flex-row items-center gap-4">
              {/* Pickup location */}
              <div className="flex-1 w-full relative flex items-center border-b border-surface-variant focus-within:border-primary transition-all pb-1">
                <MapPin size={16} className="text-primary mr-3 flex-shrink-0" />
                <input
                  className="bg-transparent text-sm w-full focus:outline-none placeholder-outline font-medium text-on-surface"
                  placeholder="Pickup"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>

              {/* Destination */}
              <div className="flex-1 w-full relative flex items-center border-b border-surface-variant focus-within:border-primary transition-all pb-1">
                <Compass size={16} className="text-primary mr-3 flex-shrink-0" />
                <input
                  className="bg-transparent text-sm w-full focus:outline-none placeholder-outline font-medium text-on-surface"
                  placeholder="Destination"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>

              {/* Date */}
              <div className="w-full md:w-44 relative flex items-center border-b border-surface-variant focus-within:border-primary transition-all pb-1">
                <Calendar size={16} className="text-secondary mr-3 flex-shrink-0" />
                <input
                  type="date"
                  className="bg-transparent text-sm w-full focus:outline-none placeholder-outline font-medium text-on-surface invert dark:invert-0"
                  min={format(new Date(), "yyyy-MM-dd")}

                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              {/* Search CTA */}
              <button
                onClick={handleSearch}
                className="btn-primary w-full md:w-auto px-6 py-2.5 flex items-center justify-center gap-2"
              >
                <Search size={14} /> Search
              </button>
            </div>
          </div>

          {/* Section: Your Upcoming Ride */}
          <section>
            <h3 className="font-mono text-[10px] text-on-surface-variant tracking-widest uppercase mb-4">
              Your Upcoming Ride
            </h3>
            
            {!upcomingRide ? (
              <div className="card p-8 border-dashed border-surface-variant flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 bg-surface-container-low flex items-center justify-center mb-4 border border-surface-variant">
                  <Calendar size={18} className="text-primary" />
                </div>
                <p className="text-sm font-semibold text-on-surface">No active ride requests scheduled</p>
                <p className="text-xs text-on-surface-variant mt-1.5 max-w-[280px]">
                  Coordinate travel routes by posting a request or searching matching lists.
                </p>
                <Link href="/rides/create" className="btn-outline text-[10px] mt-5">
                  Post a Request
                </Link>
              </div>
            ) : (
              <RideCard ride={upcomingRide} />
            )}
          </section>

          {/* Section: Recommended Rides */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-[10px] text-on-surface-variant tracking-widest uppercase">
                Explore Matching Rides
              </h3>
              {otherRides.length > 0 && (
                <Link href="/rides" className="font-mono text-[10px] text-primary hover:text-[#ffe088] uppercase tracking-widest">
                  View All Rides →
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
              <div className="card p-10 flex flex-col items-center justify-center text-center border-dashed border-surface-variant">
                <div className="w-10 h-10 bg-surface-container-low flex items-center justify-center mb-4 border border-surface-variant">
                  <Compass size={18} className="text-secondary" />
                </div>
                <p className="text-sm font-semibold text-on-surface">No matching routes in network</p>
                <p className="text-xs text-on-surface-variant mt-1.5 max-w-[280px]">
                  Be the first to post a ride request for your domain.
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
              <h3 className="font-mono text-[10px] text-on-surface-variant tracking-widest uppercase mb-4">
                My Other Active Requests
              </h3>
              <div className="flex flex-col gap-4">
                {activeRides.map((ride) => (
                  <RideCard key={ride.id} ride={ride} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar Container (Right 1/3) */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
          
          {/* Trust Panel */}
          <div className="card p-5">
            <h4 className="font-mono text-[10px] text-primary tracking-widest uppercase mb-4 flex items-center gap-2">
              <ShieldCheck className="text-emerald-500" size={16} />
              Trust & Safety Check
            </h4>
            <div className="flex flex-col gap-4 text-xs text-on-surface-variant leading-relaxed font-medium">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-primary mt-1.5 flex-shrink-0" />
                <p>Every student on CabSy has authenticated with a verified college email address.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-primary mt-1.5 flex-shrink-0" />
                <p>Always inspect physical student credentials before boarding any shared vehicle.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-primary mt-1.5 flex-shrink-0" />
                <p>Coordinate travel costs and split booking receipts directly in the coordinate chat room.</p>
              </div>
            </div>
          </div>

          {/* College Safety Notice */}
          <div className="card p-5">
            <div className="flex items-start gap-3 mb-3">
              <ShieldAlert className="text-primary flex-shrink-0 mt-0.5" size={17} />
              <h4 className="font-mono text-[10px] text-on-surface uppercase tracking-wider">Campus Notice</h4>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Travel routes scheduled after 9:00 PM must coordinate pickup gates carefully due to university hostel curfew regulations. Keep group chats updated.
            </p>
          </div>

        </div>


      </div>

    </ProtectedLayout>
  );
}

