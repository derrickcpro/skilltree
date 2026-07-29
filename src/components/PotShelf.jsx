import TreeSVG from './TreeSVG.jsx';

/**
 * The shelf: one pot per skill, so the room is a glance-able picture of
 * everything being learned.
 *
 * Each pot draws its own real tree in miniature, from the same component and the
 * same layout function the full-size tree view uses. An untaught tree has no
 * sessions, so it is still a sprout.
 *
 * @param trees          [{ id, skill_name, created_at }]
 * @param sessionsByTree { [treeId]: sessions[] } — the tree geometry and the count
 * @param justPlantedId  id of a tree created this visit, so its sprout unfurls
 * @param onOpen         (treeId) => void
 */
export default function PotShelf({ trees, sessionsByTree, justPlantedId, onOpen }) {
  if (trees.length === 0) {
    return (
      <p className="max-w-md rounded-cozy bg-parchment px-5 py-4 text-bark shadow-soft">
        The shelf is empty. Plant the first thing you are learning — a language, a chord shape, a
        proof technique. Anything you could explain out loud.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {trees.map((tree) => {
        const count = sessionsByTree[tree.id]?.length ?? 0;

        return (
          <li key={tree.id}>
            <button
              type="button"
              onClick={() => onOpen(tree.id)}
              className="flex w-full flex-col items-center gap-1 rounded-cozy bg-parchment px-3 py-3 shadow-soft transition duration-300 ease-out hover:-translate-y-1 hover:shadow-lift"
            >
              {/* idle sway off on the shelf: a dozen pots swaying at once is
                  restless rather than calm. The big tree view gets the motion.

                  A fixed box rather than w-auto: each growth stage crops to a
                  different aspect ratio, so an auto width made the card jump
                  sideways when a tree grew. The stage frames stay shrink-wrapped
                  here — a pot at 96px has no room to waste on headroom. */}
              <TreeSVG
                planted
                sessions={sessionsByTree[tree.id] ?? []}
                grew={tree.id === justPlantedId}
                idle={false}
                className="h-24 w-20 sm:h-28 sm:w-24"
              />
              <span className="font-display text-sm font-semibold text-ink">{tree.skill_name}</span>
              <span className="text-xs text-bark">
                {count === 0
                  ? 'Not taught yet'
                  : `${count} ${count === 1 ? 'session' : 'sessions'}`}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
