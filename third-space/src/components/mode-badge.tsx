/**
 * Mode badges: one small original mark per mode (theatre = screen with play, podcast = microphone,
 * studio = camera with light). Ink on the mode colour (ink on ember, amber and teal is 5:1 or better).
 * Decorative: the mode name is always written next to it.
 */
export type Mode = "theatre" | "podcast" | "studio";

export function ModeBadge({ mode, className = "h-9 w-9" }: { mode: Mode; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" data-testid="mode-badge" data-mode={mode}>
      <circle cx="24" cy="24" r="23" fill={`var(--ts-mode-${mode})`} />
      {mode === "theatre" && (
        <g fill="none" stroke="#1C1410" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="11" y="14" width="26" height="17" rx="3" />
          <path d="M21 18.5v8l7-4z" fill="#1C1410" />
          <path d="M17 36h14" />
        </g>
      )}
      {mode === "podcast" && (
        <g fill="none" stroke="#1C1410" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="19" y="10" width="10" height="18" rx="5" fill="#1C1410" />
          <path d="M14 23a10 10 0 0 0 20 0M24 33v5M18 38h12" />
        </g>
      )}
      {mode === "studio" && (
        <g fill="none" stroke="#1C1410" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="10" y="16" width="20" height="16" rx="3" />
          <path d="M30 22l8-4v12l-8-4z" />
          <circle cx="20" cy="24" r="3.5" fill="#1C1410" />
        </g>
      )}
    </svg>
  );
}
