import { useEffect, useRef, useState } from 'react';
import PotShelf from './PotShelf.jsx';
import TreeSVG from './TreeSVG.jsx';
import { SKILL_NAME_MAX } from '../lib/storage.js';

/**
 * Screen 1. Two jobs: show what is already growing, and make starting something
 * new feel like a small physical act rather than filling in a form.
 *
 * The planting flow is progressive disclosure with two steps:
 *
 *   'idle'   -> an empty pot sitting there, waiting
 *   'naming' -> the pot has opened up a name field
 *
 * Why hide the field at all: an always-visible input turns the room into a form.
 * Making the pot itself the affordance keeps the screen quiet when the person is
 * only visiting, which is the tone the whole product is going for.
 */
export default function HomeScreen({
  trees,
  sessionsByTree,
  justPlantedId,
  loading,
  onCreateTree,
  onOpenTree,
}) {
  const [step, setStep] = useState('idle');
  const [name, setName] = useState('');
  const [planting, setPlanting] = useState(false);
  const [error, setError] = useState(null);

  const inputRef = useRef(null);

  // Focus follows the reveal. Without this, opening the field leaves keyboard
  // users hunting for where the screen just went.
  useEffect(() => {
    if (step === 'naming') inputRef.current?.focus();
  }, [step]);

  const trimmed = name.trim();
  const canPlant = trimmed.length > 0 && trimmed.length <= SKILL_NAME_MAX && !planting;

  function cancel() {
    setStep('idle');
    setName('');
    setError(null);
  }

  async function plant() {
    if (!canPlant) return;
    setPlanting(true);
    setError(null);
    try {
      await onCreateTree(trimmed);
      setName('');
      setStep('idle');
    } catch (err) {
      // Storage-layer messages are already written for people, so show as-is.
      setError(err.message);
    } finally {
      setPlanting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-5 pt-10 pb-16 sm:pt-14">
      <header className="mb-8">
        <p className="font-display text-sm tracking-wide text-bark">SkillTree</p>
        <h1 className="mt-1 text-3xl font-bold text-ink sm:text-4xl">
          Come in. What are you learning?
        </h1>
        <p className="mt-2 max-w-lg text-bark">
          Every pot holds one skill. You teach each sapling what you picked up, and it grows from
          the explaining.
        </p>
      </header>

      <section aria-labelledby="shelf-heading" className="mb-10">
        <h2 id="shelf-heading" className="mb-3 font-display text-lg font-semibold text-ink">
          On the shelf
        </h2>
        {loading ? (
          <p className="text-bark">Opening the room…</p>
        ) : (
          <PotShelf
            trees={trees}
            sessionsByTree={sessionsByTree}
            justPlantedId={justPlantedId}
            onOpen={onOpenTree}
          />
        )}
      </section>

      <section aria-labelledby="plant-heading">
        <h2 id="plant-heading" className="mb-3 font-display text-lg font-semibold text-ink">
          An empty pot
        </h2>

        {step === 'idle' ? (
          <button
            type="button"
            onClick={() => setStep('naming')}
            className="flex flex-col items-center gap-2 rounded-cozy bg-parchment/70 px-6 pt-4 pb-5 shadow-soft transition duration-300 ease-out hover:-translate-y-1 hover:shadow-lift"
          >
            <TreeSVG planted={false} idle={false} className="h-32 w-24 sm:h-40 sm:w-28" />
            <span className="font-display font-semibold text-ink">Grow a sapling</span>
            <span className="text-xs text-bark">Tap the pot when you are ready</span>
          </button>
        ) : (
          <div className="rise flex max-w-xl flex-col gap-4 rounded-cozy bg-parchment/85 p-5 shadow-soft sm:flex-row sm:items-center">
            <TreeSVG planted={false} idle={false} className="h-24 w-20 shrink-0 self-center" />

            <div className="min-w-0 flex-1">
              <label htmlFor="skill-name" className="font-display font-semibold text-ink">
                What will this one learn?
              </label>

              <input
                id="skill-name"
                ref={inputRef}
                type="text"
                value={name}
                maxLength={SKILL_NAME_MAX}
                placeholder="Spanish conversation, welding, Bayes' rule…"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') plant();
                  if (e.key === 'Escape') cancel();
                }}
                className="mt-2 w-full rounded-cozy border border-leaf/60 bg-cream px-4 py-3 text-ink transition duration-200 placeholder:text-bark/60 focus:border-sage focus:outline-none"
              />

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={plant}
                  disabled={!canPlant}
                  className="rounded-cozy bg-sage px-5 py-2.5 font-semibold text-cream shadow-soft transition duration-200 ease-out hover:bg-sage/90 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {planting ? 'Planting…' : 'Grow a sapling'}
                </button>
                <button
                  type="button"
                  onClick={cancel}
                  className="text-sm text-bark underline transition duration-200 hover:text-ink"
                >
                  Not now
                </button>
                {trimmed.length > SKILL_NAME_MAX - 10 && (
                  <span className="text-xs text-bark">{SKILL_NAME_MAX - trimmed.length} left</span>
                )}
              </div>

              {error && (
                <p className="mt-3 rounded-cozy bg-amber/25 px-4 py-2 text-sm text-ink">{error}</p>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
