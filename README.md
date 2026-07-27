# SkillTree — Phase 1

A cozy, private learning diary. Each skill you are learning is a sapling in a pot inside a
warm room. You do not write journal entries — you _teach_ your sapling what you learned, and
it grows from the explaining.

**Phase 1 scope:** the room, the shelf, and planting. No chat, no LLM, no database yet.

## Running it

```bash
npm install
npm run dev
```

Then open the printed localhost URL. Nothing else to configure — Phase 1 stores everything in
your browser's localStorage, so there are no keys and no accounts.

```bash
npm run build     # production build into dist/
npm run preview   # serve the build locally
```

## What works

- A layered SVG room: wall, window with sky and hills, wooden floor. No raster images.
- An empty pot. Tap it and it opens a name field (1–50 characters).
- Naming a skill plants a sapling; its sprout unfurls with a short scale animation.
- A shelf listing every planted sapling with its session count.
- Everything survives a reload.

Clicking a pot on the shelf shows a placeholder notice. The tree view is the next phase, and
that click is the seam it will attach to.

## Files

```
src/
├── App.jsx                   # owns tree state, loads the room, one screen so far
├── lib/
│   └── storage.js            # localStorage today, Supabase later — same four functions
├── components/
│   ├── RoomBackdrop.jsx      # wall, window, floor
│   ├── HomeScreen.jsx        # greeting, shelf, planting flow
│   ├── PotShelf.jsx          # the grid of pots
│   └── TreeSVG.jsx           # pot, plus a sprout when planted
└── styles/index.css          # design tokens (@theme) and animations
```

## The storage decision

`src/lib/storage.js` is the only file that knows where data lives. It exposes four functions:

```js
getTrees()                    // -> [{ id, skill_name, created_at }]
createTree(skillName)         // -> the created tree
getSessions(treeId)           // -> [{ id, tree_id, transcript, classification, summary, created_at }]
addSession({ treeId, ... })   // -> the created session
```

Three things make the later swap to Supabase a one-file change:

1. **Every function is `async`**, even though localStorage is synchronous. Callers already
   `await`, so adding a network round trip changes no call sites.
2. **Rows use the future database's shapes** — uuid ids, ISO 8601 timestamps, snake_case
   columns. No field renaming later, and ids do not change type.
3. **Validation lives in the storage layer**, not only in the UI, because Postgres will
   enforce `char_length(skill_name) between 1 and 50` with a CHECK constraint. Same rule at
   the same layer means behaviour does not shift when the backend does.

`getSessions` and `addSession` exist already even though nothing writes a session yet. The
shelf needs the read path for its counts, and settling the interface early is what keeps the
swap boring.

## Design notes

Palette and type follow the spec's "Cozy Home" direction: cream `#FAF3E3`, wood `#5C4A32`,
sage `#7A9B76` / `#A8C09A`, terracotta `#C77B58`, amber `#E8A552` for warnings — never red.
Quicksand for headings, system sans for body. Tokens live in `@theme` in
`src/styles/index.css`, which is how Tailwind v4 generates the `bg-sage` / `text-bark` /
`rounded-cozy` utilities; there is no `tailwind.config.js`.

Motion is deliberate and quiet: a newly planted sprout unfurls once, the big pot sways very
slightly, and shelf pots hold still — a dozen swaying pots reads as restless rather than calm.
All of it is disabled under `prefers-reduced-motion`.

## Not built yet

Tree view, teach-back chat, LLM classification, procedural branch and leaf geometry, Supabase
auth and persistence, demo mode. Out of scope entirely: streaks, points, badges, social
features, monthly summaries.
