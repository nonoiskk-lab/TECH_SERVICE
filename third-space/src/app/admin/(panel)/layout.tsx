import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/server/admin/auth";
import { logoutAction } from "@/server/admin/actions";
import { Wordmark } from "@/components/site-header";

export const metadata: Metadata = { title: "Admin | THIRD SPACE", robots: { index: false, follow: false } };

const NAV = [
  ["/admin", "Today"],
  ["/admin/bookings", "Bookings"],
  ["/admin/slots", "Slots"],
  ["/admin/titles", "Titles"],
  ["/admin/incidents", "Incidents"],
  ["/admin/leads", "Leads"],
  ["/admin/notifications", "Messages"],
  ["/admin/policies", "Policies"],
  ["/admin/audit", "Audit log"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const who = await requireStaff();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
          <Link href="/admin" className="flex min-h-11 items-center gap-2">
            <Wordmark />
            <span className="rounded-full border border-line px-2 text-xs text-faint">Admin</span>
          </Link>
          <form action={logoutAction} className="flex items-center gap-2 text-sm">
            <span className="hidden text-muted sm:inline" data-testid="admin-who">
              {who}
            </span>
            <button className="ts-btn ts-btn-ghost text-sm">Log out</button>
          </form>
        </div>
        <nav aria-label="Admin" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm text-muted hover:bg-raised hover:text-text">
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
