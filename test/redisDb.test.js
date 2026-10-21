const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveRedisDb } = require("../src/utils/redisDb");

test("sin URL conserva el mapeo histórico por NODE_ENV", () => {
  assert.equal(resolveRedisDb({ NODE_ENV: "prod" }), 0);
  assert.equal(resolveRedisDb({ NODE_ENV: "staging" }), 1);
  assert.equal(resolveRedisDb({ NODE_ENV: "dev" }), 2);
  assert.equal(resolveRedisDb({}), 2);
});

test("con REDIS_URL (Redis gestionado) usa la base 0 aunque NODE_ENV sea production", () => {
  assert.equal(resolveRedisDb({ NODE_ENV: "production", REDIS_URL: "rediss://default:x@host:6379" }), 0);
});

test("respeta la base indicada en la URL", () => {
  assert.equal(resolveRedisDb({ REDIS_URL: "redis://h:6379/3" }), 3);
});

test("REDIS_DB explícito manda sobre todo", () => {
  assert.equal(resolveRedisDb({ REDIS_DB: "5", REDIS_URL: "redis://h:6379/3", NODE_ENV: "prod" }), 5);
  assert.equal(resolveRedisDb({ REDIS_DB: "abc", NODE_ENV: "prod" }), 0);
});

test("URL ilegible cae en 0", () => {
  assert.equal(resolveRedisDb({ REDIS_URL: "no es una url" }), 0);
});
