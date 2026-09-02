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
      <div className="mb-6">
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-on-background">
          Find a ride
        </h1>
        <p className="text-on-surface-variant mt-2">
          Browse and join rides heading to stations, the airport, and around campus.
        </p>
      </div>

      {/* Search Widget */}
      <div className="card p-3.5 flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex-1 w-full flex items-center gap-2.5 bg-surface-container-low rounded-xl px-3.5 py-2.5 border border-transparent focus-within:border-primary focus-within:bg-surface transition-colors">
          <Search size={16} className="text-outline flex-shrink-0" />
          <input
            className="w-full text-[15px] text-on-surface placeholder-outline bg-transparent focus:outline-none py-1"
            placeholder="Search pickup, destination, or a place…"
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
        <div className="w-full sm:w-auto flex items-center gap-2 overflow-x-auto">
          {(["all", "today", "tomorrow"] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                setDateFilter(f);
                setCustomDate("");
              }}
              className={`px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${
                dateFilter === f
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {f === "all" ? "All dates" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          {dateFilter === "custom" && (
            <button
              onClick={() => {
                setDateFilter("all");
                setCustomDate("");
              }}
              className="px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap bg-primary text-on-primary flex items-center gap-1.5"
            >
              <Calendar size={12} />
              {customDate}
            </button>
          )}
        </div>
      </div>

      {/* Results Meta Info */}
      {!loading && (
        <div className="mb-3 px-1">
          <p className="text-[13px] text-on-surface-variant">
            {filtered.length} ride{filtered.length !== 1 ? "s" : ""} matching
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
        <div className="card p-8 sm:p-12 border-dashed flex flex-col items-center justify-center text-center">
          <div className="w-11 h-11 rounded-2xl bg-primary-container flex items-center justify-center mb-4">
            <Compass size={18} className="text-on-primary-container" />
          </div>
          <p className="text-[15px] font-semibold text-on-surface">No matching rides found</p>
          <p className="text-sm text-on-surface-variant mt-1.5 max-w-[300px]">
            Nobody has posted a ride for this date or route yet. Try broadening your search.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row gap-2.5 w-full max-w-[260px] sm:max-w-none sm:w-auto">
            <button
              onClick={() => {
                setQuery("");
                setDateFilter("all");
                setCustomDate("");
              }}
              className="btn-outline w-full sm:w-auto justify-center"
            >
              Reset filters
            </button>

            <Link
              href="/rides/create"
              className="btn-primary w-full sm:w-auto justify-center"
            >
              Post a request
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

