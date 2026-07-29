/**
 * seededRandom.js — deterministic pseudo-randomness, seeded from a string.
 *
 * The tree needs to look organic: no two branches should curve identically. But
 * `Math.random()` would redraw the tree on every render, and the whole
 * architectural claim of this project is that sessions are the single source of
 * truth — the same rows must always produce the same picture.
 *
 * So the "randomness" is a pure function of the session's own id. Two properties
 * follow, and both matter:
 *
 *   1. Reload-stable. Same id, same wobble, forever.
 *   2. Neighbour-independent. A session's id seeds only its own element, so
 *      adding a session never reshapes the ones already on the tree. This is
 *      why each element gets a fresh generator rather than all of them drawing
 *      from one stream — a shared stream would make every element's shape
 *      depend on how many elements came before it.
 *
 * The algorithms are xmur3 (string -> 32-bit seed) and mulberry32 (seed ->
 * uniform stream). They are here because they are ~10 lines each and adding a
 * dependency for this would be silly. Neither is cryptographic; nothing here
 * needs to be.
 */

/** Hash a string to a well-mixed unsigned 32-bit integer. */
export function hashString(str) {
  let h = 1779033703 ^ str.length;

  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }

  // Final avalanche, so ids differing in one character land far apart. Without
  // it, sequential uuids would produce visibly similar trees.
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/** A stream of uniform numbers in [0, 1) from a 32-bit seed. */
export function mulberry32(seed) {
  let a = seed >>> 0;

  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The only thing the layout module actually calls: a small set of shaped draws
 * seeded from one id.
 *
 * Draw order is significant — `around(5)` then `between(0.88, 1.12)` consumes
 * two different values than the reverse. Callers must keep their order fixed,
 * or existing trees change shape on a refactor. That fragility is the cost of
 * seeding this way; the alternative (a named value per property, hashing
 * `id + ':angle'`) costs a hash per property and more code.
 *
 * @param {string} id a session id
 */
export function jitterFromId(id) {
  const next = mulberry32(hashString(String(id)));

  return {
    next,
    /** Signed offset in [-amount, +amount]. */
    around: (amount) => (next() * 2 - 1) * amount,
    /** A value in [lo, hi). */
    between: (lo, hi) => lo + next() * (hi - lo),
    /** One item from a list. */
    pick: (items) => items[Math.floor(next() * items.length) % items.length],
  };
}
