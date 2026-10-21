const STARTUP_GRACE_SECONDS = 6 * 60; // tras arrancar, el cron tarda hasta 5 min en su primer tick

/**
 * Evalúa la salud de los datos para el endpoint /api/health.
 * Es "obsoleto" si el último scrapeo completado es más antiguo que `maxAgeMinutes`
 * (o no existe), salvo durante el periodo de gracia posterior al arranque.
 */
function evaluateHealth({
  lastUpdate,
  now = Date.now(),
  uptimeSeconds,
  maxAgeMinutes,
  startupGraceSeconds = STARTUP_GRACE_SECONDS,
}) {
  const ageMinutes = lastUpdate ? (now - lastUpdate.getTime()) / 60000 : null;
  const inGrace = uptimeSeconds < startupGraceSeconds;
  const stale = !inGrace && (ageMinutes === null || ageMinutes > maxAgeMinutes);
  return {
    ok: !stale,
    stale,
    ageMinutes: ageMinutes === null ? null : Math.round(ageMinutes * 10) / 10,
  };
}

module.exports = { evaluateHealth, STARTUP_GRACE_SECONDS };
