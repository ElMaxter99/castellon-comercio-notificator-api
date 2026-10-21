const { version } = require("../../package.json");

const MAX_LENGTH = 300;

/** Identificación por defecto: descriptiva, con versión y página del proyecto. */
const DEFAULT_USER_AGENT = `ComercioCastellonNotificator/${version} (+https://bono-castellon.alvaromaxter.es/; proyecto independiente sin ánimo de lucro)`;

/**
 * Resuelve el User-Agent del scraper a partir de SCRAPER_USER_AGENT.
 * Vacío o ausente → el de por defecto. Con caracteres de control, no ASCII imprimible
 * o demasiado largo → se ignora con un aviso y se usa el de por defecto.
 */
function resolveUserAgent(env = process.env) {
  const raw = (env.SCRAPER_USER_AGENT || "").trim();
  if (!raw) return { value: DEFAULT_USER_AGENT, warnings: [] };
  if (raw.length > MAX_LENGTH || !/^[\x20-\x7e]+$/.test(raw)) {
    return {
      value: DEFAULT_USER_AGENT,
      warnings: [
        `SCRAPER_USER_AGENT inválido (solo ASCII imprimible, máx. ${MAX_LENGTH} caracteres): se usa el de por defecto`,
      ],
    };
  }
  return { value: raw, warnings: [] };
}

let cached;
function getUserAgent() {
  cached ??= resolveUserAgent(process.env);
  return cached;
}

module.exports = { DEFAULT_USER_AGENT, resolveUserAgent, getUserAgent };
