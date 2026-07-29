import { useMemo } from 'react';
import { layoutTree, POT, TRUNK_X } from '../lib/treeLayout.js';

/**
 * TreeSVG — draws whatever `treeLayout` derives from a tree's sessions.
 *
 * This component owns no geometry. Every coordinate on screen comes out of
 * `layoutTree`, including the viewBox, which is why a pot with no sessions still
 * renders exactly as it did in Phase 1: zero sessions is the `sprout` stage, and
 * that stage's frame is the old pot-only crop.
 *
 * The frame widens as the tree grows — see frameFor() in treeLayout.js for the
 * rule and its cost. Without that, branches would grow up into cropped space and
 * the canopy would render off-screen.
 *
 * @param planted       false draws the empty pot (the invitation to plant)
 * @param grew          the whole sprout just appeared — Phase 1's animation
 * @param idle          run the subtle sway
 * @param sessions      ordered session rows; [] means "not taught yet"
 * @param newSessionId  the one session whose branch or leaf should animate in
 * @param frameMode     'stage' shrink-wraps the viewBox to the growth stage;
 *                      'canvas' uses one frame for every stage, so a sprout is
 *                      genuinely small and the canopy grows up into the space
 *                      above it. See frameFor() in treeLayout.js.
 * @param preserveAspectRatio
 *                      defaults to bottom-anchored: when the box and the viewBox
 *                      disagree, the slack goes above the drawing, so the pot
 *                      stays planted on the floor of its container instead of
 *                      recentring every time the frame changes.
 */
export default function TreeSVG({
  planted = true,
  grew = false,
  idle = true,
  className = '',
  sessions = [],
  newSessionId = null,
  frameMode = 'stage',
  preserveAspectRatio = 'xMidYMax meet',
}) {
  // Layout is pure and cheap, but it runs on every render of every pot on the
  // shelf, so memoise on the identity of the list it was given.
  const tree = useMemo(
    () => layoutTree(planted ? sessions : [], { frame: frameMode }),
    [planted, sessions, frameMode],
  );
  const isSprout = tree.stage.name === 'sprout';

  return (
    <svg
      viewBox={tree.frame}
      preserveAspectRatio={preserveAspectRatio}
      className={className}
      role="img"
      aria-label={describe(planted, tree)}
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
          {isSprout ? (
            /* Nested on purpose: a CSS `transform` animation beats an SVG
               transform *attribute*, so the sway and the unfurl each need their
               own element or they cancel each other out. */
            <g className={grew ? 'leaf-grow' : undefined}>
              <Sprout x={TRUNK_X} baseY={POT.soilY} />
            </g>
          ) : (
            <>
              <path d={tree.trunk.d} fill={tree.trunk.color} />

              {/* Branches under leaves, so foliage sits on top of its own stem. */}
              {tree.branches.map((branch) => (
                <Branch key={branch.id} branch={branch} animate={branch.id === newSessionId} />
              ))}

              {tree.leaves.map((leaf) => (
                <Leaf key={leaf.id} leaf={leaf} animate={leaf.id === newSessionId} />
              ))}
            </>
          )}
        </g>
      )}

      {/* Drawn after the plant, so the rim overlaps the stem and the sprout
          reads as coming out of the soil rather than sitting on top of it. */}
      <Pot />
    </svg>
  );
}

/**
 * A branch: one quadratic Bézier, stroked.
 *
 * pathLength="1" normalises the path's length for stroke-dasharray, so the draw
 * animation needs no measurement of the actual curve. That is the only reason
 * the attribute is here.
 */
function Branch({ branch, animate }) {
  return (
    <path
      d={branch.d}
      pathLength="1"
      className={animate ? 'branch-draw' : undefined}
      fill="none"
      stroke={branch.color}
      strokeWidth={branch.width}
      strokeLinecap="round"
    />
  );
}

/**
 * A leaf. Three nested elements, each doing one job:
 *   outer  — position and facing, as SVG attributes
 *   middle — the scale animation, as CSS (see .leaf-unfurl)
 *   inner  — the leaf's own size
 * Collapsing these would put a CSS transform and a transform attribute on the
 * same element, and the CSS one silently wins.
 */
function Leaf({ leaf, animate }) {
  return (
    <g transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.angleDeg})`}>
      <g className={animate ? 'leaf-unfurl' : undefined}>
        <use href="#leaf-shape" fill={leaf.color} transform={`scale(${leaf.scale})`} />
      </g>
    </g>
  );
}

function describe(planted, tree) {
  if (!planted) return 'An empty terracotta pot';
  if (tree.stage.name === 'sprout') return 'A sprout in a terracotta pot';

  const branches = tree.branches.length;
  const leaves = tree.leaves.length;
  return `${tree.stage.label} in a terracotta pot, with ${branches} ${
    branches === 1 ? 'branch' : 'branches'
  } and ${leaves} ${leaves === 1 ? 'leaf' : 'leaves'}`;
}

const LEAF_PATH = 'M 0 0 C 5 -6 13 -7 17 0 C 13 7 5 6 0 0 Z';

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
