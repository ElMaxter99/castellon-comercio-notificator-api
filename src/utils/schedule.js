const cron = require("node-cron");

/** Frecuencia por defecto del scrapeo (la de siempre: cada 5 minutos). */
const DEFAULT_SCRAPE_CRON = "*/5 * * * *";
/** Intervalo mínimo permitido: no se castiga la web oficial con peticiones más seguidas. */
const MIN_INTERVAL_MINUTES = 5;
/** Ventana (días) en la que se analizan las ejecuciones para calcular los huecos entre ellas. */
const ANALYSIS_DAYS = 35;

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

class UnsupportedCron extends Error {}

function toNumber(token, min, max, names) {
  let value;
  if (names && names.includes(token.toLowerCase())) {
    value = names.indexOf(token.toLowerCase()) + (names === MONTHS ? 1 : 0);
  } else if (/^\d+$/.test(token)) {
    value = Number(token);
  } else {
    throw new UnsupportedCron(`valor no soportado: ${token}`);
  }
  if (value < min || value > max) {
    throw new UnsupportedCron(`valor fuera de rango: ${token}`);
  }
  return value;
}

/** Conjunto de valores de un campo cron: asterisco (con o sin paso), rangos, listas y nombres. */
function parseField(field, min, max, names) {
  const values = new Set();
  for (const part of field.split(",")) {
    const [range, stepText] = part.split("/");
    const step = stepText === undefined ? 1 : Number(stepText);
    if (!Number.isInteger(step) || step < 1) {
      throw new UnsupportedCron(`paso no válido: ${part}`);
    }
    let from;
    let to;
    if (range === "*") {
      [from, to] = [min, max];
    } else if (range.includes("-")) {
      const [a, b] = range.split("-");
      [from, to] = [toNumber(a, min, max, names), toNumber(b, min, max, names)];
    } else {
      from = toNumber(range, min, max, names);
      to = stepText === undefined ? from : max;
    }
    if (from > to) {
      throw new UnsupportedCron(`rango invertido: ${part}`);
    }
    for (let v = from; v <= to; v += step) {
      values.add(v);
    }
  }
  return values;
}

/** Interpreta una expresión de 5 campos (minuto hora día-del-mes mes día-de-la-semana). */
function parseCron(expression) {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) {
    throw new UnsupportedCron("usa 5 campos: minuto hora día-del-mes mes día-de-la-semana");
  }
  const [minute, hour, dom, month, dow] = fields;
  const weekdays = parseField(dow, 0, 7, WEEKDAYS);
  if (weekdays.has(7)) {
    weekdays.add(0); // 7 = domingo
  }
  return {
    minute: parseField(minute, 0, 59),
    hour: parseField(hour, 0, 23),
    dom: parseField(dom, 1, 31),
    month: parseField(month, 1, 12, MONTHS),
    dow: weekdays,
    domRestricted: dom !== "*" && !dom.startsWith("*/"),
    dowRestricted: dow !== "*" && !dow.startsWith("*/"),
  };
}

function matches(parsed, date) {
  if (!parsed.minute.has(date.getUTCMinutes()) || !parsed.hour.has(date.getUTCHours())) {
    return false;
  }
  if (!parsed.month.has(date.getUTCMonth() + 1)) {
    return false;
  }
  const domOk = parsed.dom.has(date.getUTCDate());
  const dowOk = parsed.dow.has(date.getUTCDay());
  // Como en cron: si el día del mes y el de la semana están restringidos, basta con uno
  return parsed.domRestricted && parsed.dowRestricted ? domOk || dowOk : domOk && dowOk;
}

/** Huecos (minutos) entre ejecuciones consecutivas dentro de la ventana de análisis. */
function gapsInMinutes(parsed, start = Date.UTC(2026, 0, 1)) {
  const gaps = [];
  let last = null;
  for (let minute = 0; minute < ANALYSIS_DAYS * 1440; minute += 1) {
    if (matches(parsed, new Date(start + minute * 60000))) {
      if (last !== null) {
        gaps.push(minute - last);
      }
      last = minute;
    }
  }
  return gaps;
}

function validTimezone(timezone) {
  try {
    new Intl.DateTimeFormat("es-ES", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resuelve la frecuencia del scrapeo a partir del entorno:
 * - `SCRAPE_CRON`: expresión cron de 5 campos (por defecto cada 5 min). Si es inválida, demasiado
 *   frecuente (< 5 min) o rara, se usa la de por defecto y se devuelve un `warning`.
 * - `SCRAPE_CRON_TIMEZONE`: zona horaria IANA opcional (p. ej. Europe/Madrid).
 * - La antigüedad máxima de los datos para `/api/health` (`HEALTH_MAX_AGE_MINUTES`) se deduce del
 *   mayor hueco entre ejecuciones (×1,5, mínimo 15 min) si no se define.
 */
function resolveSchedule(env = process.env) {
  const warnings = [];
  let expression = (env.SCRAPE_CRON || "").trim();
  let parsed = null;
  let gaps = [];

  const fallback = (reason) => {
    warnings.push(`SCRAPE_CRON="${expression}" ${reason}: se usa la frecuencia por defecto (${DEFAULT_SCRAPE_CRON})`);
    expression = DEFAULT_SCRAPE_CRON;
    parsed = parseCron(expression);
    gaps = gapsInMinutes(parsed);
  };

  if (!expression) {
    expression = DEFAULT_SCRAPE_CRON;
    parsed = parseCron(expression);
    gaps = gapsInMinutes(parsed);
  } else if (!cron.validate(expression)) {
    fallback("no es una expresión cron válida");
  } else {
    try {
      parsed = parseCron(expression);
      gaps = gapsInMinutes(parsed);
      if (gaps.length === 0) {
        fallback("casi nunca se ejecuta");
      } else if (Math.min(...gaps) < MIN_INTERVAL_MINUTES) {
        fallback(`es demasiado frecuente (mínimo ${MIN_INTERVAL_MINUTES} min entre ejecuciones)`);
      }
    } catch (error) {
      if (!(error instanceof UnsupportedCron)) {
        throw error;
      }
      fallback(`no se admite (${error.message})`);
    }
  }

  let timezone = (env.SCRAPE_CRON_TIMEZONE || "").trim() || undefined;
  if (timezone && !validTimezone(timezone)) {
    warnings.push(`SCRAPE_CRON_TIMEZONE="${timezone}" no es una zona horaria válida: se usa la del servidor`);
    timezone = undefined;
  }

  const minGapMinutes = Math.min(...gaps);
  const maxGapMinutes = Math.max(...gaps);
  const configuredMaxAge = Number(env.HEALTH_MAX_AGE_MINUTES);
  const healthMaxAgeMinutes =
    Number.isFinite(configuredMaxAge) && configuredMaxAge > 0
      ? configuredMaxAge
      : Math.max(15, Math.ceil(maxGapMinutes * 1.5));

  return {
    expression,
    timezone,
    minGapMinutes,
    maxGapMinutes,
    healthMaxAgeMinutes,
    // tras arrancar, el cron puede tardar hasta un hueco completo en su primer tick
    startupGraceSeconds: (maxGapMinutes + 1) * 60,
    warnings,
  };
}

let cached = null;
/** Resuelve (una vez) la frecuencia con el entorno del proceso. */
function getSchedule() {
  cached ??= resolveSchedule(process.env);
  return cached;
}

module.exports = {
  DEFAULT_SCRAPE_CRON,
  MIN_INTERVAL_MINUTES,
  resolveSchedule,
  getSchedule,
  parseCron,
  gapsInMinutes,
};
