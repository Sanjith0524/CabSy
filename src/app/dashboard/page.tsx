"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { subscribeToRides } from "@/lib/firestore";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import RideCard from "@/components/rides/RideCard";
import { Ride } from "@/types";
import { Plus, Search, MapPin, Calendar, Compass, ShieldAlert, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";
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
      <div className="flex flex-col lg:flex-row items-start gap-8">
        
        {/* Main Content Area (Left 2/3) */}
        <div className="flex-1 w-full flex flex-col gap-8">
          
          {/* Find Your Next Ride Hero Search Box */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
              Search Travel Matches
            </span>
            <h2 className="text-xl font-extrabold text-brand tracking-tight mb-4">
              Find Your Next Ride
            </h2>
            
            <div className="flex flex-col md:flex-row items-center gap-3">
              {/* Pickup location */}
              <div className="flex-1 w-full relative flex items-center bg-gray-50/50 border border-gray-200/80 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-brand-light focus-within:border-brand/70 transition-all">
                <MapPin size={16} className="text-gray-400 mr-2 flex-shrink-0" />
                <input
                  className="bg-transparent text-sm w-full focus:outline-none placeholder-gray-400 font-medium text-gray-800"
                  placeholder="Leaving from (e.g. campus gateway)..."
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>

              {/* Destination */}
              <div className="flex-1 w-full relative flex items-center bg-gray-50/50 border border-gray-200/80 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-brand-light focus-within:border-brand/70 transition-all">
                <Compass size={16} className="text-gray-450 mr-2 flex-shrink-0" />
                <input
                  className="bg-transparent text-sm w-full focus:outline-none placeholder-gray-400 font-medium text-gray-800"
                  placeholder="Going to (e.g. transit station)..."
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>

              {/* Date */}
              <div className="w-full md:w-44 relative flex items-center bg-gray-50/50 border border-gray-200/80 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-brand-light focus-within:border-brand/70 transition-all">
                <Calendar size={16} className="text-gray-400 mr-2 flex-shrink-0" />
                <input
                  type="date"
                  className="bg-transparent text-sm w-full focus:outline-none placeholder-gray-400 font-medium text-gray-800"
                  min={format(new Date(), "yyyy-MM-dd")}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              {/* Search CTA */}
              <button
                onClick={handleSearch}
                className="btn-primary w-full md:w-auto px-5 py-2.5 flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Search size={15} /> Search
              </button>
            </div>
          </div>

          {/* Section: Your Upcoming Ride */}
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
              Your Upcoming Ride
            </h3>
            
            {!upcomingRide ? (
              <div className="card p-6 border-dashed border-gray-250 flex flex-col items-center justify-center text-center">
                <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                  <Calendar size={15} className="text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-700">No upcoming travel itineraries</p>
                <p className="text-xs text-gray-400 mt-1 max-w-[280px]">
                  Coordinate travel routes by posting a request or joining other open routes.
                </p>
                <Link href="/rides/create" className="btn-outline text-xs mt-4">
                  Offer a Ride
                </Link>
              </div>
            ) : (
              <RideCard ride={upcomingRide} />
            )}
          </section>

          {/* Section: Recommended Rides */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Recommended Rides from @{domain}
              </h3>
              {otherRides.length > 0 && (
                <Link href="/rides" className="text-xs font-semibold text-brand hover:text-brand/80">
                  See all rides →
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
              <div className="card p-8 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                  <Compass size={18} className="text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-700">No domain rides available</p>
                <p className="text-xs text-gray-400 mt-1 max-w-[280px]">
                  Be the first verified student to create a route for your domain.
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
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                Other Rides Offered By Me
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
          <div className="card p-5 border border-gray-200 bg-white">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <ShieldCheck className="text-emerald-500" size={15} />
              Trust & Safety Check
            </h4>
            <div className="flex flex-col gap-3.5 text-xs text-gray-500 font-medium">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 flex-shrink-0" />
                <p>Every student on Cabsy has authenticated via Google Auth with a verified college email address.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 flex-shrink-0" />
                <p>Always inspect physical student ID cards before boarding the vehicle.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 flex-shrink-0" />
                <p>Coordinate travel costs and split booking receipts directly in the coordinate chat room.</p>
              </div>
            </div>
          </div>

          {/* College Safety Notice */}
          <div className="card p-5 border border-gray-200 bg-white">
            <div className="flex items-start gap-3 mb-3">
              <ShieldAlert className="text-accent flex-shrink-0 mt-0.5" size={17} />
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Campus Notice</h4>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed font-medium">
              Travel routes scheduled after 10:00 PM must coordinate pickup gates carefully due to university hostel curfew regulations. Keep group chats updated.
            </p>
          </div>

          {/* Travel Tips */}
          <div className="card p-5 border border-gray-200 bg-white">
            <div className="flex items-start gap-3 mb-3">
              <HelpCircle className="text-brand flex-shrink-0 mt-0.5" size={17} />
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Travel Tips</h4>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed font-medium">
              Leaving for the airport? Plan to depart at least 3.5 hours before flight timings to account for city transit traffic.
            </p>
          </div>
        </div>

      </div>
    </ProtectedLayout>
  );
}
