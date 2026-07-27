/**
 * TreeSVG — Phase 1: a terracotta pot, optionally with a sprout in it.
 *
 * Branch and leaf geometry arrives in a later phase, when a procedural layout
 * function turns sessions into shapes. For now the only two states are "empty
 * pot" (the invitation to plant) and "sprout" (a tree with no sessions yet), so
 * the pot coordinates live here. They move into the layout module later, once
 * something other than this file needs to know where the soil line sits.
 */

// One shared coordinate space for every drawing in the app; components scale it
// with CSS so nothing hardcodes pixel sizes. POT_FRAME below is the slice of it
// that Phase 1 actually shows.
const CANVAS = { width: 320, height: 460 };
const POT = { soilY: 364, rimTop: 348, rimBottom: 368, bottomY: 444 };
const TRUNK_X = 160;

/**
 * What the SVG actually shows.
 *
 * All the drawing coordinates below live in the full 320x460 canvas, because
 * that space is sized for a mature tree's canopy. In Phase 1 the only things
 * drawn are a pot and a sprout, which sit in the bottom fifth of it — so
 * showing the whole canvas renders a small pot floating in a tall empty box.
 *
 * The viewBox crops to the pot instead. Same coordinates, tighter frame. When
 * branches arrive, this widens to the full canvas as the tree grows.
 */
const POT_FRAME = '96 300 128 160';

const LEAF_PATH = 'M 0 0 C 5 -6 13 -7 17 0 C 13 7 5 6 0 0 Z';

export default function TreeSVG({ planted = true, grew = false, idle = true, className = '' }) {
  return (
    <svg
      viewBox={POT_FRAME}
      className={className}
      role="img"
      aria-label={planted ? 'A sprout in a terracotta pot' : 'An empty terracotta pot'}
    >
      <defs>
        <path id="leaf-shape" d={LEAF_PATH} />
        <linearGradient id="pot-face" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#B96C4C" />
          <stop offset="45%" stopColor="#C77B58" />
          <stop offset="100%" stopColor="#A85F42" />
        </linearGradient>
      </defs>

      {/* Everything above the soil sways together, so the plant bends as one
          thing. The origin is the base — the point that cannot move. */}
      {planted && (
        <g
          className={idle ? 'canopy-sway' : undefined}
          style={{ transformOrigin: `${TRUNK_X}px ${POT.soilY}px` }}
        >
          {/* Nested on purpose: a CSS `transform` animation beats an SVG
              transform *attribute*, so the sway and the unfurl each need their
              own element or they cancel each other out. */}
          <g className={grew ? 'leaf-grow' : undefined}>
            <Sprout x={TRUNK_X} baseY={POT.soilY} />
          </g>
        </g>
      )}

      {/* Drawn after the plant, so the rim overlaps the stem and the sprout
          reads as coming out of the soil rather than sitting on top of it. */}
      <Pot />
    </svg>
  );
}

/**
 * A newly planted sapling: a stem and two seed leaves.
 * The tip clears the rim, which covers roughly the lowest 16 units above soil.
 */
function Sprout({ x, baseY }) {
  const tip = baseY - 46;
  return (
    <g>
      <path
        d={`M ${x} ${baseY} Q ${x - 3} ${baseY - 26} ${x} ${tip}`}
        fill="none"
        stroke="#7A9B76"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <use href="#leaf-shape" fill="#A8C09A" transform={`translate(${x} ${tip + 1}) rotate(-34)`} />
      <use
        href="#leaf-shape"
        fill="#7A9B76"
        transform={`translate(${x} ${tip + 5}) rotate(-146)`}
      />
    </g>
  );
}

function Pot() {
  const { rimTop, rimBottom, bottomY } = POT;
  return (
    <g>
      {/* soil, domed slightly so a sliver shows above the rim */}
      <path
        d={`M 118 ${rimTop + 6} Q 160 ${rimTop - 4} 202 ${rimTop + 6} L 202 ${rimTop + 10} L 118 ${rimTop + 10} Z`}
        fill="#4A3B28"
      />
      {/* body, tapering toward the base */}
      <path
        d={`M 112 ${rimBottom} L 124 ${bottomY - 6} Q 126 ${bottomY} 134 ${bottomY} L 186 ${bottomY} Q 194 ${bottomY} 196 ${bottomY - 6} L 208 ${rimBottom} Z`}
        fill="url(#pot-face)"
      />
      <rect x="106" y={rimTop} width="108" height={rimBottom - rimTop} rx="7" fill="#D08A67" />
      {/* one highlight and one shadow: enough to read as clay */}
      <path
        d={`M 132 ${rimBottom + 6} L 141 ${bottomY - 10}`}
        stroke="#DD9877"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.5"
      />
      <ellipse cx="160" cy={bottomY + 4} rx="46" ry="6" fill="#5C4A32" opacity="0.16" />
    </g>
  );
}
