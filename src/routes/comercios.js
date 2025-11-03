import express from "express";
import { getComercios, getLastUpdate } from "../services/redisService.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const data = await getComercios();
  res.json(data);
});

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

export default router;
