/**
 * Original flat illustrations of THIRD SPACE's rooms, used until real
 * photos of the venue exist. Palette from tokens: warm white, orange, near-black.
 * Decorative only (aria-hidden); every place that uses them also has text.
 */
type P = { className?: string };
const C = { cream: "#FFF8F2", sand: "#FFE3CC", gold: "#FF7A1A", goldDeep: "#A84300", ink: "#1C1410", grey: "#4A3A30", white: "#FFFFFF" };

export function PodcastScene({ className }: P) {
  return (
    <svg viewBox="0 0 400 300" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="300" fill={C.cream} />
      {/* acoustic panels */}
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={40 + i * 82} y="34" width="66" height="96" rx="10" fill={i % 2 ? C.sand : "#FFD2AE"} />
      ))}
      {/* on-air sign */}
      <rect x="160" y="148" width="80" height="24" rx="12" fill={C.ink} />
      <circle cx="176" cy="160" r="5" fill="#E24B3B" />
      <rect x="188" y="156" width="40" height="8" rx="4" fill={C.gold} />
      {/* desk */}
      <rect x="30" y="226" width="340" height="18" rx="6" fill={C.ink} />
      <rect x="60" y="244" width="12" height="56" fill={C.grey} />
      <rect x="328" y="244" width="12" height="56" fill={C.grey} />
      {/* mic arms */}
      <path d="M110 226 v-30 l40 -30" stroke={C.grey} strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M290 226 v-30 l-40 -30" stroke={C.grey} strokeWidth="6" strokeLinecap="round" fill="none" />
      <rect x="138" y="140" width="26" height="44" rx="13" fill={C.gold} transform="rotate(-35 151 162)" />
      <rect x="236" y="140" width="26" height="44" rx="13" fill={C.gold} transform="rotate(35 249 162)" />
      {/* headphones on desk */}
      <path d="M172 226 a28 22 0 0 1 56 0" stroke={C.ink} strokeWidth="6" fill="none" />
      <rect x="164" y="214" width="14" height="14" rx="4" fill={C.goldDeep} />
      <rect x="222" y="214" width="14" height="14" rx="4" fill={C.goldDeep} />
      {/* laptop */}
      <rect x="40" y="206" width="52" height="20" rx="3" fill={C.white} stroke={C.ink} strokeWidth="3" />
    </svg>
  );
}

export function RoomScene({ className }: P) {
  return (
    <svg viewBox="0 0 400 300" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="300" fill={C.sand} />
      {/* screen glow */}
      <ellipse cx="200" cy="96" rx="170" ry="70" fill={C.gold} opacity="0.18" />
      <rect x="70" y="36" width="260" height="120" rx="10" fill="#4A3A30" stroke={C.gold} strokeWidth="3" />
      <rect x="84" y="50" width="232" height="92" rx="6" fill="#FFFFFF" opacity="0.92" />
      <circle cx="200" cy="96" r="18" fill={C.gold} />
      <path d="M194 86 v20 l16 -10z" fill={C.ink} />
      {/* floor */}
      <rect y="230" width="400" height="70" fill="#FFD9B8" />
      {/* recliner sofa */}
      <rect x="60" y="186" width="280" height="54" rx="20" fill="#FF9240" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={76 + i * 86} y="172" width="76" height="48" rx="16" fill="#FF7A1A" />
      ))}
      <rect x="46" y="192" width="24" height="52" rx="10" fill="#E2620B" />
      <rect x="330" y="192" width="24" height="52" rx="10" fill="#E2620B" />
      {/* lamp */}
      <rect x="364" y="120" width="4" height="110" fill={C.grey} />
      <path d="M350 120 h32 l-8 -24 h-16z" fill={C.gold} />
      {/* popcorn */}
      <path d="M22 230 l6 -36 h28 l6 36z" fill={C.white} />
      <path d="M30 194 l2 36 M42 194 v36 M54 194 l-2 36" stroke="#E24B3B" strokeWidth="3" />
      <circle cx="36" cy="190" r="7" fill="#FFF6DD" />
      <circle cx="48" cy="188" r="7" fill="#FFF6DD" />
    </svg>
  );
}

