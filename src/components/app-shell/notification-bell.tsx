"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { EmptyState } from "@/components/ui/misc";

type Notif = {
  id: string;
  type: string;
  title: string;
  message: string;
  jobId: string | null;
  isRead: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<Notif[]>([]);
  const [loading, setLoading] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const unread = items.filter((i) => !i.isRead).length;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=8");
      if (res.ok) {
        const data = await res.json();
        setItems(data.notifications ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications/mark-read", { method: "POST" });
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
        className="relative flex size-9 items-center justify-center rounded-xl text-ink-500 hover:bg-ink-50"
        aria-label="Notifications"
      >
        <Bell className="size-[18px]" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-danger-600 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-popover)]">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <p className="text-sm font-semibold text-ink-900">Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs font-medium text-primary-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto scroll-thin">
            {!loading && items.length === 0 && (
              <div className="p-4">
                <EmptyState title="You're all caught up" description="No notifications right now." />
              </div>
            )}
            {items.map((n) => (
              <Link
                key={n.id}
                href={n.jobId ? `/jobs/${n.jobId}` : "/notifications"}
                onClick={() => setOpen(false)}
                className={`block border-b border-[var(--color-border)] px-4 py-3 last:border-0 hover:bg-ink-50 ${
                  n.isRead ? "" : "bg-primary-50/40"
                }`}
              >
                <p className="text-sm font-medium text-ink-900">{n.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{n.message}</p>
                <p className="mt-1 text-[11px] text-ink-400">{formatRelativeTime(n.createdAt)}</p>
              </Link>
            ))}
          </div>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-[var(--color-border)] px-4 py-2.5 text-center text-sm font-medium text-primary-600 hover:bg-ink-50"
          >
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
