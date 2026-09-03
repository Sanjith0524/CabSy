"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  UserPlus,
  UserMinus,
  LogOut,
  XCircle,
  Users,
  MessageCircle,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { subscribeToNotifications, markNotificationsRead } from "@/lib/api";
import { AppNotification, NotificationType } from "@/types";

const ICONS: Record<NotificationType, typeof Bell> = {
  ride_join: UserPlus,
  ride_leave: LogOut,
  ride_removed: UserMinus,
  ride_cancelled: XCircle,
  ride_full: Users,
  chat_message: MessageCircle,
  ride_reminder: Clock,
};

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeToNotifications(({ notifications, unread }) => {
      setItems(notifications);
      setUnread(unread);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleOpen = async (n: AppNotification) => {
    setOpen(false);
    if (!n.readAt) {
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, readAt: Date.now() } : x))
      );
      setUnread((u) => Math.max(0, u - 1));
      await markNotificationsRead(n.id);
    }
    if (n.rideId) router.push(`/rides/${n.rideId}`);
  };

  const handleMarkAll = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? Date.now() })));
    setUnread(0);
    await markNotificationsRead();
  };

  return (
    <div className="relative flex items-center" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        aria-expanded={open}
        className={`relative flex items-center justify-center w-10 h-11 sm:h-10 rounded-full transition-colors sm:hover:bg-surface-container-low ${
          open ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
        }`}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute top-1.5 right-0.5 min-w-[15px] h-[15px] px-1 rounded-full bg-primary text-on-primary text-[9px] font-bold flex items-center justify-center leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-3 right-3 top-[68px] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[340px] bg-surface border border-surface-variant rounded-2xl shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-variant">
            <p className="text-sm font-semibold text-on-surface">Notifications</p>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-[12px] font-semibold text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell size={20} className="text-outline mx-auto mb-2" />
                <p className="text-sm text-on-surface-variant">You&apos;re all caught up.</p>
              </div>
            ) : (
              items.map((n) => {
                const Icon = ICONS[n.type] ?? Bell;
                let when = "";
                try {
                  when = formatDistanceToNow(new Date(n.createdAt), { addSuffix: true });
                } catch {}
                return (
                  <button
                    key={n.id}
                    onClick={() => handleOpen(n)}
                    className={`w-full text-left flex gap-3 px-4 py-3 border-b border-surface-variant last:border-0 hover:bg-surface-container-low transition-colors ${
                      n.readAt ? "" : "bg-primary-container/30"
                    }`}
                  >
                    <span className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon size={15} className="text-primary" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-on-surface leading-snug">
                        {n.title}
                      </span>
                      <span className="block text-[12px] text-on-surface-variant leading-snug mt-0.5">
                        {n.body}
                      </span>
                      <span className="block text-[11px] text-outline mt-1">{when}</span>
                    </span>
                    {!n.readAt && (
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
