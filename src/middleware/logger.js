const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

const logDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logFile = path.join(logDir, "access.log");

function requestLogger(req, res, next) {
  const timestamp = new Date().toISOString();
  const ip =
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    req.ip ||
    "unknown";

  const baseLogEntry = {
    method: req.method,
    url: req.originalUrl,
    ip,
    userAgent: req.headers["user-agent"],
  };

  logger.request(`${req.method} ${req.originalUrl}`, {
    context: "HTTP",
    meta: baseLogEntry,
  });

  const logEntry = `[${timestamp}] ${req.method} ${req.originalUrl} | IP: ${ip}\n`;

  fs.appendFile(logFile, logEntry, (err) => {
    if (err) {
      logger.error("KO Error escribiendo log", {
        context: "HTTP",
        meta: err,
      });
    }
  });

  next();
}

module.exports = requestLogger;
