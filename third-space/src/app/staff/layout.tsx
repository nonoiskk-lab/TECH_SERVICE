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
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2">
          <Link href="/staff" className="flex min-h-11 items-center gap-2">
            <Wordmark />
            <span className="rounded-full border border-line px-2 text-xs text-faint">Staff</span>
          </Link>
          <form action={logoutAction} className="flex items-center gap-2 text-sm">
            <span className="hidden text-muted sm:inline" data-testid="staff-who">
              {me.name} · {ROLE_LABELS[me.role]}
            </span>
            {can(me.role, "dashboard") && me.role !== "staff" && (
              <Link href="/admin" className="ts-btn ts-btn-ghost text-sm">
                Admin
              </Link>
            )}
            <button className="ts-btn ts-btn-ghost text-sm">Log out</button>
          </form>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
