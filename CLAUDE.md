# SkillTree

A private learning diary. Each skill is a sapling in a pot inside a warm room.
The user does not write journal entries — they *teach* their sapling what they
learned (Feynman technique), and it grows from the explaining.

Full spec: @BUILD_SPEC.md — read it before implementing any phase, and follow its
Section 2 Global Rules on every task.

## Commands

```bash
npm run dev      # vite dev server
npm run build    # production build
npm run lint     # eslint — must be clean before committing
npm run format   # prettier
```

## Architecture

- **`src/lib/storage.js` is the only file that knows where data lives.** Currently
  localStorage; Supabase later. Every function is `async` even though localStorage
  is synchronous, so the swap changes no call sites. Rows use uuid ids, ISO 8601
  timestamps, and snake_case columns to match the future Postgres schema.
  Validation lives here, not only in the UI.
- **Branches and leaves are never stored.** They are derived from classified
  sessions at render time by a pure function. Same sessions in, same tree out.
- **Tailwind v4** — no `tailwind.config.js`. Design tokens live in `@theme` in
  `src/styles/index.css`, which is what generates `bg-sage`, `rounded-cozy`, etc.
- **State is React built-ins only.** No Redux or Zustand without asking.

## Conventions

- Explain after building: briefly cover structure and non-obvious decisions.
- Small, readable files. ~150 lines per component where reasonable.
- No new dependencies without asking first. Propose, don't install.
- Comment the *why*, not the obvious *what*. The author is learning React.
- Never put the Anthropic API key in frontend code. All LLM calls go through the
  serverless functions in `/api`.
- Ask before assuming if a spec is ambiguous.
- Show a plan and wait for approval before writing code.

## Working with me

I am building this to discuss in interviews, so I need to be able to defend every
decision in it. Two things follow from that:

- **After building anything, quiz me on it.** Include at least one question of the
  form "where does this break" or "what would you change".
- **Every decision you record must name its cost**, not just its benefit. If a
  decision appears to have no downside, say so rather than inventing one.

## PROGRESS.md — update it every session

`PROGRESS.md` is the handoff between this project and the chat assistant I use for
planning and review. It must stay accurate without me asking.

At the end of any session that changed code, add an entry using the `/log`
command's format. Ground it in `git log` and `git diff --stat`, not in what we
discussed. State the phase firmly — if you cannot tell which phase, write
`Phase: UNCLEAR — ask me`. Separate what was verified by running a command from
what was assumed.

Then commit and push it, so the chat assistant can read it from GitHub.

## Phase status

- **Phase 1 — room, shelf, planting: complete.** Verified: lint clean, build
  succeeds, app persists across reload.
- **Phase 2 — tree view: not started.** The shelf pot click in `App.jsx`
  (`handleOpenTree`) is the seam it attaches to.
- Phases 3–5: chat proxy, Supabase persistence, demo mode. Not started.

Out of scope entirely — do not build unless asked: streaks, points, badges, any
social feature, monthly summaries.
