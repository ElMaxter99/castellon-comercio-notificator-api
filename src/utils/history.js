const DEFAULT_HISTORY_MAX_ENTRIES = 500;

/** Máximo de entradas del histórico: HISTORY_MAX_ENTRIES (entero ≥ 1); si no, 500. */
function resolveHistoryMax(env = process.env) {
  const raw = (env.HISTORY_MAX_ENTRIES ?? "").trim();
  if (/^\d+$/.test(raw) && Number(raw) >= 1) return Number(raw);
  return DEFAULT_HISTORY_MAX_ENTRIES;
}

/** Añade `entry` al principio (el más reciente primero) y descarta las más antiguas. */
function pushHistory(history, entry, max = resolveHistoryMax()) {
  return [entry, ...history].slice(0, max);
}

/** `?limit=N` de GET /history: entero ≥ 1 o undefined (todo). */
function parseLimit(value) {
  if (typeof value !== "string" || !/^\d+$/.test(value) || Number(value) < 1) return undefined;
  return Number(value);
}

module.exports = { DEFAULT_HISTORY_MAX_ENTRIES, resolveHistoryMax, pushHistory, parseLimit };
