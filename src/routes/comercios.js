const express = require("express");
const {
  getComercios,
  getLastUpdate,
  getHistory,
  getSectors,
} = require("../services/redisService");
const { searchComercios } = require("../services/comercioSearchService");
const { runScrape } = require("../cron");
const logger = require("../utils/logger");

const router = express.Router();

/**
 * Obtener comercios actuales
 */
router.get("/", async (req, res) => {
  try {
    const data = await getComercios();
    res.json(data);
  } catch (err) {
    logger.error("Error obteniendo comercios", {
      context: "ROUTE:COMERCIOS",
      meta: err,
    });
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
    logger.error("Error obteniendo estado", {
      context: "ROUTE:STATUS",
      meta: err,
    });
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
    logger.error("Error obteniendo histórico", {
      context: "ROUTE:HISTORY",
      meta: err,
    });
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
    logger.error("Error ejecutando scrapeo manual", {
      context: "ROUTE:FORCE_SCRAPE",
      meta: err,
    });
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/filter", async (req, res) => {
  try {
    const {
      name,
      street,
      sector,
      sectors,
      page,
      pageSize,
      includeLegend,
    } = req.query;

    const result = await searchComercios({
      name,
      street,
      sector,
      sectors,
      page,
      pageSize,
      includeLegend: includeLegend !== "false",
    });

    res.json(result);
  } catch (err) {
    logger.error("Error filtrando comercios", {
      context: "ROUTE:FILTER",
      meta: err,
    });
    res.status(500).json({ error: "Error filtrando comercios" });
  }
});

router.get("/sectors", async (req, res) => {
  try {
    const sectors = await getSectors();
    res.json(sectors);
  } catch (err) {
    logger.error("Error obteniendo sectores", {
      context: "ROUTE:SECTORS",
      meta: err,
    });
    res.status(500).json({ error: "Error obteniendo sectores" });
  }
});

module.exports = router;
