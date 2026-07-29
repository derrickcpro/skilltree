SkillTree — AI Build Specification
Purpose: This document is written to be given directly to an AI coding assistant (Claude
Sonnet or Opus, ideally inside Claude Code). It contains everything needed to build the
application: locked decisions, exact specs, and a phased prompt sequence.
⚠ How to Use This Document (read first, human)
Do NOT paste this entire document and say "build it." You will get a huge codebase you
can't navigate, and the project loses its resume value. Instead:
1. Start every session by giving the AI Sections 1–7 (the context) plus one phase from
Section 8.
2. Build one phase at a time. Run the app, click through it, and read the diff before
moving on.
3. After each phase, use the two learning prompts: "Explain the files you just created like
I'll be interviewed on them" and "Quiz me with 3 questions about how this works."
4. Commit to git after every phase (
git commit -m "Phase N: ..." 
).
5. Write Phase 3's system prompt yourself first, then let the AI critique it. That prompt
is the soul of the product — it should be yours.
1. Project Overview (context for the AI)
SkillTree is a cozy, private learning diary web app. Each skill a user is learning is
represented as a sapling growing in a pot inside a warm home interior. Users don't write
journal entries — they teach their sapling what they learned (Feynman Technique). An
LLM plays the sapling: a curious, encouraging student who asks follow-up questions. Every
completed teaching session grows the tree: major breakthroughs grow branches, minor
learnings grow leaves. The product celebrates attempts, mistakes, and rejections — not
just results. Tone: cozy, warm, zero pressure. Explicitly NO streaks, points, badges, or social
features.
Primary screens:
1. Home — cozy room, pot(s), "Grow a sapling" flow
2. Tree view — a single tree rendered from its data, with "Talk to your sapling" and
session history
3. Chat session — the teach-back conversation with an "End session" button
2. Global Rules for the AI Assistant
These apply to every phase:
Explain after building. After generating code, briefly explain the structure and any
non-obvious decisions.
Small, readable files. Prefer several focused components over one giant file. Max
~150 lines per component where reasonable.
No new dependencies without asking. The stack in Section 3 is locked; propose
additions, don't install them silently.
Plain, well-commented code over cleverness. The author is learning React; comment
the "why," not the obvious "what."
Never put the Anthropic API key in frontend code. All LLM calls go through the
serverless proxy (Phase 3).
Ask before assuming if a spec is ambiguous.
Preserve the data model in Section 4 unless explicitly told to change it.
3. Locked Tech Stack
Layer
Choice
Frontend
React 18 + Vite, JavaScript (JSX)
Styling
Tailwind CSS (v4, via 
@tailwindcss/vite 
)
Tree
rendering
Inline SVG, procedurally generated from data
LLM
Claude API via Vercel serverless functions (
/api/* 
). Use the current Sonnet model;
check 
https://docs.claude.com/en/api/overview for the current model ID before
hardcoding one.
Database +
Auth
Supabase (Postgres, email magic-link auth)
Hosting
Vercel
State
React built-ins (useState/useContext). No Redux/Zustand unless proposed and
approved.
Target file structure:
skilltree/
├
── PRD.md                  
├
── BUILD_SPEC.md           
├
── api/                    
│   
├
── chat.js             
│   └── classify.js         
summary)
├
── src/
│   
├
── App.jsx             
│   
├
── lib/
│   │   
├
── supabase.js     
# product requirements (separate doc)
# this document
# Vercel serverless functions
# proxies sapling conversation to Claude API
# classifies ended sessions (major/minor +
# routing between screens, auth state
# client init
│   │   └── treeLayout.js   # pure functions: sessions -> branch/leaf
geometry
│   
├
── components/
│   │   
├
── HomeScreen.jsx
│   │   
├
── PotShelf.jsx    # list of user's trees
│   │   
├
── TreeView.jsx
│   │   
├
── TreeSVG.jsx     
# procedural tree renderer
│   │   
├
── ChatScreen.jsx
│   │   
├
── MessageBubble.jsx
│   │   └── SessionHistory.jsx
│   └── styles/
└── .env.local              
# SUPABASE keys (public anon), never the
Anthropic key
4. Data Model (locked)
Design decision: Sessions are the single source of truth. Branches and leaves are NOT
separate tables — they are derived at render time from classified sessions by a deterministic
layout function. This keeps the schema simple and makes the tree fully reproducible from
history.
Supabase tables:
sql
-- trees
id uuid primary key default gen_random_uuid()
user_id uuid references auth.users not null
skill_name text not null check (char_length(skill_name) between 1 and 50)
created_at timestamptz default now()-- sessions
id uuid primary key default gen_random_uuid()
tree_id uuid references trees on delete cascade not null
transcript jsonb not null-- array of {role, content}
classification text check (classification in ('major','minor'))
summary text-- one sentence, LLM-generated
created_at timestamptz default now()
Row Level Security: users can only select/insert/update rows where 
(trees) or via the tree's owner (sessions).
Derivation rule (implement in 
treeLayout.js
 as a pure function):
user_id = auth.uid()
Input: ordered list of classified sessions. Output: 
{ branches: [...], leaves: [...] }
with SVG geometry.
Each 
major
 session appends a branch to the trunk (alternating sides, decreasing
angle spread as the tree grows).
Each 
minor
 session appends a leaf to the most recent branch (round-robin across
branches if the latest branch has 5+ leaves). If no branches exist yet, leaves attach to
the trunk.
Use the session's 
id
 as a seed for small random-looking variation (curve, angle jitter)
so the tree is organic but deterministic — the same data always renders the same tree.
Growth stages of the trunk itself: sprout (0 sessions), sapling (1–4), young tree (5–14),
mature (15+).
5. Design System — "Cozy Home"
Palette: warm cream background 
#FAF3E3 
, soft brown wood tones #5C4A32 
, sage greens for foliage 
#7A9B76
 / 
warm amber accents 
#8B6F47
 / #A8C09A 
, terracotta pot #E8A552 
. Dark text 
#3D3529 
.
#C77B58 
,
Typography: a rounded, friendly display font for headings (e.g., "Quicksand" or
"Nunito" from Google Fonts), system sans for body.
Feel: soft shadows, large border radii (12–20px), generous whitespace, gentle 200
400ms ease transitions. Nothing sharp, nothing flashy, no red error states (use warm
amber for warnings).
The home backdrop: build it as layered SVG/CSS (wall, window with sky, wooden
shelf/floor, pot) — do not use raster stock images.
Animations: new branches/leaves grow with a short scale+draw animation (~1.2s).
The sapling idles with a very subtle sway.
Responsive: must work at 375px width and up.
6. The Sapling — Conversation & Classification Specs
6a. Conversation system prompt (for 
api/chat.js 
)
Note to human: draft your own version first, then have the AI critique and merge.
Below is a strong baseline.
You are a young sapling growing in a cozy home. Your owner is learning
{{skill_name}} and visits to teach you what they learned. You are their
student — curious, warm, and a little playful. You LOVE learning.
Your job (Feynman Technique — they learn by teaching you):- Open by asking them to teach you what they learned today about
{{skill_name}}.- React with genuine delight ("Ooh!", "Wait, that's so cool!").- Ask ONE follow-up question at a time that helps them articulate deeper:
"why does that work?", "can you give me an example?", "how would you
explain that to someone who's never heard of it?"- If something they say seems fuzzy or contradictory, don't correct them —
ask an innocent clarifying question that helps them notice it themselves.- If they share a mistake, rejection, or failed attempt, celebrate it as
growth. Attempts are how trees grow.- Keep replies SHORT: 1–3 sentences plus one question. They should talk
more than you.- Never lecture, never add facts they didn't teach you, never judge.
Recent things they've taught you (for continuity, may be empty):
{{recent_summaries}}
6b. Classification call (for 
api/classify.js 
)
When the user ends a session, send the transcript to the API with a prompt that returns
only JSON:
Analyze this learning journal conversation transcript. Classify the
session and summarize it. Respond with ONLY this JSON, no other text:
{"type": "major" | "minor", "summary": "<one warm sentence, max 20 words,
describing what the learner worked on or learned>"}
"major" = a breakthrough: a new concept clearly understood, a milestone
completed, a significant aha-moment, or overcoming a hard blocker.
"minor" = incremental practice, a small insight, a good attempt, or a
productive failure. When in doubt, choose "minor".
Parse defensively (strip markdown fences, try/catch, fall back to 
summary on parse failure).
6c. API contracts
minor
 with a generic
POST /api/chat
body: { skillName, recentSummaries: string[], messages: [{role, content}] }
returns: { reply: string }
POST /api/classify
body: { transcript: [{role, content}] }
returns: { type: "major"|"minor", summary: string }
Both endpoints: reject bodies over reasonable size, cap 
messages
 at 30 turns, return
friendly error messages. 
ANTHROPIC_API_KEY
 lives only in Vercel env vars.
7. Feature Requirements Summary
MVP (build in phases below): cozy home + pot; create/list saplings; teach-back chat with
end-session flow; LLM classification; procedural SVG tree that grows (branch per major,
leaf per minor) with animation; session history with summaries; Supabase auth + RLS
persistence; demo mode (no signup: a pre-grown sample tree + one live session using an
ephemeral in-memory tree).
Explicitly out of scope for MVP (do not build unless asked): monthly summaries, photo
flowers, Dream Tree resource capture, streaks/points/social anything, mobile native.
8. Phased Build Prompts
Paste Sections 1–7 as context, then ONE phase prompt below per working session.
Phase 0 — Scaffold
"Set up the project per Section 3: Vite + React + Tailwind v4, the file structure shown, empty
placeholder components for every file listed, and screen switching in App.jsx via simple
state (no router yet). Apply the design-system palette as Tailwind theme tokens. Verify 
npm 
run dev
 renders a placeholder home screen with the cream background. Explain the
structure when done."
Phase 1 — Cozy home & sapling creation (local only)
"Build HomeScreen, PotShelf, and the sapling-creation flow per Sections 5 and 7: layered
SVG cozy-room backdrop, an empty pot that when clicked reveals a 'Grow a sapling' button,
a naming input (1–50 chars), and a shelf listing created trees. Store trees in localStorage for
now behind a small storage module with the same function signatures we'll later back with
Supabase (
getTrees, createTree, getSessions, addSession 
). A new sapling renders as a
simple sprout in its pot."
Phase 2 — Tree rendering engine
"Implement 
treeLayout.js
 and 
TreeSVG.jsx
 per Section 4's derivation rule: a pure,
deterministic, seeded function mapping ordered classified sessions to branch/leaf SVG
geometry, with the four trunk growth stages. Include a temporary dev-only debug panel
with buttons 'add fake major session' and 'add fake minor session' so I can visually test
growth without the chat. Use quadratic Bézier curves for branches and the palette greens
for foliage. Animate new growth (~1.2s draw/scale). Walk me through the geometry math
after."
Phase 3 — The conversation
pi/chat.js 
, 
"Build ChatScreen + MessageBubble and the two Vercel serverless functions per Section 6
(
a
api/classify.js 
), using 
vercel dev
 for local testing. Wire the flow: open
chat from a tree → sapling greets using the system prompt → conversation → 'End session' →
classify → sapling farewell ('Thank you for sharing what you learned with me 🌱') → session
saved via the storage module → return to TreeView where the new branch/leaf animates in.
Here is my edited version of the system prompt: [PASTE YOURS]. Critique it briefly, then
use it."
Phase 4 — Supabase persistence & auth
"Replace the localStorage storage module with Supabase per Section 4: create the SQL for
tables + RLS policies (give me the SQL to run in the Supabase dashboard), magic-link email
auth, an auth screen matching the cozy design, and loading/empty states. The storage
module's function signatures must not change, so no other components should need edits
— flag it if they do."
Phase 5 — Demo mode & session history
"Add: (1) a 'Just looking? Try the demo' entry on the auth screen that loads a pre-grown
sample tree (hardcode ~8 varied fake sessions for a skill like 'Learning watercolor') and
allows one live chat session kept only in memory; (2) SessionHistory in TreeView — a
scrollable list of past sessions showing date, major/minor icon (branch/leaf), and summary,
with tap-to-expand transcript."
Phase 6 — Polish pass
"Do a full polish pass per Section 5: micro-animations (sapling idle sway, button hovers,
screen transitions), loading skeletons, friendly error states in warm amber, mobile layout at
375px, an app icon/favicon of a small sprout, and an accessibility check (focus states, aria
labels, color contrast). List everything you changed."
Phase 7 — Ship
"Prepare for deployment: production env-var checklist for Vercel + Supabase, basic rate
limiting on both API routes (per-IP, simple in-memory or Upstash if you propose it), a
README.md with project description, screenshot placeholders, an ASCII/mermaid
architecture diagram, setup instructions, and a 'Design Decisions' section summarizing
Sections 4–6 rationale. Then give me the exact step-by-step Vercel deploy instructions."
9. Acceptance Checklist (verify after Phase 7)
New user: land → sign in → grow sapling → complete a teach session → see the tree grow,
in under 5 minutes
Demo mode works with zero signup
Refresh/other device: trees and history persist; other users' trees are invisible (RLS
verified)
Same session data always renders the identical tree (determinism)
No Anthropic key anywhere in frontend bundle or repo history
Works at 375px width; loads in <3s on Vercel
README has architecture diagram + design rationale
The human author can explain every file (the real acceptance test)