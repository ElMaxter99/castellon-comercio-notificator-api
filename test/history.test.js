const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_HISTORY_MAX_ENTRIES,
  resolveHistoryMax,
  pushHistory,
  parseLimit,
} = require("../src/utils/history");

test("pushHistory pone la entrada nueva la primera", () => {
  assert.deepEqual(pushHistory([{ n: 1 }], { n: 2 }, 10), [{ n: 2 }, { n: 1 }]);
});

test("pushHistory descarta las más antiguas al superar el máximo (también un histórico ya largo)", () => {
  const long = Array.from({ length: 20 }, (_, i) => ({ n: 20 - i }));
  const result = pushHistory(long, { n: 21 }, 5);
  assert.deepEqual(result.map((e) => e.n), [21, 20, 19, 18, 17]);
});

test("HISTORY_MAX_ENTRIES: por defecto 500, válido o ignorado", () => {
  assert.equal(resolveHistoryMax({}), DEFAULT_HISTORY_MAX_ENTRIES);
  assert.equal(resolveHistoryMax({ HISTORY_MAX_ENTRIES: "100" }), 100);
  for (const bad of ["0", "-3", "abc", "1.5"]) {
    assert.equal(resolveHistoryMax({ HISTORY_MAX_ENTRIES: bad }), DEFAULT_HISTORY_MAX_ENTRIES);
  }
});

test("parseLimit solo acepta enteros ≥ 1", () => {
  assert.equal(parseLimit("20"), 20);
  for (const bad of [undefined, "0", "-1", "x", "2.5", ["1"]]) assert.equal(parseLimit(bad), undefined);
});
