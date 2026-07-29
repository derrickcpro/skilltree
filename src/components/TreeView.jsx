import DebugPanel from './DebugPanel.jsx';
import TreeSVG from './TreeSVG.jsx';
import { growthStage } from '../lib/treeLayout.js';

/**
 * Screen 2 — one tree, full size.
 *
 * Deliberately thin for now. Session history arrives in Phase 5, and the
 * "Talk to your sapling" button is disabled: it is the seam Phase 3 attaches to,
 * shown rather than hidden so the shape of the screen is already right and the
 * next phase only has to wire an onClick.
 */
export default function TreeView({ tree, sessions, newSessionId, onBack, onGrew, onCleared }) {
  const count = sessions.length;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pt-6 pb-36">
      <button
        type="button"
        onClick={onBack}
        className="rounded-pill px-1 text-sm text-bark underline transition duration-200 hover:text-ink"
      >
        ← Back to the room
      </button>

      <header className="mt-4">
        <h1 className="text-3xl font-bold text-ink sm:text-4xl">{tree.skill_name}</h1>
        <p className="mt-1 text-bark">
          {/* The label comes from the layout module, which owns the thresholds, so
              the words and the drawing can never disagree about how grown this
              tree is. */}
          {growthStage(count).label} ·{' '}
          {count === 0 ? 'not taught yet' : `${count} ${count === 1 ? 'session' : 'sessions'}`}
        </p>
      </header>

      <div className="mt-6 flex justify-center rounded-cozy bg-parchment px-4 py-6 shadow-soft">
        <TreeSVG
          planted
          idle
          sessions={sessions}
          newSessionId={newSessionId}
          className="h-[22rem] w-auto sm:h-[26rem]"
        />
      </div>

      <div className="mt-6 flex flex-col items-center gap-2">
        <button
          type="button"
          disabled
          className="rounded-cozy bg-sage px-6 py-3 font-semibold text-cream shadow-soft disabled:cursor-not-allowed disabled:opacity-45"
        >
          Talk to your sapling
        </button>
        <p className="text-xs text-bark">The teach-back conversation arrives next phase.</p>
      </div>

      {/* Vite substitutes a literal `false` here in a production build, so both
          the branch and the imported module are dropped from the bundle. */}
      {import.meta.env.DEV && <DebugPanel treeId={tree.id} onGrew={onGrew} onCleared={onCleared} />}
    </div>
  );
}