export function CelebrationScene({ className }: P) {
  const balloons: [number, number, string][] = [
    [80, 90, C.gold],
    [130, 64, C.ink],
    [300, 70, C.gold],
    [345, 100, C.white],
    [255, 54, C.goldDeep],
  ];
  return (
    <svg viewBox="0 0 400 300" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="300" fill={C.cream} />
      {/* bunting */}
      <path d="M0 26 Q200 70 400 26" stroke={C.goldDeep} strokeWidth="2" fill="none" />
      {Array.from({ length: 9 }, (_, i) => {
        const x = 20 + i * 45;
        const y = 26 + Math.sin((i / 8) * Math.PI) * 22;
        return <path key={i} d={`M${x} ${y} l14 0 l-7 18z`} fill={i % 2 ? C.gold : C.ink} />;
      })}
      {/* balloons */}
      {balloons.map(([x, y, c], i) => (
        <g key={i}>
          <path d={`M${x} ${y + 30} q-6 40 6 80`} stroke={C.grey} strokeWidth="1.5" fill="none" />
          <ellipse cx={x} cy={y} rx="24" ry="30" fill={c} stroke={c === C.white ? C.sand : "none"} strokeWidth="2" />
        </g>
      ))}
      {/* table and cake */}
      <rect x="120" y="236" width="160" height="14" rx="6" fill={C.ink} />
      <rect x="150" y="196" width="100" height="40" rx="8" fill={C.white} stroke={C.sand} strokeWidth="2" />
      <path d="M150 210 q12 10 25 0 t25 0 t25 0 t25 0" stroke={C.gold} strokeWidth="4" fill="none" />
      <rect x="168" y="168" width="64" height="30" rx="7" fill={C.gold} />
      {[184, 200, 216].map((x) => (
        <g key={x}>
          <rect x={x - 2} y="150" width="4" height="18" fill={C.white} />
          <ellipse cx={x} cy="146" rx="3" ry="5" fill="#F2A23A" />
        </g>
      ))}
      {/* sparkles */}
      {[
        [60, 200],
        [340, 210],
        [300, 170],
      ].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y - 10} L${x + 3} ${y - 3} L${x + 10} ${y} L${x + 3} ${y + 3} L${x} ${y + 10} L${x - 3} ${y + 3} L${x - 10} ${y} L${x - 3} ${y - 3}z`} fill={C.gold} />
      ))}
    </svg>
  );
}

export function CreatorScene({ className }: P) {
  return (
    <svg viewBox="0 0 400 300" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="300" fill={C.sand} />
      {/* backdrop sweep */}
      <path d="M90 20 h220 v200 q0 40 -40 40 h-140 q-40 0 -40 -40z" fill={C.cream} />
      {/* ring light */}
      <rect x="296" y="120" width="4" height="150" fill={C.grey} />
      <circle cx="298" cy="100" r="36" fill="none" stroke={C.gold} strokeWidth="12" />
      <circle cx="298" cy="100" r="36" fill="none" stroke="#FFF6DD" strokeWidth="4" />
      {/* tripod with phone */}
      <path d="M150 270 l20 -90 l20 90 M170 180 v90" stroke={C.ink} strokeWidth="5" strokeLinecap="round" fill="none" />
      <rect x="152" y="120" width="36" height="62" rx="8" fill={C.ink} />
      <rect x="157" y="127" width="26" height="46" rx="4" fill={C.gold} />
      <circle cx="170" cy="150" r="7" fill={C.ink} />
      {/* softbox */}
      <path d="M40 60 h70 l-20 60 h-30z" fill={C.white} stroke={C.grey} strokeWidth="3" />
      <rect x="73" y="120" width="4" height="150" fill={C.grey} />
      {/* product on plinth */}
      <rect x="222" y="214" width="60" height="46" rx="6" fill={C.white} />
      <rect x="236" y="184" width="32" height="30" rx="8" fill={C.goldDeep} />
    </svg>
  );
}
