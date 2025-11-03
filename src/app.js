import express from "express";
import comerciosRouter from "./routes/comercios";
import { startCron } from "./cron";
import { redis } from "./config/redis";
import { verifyMailer } from "./services/mailService";

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
  await verifyMailer();
  console.log("⏱️  Iniciando cron de scrapeo cada 5 min...");
  await startCron();
});
