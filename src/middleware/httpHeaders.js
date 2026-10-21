const DEFAULT_MAX_AGE_SECONDS = 60;

/** Cabeceras de seguridad básicas (la API solo sirve JSON; no necesita CSP). */
function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
}

/** Segundos de caché de los GET de datos: CACHE_MAX_AGE_SECONDS (por defecto 60; 0 = sin caché). */
function resolveCacheMaxAge(env = process.env) {
  const raw = (env.CACHE_MAX_AGE_SECONDS ?? "").trim();
  if (/^\d+$/.test(raw)) return Number(raw);
  return DEFAULT_MAX_AGE_SECONDS;
}

/**
 * Caché HTTP para los GET de datos (el catálogo cambia, como mucho, en cada scrapeo).
 * Express ya añade ETag, así que tras caducar se revalida con 304. Lo demás, sin caché.
 */
function cacheControl(maxAgeSeconds = resolveCacheMaxAge()) {
  return (req, res, next) => {
    if (req.method === "GET" || req.method === "HEAD") {
      res.setHeader(
        "Cache-Control",
        maxAgeSeconds > 0 ? `public, max-age=${maxAgeSeconds}` : "no-cache"
      );
    } else {
      res.setHeader("Cache-Control", "no-store");
    }
    next();
  };
}

module.exports = { securityHeaders, cacheControl, resolveCacheMaxAge, DEFAULT_MAX_AGE_SECONDS };
