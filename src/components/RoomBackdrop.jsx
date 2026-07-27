/**
 * The room every screen sits inside: wall, window, and floor.
 *
 * Two positioning decisions worth understanding, because both were bugs first:
 *
 * 1. The wall is `fixed` (it should never scroll), but the floor is `absolute`.
 *    A fixed floor parks itself at the bottom of the *viewport*, so content
 *    scrolls straight through it and you get a hard line cutting across cards.
 *    Absolute anchors it to the bottom of the *page* instead — it is the floor
 *    of the room, not a stripe on the screen.
 *
 * 2. The window is placed with CSS rather than living inside one huge SVG
 *    viewBox. A 1440-wide viewBox scaled to cover a phone screen pushes the
 *    window entirely off the right edge. Positioning the element and letting it
 *    carry its own small viewBox keeps it where it belongs at any width.
 *
 * All decoration, so the whole thing is aria-hidden.
 */
export default function RoomBackdrop() {
  return (
    <div aria-hidden="true">
      {/* Wall: a warm vertical wash. */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-cream-deep via-cream to-cream" />

      {/* Light spilling in from the window. */}
      <div
        className="pointer-events-none fixed -top-24 right-[4%] -z-10 h-[520px] w-[420px] rounded-full opacity-50 blur-3xl"
        style={{ background: 'radial-gradient(circle, #FFF6E0 0%, transparent 70%)' }}
      />

      {/* Window. Hidden on narrow screens, where there is no room for it beside
          the heading and it would only crowd the text. */}
      <div className="pointer-events-none fixed top-14 right-[5%] -z-10 hidden w-[clamp(200px,26vw,330px)] sm:block">
        <Window />
      </div>

      {/* Floor, at the bottom of the page. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-24 sm:h-28">
        <Floor />
      </div>
    </div>
  );
}

function Window() {
  return (
    <svg viewBox="0 0 368 322" className="h-auto w-full">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#BFDCEA" />
          <stop offset="60%" stopColor="#DCEBEF" />
          <stop offset="100%" stopColor="#F2F0E0" />
        </linearGradient>
      </defs>

      {/* frame */}
      <rect x="0" y="0" width="368" height="298" rx="18" fill="#5C4A32" opacity="0.92" />
      {/* glass */}
      <rect x="14" y="14" width="340" height="270" rx="10" fill="url(#sky)" />
      {/* clouds */}
      <ellipse cx="110" cy="88" rx="52" ry="22" fill="#FFFDF7" opacity="0.75" />
      <ellipse cx="154" cy="80" rx="38" ry="18" fill="#FFFDF7" opacity="0.6" />
      <ellipse cx="262" cy="164" rx="44" ry="18" fill="#FFFDF7" opacity="0.45" />
      {/* hills, so the view has depth */}
      <path
        d="M 14 228 Q 98 182 182 228 T 354 220 L 354 284 L 14 284 Z"
        fill="#A8C09A"
        opacity="0.75"
      />
      <path
        d="M 14 254 Q 134 220 254 256 T 354 250 L 354 284 L 14 284 Z"
        fill="#7A9B76"
        opacity="0.7"
      />
      {/* mullions */}
      <rect x="178" y="14" width="12" height="270" fill="#5C4A32" opacity="0.92" />
      <rect x="14" y="142" width="340" height="12" fill="#5C4A32" opacity="0.92" />
      {/* sill */}
      <rect x="-8" y="298" width="384" height="18" rx="8" fill="#6B5436" />
    </svg>
  );
}

function Floor() {
  // preserveAspectRatio="none" lets the boards stretch to any width without
  // distorting anything that matters — they are just horizontal bands.
  return (
    <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="h-full w-full">
      <rect x="0" y="0" width="1440" height="120" fill="#E4D3B0" />
      <rect x="0" y="0" width="1440" height="8" fill="#C9B48C" />
      <path d="M 0 46 H 1440" stroke="#D6C29B" strokeWidth="3" />
      <path d="M 0 88 H 1440" stroke="#D6C29B" strokeWidth="3" />
    </svg>
  );
}
