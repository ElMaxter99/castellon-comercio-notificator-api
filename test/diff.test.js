const test = require("node:test");
const assert = require("node:assert/strict");
const { diffComercios } = require("../src/utils/diff");

const c = (name, address = "CALLE A, 1") => ({ name, address });
const names = (list) => list.map((x) => x.name);

test("sin cambios", () => {
  const list = [c("A"), c("B")];
  assert.deepEqual(diffComercios(list, [c("A"), c("B")]), { added: [], removed: [], modified: [] });
});

test("altas y bajas simples, respetando el orden", () => {
  const d = diffComercios([c("A"), c("B")], [c("B"), c("C"), c("D")]);
  assert.deepEqual(names(d.added), ["C", "D"]);
  assert.deepEqual(names(d.removed), ["A"]);
});

test("mayúsculas, acentos y espacios no generan altas ni bajas", () => {
  const d = diffComercios([c("Panadería  Ejemplo")], [c("PANADERIA EJEMPLO")]);
  assert.deepEqual(d, { added: [], removed: [], modified: [] });
});

test("corregir la dirección de un comercio no es alta ni baja: es una modificación", () => {
  const d = diffComercios([c("A", "CALLE X, 1")], [c("A", "CALLE X, 1 BAJO")]);
  assert.deepEqual(d.added, []);
  assert.deepEqual(d.removed, []);
  assert.equal(d.modified.length, 1);
  assert.equal(d.modified[0].name, "A");
  assert.deepEqual(d.modified[0].changes, ["address"]);
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

const full = (name, extra = {}) => ({ name, sector: "Moda", phone: "964 1", address: "CALLE A, 1", mapsUrl: "m1", img: "i1", ...extra });

test("modificaciones: teléfono y sector cambian → un solo registro con ambos campos", () => {
  const d = diffComercios([full("A")], [full("A", { phone: "964 2", sector: "Hogar" })]);
  assert.equal(d.modified.length, 1);
  assert.deepEqual(d.modified[0].changes, ["sector", "phone"]);
  assert.equal(d.modified[0].before.phone, "964 1");
  assert.equal(d.modified[0].after.phone, "964 2");
  assert.deepEqual([d.added, d.removed], [[], []]);
});

test("la imagen y los cambios de formato/mayúsculas no cuentan como modificación", () => {
  const d = diffComercios([full("A")], [full("A", { img: "otra", sector: "MODA", phone: " 964 1 " })]);
  assert.deepEqual(d.modified, []);
});

test("homónimos: se emparejan por dirección y solo se marca el que cambió", () => {
  const old = [full("BAR", { address: "CALLE A, 1" }), full("BAR", { address: "CALLE B, 2", phone: "1" })];
  const nuevo = [full("BAR", { address: "CALLE B, 2", phone: "2" }), full("BAR", { address: "CALLE A, 1" })];
  const d = diffComercios(old, nuevo);
  assert.equal(d.modified.length, 1);
  assert.equal(d.modified[0].after.address, "CALLE B, 2");
  assert.deepEqual(d.modified[0].changes, ["phone"]);
});

test("a la vez: alta, baja y modificación", () => {
  const d = diffComercios([full("A"), full("B")], [full("B", { phone: "x" }), full("C")]);
  assert.deepEqual(d.added.map((x) => x.name), ["C"]);
  assert.deepEqual(d.removed.map((x) => x.name), ["A"]);
  assert.deepEqual(d.modified.map((x) => x.name), ["B"]);
});
