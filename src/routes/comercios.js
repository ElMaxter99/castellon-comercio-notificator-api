const express = require("express");
const { getComercios, getLastUpdate, getHistory } = require("../services/redisService");
const { runScrape } = require("../cron");

const router = express.Router();

/**
 * Obtener comercios actuales
 */
router.get("/", async (req, res) => {
  try {
    const data = await getComercios();
    res.json(data);
  } catch (err) {
    console.error("Error obteniendo comercios:", err.message);
    res.status(500).json({ error: "Error obteniendo comercios" });
  }
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
    console.error("Error obteniendo histórico:", err.message);
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
    console.error("Error ejecutando scrapeo manual:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
