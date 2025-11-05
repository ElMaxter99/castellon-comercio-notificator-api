const express = require("express");
const comerciosRouter = require("./routes/comercios");
const { startCron } = require("./cron");
const { redis } = require("./config/redis");
const { verifyMailer } = require("./services/mailService");
const requestLogger = require("./middleware/logger");
const rateLimiter = require("./middleware/rateLimiter");
const logger = require("./utils/logger");

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.header(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );
    return res.sendStatus(204);
  }

  next();
});

app.use(rateLimiter);
app.use(requestLogger);

const port = process.env.PORT || 12001;

app.use("/api/comercios", comerciosRouter);

app.get("/api/status", async (req, res) => {
  try {
    const redisStatus = await redis.ping();
    res.json({ ok: true, redis: redisStatus, message: "API running" });
  } catch (e) {
    logger.error("Redis unreachable desde /api/status", {
      context: "APP",
      meta: e,
    });
    res.status(500).json({ ok: false, error: "Redis unreachable" });
  }
});

app.listen(port, async () => {
  logger.success("API levantada", {
    context: "APP",
    meta: { port },
  });
  await verifyMailer();
  logger.info("Iniciando cron de scrapeo cada 5 min", { context: "APP" });
  await startCron();
});
