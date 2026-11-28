/**
 * Original empty-state and error illustrations (orange, ink and warm white). Decorative (aria-hidden):
 * the text next to each one carries the message.
 */
const C = { ink: "#1C1410", orange: "#FF7A1A", orangeDeep: "#A84300", sand: "#FFE3CC", warm: "#FFF8F2", line: "#F1D9C6" };

type P = { className?: string };

/** 404: an empty room, the door ajar with light spilling out. */
export function NotFoundArt({ className }: P) {
  return (
    <svg viewBox="0 0 320 220" className={className} aria-hidden="true" data-testid="art-404">
      <rect width="320" height="220" rx="24" fill={C.warm} />
      <rect x="0" y="176" width="320" height="44" fill={C.sand} />
      <path d="M96 176V70a64 64 0 0 1 128 0v106z" fill={C.ink} />
      <path d="M128 176V82a32 32 0 0 1 64 0v94z" fill={C.orange} opacity="0.35" />
      <path d="M128 176V82a32 32 0 0 1 32-32v126z" fill="#FFFFFF" />
      <path d="M160 176l60 14H100z" fill={C.orange} opacity="0.25" />
      <circle cx="170" cy="130" r="4" fill={C.orange} />
      <text x="160" y="40" textAnchor="middle" fontSize="28" fontWeight="700" fill={C.orangeDeep} fontFamily="sans-serif">404</text>
      <circle cx="46" cy="60" r="5" fill={C.orange} />
      <circle cx="276" cy="92" r="4" fill={C.orangeDeep} />
    </svg>
  );
}

/** Nothing here yet: an open box with a small spark. */
export function EmptyArt({ className }: P) {
  return (
    <svg viewBox="0 0 200 140" className={className} aria-hidden="true" data-testid="art-empty">
      <ellipse cx="100" cy="124" rx="62" ry="8" fill={C.sand} />
      <path d="M44 62l56-24 56 24-56 24z" fill={C.sand} stroke={C.ink} strokeWidth="3" strokeLinejoin="round" />
      <path d="M44 62v42l56 22V86zM156 62v42l-56 22V86z" fill="#FFFFFF" stroke={C.ink} strokeWidth="3" strokeLinejoin="round" />
      <path d="M100 18l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill={C.orange} />
    </svg>
  );
}

/** Something went wrong: a plug pulled out of the wall. */
export function ErrorArt({ className }: P) {
  return (
    <svg viewBox="0 0 200 140" className={className} aria-hidden="true" data-testid="art-error">
      <rect x="20" y="40" width="64" height="60" rx="12" fill={C.sand} stroke={C.ink} strokeWidth="3" />
      <path d="M52 62v14M52 76v10" stroke={C.ink} strokeWidth="3" strokeLinecap="round" />
      <rect x="116" y="52" width="56" height="36" rx="10" fill={C.orange} stroke={C.ink} strokeWidth="3" />
      <path d="M116 62h-14M116 78h-14" stroke={C.ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M96 30l-6 16 10-2-6 18" fill="none" stroke={C.orangeDeep} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
