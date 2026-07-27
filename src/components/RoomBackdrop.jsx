/**
 * The room the whole app sits inside: wall, window, and floor, built from SVG
 * layers so it scales cleanly and never loads an image.
 *
 * It is decoration, so it is aria-hidden and fixed behind the content.
 */
export default function RoomBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Wall: a warm vertical wash, lighter near the window. */}
      <div className="absolute inset-0 bg-gradient-to-b from-cream-deep via-cream to-cream" />

      {/* Light spilling from the window across the wall. */}
      <div
        className="absolute -top-24 right-[8%] h-[520px] w-[420px] rounded-full opacity-50 blur-3xl"
        style={{ background: 'radial-gradient(circle, #FFF6E0 0%, transparent 70%)' }}
      />

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMax slice"
      >
        {/* Window, set back on the right. Sized in the same space as the wall so
            it stays put as the viewport changes. */}
        <g transform="translate(880 90)">
          <rect x="-14" y="-14" width="368" height="298" rx="18" fill="#5C4A32" opacity="0.92" />
          <rect x="0" y="0" width="340" height="270" rx="10" fill="#CFE3EC" />
          {/* sky gradient + a couple of soft clouds */}
          <rect x="0" y="0" width="340" height="270" rx="10" fill="url(#sky)" />
          <ellipse cx="96" cy="74" rx="52" ry="22" fill="#FFFDF7" opacity="0.75" />
          <ellipse cx="140" cy="66" rx="38" ry="18" fill="#FFFDF7" opacity="0.6" />
          <ellipse cx="248" cy="150" rx="44" ry="18" fill="#FFFDF7" opacity="0.45" />
          {/* distant hills, so the window has depth */}
          <path
            d="M 0 214 Q 84 168 168 214 T 340 206 L 340 270 L 0 270 Z"
            fill="#A8C09A"
            opacity="0.75"
          />
          <path
            d="M 0 240 Q 120 206 240 242 T 340 236 L 340 270 L 0 270 Z"
            fill="#7A9B76"
            opacity="0.7"
          />
          {/* mullions */}
          <rect x="164" y="0" width="12" height="270" fill="#5C4A32" opacity="0.92" />
          <rect x="0" y="128" width="340" height="12" fill="#5C4A32" opacity="0.92" />
          {/* sill */}
          <rect x="-30" y="284" width="400" height="18" rx="8" fill="#6B5436" />
        </g>

        {/* Floor: a single plank line and a wide board, kept very quiet. */}
        <rect x="0" y="742" width="1440" height="158" fill="#E4D3B0" />
        <rect x="0" y="742" width="1440" height="10" fill="#C9B48C" />
        <path d="M 0 800 H 1440" stroke="#D6C29B" strokeWidth="3" />
        <path d="M 0 856 H 1440" stroke="#D6C29B" strokeWidth="3" />

        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#BFDCEA" />
            <stop offset="60%" stopColor="#DCEBEF" />
            <stop offset="100%" stopColor="#F2F0E0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
