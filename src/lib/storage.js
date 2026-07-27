/**
 * storage.js — where trees and sessions live in Phase 1.
 *
 * This is a stand-in for Supabase. The whole point of putting it behind these
 * four functions is that swapping the backend later should touch this file and
 * nothing else. Three deliberate choices make that swap cheap:
 *
 *   1. Every function is `async`, even though localStorage is synchronous.
 *      Callers must already `await`, so a network-backed version drops in
 *      without editing a single component.
 *   2. Rows use the shapes and names the Postgres tables will use — snake_case
 *      columns (tree_id, skill_name, created_at), uuid ids, ISO timestamps.
 *      No field renaming later, and no "id is a number here but a uuid there".
 *   3. Validation lives here, not only in the UI. The database will enforce
 *      1-50 characters with a CHECK constraint, so enforcing it at the same
 *      layer now means behaviour does not change when the swap happens.
 */

// Namespaced and versioned. The version lets a future change to the stored
// shape be detected instead of silently mis-parsed.
const KEYS = {
  trees: 'skilltree.v1.trees',
  sessions: 'skilltree.v1.sessions',
};

export const SKILL_NAME_MAX = 50;

// ------------------------------------------------------------------ helpers

/**
 * Read a list, treating any problem as "empty" rather than crashing.
 * localStorage holds strings a user can edit in devtools, so this is parsing
 * untrusted input — it is never safe to assume the JSON is what we wrote.
 */
function readList(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error(`[storage] could not read ${key}`, err);
    return [];
  }
}

function writeList(key, rows) {
  try {
    localStorage.setItem(key, JSON.stringify(rows));
  } catch (err) {
    // Private browsing and full quotas both land here.
    console.error(`[storage] could not write ${key}`, err);
    throw new Error('This browser will not let the room save right now.', { cause: err });
  }
}

/**
 * uuids, so ids look the same before and after Supabase. randomUUID needs a
 * secure context (https or localhost), which covers dev and production — the
 * fallback exists only so a plain-http preview does not break.
 */
function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

/** Oldest first. Chronological order is what the tree layout will depend on. */
function byCreatedAt(a, b) {
  return String(a.created_at).localeCompare(String(b.created_at));
}

// -------------------------------------------------------------------- trees

/** @returns {Promise<Array<{id, skill_name, created_at}>>} */
export async function getTrees() {
  return readList(KEYS.trees).sort(byCreatedAt);
}

/**
 * Plant a sapling.
 * @param {string} skillName 1-50 characters after trimming
 * @returns {Promise<{id, skill_name, created_at}>} the created row
 */
export async function createTree(skillName) {
  const name = typeof skillName === 'string' ? skillName.trim() : '';

  if (name.length === 0) {
    throw new Error('Give your sapling something to learn.');
  }
  if (name.length > SKILL_NAME_MAX) {
    throw new Error(`Keep the name under ${SKILL_NAME_MAX} characters.`);
  }

  const tree = { id: newId(), skill_name: name, created_at: new Date().toISOString() };
  const trees = readList(KEYS.trees);
  writeList(KEYS.trees, [...trees, tree]);
  return tree;
}

// ----------------------------------------------------------------- sessions

/**
 * Sessions for one tree, oldest first.
 *
 * Nothing writes sessions yet — the chat arrives in a later phase. The function
 * exists now because the shelf already asks "how much has this grown?", and
 * because settling the interface early is what keeps the Supabase swap boring.
 *
 * @returns {Promise<Array<{id, tree_id, transcript, classification, summary, created_at}>>}
 */
export async function getSessions(treeId) {
  return readList(KEYS.sessions)
    .filter((s) => s.tree_id === treeId)
    .sort(byCreatedAt);
}

/**
 * Record a finished teaching session.
 * @param {{treeId: string, transcript?: Array, classification?: 'major'|'minor', summary?: string}} input
 */
export async function addSession({ treeId, transcript = [], classification = null, summary = '' }) {
  if (!treeId) throw new Error('A session needs a tree to belong to.');

  const session = {
    id: newId(),
    tree_id: treeId,
    transcript,
    classification,
    summary,
    created_at: new Date().toISOString(),
  };

  const sessions = readList(KEYS.sessions);
  writeList(KEYS.sessions, [...sessions, session]);
  return session;
}
