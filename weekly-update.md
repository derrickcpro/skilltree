# SkillTree — Weekly Update

**Week of July 27, 2026 · For cross-functional partners**

Phase 1 is functionally complete. SkillTree is a private learning diary where each skill you're learning is a sapling in a pot inside a warm room — you don't write journal entries, you *teach* your sapling what you learned, and it grows from the explaining.

## What's coming

- **Phase 1 (room, shelf, planting) — playable now.** Layered SVG room, an empty pot you tap to name a skill, a sprout that unfurls when planted, and a shelf listing every sapling with its session count. Everything survives a reload. If you want to click through it, it runs locally with `npm run dev` — no keys, no accounts.
- **Phase 2 (tree view + teach-back) — next up.** Clicking a shelf pot currently shows a placeholder; that click is the seam the tree view attaches to. Teach-back chat and LLM classification follow.
- **No backend yet.** Phase 1 stores everything in browser localStorage. Supabase auth and persistence are deliberately deferred.

## What we need from you

- **Design:** a look at the Cozy Home palette in context — cream `#FAF3E3`, wood `#5C4A32`, sage `#7A9B76`/`#A8C09A`, terracotta `#C77B58`, amber `#E8A552` for warnings (never red). Motion is intentionally quiet: the new sprout unfurls once, the big pot sways slightly, shelf pots hold still. Flagging that last one specifically — a dozen swaying pots read as restless rather than calm, but it's worth a second opinion.
- **Anyone with a spare 10 minutes:** plant two or three skills and tell me whether the empty room reads as inviting or unfinished. That's the main open question before Phase 2 locks in.

## Decisions made

- **localStorage now, Supabase later — as a one-file change.** `src/lib/storage.js` is the only file that knows where data lives. Every function is already `async`, rows already use future-database shapes (uuid ids, ISO 8601 timestamps, snake_case columns), and validation lives in the storage layer rather than only the UI. The swap should be boring by design.
- **Session read/write paths exist before anything writes a session.** The shelf needs the read path for its counts, and settling the interface early is what keeps the later swap uneventful.
- **Tailwind v4 with `@theme` tokens, no `tailwind.config.js`.** Tokens live in `src/styles/index.css` and generate the `bg-sage` / `text-bark` / `rounded-cozy` utilities.
- **Explicitly out of scope:** streaks, points, badges, social features, monthly summaries. Not deferred — out.

## Open for input

- Does the teach-back framing land, or does "teach your sapling" need a clearer first-run explanation?
- Growth model for Phase 2: procedural branch and leaf geometry driven by session count and classification. Early thoughts welcome before it gets built.
