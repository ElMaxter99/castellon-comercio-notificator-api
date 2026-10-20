const crypto = require("crypto");

/**
 * Protege las rutas de administración con un token (`Authorization: Bearer <token>`).
 * El token se define en FORCE_SCRAPE_TOKEN. Si no está definido la ruta queda
 * DESHABILITADA (seguro por defecto), en vez de abierta a cualquiera.
 */
function digest(value) {
  return crypto.createHash("sha256").update(String(value)).digest();
}

function requireAdminToken(req, res, next) {
  const expected = process.env.FORCE_SCRAPE_TOKEN;

  if (!expected) {
    return res.status(403).json({
      ok: false,
      error: "Ruta deshabilitada: define FORCE_SCRAPE_TOKEN para habilitarla.",
    });
  }

  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  const provided = match ? match[1].trim() : "";

  // Comparación en tiempo constante (se comparan hashes de igual longitud).
  if (!provided || !crypto.timingSafeEqual(digest(provided), digest(expected))) {
    return res.status(401).json({ ok: false, error: "Token inválido o ausente." });
  }

  return next();
}

module.exports = requireAdminToken;
