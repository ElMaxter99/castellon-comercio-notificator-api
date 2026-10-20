const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluateHealth, STARTUP_GRACE_SECONDS } = require("../src/utils/health");

const now = Date.parse("2026-10-20T14:00:00Z");
const minutesAgo = (m) => new Date(now - m * 60000);
const base = { now, uptimeSeconds: 3600, maxAgeMinutes: 15 };

test("datos recientes → ok", () => {
  const h = evaluateHealth({ ...base, lastUpdate: minutesAgo(4) });
  assert.equal(h.ok, true);
  assert.equal(h.ageMinutes, 4);
});

test("justo en el límite sigue siendo ok", () => {
  assert.equal(evaluateHealth({ ...base, lastUpdate: minutesAgo(15) }).ok, true);
});

test("datos más viejos que el máximo → obsoleto", () => {
  const h = evaluateHealth({ ...base, lastUpdate: minutesAgo(50) });
  assert.equal(h.ok, false);
  assert.equal(h.stale, true);
  assert.equal(h.ageMinutes, 50);
});

test("sin ninguna actualización y fuera del periodo de gracia → obsoleto", () => {
  const h = evaluateHealth({ ...base, lastUpdate: null });
  assert.equal(h.stale, true);
  assert.equal(h.ageMinutes, null);
});

test("recién arrancado no se alerta aunque los datos sean viejos (el cron aún no ha dado su primer tick)", () => {
  const h = evaluateHealth({ ...base, uptimeSeconds: 30, lastUpdate: minutesAgo(50) });
  assert.equal(h.ok, true);
  assert.equal(evaluateHealth({ ...base, uptimeSeconds: 30, lastUpdate: null }).ok, true);
});

test("pasado el periodo de gracia vuelve a alertar", () => {
  const h = evaluateHealth({ ...base, uptimeSeconds: STARTUP_GRACE_SECONDS + 1, lastUpdate: minutesAgo(50) });
  assert.equal(h.stale, true);
});
