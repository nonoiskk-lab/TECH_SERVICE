import type { Metadata } from "next";
import Link from "next/link";
import { can, requireRole, ROLE_LABELS, type Permission } from "@/server/admin/auth";
import { logoutAction } from "@/server/admin/actions";
import { Wordmark } from "@/components/site-header";

export const metadata: Metadata = { title: "Admin | THIRD SPACE", robots: { index: false, follow: false } };

const NAV: [string, string, Permission][] = [
  ["/admin", "Today", "dashboard"],
  ["/admin/bookings", "Bookings", "bookings.view"],
  ["/admin/slots", "Schedule", "bookings.view"],
  ["/admin/calendar", "Calendar", "calendar"],
  ["/admin/customers", "Customers", "customers"],
  ["/admin/packages", "Packages", "packages"],
  ["/admin/addons", "Add-ons", "packages"],
  ["/admin/coupons", "Coupons", "coupons"],
  ["/admin/payments", "Payments", "payments"],
  ["/admin/memberships", "Creator plans", "memberships"],
  ["/admin/recordings", "Recordings", "recordings"],
  ["/admin/reports", "Reports", "reports"],
  ["/admin/titles", "Titles", "packages"],
  ["/admin/incidents", "Incidents", "incidents"],
  ["/admin/leads", "Leads", "leads"],
  ["/admin/notifications", "Messages", "notifications"],
  ["/admin/content", "Gallery & reviews", "content"],
  ["/admin/staff", "Staff", "staff"],
  ["/admin/settings", "Settings", "settings"],
  ["/admin/policies", "Policies", "dashboard"],
  ["/admin/audit", "Audit log", "audit"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireRole("dashboard");
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
              {me.name} · {ROLE_LABELS[me.role]}
            </span>
            <button className="ts-btn ts-btn-ghost text-sm">Log out</button>
          </form>
        </div>
        <nav aria-label="Admin" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
          {NAV.filter(([, , p]) => can(me.role, p)).map(([href, label]) => (
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
