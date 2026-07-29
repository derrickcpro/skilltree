---
description: Write a session report into PROGRESS.md — what phase, what prompt, what changed. Run this at the end of every working session.
allowed-tools: Bash(git *), Bash(npm run lint), Read, Edit, Write
---

# Session log

Write a report of THIS session into `PROGRESS.md`, newest entry first (directly
under the file's intro, above any older entries).

## Real context — use this, do not rely on memory

- Branch: !`git branch --show-current`
- Commits this session: !`git log --oneline -8`
- Uncommitted right now: !`git status --short`
- Change sizes: !`git diff --stat HEAD~1 2>/dev/null || echo "no previous commit"`

## Rules

1. **Ground every claim in the git output above.** If you cannot see a file in
   the diff or commit list, do not claim you changed it. If the session was
   discussion only with no code changes, say exactly that.
2. **State the phase firmly.** Read `BUILD_SPEC.md` if it exists. Name the phase
   number and title, and say plainly whether it is complete, in progress, or
   blocked. Never write "roughly" or "possibly" about the phase — if you cannot
   tell, write `Phase: UNCLEAR — ask me` so the ambiguity is visible.
3. **Quote the prompt I actually gave**, as close to verbatim as you can. This is
   the single most useful line in the report.
4. **Every decision needs its cost.** "We did X because Y" is half a decision.
   Write what X gives up. If a decision has no downside, you have not found it
   yet — say so rather than inventing one.
5. **Separate verified from assumed.** Only list something under Verified if a
   command was actually run this session. If lint was not run, write "not run".
6. **Flag what I should ask about.** Anything you were unsure of, any spec
   ambiguity you resolved by guessing, any shortcut taken.
7. Keep it under ~40 lines. This gets pasted into a chat window.

## Format — follow exactly

```markdown
## YYYY-MM-DD · Phase N · <five-word summary>

**Phase:** Phase N — <title from BUILD_SPEC> · <complete | in progress | blocked>
**Branch:** <branch>
**Prompt I gave:** "<verbatim>"

### Changed
- `path/to/file` — what changed and why

### Decisions
- <decision> — costs: <what it gives up>

### Verified
- lint: <clean | N errors | not run>
- ran the app: <what was clicked and what happened | not run>
- commits: <hash short-message>

### Not done / next
- <specific next action>

### Ask Claude about
- <uncertainty, ambiguity, or shortcut worth a second opinion>
```

After writing the file, print the new entry to the terminal so I can copy it
without opening the file.
