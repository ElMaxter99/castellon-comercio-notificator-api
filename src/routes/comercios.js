import express from "express";
import { getComercios, getLastUpdate, getHistory } from "../services/redisService";
import { runScrape } from "../cron";

const router = express.Router();

/**
 * Obtener comercios actuales
 */
router.get("/", async (req, res) => {
  const data = await getComercios();
  res.json(data);
});

/**
 * Estado actual
 */
router.get("/status", async (req, res) => {
  try {
    const [comercios, lastUpdate] = await Promise.all([
      getComercios(),
      getLastUpdate(),
    ]);

    res.json({
      environment: process.env.NODE_ENV || "dev",
      total: comercios.length,
      lastUpdate: lastUpdate ? lastUpdate.toISOString() : null,
    });
  } catch (err) {
    console.error("Error obteniendo estado:", err.message);
    res.status(500).json({ error: "Error obteniendo estado" });
  }
});

/**
 * Histórico de cambios
 */
router.get("/history", async (req, res) => {
  try {
    const history = await getHistory();
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Error obteniendo histórico" });
  }
});

/**
 * Forzar scrapeo manual
 */
router.post("/force-scrape", async (req, res) => {
  try {
    await runScrape(true);
    res.json({ ok: true, message: "Scrapeo manual completado." });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
