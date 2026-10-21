const test = require("node:test");
const assert = require("node:assert/strict");
const { DEFAULT_USER_AGENT, resolveUserAgent } = require("../src/utils/userAgent");

test("sin variable usa el User-Agent descriptivo por defecto", () => {
  const r = resolveUserAgent({});
  assert.equal(r.value, DEFAULT_USER_AGENT);
  assert.match(r.value, /^ComercioCastellonNotificator\/\d+\.\d+\.\d+ \(\+https:\/\//);
  assert.deepEqual(r.warnings, []);
});

test("vacío o solo espacios usa el de por defecto sin avisar", () => {
  assert.equal(resolveUserAgent({ SCRAPER_USER_AGENT: "   " }).value, DEFAULT_USER_AGENT);
});

test("respeta un valor válido (recortado)", () => {
  const r = resolveUserAgent({ SCRAPER_USER_AGENT: "  MiBot/1.0 (+mailto:yo@example.com) " });
  assert.equal(r.value, "MiBot/1.0 (+mailto:yo@example.com)");
  assert.deepEqual(r.warnings, []);
});

test("rechaza saltos de línea, no ASCII y longitud excesiva", () => {
  for (const bad of ["Bot\r\nX-Evil: 1", "Bót/1.0", "a".repeat(301)]) {
    const r = resolveUserAgent({ SCRAPER_USER_AGENT: bad });
    assert.equal(r.value, DEFAULT_USER_AGENT);
    assert.equal(r.warnings.length, 1);
  }
});
