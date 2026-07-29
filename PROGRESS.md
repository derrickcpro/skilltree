# Progress log

A session-by-session record of what was built, what was decided, and what it
cost. Newest entry first. Written by `/log` at the end of each session.

This is not the README. The README explains what SkillTree is and how to run it.
This file is for me — so I can pick up where I left off, and so I can explain
every decision in this repo without re-reading the code.

---

## 2026-07-28 · Phase 2 · tree rendering engine

**Phase:** Phase 2 — `treeLayout.js`, `TreeSVG`, `TreeView` · **complete, not yet
committed**
**Branch:** unverified — I was told not to run git this session, so this entry is
grounded in the files I changed, not in `git log` / `git diff --stat`. Re-check it
against the diff before trusting the Changed list.
**Prompt I gave:** "Implement Phase 2 — the tree rendering engine: `treeLayout.js`
as a pure deterministic seeded function per Section 4's derivation rule, EXTEND
`TreeSVG.jsx` (handle the POT_FRAME viewBox crop explicitly), quadratic Béziers
for branches, palette greens, ~1.2s growth animation, a minimal `TreeView.jsx`
wired to `handleOpenTree`, and a dev-only debug panel behind `import.meta.env.DEV`
writing through `storage.addSession`."

### Changed

- `src/lib/seededRandom.js` — new. xmur3 + mulberry32, one generator per session id
- `src/lib/treeLayout.js` — new. `layoutTree(sessions)` → trunk, branches, leaves,
  viewBox; also exports `growthStage(count)` so UI text can't drift from the drawing
- `src/components/TreeSVG.jsx` — extended. Pot and sprout untouched; added trunk,
  branch, leaf rendering and a layout-driven viewBox
- `src/components/TreeView.jsx` — new. Screen 2, minimal
- `src/components/DebugPanel.jsx` — new. Dev-only, writes real sessions
- `src/components/PotShelf.jsx` — one line: shelf pots now draw real miniatures
- `src/App.jsx` — two screens, `handleOpenTree` opens TreeView, `handleGrew` /
  `handleCleared` refresh state
- `src/lib/storage.js` — added `clearSessions(treeId)`
- `src/styles/index.css` — `.leaf-unfurl`, `@keyframes branch-draw`, `.branch-draw`
- `scripts/check-determinism.mjs` — new. 5 check groups, no test dependency
- `package.json` — added `check:tree` script

### Decisions

- **Branch heights are stable, not redistributed.**
  `attachT(i) = 0.30 + 0.60(1 − e^(−0.28i))` — monotonic, asymptotic to 0.90, and
  branch 2 sits at the same fraction whether the tree has 3 branches or 30. Costs:
  spacing compresses, so past ~8 majors the upper branches crowd; and the
  asymptote means the trunk's top 10% never carries a branch.
- **viewBox = a per-stage table, expanded if content escapes it.** Fitting the
  frame to content would rescale the tree after every single leaf. Costs: the tree
  snaps smaller at 1, 5, and 15 sessions, and `viewBox` is an attribute so that
  snap can't be CSS-transitioned. Measured headroom is 15–26 units, so the
  expansion guard never fired in 1,600 layouts — it is untested insurance.
- **Least-loaded overflow, not a rotating counter.** A counter can put a 6th leaf
  on a full branch while another holds one, because it can't see the state it's
  balancing. Costs: a newly appended branch absorbs a burst of overflow leaves
  until it catches up; and it is not literally "round-robin" as the spec words it,
  though it reduces to round-robin when branches are evenly loaded.
- **One generator per session id, not one stream per tree.** A shared stream would
  make each element's shape depend on how many came before it. Costs: draw order
  inside each element's code is now load-bearing — reordering two `rnd` calls
  silently reshapes every existing tree.
- **`pathLength="1"` for the branch draw animation.** No arc-length sampling, no
  `getTotalLength()`. Genuinely no downside I can find beyond needing to know the
  attribute exists.
- **No apical tip cluster.** Considered adding 2 decorative leaves at the trunk tip
  so a 1-session tree isn't a bare stick; rejected, because every mark tracing to
  a session is the architectural claim. Cost: a sapling with one major looks stark.
