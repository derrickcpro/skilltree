import { useEffect, useState } from 'react';
import RoomBackdrop from './components/RoomBackdrop.jsx';
import HomeScreen from './components/HomeScreen.jsx';
import TreeView from './components/TreeView.jsx';
import { getTrees, getSessions, createTree } from './lib/storage.js';

/**
 * App root.
 *
 * Two screens now, so still no router — a screen name in state is enough, and
 * the chat screen slots in next to it in Phase 3.
 *
 * State lives here rather than in HomeScreen because the shelf, the planting
 * flow, and the tree view all need the same tree list. One owner, passed down.
 */
export default function App() {
  const [trees, setTrees] = useState([]);
  const [sessionsByTree, setSessionsByTree] = useState({});
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  // Which sprout should unfurl. Only the tree planted this visit animates —
  // otherwise every pot on the shelf would pop on every reload.
  const [justPlantedId, setJustPlantedId] = useState(null);
  const [screen, setScreen] = useState('home');
  const [openTreeId, setOpenTreeId] = useState(null);
  // The one session whose branch or leaf should animate in. Cleared on
  // navigation, so growth animates when it happens and not on every revisit.
  const [newSessionId, setNewSessionId] = useState(null);

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

  function handleOpenTree(treeId) {
    setOpenTreeId(treeId);
    setNewSessionId(null);
    setNotice(null);
    setScreen('tree');
  }

  function handleBackToRoom() {
    setScreen('home');
    setOpenTreeId(null);
    setNewSessionId(null);
  }

  /**
   * A session was recorded for a tree: fold it into state and mark it as the one
   * to animate.
   *
   * The debug panel calls this today and Phase 3's end-of-chat flow calls it
   * tomorrow — it is the same event either way, which is the point of routing
   * fake sessions through the real storage module.
   */
  async function handleGrew(session) {
    const rows = await getSessions(session.tree_id);
    setSessionsByTree((prev) => ({ ...prev, [session.tree_id]: rows }));
    setNewSessionId(session.id);
  }

  function handleCleared(treeId) {
    setSessionsByTree((prev) => ({ ...prev, [treeId]: [] }));
    setNewSessionId(null);
  }

  const openTree = trees.find((t) => t.id === openTreeId) ?? null;

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

      {/* A tree can vanish from under an open view (cleared storage, a future
          delete), so fall back to the room rather than rendering a blank screen. */}
      {screen === 'tree' && openTree ? (
        <TreeView
          tree={openTree}
          sessions={sessionsByTree[openTree.id] ?? []}
          newSessionId={newSessionId}
          onBack={handleBackToRoom}
          onGrew={handleGrew}
          onCleared={handleCleared}
        />
      ) : (
        <HomeScreen
          trees={trees}
          sessionsByTree={sessionsByTree}
          justPlantedId={justPlantedId}
          loading={loading}
          onCreateTree={handleCreateTree}
          onOpenTree={handleOpenTree}
        />
      )}
    </div>
  );
}
