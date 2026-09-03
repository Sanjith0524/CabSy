"use client";

import { Sparkles } from "lucide-react";

/**
 * Persistent "you're in the sandbox" marker for the demo deployment.
 * Renders nothing unless NEXT_PUBLIC_DEMO_MODE=true.
 */
export default function DemoBadge() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return null;

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
      <div className="flex items-center gap-1.5 rounded-full bg-primary text-on-primary text-[11px] font-semibold px-3 py-1.5 shadow-lg">
        <Sparkles size={12} />
        Demo mode · sample data, resets daily
      </div>
    </div>
  );
}
