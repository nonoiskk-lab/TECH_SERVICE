"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, User, Wrench, Package, Truck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Result = {
  type: "customer" | "job" | "part" | "supplier";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

const ICONS = { customer: User, job: Wrench, part: Package, supplier: Truck };

export function CommandSearch() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<Result[]>([]);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results ?? []);
        }
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-sm items-center gap-2 rounded-xl border border-[var(--color-border)] bg-ink-50 px-3 text-sm text-ink-500 hover:bg-ink-100"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">Search customers, jobs, parts…</span>
        <span className="sm:hidden">Search…</span>
        <kbd className="ml-auto hidden rounded border border-ink-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-ink-500 sm:block">
          ⌘K
        </kbd>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-24">
            <div className="fixed inset-0 bg-ink-900/50" onClick={() => setOpen(false)} />
            <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-[var(--shadow-popover)]">
              <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
                <Search className="size-5 text-ink-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by customer, mobile, job ID, laptop model, part, supplier…"
                  className="flex-1 border-0 text-sm text-ink-900 outline-none placeholder:text-ink-400"
                />
                {loading && <Loader2 className="size-4 animate-spin text-ink-400" />}
              </div>
              <div className="max-h-96 overflow-y-auto scroll-thin p-2">
                {!loading && query && results.length === 0 && (
                  <p className="p-6 text-center text-sm text-ink-500">No results for &ldquo;{query}&rdquo;</p>
                )}
                {!query && (
                  <p className="p-6 text-center text-sm text-ink-400">
                    Start typing to search across the whole system.
                  </p>
                )}
                {results.map((r) => {
                  const Icon = ICONS[r.type];
                  return (
                    <button
                      key={`${r.type}-${r.id}`}
                      onClick={() => go(r.href)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-ink-50"
                      )}
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-900">{r.title}</p>
                        <p className="truncate text-xs text-ink-500">{r.subtitle}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
