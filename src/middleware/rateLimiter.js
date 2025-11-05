const logger = require("../utils/logger");

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10);
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "120", 10);
const CLEANUP_INTERVAL_MS = WINDOW_MS * 5;

const requestCounts = new Map();

function normalizeIp(ip) {
  if (!ip || typeof ip !== "string") {
    return null;
  }

  const trimmed = ip.trim();
  if (!trimmed) {
    return null;
  }

  // Remove IPv6 prefix that Node can add for IPv4 addresses (e.g. ::ffff:127.0.0.1)
  return trimmed.replace(/^::ffff:/i, "");
}

function extractClientIp(req) {
  const candidates = [
    req.ip,
    req.connection?.remoteAddress,
    req.socket?.remoteAddress,
    req.connection?.socket?.remoteAddress,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeIp(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return "unknown";
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
