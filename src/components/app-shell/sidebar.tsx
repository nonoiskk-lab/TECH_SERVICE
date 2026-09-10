"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Laptop2,
  X,
  LayoutDashboard,
  Wrench,
  Users,
  Boxes,
  Truck,
  ShoppingCart,
  Wallet,
  BarChart3,
  Bell,
  Settings,
  UserCog,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem, NavIconKey } from "@/lib/nav";

const ICONS: Record<NavIconKey, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  jobs: Wrench,
  customers: Users,
  inventory: Boxes,
  suppliers: Truck,
  purchases: ShoppingCart,
  payments: Wallet,
  reports: BarChart3,
  notifications: Bell,
  users: UserCog,
  "audit-log": History,
  settings: Settings,
};

export function Sidebar({
  navItems,
  settingsItems,
  mobileOpen,
  onCloseMobile,
}: {
  navItems: NavItem[];
  settingsItems: NavItem[];
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 px-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary-600 text-white">
          <Laptop2 className="size-5" />
        </div>
        <span className="text-lg font-bold text-ink-900">RepairFlow</span>
        <button onClick={onCloseMobile} className="ml-auto rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 lg:hidden">
          <X className="size-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto scroll-thin px-3 py-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-primary-50 text-primary-700" : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
              )}
            >
              <Icon className={cn("size-[18px]", active ? "text-primary-600" : "text-ink-400")} />
              {item.label}
            </Link>
          );
        })}

        {settingsItems.length > 0 && (
          <>
            <p className="px-3 pt-5 pb-1.5 text-xs font-semibold tracking-wide text-ink-400 uppercase">Admin</p>
            {settingsItems.map((item) => {
              const active = isActive(item.href);
              const Icon = ICONS[item.icon];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active ? "bg-primary-50 text-primary-700" : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                  )}
                >
                  <Icon className={cn("size-[18px]", active ? "text-primary-600" : "text-ink-400")} />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="border-t border-[var(--color-border)] p-4 text-xs text-ink-400">
        RepairFlow v1.0 · Service Center OS
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-[var(--color-border)] bg-white lg:block">
        {content}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-ink-900/50" onClick={onCloseMobile} />
          <aside className="fixed inset-y-0 left-0 w-72 bg-white shadow-xl">{content}</aside>
        </div>
      )}
    </>
  );
}
