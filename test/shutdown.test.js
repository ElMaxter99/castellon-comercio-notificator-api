const test = require("node:test");
const assert = require("node:assert/strict");
const { createShutdown } = require("../src/utils/shutdown");

test("ejecuta los pasos en orden y sale con 0", async () => {
  const order = [];
  let code;
  const shutdown = createShutdown({
    steps: [["a", async () => order.push("a")], ["b", async () => order.push("b")]],
    exit: (c) => (code = c),
  });
  await shutdown("SIGTERM");
  assert.deepEqual(order, ["a", "b"]);
  assert.equal(code, 0);
});

test("un paso que falla no impide los siguientes", async () => {
  const order = [];
  let code;
  const shutdown = createShutdown({
    steps: [["a", async () => { throw new Error("x"); }], ["b", async () => order.push("b")]],
    exit: (c) => (code = c),
  });
  await shutdown("SIGINT");
  assert.deepEqual(order, ["b"]);
  assert.equal(code, 0);
});

test("solo atiende la primera señal", async () => {
  let runs = 0;
  const shutdown = createShutdown({ steps: [["a", async () => runs++]], exit: () => {} });
  await shutdown("SIGTERM");
  await shutdown("SIGINT");
  assert.equal(runs, 1);
});

test("si tarda más del límite sale con 1", async () => {
  let code;
  const shutdown = createShutdown({
    timeoutMs: 20,
    steps: [["lento", () => new Promise((r) => setTimeout(r, 300))]],
    exit: (c) => (code = c),
  });
  await shutdown("SIGTERM");
  assert.equal(code, 1);
});
