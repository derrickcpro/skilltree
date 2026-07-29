import { useState } from 'react';
import { addSession, clearSessions } from '../lib/storage.js';

/**
 * DebugPanel — grow a tree without the chat, so the layout can be eyeballed
 * before Phase 3 exists.
 *
 * Two things about this are deliberate:
 *
 *   1. It writes through `storage.addSession` with real 'major' / 'minor'
 *      classifications. It is not a separate in-memory store. So it exercises
 *      the exact write-then-read path Phase 3 will use, and a bug in that path
 *      shows up here rather than later.
 *   2. It never ships. TreeView renders it behind `import.meta.env.DEV`, which
 *      Vite replaces with the literal `false` in a production build; the branch
 *      and then this whole module are dropped as dead code.
 *
 * Cost: fake rows land in the same localStorage as real ones, so a tree grown
 * for testing is indistinguishable from a taught tree until you read the
 * summaries. 'Clear sessions' is the way out.
 */
export default function DebugPanel({ treeId, onGrew, onCleared }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function run(work) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const addFake = (classification) =>
    run(async () => {
      const session = await addSession({
        treeId,
        classification,
        transcript: FAKE_TRANSCRIPT,
        summary:
          classification === 'major'
            ? 'Fake major session — a breakthrough, added from the debug panel.'
            : 'Fake minor session — small practice, added from the debug panel.',
      });
      onGrew(session);
    });

  return (
    <aside className="mt-10 rounded-cozy border border-dashed border-bark/40 bg-cream-deep/60 p-4">
      <p className="font-display text-sm font-semibold text-ink">Debug — dev build only</p>
      <p className="mt-1 text-xs text-bark">
        Writes real sessions through the storage module, the same path the chat will use.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => addFake('major')}
          className="rounded-pill bg-bark px-4 py-2 text-sm font-semibold text-cream transition duration-200 hover:bg-bark/90 disabled:opacity-45"
        >
          Add fake major session
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => addFake('minor')}
          className="rounded-pill bg-sage px-4 py-2 text-sm font-semibold text-cream transition duration-200 hover:bg-sage/90 disabled:opacity-45"
        >
          Add fake minor session
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await clearSessions(treeId);
              onCleared(treeId);
            })
          }
          className="rounded-pill border border-bark/40 px-4 py-2 text-sm font-semibold text-bark transition duration-200 hover:bg-parchment disabled:opacity-45"
        >
          Clear sessions
        </button>
      </div>

      {error && <p className="mt-3 rounded-cozy bg-amber/25 px-3 py-2 text-sm text-ink">{error}</p>}
    </aside>
  );
}

// Shaped like a real transcript so Phase 5's history view has something to open.
const FAKE_TRANSCRIPT = [
  { role: 'assistant', content: 'Ooh, what did you learn today?' },
  { role: 'user', content: 'This session came from the debug panel, so nothing really.' },
];
