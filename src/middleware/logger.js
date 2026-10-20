const fs = require("fs");
const path = require("path");
const rfs = require("rotating-file-stream");
const logger = require("../utils/logger");

const logDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Rotación para que el log de accesos no crezca sin límite (10 MB por fichero, 5 ficheros).
const accessLog = rfs.createStream("access.log", {
  path: logDir,
  size: "10M",
  maxFiles: 5,
});
accessLog.on("error", (err) => {
  logger.error("KO Error escribiendo log", { context: "HTTP", meta: err });
});

function requestLogger(req, res, next) {
  const timestamp = new Date().toISOString();
  // req.ip respeta TRUST_PROXY; la cabecera X-Forwarded-For en crudo la controla el cliente.
  const ip = req.ip || req.socket?.remoteAddress || "unknown";

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

  accessLog.write(logEntry);

  next();
}

module.exports = requestLogger;
