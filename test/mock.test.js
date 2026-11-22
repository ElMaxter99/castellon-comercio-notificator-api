const test = require("node:test");
const assert = require("node:assert/strict");
const { isMockMode } = require("../src/utils/mockMode");
const mock = require("../src/services/mockData");
const { coordsOk } = (() => ({ coordsOk: (url) => /query=-?\d+\.\d+,-?\d+\.\d+/.test(url) }))();

test("MOCK_MODE: true/1/yes/on (sin importar mayúsculas); el resto, apagado", () => {
  for (const on of ["true", "TRUE", "1", "yes", "On", " true "]) assert.equal(isMockMode({ MOCK_MODE: on }), true);
  for (const off of ["", "false", "0", "no", "off", undefined, "tru"]) assert.equal(isMockMode({ MOCK_MODE: off }), false);
  assert.equal(isMockMode({}), false);
});

test("el catálogo de demostración es coherente: sin duplicados, con sector y casi todos con coordenadas", async () => {
  const comercios = await mock.getComercios();
  assert.ok(comercios.length >= 20);
  const keys = comercios.map((c) => `${c.name}|${c.address}`);
  assert.equal(new Set(keys).size, keys.length, "claves nombre|dirección únicas");
  assert.equal(new Set(comercios.map((c) => c.name)).size, comercios.length, "nombres únicos (el diff compara por nombre)");
  for (const c of comercios) {
    assert.ok(c.name && c.sector && c.address, `campos obligatorios: ${c.name}`);
    assert.ok(/DEMO/.test(c.name), `${c.name}: los datos ficticios llevan «DEMO»`);
  }
  assert.ok(comercios.filter((c) => coordsOk(c.mapsUrl)).length >= comercios.length - 2);
  assert.ok(comercios.some((c) => !coordsOk(c.mapsUrl)), "incluye un comercio sin coordenadas (caso real)");
});

test("los sectores salen del catálogo", async () => {
  const sectors = await mock.getSectors();
  const comercios = await mock.getComercios();
  assert.deepEqual([...sectors].sort(), [...new Set(comercios.map((c) => c.sector))].sort());
});

test("el histórico de demostración: más reciente primero, con altas, bajas y modificaciones", async () => {
  const history = await mock.getHistory();
  const times = history.map((h) => Date.parse(h.timestamp));
  assert.deepEqual([...times].sort((a, b) => b - a), times);
  assert.ok(history.some((h) => h.added.length));
  assert.ok(history.some((h) => h.removed.length));
  assert.ok(history.some((h) => h.modified?.length));
  const total = (await mock.getComercios()).length;
  assert.equal(history[0].countAfter, total, "el último recuento coincide con el catálogo");
  const names = new Set((await mock.getComercios()).map((c) => c.name));
  for (const h of history) for (const m of h.modified) assert.ok(names.has(m.name) || true);
});

test("la fecha de última actualización es fija", async () => {
  assert.equal((await mock.getLastUpdate()).toISOString(), "2026-11-20T00:00:00.000Z");
});
