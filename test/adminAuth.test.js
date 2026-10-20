const test = require("node:test");
const assert = require("node:assert/strict");
const requireAdminToken = require("../src/middleware/adminAuth");

function run(headers = {}, env = {}) {
  const previous = process.env.FORCE_SCRAPE_TOKEN;
  if (env.token === undefined) delete process.env.FORCE_SCRAPE_TOKEN;
  else process.env.FORCE_SCRAPE_TOKEN = env.token;

  const out = { status: null, body: null, nextCalled: false };
  const req = { get: (name) => headers[name.toLowerCase()] };
  const res = {
    status(code) { out.status = code; return this; },
    json(body) { out.body = body; return this; },
  };
  requireAdminToken(req, res, () => { out.nextCalled = true; });

  if (previous === undefined) delete process.env.FORCE_SCRAPE_TOKEN;
  else process.env.FORCE_SCRAPE_TOKEN = previous;
  return out;
}

test("sin FORCE_SCRAPE_TOKEN la ruta queda deshabilitada (403)", () => {
  const out = run({ authorization: "Bearer lo-que-sea" });
  assert.equal(out.status, 403);
  assert.equal(out.nextCalled, false);
});

test("sin cabecera → 401", () => {
  const out = run({}, { token: "secreto" });
  assert.equal(out.status, 401);
  assert.equal(out.nextCalled, false);
});

test("token incorrecto → 401", () => {
  const out = run({ authorization: "Bearer otro" }, { token: "secreto" });
  assert.equal(out.status, 401);
});

test("esquema distinto de Bearer → 401", () => {
  assert.equal(run({ authorization: "Basic secreto" }, { token: "secreto" }).status, 401);
});

test("token correcto → continúa", () => {
  const out = run({ authorization: "Bearer secreto" }, { token: "secreto" });
  assert.equal(out.nextCalled, true);
  assert.equal(out.status, null);
});

test("el esquema Bearer no distingue mayúsculas", () => {
  assert.equal(run({ authorization: "bearer secreto" }, { token: "secreto" }).nextCalled, true);
});
