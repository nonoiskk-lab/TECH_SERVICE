import type { Metadata } from "next";
import Link from "next/link";
import { can, requireRole, ROLE_LABELS } from "@/server/admin/auth";
import { logoutAction } from "@/server/admin/actions";
import { Wordmark } from "@/components/site-header";

export const metadata: Metadata = { title: "Staff | THIRD SPACE", robots: { index: false, follow: false } };

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const me = await requireRole("checkin");
  return (
    <div className="theme-light theme-light-root min-h-dvh">
      <header className="ts-topbar ts-glass">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2">
          <Link href="/staff" className="flex min-h-11 items-center gap-2">
            <Wordmark />
            <span className="rounded-full border border-line px-2 text-xs text-muted">Staff</span>
          </Link>
          <form action={logoutAction} className="flex items-center gap-2 text-sm">
            <span className="hidden text-muted sm:inline" data-testid="staff-who">
              {me.name} · {ROLE_LABELS[me.role]}
            </span>
            <button className="ts-btn ts-btn-ghost text-sm">Log out</button>
          </form>
        </div>
        <nav aria-label="Staff" className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 pb-2">
          <Link href="/staff" className="ts-btn ts-btn-dark text-sm">
            Today
          </Link>
          <Link href="/staff/checklist" className="ts-btn ts-btn-dark text-sm" data-testid="nav-checklist">
            Checklist
          </Link>
          {can(me.role, "dashboard") && me.role !== "staff" && (
            <Link href="/admin" className="ts-btn ts-btn-dark text-sm">
              Admin
            </Link>
          )}
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
