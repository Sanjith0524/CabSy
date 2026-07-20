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
      <div className="card-interactive p-5 group">
        
        {/* Main ride metadata (Route & pricing/seats) */}
        <div className="flex items-center justify-between gap-6">
          {/* Left Pane: Travel Route & Timeline */}
          <div className="flex-1 flex gap-4 min-w-0">
            {/* Times */}
            <div className="flex flex-col justify-between items-end font-mono text-on-surface text-xs py-0.5 w-11 flex-shrink-0 leading-none h-[64px]">
              <span>{ride.time}</span>
              <span className="text-[8px] text-[#99907c] font-semibold tracking-tight uppercase">2h est.</span>
              <span>{arrivalTime || "--:--"}</span>
            </div>

            {/* Timeline connector graphic */}
            <div className="flex flex-col items-center justify-between py-1 relative w-3 flex-shrink-0 h-[64px]">
              <div className="w-1.5 h-1.5 rounded-full bg-primary z-10" />
              <div className="w-px absolute top-2.5 bottom-2.5 bg-surface-variant z-0" />
              <div className="w-1.5 h-1.5 rounded-full bg-secondary z-10" />
            </div>


            {/* Locations */}
            <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0 h-[64px]">
              <div className="min-w-0">
                <p className="text-sm font-bold text-on-surface truncate leading-none">{ride.pickup}</p>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-on-surface truncate leading-none">{ride.destination}</p>
              </div>
            </div>

          </div>

          {/* Right Pane: Seats Availability */}
          <div className="text-right flex-shrink-0 flex flex-col items-end justify-center">
            <span className={clsx(
              "font-mono text-xs font-bold uppercase tracking-wider",
              isFull ? "text-[#99907c]" : "text-primary"
            )}>
              {isFull ? "Fully booked" : `${seatsLeft} seats left`}
            </span>
            <span className="text-[10px] text-on-surface-variant font-medium mt-1">
              {ride.seatsTaken} / {ride.seatsTotal} joined
            </span>
          </div>
        </div>

        {/* Separator & Creator bottom line */}
        <div className="flex items-center justify-between pt-4 border-t border-surface-variant mt-4">
          {/* Driver profile summary */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-surface-container-low flex items-center justify-center text-[10px] font-mono font-bold text-[#ffe088] border border-surface-variant">
              {creatorInitials}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-on-surface leading-none">
                {ride.creatorName.split(" ")[0]}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[8px] font-mono font-bold text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 px-1 py-0.5 mt-1 leading-none">
                <ShieldCheck size={9} />
                STUDENT VERIFIED
              </span>
            </div>
          </div>

          {/* Date & details */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container-low border border-surface-variant px-2 py-0.5">
              <Calendar size={10} />
              {dateLabel}
            </span>
            <div className="font-mono text-[9px] uppercase tracking-widest text-primary group-hover:translate-x-0.5 transition-transform duration-150 flex items-center gap-0.5">
              Details
              <ArrowRight size={10} />
            </div>
          </div>
        </div>


      </div>
    </Link>
  );
}

