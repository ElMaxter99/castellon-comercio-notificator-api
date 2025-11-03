import express from "express";
import comerciosRouter from "./routes/comercios.js";
import { startCron } from "./cron.js";
import { redis } from "./config/redis.js";

const app = express();
app.use(express.json());

const port = process.env.PORT || 12001;

app.use("/api/comercios", comerciosRouter);

app.get("/api/status", async (req, res) => {
  try {
    const redisStatus = await redis.ping();
    res.json({ ok: true, redis: redisStatus, message: "API running" });
  } catch (e) {
    res.status(500).json({ ok: false, error: "Redis unreachable" });
  }
});

app.listen(port, async () => {
  console.log(`🚀 API levantada en http://localhost:${port}`);
  console.log("⏱️  Iniciando cron de scrapeo cada 5 min...");
  await startCron();
});
