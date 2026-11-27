"use client";

import Link from "next/link";
import { useState } from "react";

export type ServiceItem = {
  id: string;
  mode: "theatre" | "podcast" | "studio";
  name: string;
  meta: string;
  price: string;
  summary: string;
  href: string;
  soon: boolean;
};

type Labels = { title: string; all: string; theatre: string; podcast: string; studio: string; book: string; soon: string };

/**
 * Mode Tabs (All, Theatre, Podcast, Studio) filtering the three Service Cards. Without JavaScript every card is
 * shown (the default tab is "All"). Each card carries its mode colour (ember, amber, teal).
 */
export function ModeServices({ items, labels }: { items: ServiceItem[]; labels: Labels }) {
  const [mode, setMode] = useState<"all" | ServiceItem["mode"]>("all");
  const tabs: { id: "all" | ServiceItem["mode"]; label: string }[] = [
    { id: "all", label: labels.all },
    { id: "theatre", label: labels.theatre },
    { id: "podcast", label: labels.podcast },
    { id: "studio", label: labels.studio },
  ];
  const shown = items.filter((i) => mode === "all" || i.mode === mode);
  return (
    <div data-testid="mode-services">
      <div role="tablist" aria-label={labels.title} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            role="tab"
            type="button"
            id={`mode-tab-${tb.id}`}
            aria-selected={mode === tb.id}
            aria-controls="mode-panel"
            data-mode={tb.id === "all" ? undefined : tb.id}
            className="ts-tab"
            data-testid={`mode-tab-${tb.id}`}
            onClick={() => setMode(tb.id)}
          >
            {tb.id !== "all" && <span className="ts-dot" data-mode={tb.id} aria-hidden="true" />}
            {tb.label}
          </button>
        ))}
      </div>
      <div id="mode-panel" role="tabpanel" aria-labelledby={`mode-tab-${mode}`} className="mt-4 grid gap-4 md:grid-cols-3">
        {shown.map((s) => (
          <article key={s.id} className="ts-card ts-service-card flex flex-col p-6 pt-7" data-mode={s.mode} data-testid="service-card">
            <p className="t-overline" style={{ color: `var(--ts-mode-${s.mode}-text)` }}>
              {s.mode === "theatre" ? labels.theatre : s.mode === "podcast" ? labels.podcast : labels.studio}
            </p>
            <h3 className="t-h2 mt-1">{s.name}</h3>
            <p className="t-body-m mt-1 text-muted">{s.meta}</p>
            <p className="t-body-m mt-3 text-muted">{s.summary}</p>
            <p className="t-price mt-4" data-testid="service-price">
              {s.price}
            </p>
            <div className="mt-auto pt-5">
              {s.soon ? (
                <span className="ts-btn ts-btn-ghost w-full opacity-70" aria-disabled="true">
                  {labels.soon}
                </span>
              ) : (
                <Link href={s.href} className="ts-btn ts-btn-primary w-full">
                  {labels.book}
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
