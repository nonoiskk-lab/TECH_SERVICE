"use client";

import { Menu } from "lucide-react";
import { CommandSearch } from "./command-search";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";
import type { Role } from "@/lib/constants";

export function Topbar({
  onOpenMobileNav,
  user,
}: {
  onOpenMobileNav: () => void;
  user: { name: string; email: string; role: Role };
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[var(--color-border)] bg-white/90 px-4 backdrop-blur sm:px-6">
      <button
        onClick={onOpenMobileNav}
        className="flex size-9 items-center justify-center rounded-xl text-ink-500 hover:bg-ink-50 lg:hidden"
      >
        <Menu className="size-5" />
      </button>
      <CommandSearch />
      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />
        <div className="mx-1 h-6 w-px bg-[var(--color-border)]" />
        <UserMenu {...user} />
      </div>
    </header>
  );
}
