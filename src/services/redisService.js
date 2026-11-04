const { redis, ENV, NAMESPACE } = require("../config/redis");
const { pushHistory } = require("../utils/history");
const { createTtlCache, resolveCatalogCacheMs } = require("../utils/ttlCache");

// El catálogo solo cambia en cada scrapeo: se cachea en memoria para no leer y parsear el JSON
// completo de Redis en cada petición. Se invalida al guardar; el cron siempre lee de Redis.
const catalogCache = createTtlCache(resolveCatalogCacheMs());

function key(name) {
  return `${ENV}:${NAMESPACE}:${name}`;
}

async function saveComercios(comercios) {
  await redis.set(key("comercios"), JSON.stringify(comercios));
  catalogCache.clear();
}

/** `fresh: true` se salta la caché (lo usa el cron para comparar contra lo realmente guardado). */
async function getComercios({ fresh = false } = {}) {
  if (!fresh) {
    const cached = catalogCache.get();
    if (cached) return cached;
  }
  const data = await redis.get(key("comercios"));
  return catalogCache.set(data ? JSON.parse(data) : []);
}

async function deleteComercios() {
  await redis.del(key("comercios"));
  catalogCache.clear();
}

async function saveLastUpdate(date = new Date()) {
  await redis.set(key("last-update"), date.toISOString());
}

async function getLastUpdate() {
  const date = await redis.get(key("last-update"));
  return date ? new Date(date) : null;
}

async function addHistoryEntry({ added, removed, modified = [], total }) {
  const entry = {
    timestamp: new Date().toISOString(),
    added: added.map((c) => c.name),
    removed: removed.map((c) => c.name),
    modified: modified.map((m) => ({ name: m.name, changes: m.changes })),
    countAfter: total,
  };

  const keyHistory = key("history");
  const existing = await redis.get(keyHistory);
  const history = existing ? JSON.parse(existing) : [];

  await redis.set(keyHistory, JSON.stringify(pushHistory(history, entry)));
}

async function getHistory() {
  const data = await redis.get(key("history"));
  return data ? JSON.parse(data) : [];
}

async function updateSectorsFromComercios(comercios) {
  const keySectors = key("sectors");
  const sectors = new Set(comercios.map(c => c.sector || "Sin sector"));
  await redis.set(keySectors, JSON.stringify([...sectors]));
}

async function getSectors() {
  const data = await redis.get(key("sectors"));
  return data ? JSON.parse(data) : [];
}

module.exports = {
  redis,
  saveComercios,
  getComercios,
  deleteComercios,
  saveLastUpdate,
  getLastUpdate,
  addHistoryEntry,
  getHistory,
  updateSectorsFromComercios,
  getSectors,
};