- **Debug panel writes through `storage.addSession`** with real classifications,
  so it exercises Phase 3's write-then-read path. Cost: fake rows are
  indistinguishable from taught ones in localStorage until you read the summaries.

### Verified

- lint: clean (`npm run lint`, exit 0)
- build: succeeds (`npm run build`, 160.98 kB / 52.65 kB gzip)
- `npm run check:tree`: all 5 groups pass — determinism across 14 session
  patterns, bounds, in-stage stability, a 1,600-layout jitter sweep, and the
  Section 4 counting rules
- production bundle grepped for `Add fake major session`, `Debug — dev build
  only`, `debug panel`, and `clear sessions from`: 0 matches, while
  `Talk to your sapling` is present — so the panel and `clearSessions` are both
  tree-shaken, and `TreeView` is not
- every changed module transforms through vite dev (HTTP 200 each)
- **not verified: what any of this looks like.** I never rendered it in a browser.
  Lint, build, and the geometry checks say the numbers are right and the code
  loads; they say nothing about whether the tree is attractive.

### Follow-up, same session · TreeView fit at 1440x900

You reported the card filling the viewport and the button below the fold. Fixed:

- `TreeView` card is now a fixed-aspect frame — `aspect-[6/7] h-[36vh]
  max-h-[340px] min-h-[200px]` — so it no longer resizes as the tree grows.
  `aspect-[6/7]` is exactly the 312x364 canvas frame's ratio, so no letterboxing.
- `layoutTree(sessions, { frame })` gained a `'canvas'` mode: every stage shares
  the mature frame, so one canvas unit is always the same number of pixels.
  **This reverses Phase 1's pot-crop decision, for TreeView only.** It is what
  makes growth read as growth instead of every stage being rescaled to fill the
  card. Cost: a sprout now sits in a card that is ~57% empty above it. The shelf
  keeps the shrink-wrapped per-stage frames, where a tall empty box was the
  original bug.
- `preserveAspectRatio="xMidYMax meet"` is now TreeSVG's default, so slack goes
  above the drawing and the pot stays planted on the container floor. No visible
  change on the shelf, which has no slack to distribute.
- `pb-36` → `pb-28` on TreeView. 144px of bottom padding was most of the scroll;
  112px still clears the 96px floor graphic.
- `PotShelf` SVG box fixed at `h-24 w-20 sm:h-28 sm:w-24` — the shelf cards had
  the same width-jitter bug, for the same aspect-ratio reason.

Verified: lint clean, build succeeds, `check:tree` passes with a new canvas-mode
group (bounds, trunk-centred, aspect matches the card, one frame at every stage),
debug panel still absent from `dist`.

**Not verified: still never rendered in a browser.** No Chrome was connected and
the preview tool is rooted at the other project, so the 900px fit below is
computed from Tailwind's type scale, not measured.

| element | px | cumulative |
| --- | --- | --- |
| `pt-6` | 24 | 24 |
| back link (`text-sm`, 20px line) | 20 | 44 |
| skill name + stage label | 85.6 | 129.6 |
| card (`mt-6` + 324) | 348 | 477.6 |
| button + helper (`mt-6`) | 97.6 | **575.2** |
| debug panel (dev only) | 162 | 737.2 |
| `pb-28` | 112 | 849.2 |

### Not done / next

- Visual pass: open a tree, click the debug buttons, check the canopy at 375px.
- Confirm the computed 900px fit above against a real browser.
- Nothing is committed. Git was off-limits this session.
- Phase 3 seam: `TreeView`'s disabled "Talk to your sapling" button, and
  `App.handleGrew(session)` — which is already exactly what end-of-chat will call.

### Ask Claude about

- The dating on the Phase 1 entry below is `2026-07-29`; today is `2026-07-28`.
  One of the two is wrong, and it makes newest-first ordering ambiguous.
- The `frameFromStage` flag on the layout output is computed but nothing reads it.
  Keep it for the debug panel or drop it.
- Five Phase 1 quiz questions are still unanswered (see below).

