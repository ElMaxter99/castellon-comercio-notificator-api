/** Caché de un único valor con caducidad. `ttlMs <= 0` la desactiva. */
function createTtlCache(ttlMs, now = Date.now) {
  let entry = null;

  return {
    get() {
      if (ttlMs <= 0 || !entry) return undefined;
      if (now() - entry.at >= ttlMs) {
        entry = null;
        return undefined;
      }
      return entry.value;
    },
    set(value) {
      if (ttlMs > 0) entry = { value, at: now() };
      return value;
    },
    clear() {
      entry = null;
    },
  };
}

const DEFAULT_CATALOG_CACHE_SECONDS = 30;

/** Segundos que se cachea el catálogo en memoria: CATALOG_CACHE_SECONDS (por defecto 30; 0 = sin caché). */
function resolveCatalogCacheMs(env = process.env) {
  const raw = (env.CATALOG_CACHE_SECONDS ?? "").trim();
  const seconds = /^\d+$/.test(raw) ? Number(raw) : DEFAULT_CATALOG_CACHE_SECONDS;
  return seconds * 1000;
}

module.exports = { createTtlCache, resolveCatalogCacheMs, DEFAULT_CATALOG_CACHE_SECONDS };
