"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import type { NavItem } from "@/lib/nav";
import type { Role } from "@/lib/constants";

export function AppShell({
  navItems,
  settingsItems,
  user,
  children,
}: {
  navItems: NavItem[];
  settingsItems: NavItem[];
  user: { name: string; email: string; role: Role };
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        navItems={navItems}
        settingsItems={settingsItems}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMobileNav={() => setMobileOpen(true)} user={user} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
