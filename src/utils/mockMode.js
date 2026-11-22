/** `MOCK_MODE=true|1|yes|on` → la API sirve datos de demostración, sin Redis, scrapeo ni correo. */
function isMockMode(env = process.env) {
  return /^(1|true|yes|on)$/i.test(String(env.MOCK_MODE ?? "").trim());
}

module.exports = { isMockMode };
