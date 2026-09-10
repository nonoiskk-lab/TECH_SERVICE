"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, ChevronDown } from "lucide-react";
import { Avatar } from "@/components/ui/misc";
import { ROLE_LABELS, type Role } from "@/lib/constants";

export function UserMenu({ name, email, role }: { name: string; email: string; role: Role }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const router = useRouter();

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-ink-50"
      >
        <Avatar name={name} />
        <div className="hidden text-left sm:block">
          <p className="text-sm font-semibold leading-tight text-ink-900">{name}</p>
          <p className="text-xs leading-tight text-ink-500">{ROLE_LABELS[role]}</p>
        </div>
        <ChevronDown className="size-4 text-ink-400" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-[var(--color-border)] bg-white p-1.5 shadow-[var(--shadow-popover)]">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-ink-900">{name}</p>
            <p className="truncate text-xs text-ink-500">{email}</p>
          </div>
          <div className="my-1 h-px bg-[var(--color-border)]" />
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-danger-600 hover:bg-danger-50"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
