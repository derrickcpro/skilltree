/**
 * treeLayout.js — ordered sessions in, SVG geometry out. Pure, no React, no DOM.
 *
 * This is the file that makes "branches and leaves are never stored" true. The
 * database holds sessions; this function derives the picture. Give it the same
 * rows and it returns the same numbers, so the tree is reproducible from history
 * on any device.
 *
 * Section 4's derivation rule, implemented literally:
 *   - one branch per `major`, alternating sides, angle spread narrowing as the
 *     tree grows
 *   - one leaf per `minor`, on the most recent branch until that branch holds 5,
 *     then spread across branches
 *   - no branches yet -> leaves attach to the trunk
 *   - each session's id seeds its own wobble
 *   - four trunk growth stages by session count
 *
 * The coordinate space is shared with TreeSVG: a 320x460 box sized for a mature
 * canopy, with the pot at the bottom. These constants used to live in TreeSVG;
 * they moved here the moment something other than the renderer needed to know
 * where the soil line sits.
 */

import { jitterFromId } from './seededRandom.js';

export const CANVAS = { width: 320, height: 460 };
export const POT = { soilY: 364, rimTop: 348, rimBottom: 368, bottomY: 444 };
export const TRUNK_X = 160;

/** The two palette greens. Foliage picks between them by seed. */
export const FOLIAGE = ['#7A9B76', '#A8C09A'];

/** How far a leaf can stick out from its anchor point, at scale 1. Matches the
 *  length of LEAF_PATH in TreeSVG — if that path changes, change this. */
export const LEAF_REACH = 20;

/** Section 4: "round-robin across branches if the latest branch has 5+ leaves". */
const LEAVES_PER_BRANCH = 5;

/** Breathing room added around content when the stage frame is too tight. */
const FRAME_PAD = 10;

/**
 * The four trunk growth stages. Ordered highest-threshold-first so a plain
 * `find` picks the right one.
 *
 * `frame` is the SVG viewBox for the stage, as [x, y, width, height]. Every one
 * is centred on TRUNK_X and bottomed at the canvas floor, so the pot sits in the
 * same place in all four — only the headroom above it changes. See frameFor()
 * for why this is a table rather than a fit to the content.
 */
const STAGES = [
  {
    name: 'mature',
    label: 'Mature tree',
    min: 15,
    trunkLength: 205,
    baseWidth: 15,
    tipWidth: 4,
    branchLength: 78,
    trunkColor: '#8B6F47',
    frame: [4, 96, 312, 364],
  },
  {
    name: 'young',
    label: 'Young tree',
    min: 5,
    trunkLength: 150,
    baseWidth: 11,
    tipWidth: 3.2,
    branchLength: 62,
    trunkColor: '#8B6F47',
    frame: [40, 170, 240, 290],
  },
  {
    name: 'sapling',
    label: 'Sapling',
    min: 1,
    trunkLength: 84,
    baseWidth: 7,
    tipWidth: 2.6,
    branchLength: 46,
    // A sapling's stem is still green, like the sprout it just replaced.
    trunkColor: '#7A9B76',
    frame: [64, 256, 192, 204],
  },
  {
    name: 'sprout',
    label: 'Sprout',
    min: 0,
    trunkLength: 0,
    baseWidth: 0,
    tipWidth: 0,
    branchLength: 0,
    trunkColor: '#7A9B76',
    // Phase 1's pot-only frame, unchanged: a sprout in the full canvas is a
    // small plant floating in a tall empty box.
    frame: [96, 300, 128, 160],
  },
];

/**
 * Branch placement. The two index-driven curves here are the heart of the
 * derivation rule, so they are named rather than inlined.
 */
const BRANCH = {
  // Height up the trunk, as a fraction of trunk length:
  //   attachT(i) = 0.30 + 0.60 * (1 - e^(-0.28 i))
  // Monotonic, asymptotic to 0.90, and — the reason for the exponential —
  // *stable*: branch 2 sits at the same fraction whether the tree has three
  // branches or thirty. Spreading n branches evenly would slide every existing
  // branch each time a new one appeared. Cost: spacing compresses, so past
  // ~8 majors the upper branches crowd.
  firstAttach: 0.3,
  attachSpan: 0.6,
  attachRate: 0.28,

  // "Decreasing angle spread as the tree grows", read per branch index: early
  // branches sweep wide, later ones point up, which builds a conical crown.
  maxAngle: 62,
  angleStep: 6,
  minAngle: 26,

  // Higher branches are shorter, for the same conical reason.
  heightTaper: 0.35,
};

