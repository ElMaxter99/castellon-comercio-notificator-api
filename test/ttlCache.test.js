const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createTtlCache,
  resolveCatalogCacheMs,
  DEFAULT_CATALOG_CACHE_SECONDS,
} = require("../src/utils/ttlCache");

test("devuelve el valor hasta que caduca", () => {
  let t = 1000;
  const cache = createTtlCache(500, () => t);
  assert.equal(cache.get(), undefined);
  cache.set(["a"]);
  t += 499;
  assert.deepEqual(cache.get(), ["a"]);
  t += 1;
  assert.equal(cache.get(), undefined);
});

test("clear() la invalida al momento", () => {
  const cache = createTtlCache(10000);
  cache.set(1);
  cache.clear();
  assert.equal(cache.get(), undefined);
});

test("ttl 0 la desactiva", () => {
  const cache = createTtlCache(0);
  cache.set(1);
  assert.equal(cache.get(), undefined);
});

test("CATALOG_CACHE_SECONDS: por defecto 30, válido (incluido 0) o ignorado", () => {
  assert.equal(resolveCatalogCacheMs({}), DEFAULT_CATALOG_CACHE_SECONDS * 1000);
  assert.equal(resolveCatalogCacheMs({ CATALOG_CACHE_SECONDS: "120" }), 120000);
  assert.equal(resolveCatalogCacheMs({ CATALOG_CACHE_SECONDS: "0" }), 0);
  assert.equal(resolveCatalogCacheMs({ CATALOG_CACHE_SECONDS: "x" }), DEFAULT_CATALOG_CACHE_SECONDS * 1000);
});
