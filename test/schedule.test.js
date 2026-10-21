const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveSchedule, parseCron, gapsInMinutes, DEFAULT_SCRAPE_CRON } = require("../src/utils/schedule");
const { evaluateHealth } = require("../src/utils/health");

const gaps = (expression) => gapsInMinutes(parseCron(expression));

test("sin SCRAPE_CRON se usa la frecuencia de siempre: cada 5 minutos", () => {
  const s = resolveSchedule({});
  assert.equal(s.expression, DEFAULT_SCRAPE_CRON);
  assert.equal(s.minGapMinutes, 5);
  assert.equal(s.maxGapMinutes, 5);
  assert.deepEqual(s.warnings, []);
});

test("acepta una expresión válida y deduce los intervalos", () => {
  const s = resolveSchedule({ SCRAPE_CRON: "*/15 * * * *" });
  assert.equal(s.expression, "*/15 * * * *");
  assert.equal(s.minGapMinutes, 15);
  assert.deepEqual(s.warnings, []);

  const hourly = resolveSchedule({ SCRAPE_CRON: "0 * * * *" });
  assert.equal(hourly.minGapMinutes, 60);
  assert.equal(hourly.maxGapMinutes, 60);
});

test("el hueco máximo tiene en cuenta los periodos sin ejecuciones (p. ej. de noche)", () => {
  const s = resolveSchedule({ SCRAPE_CRON: "0 8-20 * * *" });
  assert.equal(s.minGapMinutes, 60);
  assert.equal(s.maxGapMinutes, 12 * 60); // de las 20:00 a las 08:00 del día siguiente
});

test("interpreta listas, rangos, pasos, nombres y 7 como domingo", () => {
  assert.deepEqual([...new Set(gaps("0 8,20 * * *"))].sort((a, b) => a - b), [720]);
  assert.equal(Math.min(...gaps("*/10 8-22 * jan-dec *")), 10);
  assert.equal(Math.max(...gaps("0 0 * * mon")), 7 * 1440);
  assert.equal(Math.max(...gaps("0 0 * * 7")), 7 * 1440); // domingo
  assert.equal(Math.max(...gaps("0 0 * * 0")), 7 * 1440);
  assert.equal(Math.min(...gaps("0 9 * * 1-5")), 1440);
});

test("con día del mes y de la semana a la vez basta con que se cumpla uno (como cron)", () => {
  // día 1 de cada mes O cada lunes: huecos de varios días, nunca de más de 7
  assert.ok(Math.max(...gaps("0 0 1 * mon")) <= 7 * 1440);
});

test("una expresión inválida cae a la de por defecto y avisa", () => {
  const s = resolveSchedule({ SCRAPE_CRON: "cada rato" });
  assert.equal(s.expression, DEFAULT_SCRAPE_CRON);
  assert.equal(s.warnings.length, 1);
  assert.match(s.warnings[0], /no es una expresión cron válida/);
});

test("no se admite más frecuente que cada 5 minutos (cuida la web oficial)", () => {
  for (const expression of ["* * * * *", "*/1 * * * *", "*/4 * * * *", "0,3 * * * *"]) {
    const s = resolveSchedule({ SCRAPE_CRON: expression });
    assert.equal(s.expression, DEFAULT_SCRAPE_CRON, expression);
    assert.match(s.warnings[0], /demasiado frecuente/, expression);
  }
  assert.equal(resolveSchedule({ SCRAPE_CRON: "*/5 * * * *" }).warnings.length, 0);
});

test("no se admiten los 6 campos con segundos", () => {
  const s = resolveSchedule({ SCRAPE_CRON: "*/30 * * * * *" });
  assert.equal(s.expression, DEFAULT_SCRAPE_CRON);
  assert.match(s.warnings[0], /5 campos/);
});

test("una expresión que casi nunca se ejecuta se rechaza", () => {
  const s = resolveSchedule({ SCRAPE_CRON: "0 0 1 6 *" }); // una vez al año (fuera de la ventana de análisis)
  assert.equal(s.expression, DEFAULT_SCRAPE_CRON);
  assert.match(s.warnings[0], /casi nunca/);
});

test("la zona horaria se valida", () => {
  assert.equal(resolveSchedule({ SCRAPE_CRON_TIMEZONE: "Europe/Madrid" }).timezone, "Europe/Madrid");
  const bad = resolveSchedule({ SCRAPE_CRON_TIMEZONE: "Marte/Olympus" });
  assert.equal(bad.timezone, undefined);
  assert.match(bad.warnings[0], /zona horaria/);
});

test("la salud se adapta a la frecuencia: ×1,5 del mayor hueco, mínimo 15 min", () => {
  assert.equal(resolveSchedule({}).healthMaxAgeMinutes, 15);
  assert.equal(resolveSchedule({ SCRAPE_CRON: "*/15 * * * *" }).healthMaxAgeMinutes, 23);
  assert.equal(resolveSchedule({ SCRAPE_CRON: "0 * * * *" }).healthMaxAgeMinutes, 90);
});

test("HEALTH_MAX_AGE_MINUTES manda sobre el valor deducido", () => {
  assert.equal(resolveSchedule({ SCRAPE_CRON: "0 * * * *", HEALTH_MAX_AGE_MINUTES: "200" }).healthMaxAgeMinutes, 200);
  assert.equal(resolveSchedule({ SCRAPE_CRON: "0 * * * *", HEALTH_MAX_AGE_MINUTES: "basura" }).healthMaxAgeMinutes, 90);
});

test("con un cron horario, /api/health no da 503 por datos de hace 50 minutos", () => {
  const s = resolveSchedule({ SCRAPE_CRON: "0 * * * *" });
  const now = Date.parse("2026-10-20T14:00:00Z");
  const health = evaluateHealth({
    lastUpdate: new Date(now - 50 * 60000),
    now,
    uptimeSeconds: 7200,
    maxAgeMinutes: s.healthMaxAgeMinutes,
    startupGraceSeconds: s.startupGraceSeconds,
  });
  assert.equal(health.ok, true);
  // con la salud de siempre (15 min) sí daría falso positivo
  assert.equal(evaluateHealth({ lastUpdate: new Date(now - 50 * 60000), now, uptimeSeconds: 7200, maxAgeMinutes: 15 }).ok, false);
});

test("el periodo de gracia tras arrancar se alarga con el hueco del cron", () => {
  const s = resolveSchedule({ SCRAPE_CRON: "0 * * * *" });
  assert.equal(s.startupGraceSeconds, 61 * 60);
  const health = evaluateHealth({
    lastUpdate: null,
    uptimeSeconds: 30 * 60,
    maxAgeMinutes: s.healthMaxAgeMinutes,
    startupGraceSeconds: s.startupGraceSeconds,
  });
  assert.equal(health.ok, true);
});
