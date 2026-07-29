/**
 * check-determinism.mjs — the acceptance check for Section 9's "same session
 * data always renders the identical tree".
 *
 * A plain node script rather than a test runner, because adding a dependency to
 * assert three things would be out of proportion. Run it with:
 *
 *   node scripts/check-determinism.mjs
 *
 * It checks three properties:
 *
 *   1. Determinism — layoutTree called twice on the same rows returns identical
 *      JSON. This is the claim the whole "branches are never stored" design
 *      rests on.
 *   2. Bounds — no computed point falls outside the frame the layout chose. This
 *      is what proves the viewBox guard works; a leaf outside the frame is a
 *      leaf the user never sees.
 *   3. Stability within a stage — adding a session does not move the branches
 *      already on the tree. Enumerated independently of the layout module's own
 *      point list, so a point the frame logic forgot to consider still fails.
 */

import { CANVAS_FRAME, layoutTree, LEAF_REACH, TRUNK_X } from '../src/lib/treeLayout.js';

// Fixed ids, so this script is as deterministic as the thing it is testing.
function sessionsFrom(pattern) {
  return pattern.split('').map((c, i) => ({
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    tree_id: 'tree-under-test',
    classification: c === 'M' ? 'major' : c === 'm' ? 'minor' : null,
    transcript: [],
    summary: '',
    created_at: `2026-07-${String(i + 1).padStart(2, '0')}T09:00:00.000Z`,
  }));
}

const CASES = {
  'no sessions (sprout)': '',
  'one major': 'M',
  'one minor, no branches yet': 'm',
  'all minors, trunk only': 'mmmm',
  'sapling, mixed': 'Mm',
  'young tree, interleaved': 'MmmMmmmMm',
  'one branch filled to its five': 'MmmmmmM',
  'overflow onto a single branch': 'Mmmmmmmmmmm',
  'overflow redistributed to the emptier branch': 'MMmmmmmmm',
  'mature, branch-heavy': 'MMMMMMMMMMMMMMMMMM',
  'mature, leaf-heavy': 'Mmmmmmmmmmmmmmmmmmmm',
  'mature, mixed': 'MmMmmMmmmMmMMmmmMmmMmmMM',
  'null classification treated as minor': 'M???',
  'forty sessions': 'MmmMmmMmmMmmMmmMmmMmmMmmMmmMmmMmmMmmMmmm',
};

let failures = 0;

function fail(label, detail) {
  failures += 1;
  console.error(`  FAIL  ${label}\n        ${detail}`);
}

function pass(label) {
  console.log(`  ok    ${label}`);
}

// --------------------------------------------------------------- 1. determinism

console.log('\nDeterminism — same rows in, identical geometry out');

for (const [label, pattern] of Object.entries(CASES)) {
  const rows = sessionsFrom(pattern);
  const a = JSON.stringify(layoutTree(rows));
  const b = JSON.stringify(layoutTree(rows));
  // A fresh array of fresh objects with the same values, to be sure nothing is
  // keyed on object identity or memoised across calls.
  const c = JSON.stringify(layoutTree(sessionsFrom(pattern)));

  if (a !== b) fail(label, 'two calls on the same array disagreed');
  else if (a !== c) fail(label, 'equal-valued rows produced different geometry');
  else pass(label);
}

// --------------------------------------------------------------------- 2. bounds

console.log('\nBounds — every point inside the frame the layout chose');

/**
 * Enumerated here rather than imported, on purpose. If this reused the layout
 * module's own point list the check would be circular: a point the frame logic
 * forgot would be forgotten here too.
 */
