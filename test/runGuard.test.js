const test = require("node:test");
const assert = require("node:assert/strict");
const { createRunGuard } = require("../src/utils/runGuard");

const tick = (ms) => new Promise((r) => setTimeout(r, ms));

test("ejecuta y devuelve el valor", async () => {
  const g = createRunGuard();
  assert.deepEqual(await g.run(async () => 42), { skipped: false, value: 42 });
  assert.equal(g.isRunning(), false);
});

test("una segunda ejecución mientras hay otra en curso se omite", async () => {
  const g = createRunGuard();
  let calls = 0;
  const first = g.run(async () => {
    calls++;
    await tick(30);
    return "a";
  });
  const second = await g.run(async () => {
    calls++;
    return "b";
  });
  assert.deepEqual(second, { skipped: true });
  assert.equal((await first).value, "a");
  assert.equal(calls, 1);
});

test("tras terminar (o fallar) se puede volver a ejecutar", async () => {
  const g = createRunGuard();
  await assert.rejects(g.run(async () => { throw new Error("boom"); }), /boom/);
  assert.equal(g.isRunning(), false);
  assert.equal((await g.run(async () => 1)).value, 1);
});

test("whenIdle: true si no hay nada, espera a la tarea y false si se agota el tiempo", async () => {
  const g = createRunGuard();
  assert.equal(await g.whenIdle(10), true);

  const quick = g.run(() => tick(20));
  assert.equal(await g.whenIdle(500), true);
  await quick;

  const slow = g.run(() => tick(200));
  assert.equal(await g.whenIdle(10), false);
  await slow;
});
