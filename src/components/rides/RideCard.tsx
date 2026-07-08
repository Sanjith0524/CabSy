"use client";

import Link from "next/link";
import { Ride } from "@/types";
import { Calendar, ShieldCheck, ArrowRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import clsx from "clsx";

interface Props {
  ride: Ride;
}

export default function RideCard({ ride }: Props) {
  const seatsLeft = ride.seatsTotal - ride.seatsTaken;
  const isFull = ride.status === "full" || seatsLeft <= 0;

  let dateLabel = ride.date;
  try {
    dateLabel = format(parseISO(ride.date), "MMM d");
  } catch {}

  const creatorInitials = ride.creatorName
    ? ride.creatorName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  // Calculate estimated arrival (+2h for mock duration display)
  const getArrivalTime = (timeStr: string) => {
    try {
      const [h, m] = timeStr.split(":").map(Number);
      const newH = (h + 2) % 24;
      return `${String(newH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    } catch {
      return "";
    }
  };
  const arrivalTime = getArrivalTime(ride.time);

  return (
    <Link href={`/rides/${ride.id}`} className="block">
      <div className="card p-5 border border-gray-200 hover:border-gray-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-all duration-150 cursor-pointer group bg-white">
        
        {/* Main ride metadata (Route & pricing/seats) */}
        <div className="flex items-center justify-between gap-6">
          {/* Left Pane: Travel Route & Timeline */}
          <div className="flex-1 flex gap-4 min-w-0">
            {/* Times */}
            <div className="flex flex-col justify-between items-end font-display font-bold text-gray-900 text-sm py-0.5 w-11 flex-shrink-0 leading-none h-[64px]">
              <span>{ride.time}</span>
              <span className="text-[9px] text-gray-400 font-semibold tracking-tight uppercase">2h est.</span>
              <span>{arrivalTime || "--:--"}</span>
            </div>

            {/* Timeline connector graphic */}
            <div className="flex flex-col items-center justify-between py-1 relative w-3 flex-shrink-0 h-[64px]">
              <div className="w-2 h-2 rounded-full bg-brand/35 border border-brand z-10" />
              <div className="w-0.5 absolute top-2.5 bottom-2.5 bg-gray-200/80 z-0" />
              <div className="w-2 h-2 rounded-full bg-accent/35 border border-accent z-10" />
            </div>

            {/* Locations */}
            <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0 h-[64px]">
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate leading-none">{ride.pickup}</p>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate leading-none">{ride.destination}</p>
              </div>
            </div>
          </div>

          {/* Right Pane: Seats Availability */}
          <div className="text-right flex-shrink-0 flex flex-col items-end justify-center">
            <span className={clsx(
              "text-sm font-extrabold",
              isFull ? "text-gray-400 animate-none" : "text-brand"
            )}>
              {isFull ? "Fully booked" : `${seatsLeft} seats left`}
            </span>
            <span className="text-[10px] text-gray-400 font-semibold mt-1">
              {ride.seatsTaken} / {ride.seatsTotal} joined
            </span>
          </div>
        </div>

        {/* Separator & Creator bottom line */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-150 mt-4">
          {/* Driver profile summary */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-[10px] font-bold text-gray-500 border border-gray-200">
              {creatorInitials}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-800 leading-none">
                {ride.creatorName.split(" ")[0]}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 mt-1 leading-none">
                <ShieldCheck size={11} className="text-emerald-500" />
                Verified Student
              </span>
            </div>
          </div>

          {/* Date & details */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border border-gray-200/50 px-2 py-0.5 rounded-md">
              <Calendar size={11} />
              {dateLabel}
            </span>
            <div className="text-xs font-bold text-brand group-hover:translate-x-0.5 transition-transform duration-150 flex items-center gap-0.5">
              Details
              <ArrowRight size={12} />
            </div>
          </div>
        </div>

      </div>
    </Link>
  );
}
