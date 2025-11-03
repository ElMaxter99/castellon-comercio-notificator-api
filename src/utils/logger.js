const util = require("util");

const LEVELS = {
  INFO: "INFO",
  SUCCESS: "SUCCESS",
  WARN: "WARN",
  ERROR: "ERROR",
  DEBUG: "DEBUG",
  REQUEST: "REQUEST",
};

const COLORS = {
  INFO: "\x1b[36m", // cyan
  SUCCESS: "\x1b[32m", // green
  WARN: "\x1b[33m", // yellow
  ERROR: "\x1b[31m", // red
  DEBUG: "\x1b[35m", // magenta
  REQUEST: "\x1b[34m", // blue
  RESET: "\x1b[0m",
};

const OUTPUT_BY_LEVEL = {
  [LEVELS.ERROR]: console.error,
  [LEVELS.WARN]: console.warn,
  [LEVELS.DEBUG]: console.debug,
};

function normalizeMeta(meta) {
  if (meta === undefined || meta === null) return "";

  if (meta instanceof Error) {
    return meta.stack || meta.message;
  }

  if (typeof meta === "string") {
    return meta;
  }

  if (typeof meta === "object") {
    return util.inspect(meta, { depth: null, colors: false, compact: true });
  }

  return String(meta);
}

function log(level, message, { context, meta } = {}) {
  const timestamp = new Date().toISOString();
  const color = COLORS[level] || COLORS.INFO;
  const output = OUTPUT_BY_LEVEL[level] || console.log;

  let formatted = `[${timestamp}] [${level}]`;
  if (context) {
    formatted += ` [${context}]`;
  }
  formatted += ` ${message}`;

  const extra = normalizeMeta(meta);
  if (extra) {
    formatted += ` | ${extra}`;
  }

  output(`${color}${formatted}${COLORS.RESET}`);
}

module.exports = {
  info: (message, options) => log(LEVELS.INFO, message, options),
  success: (message, options) => log(LEVELS.SUCCESS, message, options),
  warn: (message, options) => log(LEVELS.WARN, message, options),
  error: (message, options) => log(LEVELS.ERROR, message, options),
  debug: (message, options) => log(LEVELS.DEBUG, message, options),
  request: (message, options) => log(LEVELS.REQUEST, message, options),
  LEVELS,
};