function pointsOf(tree) {
  const points = [];

  if (tree.trunk) {
    const { base, tip, baseWidth } = tree.trunk;
    points.push(
      { what: 'trunk base left', x: base.x - baseWidth / 2, y: base.y },
      { what: 'trunk base right', x: base.x + baseWidth / 2, y: base.y },
      { what: 'trunk tip', x: tip.x, y: tip.y },
    );
  }

  for (const b of tree.branches) {
    points.push(
      { what: `branch ${b.index} from`, x: b.from.x, y: b.from.y },
      { what: `branch ${b.index} ctrl`, x: b.ctrl.x, y: b.ctrl.y },
      { what: `branch ${b.index} tip`, x: b.to.x, y: b.to.y },
    );
  }

  for (const leaf of tree.leaves) {
    const reach = LEAF_REACH * leaf.scale;
    for (const [dx, dy] of [
      [1, -1],
      [-1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      points.push({
        what: `leaf on ${leaf.host} ${leaf.hostId ?? ''} corner`,
        x: leaf.x + dx * reach,
        y: leaf.y + dy * reach,
      });
    }
  }

  return points;
}

for (const [label, pattern] of Object.entries(CASES)) {
  const tree = layoutTree(sessionsFrom(pattern));
  const { x, y, width, height } = tree.frameBox;
  const outside = pointsOf(tree).filter(
    (p) => p.x < x || p.x > x + width || p.y < y || p.y > y + height,
  );

  if (outside.length > 0) {
    const first = outside[0];
    fail(
      label,
      `${outside.length} point(s) outside viewBox "${tree.frame}", e.g. ` +
        `${first.what} at (${first.x.toFixed(1)}, ${first.y.toFixed(1)})`,
    );
  } else {
    // A frame that is not centred on the trunk would slide the pot sideways
    // when the guard fires, so check that too.
    const centre = x + width / 2;
    if (Math.abs(centre - TRUNK_X) > 0.01) {
      fail(label, `frame centre ${centre} is not the trunk axis ${TRUNK_X}`);
    } else {
      pass(`${label} — ${pointsOf(tree).length} points inside "${tree.frame}"`);
    }
  }
}

// ------------------------------------------------------- 3. stability in a stage

console.log('\nStability — adding a session leaves existing branches untouched');

/**
 * Branch geometry is absolute, so it legitimately moves when the trunk grows at
 * a stage boundary. Within one stage nothing should move at all. Each pair below
 * stays inside a single stage.
 */
const STABILITY_PAIRS = [
  ['MmM', 'MmMm'],
  ['MMMMM', 'MMMMMm'],
  ['MmmMmmM', 'MmmMmmMm'],
  ['MMMMMMMMMMMMMMMM', 'MMMMMMMMMMMMMMMMm'],
];

for (const [before, after] of STABILITY_PAIRS) {
  const a = layoutTree(sessionsFrom(before));
  const b = layoutTree(sessionsFrom(after));
  const label = `"${before}" -> "${after}"`;

  if (a.stage.name !== b.stage.name) {
    fail(label, `pair crosses a stage boundary (${a.stage.name} -> ${b.stage.name})`);
    continue;
  }

  const moved = a.branches.filter((branch, i) => branch.d !== b.branches[i]?.d);
  if (moved.length > 0) {
    fail(label, `${moved.length} existing branch path(s) changed, first: branch ${moved[0].index}`);
  } else {
    pass(`${label} — ${a.branches.length} branch path(s) unchanged`);
  }
}

// ------------------------------------------------------ 4. bounds under jitter

/**
 * The 13 cases above all happen to fit their stage frame, which means the
 * expansion guard never ran. Since jitter is exactly what would push a leaf past
 * the frame edge, sweep many different id sets over the patterns that sit
 * closest to their frame's top edge.
 *
 * Still deterministic: the ids come from the sweep index, not from a random
 * source.
 */
console.log('\nBounds under jitter — sweeping id sets to exercise the frame guard');

const SWEEP_PATTERNS = ['MMMM', 'MmmM', 'MMMMMMMMMMMMMM', 'MMMMMMMMMMMMMMMMMMMMMMMM'];
const SWEEP_RUNS = 400;

for (const pattern of SWEEP_PATTERNS) {
  let expanded = 0;
  let broke = 0;
  let firstBreak = null;
  // How close the closest point ever came to an edge, so "the guard never fired"
  // can be read as "there is N units of headroom" rather than as a shrug.
  let tightest = Infinity;
  let tightestEdge = '';

  for (let run = 0; run < SWEEP_RUNS; run += 1) {
    const rows = pattern.split('').map((c, i) => ({
      id: `sweep-${run}-${i}-${pattern.length}`,
      classification: c === 'M' ? 'major' : 'minor',
    }));

    const tree = layoutTree(rows);
    if (!tree.frameFromStage) expanded += 1;

    const { x, y, width, height } = tree.frameBox;
    const points = pointsOf(tree);

    for (const p of points) {
      const margins = [
        ['left', p.x - x],
        ['right', x + width - p.x],
        ['top', p.y - y],
      ];
      for (const [edge, margin] of margins) {
        if (margin < tightest) {
          tightest = margin;
          tightestEdge = edge;
        }
      }
    }

    const outside = points.filter((p) => p.x < x || p.x > x + width || p.y < y || p.y > y + height);
    if (outside.length > 0) {
      broke += 1;
      firstBreak ??= `run ${run}: ${outside[0].what} at (${outside[0].x.toFixed(1)}, ${outside[0].y.toFixed(1)}) outside "${tree.frame}"`;
    }
  }

  const label =
    `"${pattern}" over ${SWEEP_RUNS} id sets — guard expanded ${expanded}x, ` +
    `tightest margin ${tightest.toFixed(1)} units (${tightestEdge})`;
  if (broke > 0) fail(label, firstBreak);
  else pass(label);
}

// ------------------------------------------------- 4b. the canvas framing mode

/**
 * `frame: 'canvas'` is a second framing path, so the guard and the centring have
 * to hold there too. Two extra properties matter in this mode:
 *
 *   - the frame is the same at every stage, which is the whole point: one canvas
 *     unit is always the same number of pixels, so growth reads as growth
 *   - its aspect ratio must match CANVAS_FRAME, because TreeView sizes a
 *     fixed-aspect card from it. If they drift, the card letterboxes.
 */
console.log('\nCanvas framing — one frame for every stage, aspect matching the card');

const CANVAS_ASPECT = CANVAS_FRAME.width / CANVAS_FRAME.height;
const canvasFrames = new Set();

for (const [label, pattern] of Object.entries(CASES)) {
  const tree = layoutTree(sessionsFrom(pattern), { frame: 'canvas' });
  const { x, y, width, height } = tree.frameBox;
  canvasFrames.add(tree.frame);

  const outside = pointsOf(tree).filter(
    (p) => p.x < x || p.x > x + width || p.y < y || p.y > y + height,
  );
  const aspect = width / height;

  if (outside.length > 0) {
    fail(label, `${outside.length} point(s) outside canvas frame "${tree.frame}"`);
  } else if (Math.abs(aspect - CANVAS_ASPECT) > 0.001) {
    fail(label, `frame aspect ${aspect.toFixed(4)} != card aspect ${CANVAS_ASPECT.toFixed(4)}`);
  } else if (Math.abs(x + width / 2 - TRUNK_X) > 0.01) {
    fail(label, `frame is not centred on the trunk axis`);
  } else {
    pass(`${label} — "${tree.frame}"`);
  }
}

if (canvasFrames.size !== 1) {
  fail('canvas mode uses one frame everywhere', `saw ${canvasFrames.size}: ${[...canvasFrames]}`);
} else {
  pass(`every stage shares the frame "${[...canvasFrames][0]}"`);
}

// ------------------------------------------------------- 5. the derivation rule

/**
 * Section 4's counting rules, checked directly rather than inferred from the
 * picture. The overflow rule is the subtlest thing in the spec, so it gets an
 * explicit invariant: a branch may only hold more than five leaves once every
 * branch holds at least five. That is what distinguishes least-loaded placement
 * from a blind rotating counter, which can pile a sixth leaf onto a full branch
 * while another sits nearly bare.
 */
console.log('\nDerivation rule — one mark per session, leaves placed by the spec');

for (const [label, pattern] of Object.entries(CASES)) {
  const rows = sessionsFrom(pattern);
  const tree = layoutTree(rows);
  const majors = rows.filter((r) => r.classification === 'major').length;
  const minors = rows.length - majors;

  const problems = [];

  if (tree.stage.name !== 'sprout') {
    if (tree.branches.length !== majors) {
      problems.push(`${majors} major(s) produced ${tree.branches.length} branch(es)`);
    }
    if (tree.leaves.length !== minors) {
      problems.push(`${minors} minor(s) produced ${tree.leaves.length} leaf/leaves`);
    }
  }

  const onTrunk = tree.leaves.filter((l) => l.host === 'trunk').length;
  if (onTrunk > 0 && tree.branches.length > 0) {
    problems.push(`${onTrunk} leaf/leaves on the trunk despite ${tree.branches.length} branch(es)`);
  }

  const perBranch = tree.branches.map((b) => tree.leaves.filter((l) => l.hostId === b.id).length);
  const over = perBranch.filter((n) => n > 5).length;
  const under = perBranch.filter((n) => n < 5).length;
  if (over > 0 && under > 0) {
    problems.push(`a branch exceeded five leaves while another had fewer: [${perBranch}]`);
  }

  if (problems.length > 0) fail(label, problems.join('; '));
  else pass(`${label} — ${majors} branch(es), ${minors} leaf/leaves, per-branch [${perBranch}]`);
}

// ------------------------------------------------------------------------ result

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.\n`);
  process.exit(1);
}

console.log('\nAll checks passed.\n');
