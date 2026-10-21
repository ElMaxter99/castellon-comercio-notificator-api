const test = require("node:test");
const assert = require("node:assert/strict");
const {
  securityHeaders,
  cacheControl,
  resolveCacheMaxAge,
  DEFAULT_MAX_AGE_SECONDS,
} = require("../src/middleware/httpHeaders");

function run(mw, method = "GET") {
  const headers = {};
  let nexted = false;
  mw({ method }, { setHeader: (k, v) => (headers[k] = v) }, () => (nexted = true));
  return { headers, nexted };
}

test("cabeceras de seguridad básicas", () => {
  const { headers, nexted } = run(securityHeaders);
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.equal(headers["Referrer-Policy"], "no-referrer");
  assert.ok(nexted);
});

test("GET de datos: caché pública; el resto, sin almacenar", () => {
  assert.equal(run(cacheControl(60)).headers["Cache-Control"], "public, max-age=60");
  assert.equal(run(cacheControl(60), "HEAD").headers["Cache-Control"], "public, max-age=60");
  assert.equal(run(cacheControl(60), "POST").headers["Cache-Control"], "no-store");
});

test("max-age 0 → no-cache (revalida siempre)", () => {
  assert.equal(run(cacheControl(0)).headers["Cache-Control"], "no-cache");
});

test("CACHE_MAX_AGE_SECONDS: por defecto 60, numérico válido o ignorado", () => {
  assert.equal(resolveCacheMaxAge({}), DEFAULT_MAX_AGE_SECONDS);
  assert.equal(resolveCacheMaxAge({ CACHE_MAX_AGE_SECONDS: "300" }), 300);
  assert.equal(resolveCacheMaxAge({ CACHE_MAX_AGE_SECONDS: "0" }), 0);
  assert.equal(resolveCacheMaxAge({ CACHE_MAX_AGE_SECONDS: "abc" }), DEFAULT_MAX_AGE_SECONDS);
});
