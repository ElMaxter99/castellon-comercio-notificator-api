const logger = require("../utils/logger");

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10);
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "120", 10);
const CLEANUP_INTERVAL_MS = WINDOW_MS * 5;

const requestCounts = new Map();

function extractClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return (
    req.connection?.remoteAddress ||
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of requestCounts.entries()) {
    if (now - entry.start > WINDOW_MS) {
      requestCounts.delete(ip);
    }
  }
}, CLEANUP_INTERVAL_MS).unref();

function rateLimiter(req, res, next) {
  const now = Date.now();
  const ip = extractClientIp(req);
  let entry = requestCounts.get(ip);

  if (!entry || now - entry.start >= WINDOW_MS) {
    entry = { start: now, count: 0 };
    requestCounts.set(ip, entry);
  }

  entry.count += 1;

  if (entry.count > MAX_REQUESTS) {
    logger.warn("Rate limit exceeded", {
      context: "HTTP",
      meta: { ip, url: req.originalUrl, method: req.method },
    });
    return res.status(429).json({
      ok: false,
      error: "Too many requests, please try again later.",
    });
  }

  return next();
}

module.exports = rateLimiter;
