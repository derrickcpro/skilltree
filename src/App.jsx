import { useEffect, useState } from 'react';
import RoomBackdrop from './components/RoomBackdrop.jsx';
import HomeScreen from './components/HomeScreen.jsx';
import { getTrees, getSessions, createTree } from './lib/storage.js';

/**
 * App root for Phase 1.
 *
 * There is one screen so far, so there is no router — a screen name in state is
 * enough, and it is what the tree view and chat screen will slot into next.
 *
 * State lives here rather than in HomeScreen because the shelf and the planting
 * flow both need the same tree list. One owner, passed down.
 */
export default function App() {
  const [trees, setTrees] = useState([]);
  const [sessionsByTree, setSessionsByTree] = useState({});
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  // Which sprout should unfurl. Only the tree planted this visit animates —
  // otherwise every pot on the shelf would pop on every reload.
  const [justPlantedId, setJustPlantedId] = useState(null);

  // Load the room once on mount. `await` here does nothing useful against
  // localStorage, but it is exactly the code that will keep working when the
  // storage module starts talking to Supabase over the network.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const rows = await getTrees();
        const lists = await Promise.all(rows.map((t) => getSessions(t.id)));

        if (cancelled) return;
        const byTree = {};
        rows.forEach((tree, i) => {
          byTree[tree.id] = lists[i];
        });
        setTrees(rows);
        setSessionsByTree(byTree);
      } catch (err) {
        console.error(err);
        if (!cancelled) setNotice('The room could not be opened. Try reloading.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Plant a tree, then fold the saved row into state rather than refetching.
   * The storage module returns the created row for exactly this reason — one
   * write, no read-back, and the id comes from the source of truth.
   */
  async function handleCreateTree(skillName) {
    const tree = await createTree(skillName);
    setTrees((prev) => [...prev, tree]);
    setSessionsByTree((prev) => ({ ...prev, [tree.id]: [] }));
    setJustPlantedId(tree.id);
  }

  // The seam where the tree view will attach in the next phase. Stubbed out
  // loud and clear rather than left as a dead click.
  function handleOpenTree(treeId) {
    const tree = trees.find((t) => t.id === treeId);
    setNotice(
      `Stepping up to ${tree?.skill_name ?? 'that pot'} — the tree view arrives next phase.`,
    );
  }

  return (
    <div className="relative min-h-dvh">
      <RoomBackdrop />

      {notice && (
        <div className="rise mx-auto mt-4 flex w-full max-w-4xl items-start gap-3 px-5">
          <p className="flex-1 rounded-cozy bg-amber/25 px-4 py-3 text-sm text-ink">{notice}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="mt-2 text-sm text-bark underline hover:text-ink"
          >
            Dismiss
          </button>
        </div>
      )}

      <HomeScreen
        trees={trees}
        sessionsByTree={sessionsByTree}
        justPlantedId={justPlantedId}
        loading={loading}
        onCreateTree={handleCreateTree}
        onOpenTree={handleOpenTree}
      />
    </div>
  );
}