---

## 2026-07-29 · Phase 1 · room, shelf, and planting shipped

**Phase:** Phase 1 — HomeScreen, PotShelf, sapling creation · **complete**
**Branch:** main
**Prompt I gave:** "Build HomeScreen, PotShelf, and the sapling-creation flow per
Sections 5 and 7: layered SVG cozy-room backdrop, an empty pot that when clicked
reveals a 'Grow a sapling' button, a naming input (1–50 chars), and a shelf
listing created trees. Store trees in localStorage for now behind a small storage
module with the same function signatures we'll later back with Supabase
(getTrees, createTree, getSessions, addSession). A new sapling renders as a
simple sprout in its pot."

### Changed

- `src/lib/storage.js` — localStorage behind four async functions
- `src/components/RoomBackdrop.jsx` — wall, window, floor as layered SVG
- `src/components/HomeScreen.jsx` — greeting, shelf, two-step planting flow
- `src/components/PotShelf.jsx` — grid of pots, one per skill
- `src/components/TreeSVG.jsx` — pot, plus a sprout when planted
- `src/App.jsx` — owns tree state, loads the room on mount
- `src/styles/index.css` — Tailwind v4 `@theme` tokens and animations
- `eslint.config.js`, `.prettierrc`, `.vscode/settings.json` — toolchain

### Decisions

- **localStorage now, Supabase later, behind one module.** Every function is
  `async` though localStorage is synchronous; rows use uuid ids, ISO timestamps,
  snake_case columns; validation lives in the storage layer, not just the UI.
  Costs: ceremony in code that does not need it yet, and a reviewer will ask me
  to justify the `async` — I need the answer ready.
- **Branches and leaves are never stored.** They are derived from classified
  sessions at render time. Costs: the tree's *appearance* is not versioned, so
  changing the layout algorithm later silently redraws every existing user's
  tree. Also no way to store a user-customised tree.
- **`getSessions` / `addSession` exist before anything writes a session.** The
  shelf needs the read path for counts. Costs: dead code until Phase 2.
- **Progressive disclosure on the planting flow** — the pot is the affordance, not
  a permanent form. Costs: one extra click, and the action is less discoverable.
- **Out of scope, not deferred:** streaks, points, badges, social, monthly
  summaries.

### Verified

- lint: clean (`eslint .`, exit 0)
- build: succeeds
- ran the app: planted a sapling, refreshed, it persisted; clicking a shelf pot
  shows the Phase 2 placeholder
- commits: `a20b107` feat: cozy room, pot shelf, and sapling planting flow ·
  `dae40fc` fix: room layout, SVG framing, and shelf card sizing

### Fixed this session

- Floor was `fixed`, pinning it to the viewport so content scrolled through it
  and a hard line cut across cards. Now `absolute`, anchored to the page.
- SVG `viewBox` showed the full 320×460 canvas (sized for a mature canopy), so a
  pot rendered small at the bottom of an empty box. Now framed to the pot.
- Window moved out of the shared 1440-wide viewBox to CSS positioning — it was
  pushed off-screen entirely at phone widths.
- `storage.js` rethrew a friendly error and discarded the original. Now passes
  `{ cause: err }`. **Caught by ESLint, not by me** — `preserve-caught-error`.

### Not done / next

- Phase 2 (tree view) not started. The shelf pot click is the seam it attaches to.
- `weekly-update.md` still untracked — convert to `DECISIONS.md` or delete.
- `BUILD_SPEC.md` and `CLAUDE.md` not yet committed.

### Ask Claude about

- Five open Phase 1 quiz questions, unanswered: why `getTrees()` is `async`; why
  `createTree` returns the row instead of refetching; the argument *against*
  `readList` swallowing parse errors; why session counts live in `App.jsx`; and
  where `crypto.randomUUID()`'s secure-context requirement would bite.
- Nothing sways in Phase 1 — all three `TreeSVG` call sites pass `idle={false}`,
  so `canopy-sway` is defined but never active. An earlier generated doc claimed
  otherwise. Worth remembering that generated summaries need checking.
