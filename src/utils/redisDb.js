/**
 * Índice de base de datos de Redis.
 * - `REDIS_DB` explícito manda.
 * - Con `REDIS_URL` (Upstash, Render Key Value…) se respeta la ruta de la URL (`/3`) y, si no la
 *   hay, se usa la 0: los Redis gestionados suelen tener solo una base y `SELECT 2` falla con
 *   "ERR DB index is out of range".
 * - Sin URL (Docker local) se mantiene lo de siempre: prod → 0, staging → 1, resto → 2.
 */
function resolveRedisDb(env = process.env) {
  const explicit = (env.REDIS_DB ?? "").trim();
  if (/^\d+$/.test(explicit)) return Number(explicit);

  if (env.REDIS_URL) {
    try {
      const path = new URL(env.REDIS_URL).pathname.replace(/^\//, "");
      if (/^\d+$/.test(path)) return Number(path);
    } catch {
      // URL ilegible: ioredis avisará; usamos la base por defecto
    }
    return 0;
  }

  const nodeEnv = env.NODE_ENV || "dev";
  return nodeEnv === "prod" ? 0 : nodeEnv === "staging" ? 1 : 2;
}

module.exports = { resolveRedisDb };