/** Where leaves sit along their host, as Bézier parameters. */
const BRANCH_LEAF_SLOTS = [0.52, 0.64, 0.76, 0.88, 0.99];
const TRUNK_LEAF_SLOTS = [0.45, 0.58, 0.71, 0.84, 0.95];

// ------------------------------------------------------------------ geometry

/** A point on a quadratic Bézier at parameter t. */
function quadPoint(p0, c, p1, t) {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x,
    y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y,
  };
}

/** The derivative — the direction the curve is heading at t. */
function quadTangent(p0, c, p1, t) {
  const u = 1 - t;
  return {
    x: 2 * (u * (c.x - p0.x) + t * (p1.x - c.x)),
    y: 2 * (u * (c.y - p0.y) + t * (p1.y - c.y)),
  };
}

/** Rotate a vector by `deg`. Positive is clockwise, because SVG's y axis points down. */
function rotate(v, deg) {
  const a = (deg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
}

function unit(v) {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

function degOf(v) {
  return (Math.atan2(v.y, v.x) * 180) / Math.PI;
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

/** Two decimals is more than enough for a 320-unit canvas, and keeps `d` short. */
function r2(n) {
  return Math.round(n * 100) / 100;
}

function point(p) {
  return { x: r2(p.x), y: r2(p.y) };
}

// -------------------------------------------------------------------- pieces

function stageFor(sessionCount) {
  return STAGES.find((stage) => sessionCount >= stage.min);
}

/**
 * The growth stage for a session count, without computing a whole tree.
 * Exported so UI text and the drawing can never disagree about how grown a tree
 * is — there is one copy of the thresholds and this is it.
 */
export function growthStage(sessionCount) {
  const stage = stageFor(Math.max(0, Number(sessionCount) || 0));
  return { name: stage.name, label: stage.label };
}

/**
 * The trunk: a tapered shape, not a stroke, so it can be thick at the soil and
 * thin at the tip. Two quadratic curves — up the left edge, down the right —
 * closed across the top. The lean is fixed rather than seeded: the trunk belongs
 * to the tree, and the tree has no id in this function's input.
 */
function makeTrunk(stage) {
  const base = { x: TRUNK_X, y: POT.soilY };
  const tip = { x: TRUNK_X - 2, y: POT.soilY - stage.trunkLength };
  const ctrl = { x: TRUNK_X + 4, y: POT.soilY - stage.trunkLength * 0.55 };

  const halfBase = stage.baseWidth / 2;
  const halfTip = stage.tipWidth / 2;

  const d = [
    `M ${r2(base.x - halfBase)} ${r2(base.y)}`,
    `Q ${r2(ctrl.x - halfTip)} ${r2(ctrl.y)} ${r2(tip.x - halfTip)} ${r2(tip.y)}`,
    `L ${r2(tip.x + halfTip)} ${r2(tip.y)}`,
    `Q ${r2(ctrl.x + halfTip)} ${r2(ctrl.y)} ${r2(base.x + halfBase)} ${r2(base.y)}`,
    'Z',
  ].join(' ');

  return {
    base: point(base),
    ctrl: point(ctrl),
    tip: point(tip),
    baseWidth: stage.baseWidth,
    tipWidth: stage.tipWidth,
    color: stage.trunkColor,
    d,
    // The centreline, for hanging trunk leaves off. Not the same as the outline.
    curve: { p0: base, c: ctrl, p1: tip },
  };
}

/**
 * One branch, from one major session.
 *
 * The curve arcs: it leaves the trunk at `angleDeg` from vertical, and its
 * control point is that same direction rotated a little further outward. The
 * effect is a branch that starts wide and finishes pointing up, which is both
 * what real branches do and what keeps the crown from looking like a starburst.
 */
function makeBranch(seedId, index, trunk, stage) {
  const rnd = jitterFromId(seedId);

  const attachT =
    BRANCH.firstAttach + BRANCH.attachSpan * (1 - Math.exp(-BRANCH.attachRate * index));
  const side = index % 2 === 0 ? 1 : -1;

  // Draw order is fixed. See the note in seededRandom.js.
  const angleDeg =
    Math.max(BRANCH.minAngle, BRANCH.maxAngle - BRANCH.angleStep * index) + rnd.around(5);
  const length = stage.branchLength * (1 - BRANCH.heightTaper * attachT) * rnd.between(0.88, 1.12);
  const bow = rnd.between(10, 22);

  const from = quadPoint(trunk.curve.p0, trunk.curve.c, trunk.curve.p1, attachT);
  const a = (angleDeg * Math.PI) / 180;
  const dir = { x: side * Math.sin(a), y: -Math.cos(a) };
  const to = { x: from.x + dir.x * length, y: from.y + dir.y * length };

  const bowed = rotate(dir, side * bow);
  const ctrl = { x: from.x + bowed.x * length * 0.55, y: from.y + bowed.y * length * 0.55 };

  return {
    id: seedId,
    sessionId: seedId,
    index,
    side,
    attachT: r2(attachT),
    angleDeg: r2(angleDeg),
    length: r2(length),
    width: r2(Math.max(2, stage.baseWidth * 0.5 * (1 - 0.3 * attachT))),
    color: stage.trunkColor,
    from: point(from),
    ctrl: point(ctrl),
    to: point(to),
    d: `M ${r2(from.x)} ${r2(from.y)} Q ${r2(ctrl.x)} ${r2(ctrl.y)} ${r2(to.x)} ${r2(to.y)}`,
    curve: { p0: from, c: ctrl, p1: to },
  };
}

/**
 * One leaf, from one minor session, hung off a host curve (a branch, or the
 * trunk when there are no branches yet).
 *
 * `indexOnHost` picks a slot along the curve. Past five, slots repeat one ring
 * further inward, so a heavily-loaded branch layers foliage rather than stacking
 * it in the same five places.
 */
function makeLeaf(seedId, indexOnHost, host, slots) {
  const rnd = jitterFromId(seedId);

  const ring = Math.floor(indexOnHost / slots.length);
  const t = clamp(slots[indexOnHost % slots.length] - ring * 0.09 + rnd.around(0.02), 0.3, 0.99);
  // Alternate sides so foliage fans out instead of forming a single row.
  const side = indexOnHost % 2 === 0 ? 1 : -1;

  const { p0, c, p1 } = host.curve;
  const at = quadPoint(p0, c, p1, t);
  const tangent = quadTangent(p0, c, p1, t);
  const normal = unit({ x: -tangent.y, y: tangent.x });

  // Lift the leaf off the stroke's centreline, or half of it hides under the branch.
  const anchor = { x: at.x + normal.x * 2.5 * side, y: at.y + normal.y * 2.5 * side };

  return {
    id: seedId,
    sessionId: seedId,
    host: host.kind,
    hostId: host.id,
    indexOnHost,
    t: r2(t),
    x: r2(anchor.x),
    y: r2(anchor.y),
    // Leaves point away from their host, roughly 40 degrees off its direction.
    angleDeg: r2(degOf(tangent) + side * 42 + rnd.around(10)),
    scale: r2(rnd.between(0.85, 1.15)),
    color: rnd.pick(FOLIAGE),
  };
}

/**
 * Which branch a leaf lands on.
 *
 * Most recent branch while it has room. On overflow, the least-loaded branch
 * wins, earliest index breaking ties. When every branch is equally loaded that
 * is exactly round-robin; when they are not, it repairs the imbalance instead of
 * preserving it. A rotating counter would keep handing leaves to a full branch
 * while another sat nearly bare, because it cannot see the state it is meant to
 * be balancing.
 *
 * Cost: a newly appended branch is empty, so it absorbs a burst of overflow
 * leaves until it catches up with its neighbours.
 */
function chooseHostBranch(branches, leafCounts) {
  const newest = branches[branches.length - 1];
  if ((leafCounts.get(newest.id) ?? 0) < LEAVES_PER_BRANCH) return newest;

  return branches.reduce(
    (best, b) => ((leafCounts.get(b.id) ?? 0) < (leafCounts.get(best.id) ?? 0) ? b : best),
    branches[0],
  );
}

/**
 * The viewBox.
 *
 * A pot occupies the bottom fifth of the canvas, so Phase 1 cropped to it. A
 * mature canopy needs the whole thing. Two ways to reconcile that:
 *
 *   - fit the frame to the content on every render. Never crops, but the frame
 *     then breathes every time a leaf is added, so the whole tree visibly
 *     rescales after every session.
 *   - one frame per growth stage. Steady, but a run of unlucky jitter could push
 *     a leaf outside it and silently crop the thing we just grew.
 *
 * So: the stage table decides the frame, and then it is *expanded* if any
 * content falls outside. In practice the frame changes at 1, 5, and 15 sessions
 * and nowhere else; the guard only ever fires on an outlier. Expansion is
 * symmetric about TRUNK_X and the bottom edge is pinned to the canvas floor, so
 * the pot never drifts or resizes asymmetrically when it fires.
 *
 * Cost, stated plainly: at those three thresholds the whole tree snaps smaller
 * as the camera pulls back, and `viewBox` is an attribute rather than a CSS
 * property, so that snap cannot be transitioned. Smoothing it would mean
 * tweening four numbers in JS.
 */
function frameFor(stage, contentPoints) {
  const [stageX, stageY, stageWidth] = stage.frame;

  let halfWidth = stageWidth / 2;
  let top = stageY;

  for (const p of contentPoints) {
    halfWidth = Math.max(halfWidth, Math.abs(p.x - TRUNK_X) + FRAME_PAD);
    top = Math.min(top, p.y - FRAME_PAD);
  }

  const box = {
    x: r2(TRUNK_X - halfWidth),
    y: r2(top),
    width: r2(halfWidth * 2),
    height: r2(CANVAS.height - top),
  };

  return {
    frame: `${box.x} ${box.y} ${box.width} ${box.height}`,
    frameBox: box,
    // True when the stage table was enough on its own. Handy in the dev panel.
    frameFromStage: box.x === stageX && box.y === stageY,
  };
}

/** Every point the frame must contain. The pot is included so it never gets clipped. */
function contentPointsOf(trunk, branches, leaves) {
  const points = [
    // pot extents, from the shapes drawn in TreeSVG
    { x: 106, y: POT.rimTop - 4 },
    { x: 214, y: POT.rimTop - 4 },
    { x: 106, y: POT.bottomY + 10 },
    { x: 214, y: POT.bottomY + 10 },
  ];

  if (trunk) {
    points.push(
      { x: trunk.base.x - trunk.baseWidth, y: trunk.base.y },
      { x: trunk.base.x + trunk.baseWidth, y: trunk.base.y },
      trunk.ctrl,
      trunk.tip,
    );
  }

  for (const b of branches) {
    // The control point is not on the curve, but a quadratic Bézier never leaves
    // the triangle of its three points — so bounding those bounds the curve.
    points.push(b.from, b.ctrl, b.to);
  }

  for (const leaf of leaves) {
    const reach = LEAF_REACH * leaf.scale;
    points.push(
      { x: leaf.x + reach, y: leaf.y - reach },
      { x: leaf.x - reach, y: leaf.y - reach },
      { x: leaf.x + reach, y: leaf.y + reach },
      { x: leaf.x - reach, y: leaf.y + reach },
    );
  }

  return points;
}

// ----------------------------------------------------------------- the thing

/**
 * Map an ordered list of sessions to tree geometry.
 *
 * One chronological pass, which is what makes interleaved histories work: a
 * minor session attaches to the branches that existed *at that moment*, not to
 * the final set. Two counts of majors and minors would not be enough input.
 *
 * @param {Array<{id: string, classification?: 'major'|'minor'}>} sessions oldest first
 * @returns {{stage, trunk, branches, leaves, frame, frameBox, frameFromStage}}
 */
export function layoutTree(sessions = []) {
  const list = Array.isArray(sessions) ? sessions : [];
  const stage = stageFor(list.length);

  const stageInfo = {
    name: stage.name,
    label: stage.label,
    sessionCount: list.length,
  };

  // No sessions: there is no trunk yet, and TreeSVG draws its sprout instead.
  if (stage.name === 'sprout') {
    return {
      stage: stageInfo,
      trunk: null,
      branches: [],
      leaves: [],
      ...frameFor(stage, contentPointsOf(null, [], [])),
    };
  }

  const trunk = makeTrunk(stage);
  const trunkHost = { kind: 'trunk', id: null, curve: trunk.curve };

  const branches = [];
  const leaves = [];
  const leafCounts = new Map();
  let trunkLeafCount = 0;

  list.forEach((session, i) => {
    // An id is required to seed with. Falling back to the position keeps the
    // function total rather than throwing on a malformed row.
    const seedId = session && session.id ? String(session.id) : `unseeded-${i}`;

    // Section 6b says classification falls back to 'minor' on a parse failure,
    // and `addSession` defaults it to null. Coercing here means every stored
    // session grows something, so a null never looks like a rendering bug.
    const kind = session && session.classification === 'major' ? 'major' : 'minor';

    if (kind === 'major') {
      const branch = makeBranch(seedId, branches.length, trunk, stage);
      branches.push(branch);
      leafCounts.set(branch.id, 0);
      return;
    }

    if (branches.length === 0) {
      leaves.push(makeLeaf(seedId, trunkLeafCount, trunkHost, TRUNK_LEAF_SLOTS));
      trunkLeafCount += 1;
      return;
    }

    const host = chooseHostBranch(branches, leafCounts);
    const indexOnHost = leafCounts.get(host.id) ?? 0;
    leaves.push(
      makeLeaf(
        seedId,
        indexOnHost,
        { kind: 'branch', id: host.id, curve: host.curve },
        BRANCH_LEAF_SLOTS,
      ),
    );
    leafCounts.set(host.id, indexOnHost + 1);
  });

  return {
    stage: stageInfo,
    trunk,
    branches,
    leaves,
    ...frameFor(stage, contentPointsOf(trunk, branches, leaves)),
  };
}
