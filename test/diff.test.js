const test = require("node:test");
const assert = require("node:assert/strict");
const { diffComercios } = require("../src/utils/diff");

const c = (name, address = "CALLE A, 1") => ({ name, address });
const names = (list) => list.map((x) => x.name);

test("sin cambios", () => {
  const list = [c("A"), c("B")];
  assert.deepEqual(diffComercios(list, [c("A"), c("B")]), { added: [], removed: [] });
});

test("altas y bajas simples, respetando el orden", () => {
  const d = diffComercios([c("A"), c("B")], [c("B"), c("C"), c("D")]);
  assert.deepEqual(names(d.added), ["C", "D"]);
  assert.deepEqual(names(d.removed), ["A"]);
});

test("mayúsculas, acentos y espacios no generan altas ni bajas", () => {
  const d = diffComercios([c("Panadería  Ejemplo")], [c("PANADERIA EJEMPLO")]);
  assert.deepEqual(d, { added: [], removed: [] });
});

test("corregir la dirección de un comercio no es alta ni baja", () => {
  const d = diffComercios([c("A", "CALLE X, 1")], [c("A", "CALLE X, 1 BAJO")]);
  assert.deepEqual(d, { added: [], removed: [] });
});

test("homónimos: aparece un segundo comercio con el mismo nombre → alta (antes se perdía)", () => {
  const old = [c("BAR PEPE", "CALLE A, 1")];
  const nuevo = [c("BAR PEPE", "CALLE A, 1"), c("BAR PEPE", "CALLE B, 9")];
  const d = diffComercios(old, nuevo);
  assert.equal(d.added.length, 1);
  assert.equal(d.added[0].address, "CALLE B, 9");
  assert.deepEqual(d.removed, []);
});

test("homónimos: desaparece uno de los dos → baja del correcto", () => {
  const old = [c("BAR PEPE", "CALLE A, 1"), c("BAR PEPE", "CALLE B, 9")];
  const d = diffComercios(old, [c("BAR PEPE", "CALLE B, 9")]);
  assert.equal(d.removed.length, 1);
  assert.equal(d.removed[0].address, "CALLE A, 1");
  assert.deepEqual(d.added, []);
});

test("catálogo previo vacío: todo son altas", () => {
  assert.equal(diffComercios([], [c("A"), c("B")]).added.length, 2);
});
