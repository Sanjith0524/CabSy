"use client";

import Link from "next/link";
import { Ride } from "@/types";
import { Calendar, ArrowRight } from "lucide-react";
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

        {/* Main ride metadata (Route & seats) */}
        <div className="flex items-center justify-between gap-6">
          {/* Left Pane: Travel Route & Timeline */}
          <div className="flex-1 flex gap-4 min-w-0">
            {/* Times */}
            <div className="flex flex-col justify-between items-end font-mono text-on-surface text-[13px] tabular-nums py-0.5 w-12 flex-shrink-0 leading-none h-[64px]">
              <span>{ride.time}</span>
              <span className="text-[11px] text-on-surface-variant">~2h</span>
              <span>{arrivalTime || "--:--"}</span>
            </div>

            {/* Timeline connector graphic */}
            <div className="flex flex-col items-center justify-between py-1 relative w-3 flex-shrink-0 h-[64px]">
              <div className="w-2 h-2 rounded-full bg-primary z-10" />
              <div className="w-0.5 absolute top-2.5 bottom-2.5 bg-surface-variant z-0" />
              <div className="w-2 h-2 rounded-full bg-outline z-10" />
            </div>

            {/* Locations */}
            <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0 h-[64px]">
              <p className="text-[15px] font-semibold text-on-surface truncate leading-tight">{ride.pickup}</p>
              <p className="text-[15px] font-semibold text-on-surface truncate leading-tight">{ride.destination}</p>
            </div>
          </div>

          {/* Right Pane: Seats Availability */}
          <div className="text-right flex-shrink-0 flex flex-col items-end justify-center">
            <span className={clsx(
              "text-[13px] font-bold",
              isFull ? "text-on-surface-variant" : "text-primary"
            )}>
              {isFull ? "Fully booked" : `${seatsLeft} seat${seatsLeft !== 1 ? "s" : ""} left`}
            </span>
            <span className="text-xs text-on-surface-variant font-medium mt-1">
              {ride.seatsTaken} of {ride.seatsTotal} joined
            </span>
          </div>
        </div>

        {/* Separator & Creator bottom line */}
        <div className="flex items-center justify-between pt-4 border-t border-surface-variant mt-4">
          {/* Creator summary */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-[11px] font-bold text-on-surface-variant border border-surface-variant">
              {creatorInitials}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-semibold text-on-surface leading-none">
                {ride.creatorName.split(" ")[0]}
              </span>
              <span className="text-[11px] text-on-surface-variant leading-none">
                Ride host
              </span>
            </div>
          </div>

          {/* Date & details */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-on-surface-variant bg-surface-container-low px-2.5 py-1 rounded-full">
              <Calendar size={12} />
              {dateLabel}
            </span>
            <div className="text-[13px] font-semibold text-primary group-hover:translate-x-0.5 transition-transform duration-150 flex items-center gap-1">
              Details
              <ArrowRight size={13} />
            </div>
          </div>
        </div>

      </div>
    </Link>
  );
}

