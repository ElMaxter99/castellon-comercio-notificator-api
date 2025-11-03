const fs = require("fs");
const path = require("path");

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

  const logEntry = `[${timestamp}] ${req.method} ${req.originalUrl} | IP: ${ip}\n`;

  process.stdout.write(logEntry);

  fs.appendFile(logFile, logEntry, (err) => {
    if (err) console.error("KO Error escribiendo log:", err.message);
  });

  next();
}

module.exports = requestLogger;
