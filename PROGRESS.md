# Progress log

A session-by-session record of what was built, what was decided, and what it
cost. Newest entry first. Written by `/log` at the end of each session.

This is not the README. The README explains what SkillTree is and how to run it.
This file is for me — so I can pick up where I left off, and so I can explain
every decision in this repo without re-reading the code.

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
