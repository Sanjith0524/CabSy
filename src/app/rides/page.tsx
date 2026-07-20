"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { subscribeToRides } from "@/lib/firestore";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import RideCard from "@/components/rides/RideCard";
import { Ride } from "@/types";
import { Search, Compass, Calendar } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

function RidesFeedContent() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from") || "";
  const toParam = searchParams.get("to") || "";
  const dateParam = searchParams.get("date") || "";

  const [query, setQuery] = useState("");
  const [customDate, setCustomDate] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "tomorrow" | "custom">("all");

  useEffect(() => {
    const unsub = subscribeToRides((all) => {
      setRides(all);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let q = "";
    if (fromParam && toParam) {
      q = `${fromParam} ${toParam}`;
    } else if (fromParam) {
      q = fromParam;
    } else if (toParam) {
      q = toParam;
    }
    if (q) setQuery(q);

    if (dateParam) {
      setCustomDate(dateParam);
      setDateFilter("custom");
    }
  }, [fromParam, toParam, dateParam]);

  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(
    new Date(Date.now() + 86400000),
    "yyyy-MM-dd"
  );

  const filtered = rides.filter((r) => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matchQuery =
      terms.length === 0 ||
      terms.every(
        (term) =>
          r.pickup.toLowerCase().includes(term) ||
          r.destination.toLowerCase().includes(term)
      );

    const matchDate =
      dateFilter === "custom"
        ? r.date === customDate
        : dateFilter === "all"
        ? true
        : dateFilter === "today"
        ? r.date === today
        : r.date === tomorrow;

    return matchQuery && matchDate;
  });

  return (
    <ProtectedLayout>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-sans font-bold text-4xl uppercase text-on-background">
          Find a Ride
        </h1>

        <p className="font-sans text-xs text-on-surface-variant mt-2">
          Browse and join active travel groups heading to transit hubs and campuses.
        </p>

      </div>

      {/* Search Widget */}
      <div className="card p-4 flex flex-col sm:flex-row items-center gap-4 mb-6">
        <div className="flex-1 w-full flex items-center gap-3 border-b border-surface-variant focus-within:border-primary pb-1">
          <Search size={16} className="text-primary flex-shrink-0" />
          <input
            className="w-full text-sm text-on-surface placeholder-outline bg-transparent focus:outline-none py-1.5"
            placeholder="Search pickup, destination, or campus keywords..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (dateFilter === "custom") {
                setDateFilter("all");
                setCustomDate("");
              }
            }}
          />
        </div>

        {/* Date Filter Pills */}
        <div className="w-full sm:w-auto flex items-center gap-2 overflow-x-auto py-1">
          {(["all", "today", "tomorrow"] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                setDateFilter(f);
                setCustomDate("");
              }}
              className={`px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-all border ${
                dateFilter === f
                  ? "bg-primary border-primary text-on-primary"
                  : "bg-transparent border-surface-variant text-on-surface-variant hover:text-on-surface hover:border-outline"
              }`}
            >
              {f === "all" ? "All Dates" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          {dateFilter === "custom" && (
            <button
              onClick={() => {
                setDateFilter("all");
                setCustomDate("");
              }}
              className="px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-all border bg-primary border-primary text-on-primary flex items-center gap-1.5"
            >
              <Calendar size={11} />
              {customDate}
            </button>
          )}
        </div>
      </div>

      {/* Results Meta Info */}
      {!loading && (
        <div className="flex items-center justify-between mb-4 px-1">
          <p className="font-mono text-[9px] text-on-surface-variant uppercase tracking-wider">
            {filtered.length} active ride{filtered.length !== 1 ? "s" : ""} matching
          </p>
        </div>
      )}

      {/* Feed list */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 border-dashed border-surface-variant flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 bg-surface-container-low flex items-center justify-center mb-4 border border-surface-variant">
            <Compass size={18} className="text-primary" />
          </div>
          <p className="text-sm font-semibold text-on-surface">No matching rides found</p>

          <p className="text-xs text-on-surface-variant mt-1.5 max-w-[280px]">
            No one has requested a ride for this date or route yet. Try broadening your keywords.
          </p>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => {
                setQuery("");
                setDateFilter("all");
                setCustomDate("");
              }}
              className="btn-outline text-[10px]"
            >
              Reset Filters
            </button>

            <Link href="/rides/create" className="btn-primary text-[10px]">
              Post Request
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((ride) => (
            <RideCard key={ride.id} ride={ride} />
          ))}
        </div>
      )}
    </ProtectedLayout>
  );
}

export default function RidesFeedPage() {
  return (
    <Suspense
      fallback={
        <ProtectedLayout>
          <div className="max-w-5xl mx-auto flex flex-col gap-6">
            <div className="h-10 w-48 skeleton" />
            <div className="h-14 skeleton" />
            <div className="flex flex-col gap-4 mt-4">
              <div className="h-32 skeleton" />
              <div className="h-32 skeleton" />
            </div>
          </div>
        </ProtectedLayout>
      }
    >
      <RidesFeedContent />
    </Suspense>
  );
}

