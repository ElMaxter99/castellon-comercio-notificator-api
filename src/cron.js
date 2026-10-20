const { scrapeComercios } = require("./scraper/index");
const logger = require("./utils/logger");
const {
  getComercios,
  saveComercios,
  saveLastUpdate,
  addHistoryEntry,
  updateSectorsFromComercios,
} = require("./services/redisService");
const { diffComercios } = require("./utils/diff");
const { sendDiffEmail } = require("./services/mailService");
const cron = require("node-cron");

async function runScrape(manual = false) {
  logger.info(manual ? "Scrapeo manual iniciado" : "Ejecutando scrapeo automático", {
    context: "CRON",
    meta: { manual },
  });

  try {
    const nuevos = await scrapeComercios();
    const antiguos = await getComercios();

    // Protección: una web caída o cambiada devuelve 0 comercios; no se debe
    // vaciar el catálogo ni registrar "bajas" masivas.
    if (nuevos.length === 0) {
      logger.error("El scrapeo no devolvió comercios; se conserva el catálogo anterior", {
        context: "CRON",
        meta: { previos: antiguos.length },
      });
      return { ok: false, error: "El scrapeo no devolvió comercios; se conserva el catálogo anterior." };
    }

    const diff = diffComercios(antiguos, nuevos);

    if (diff.added.length || diff.removed.length) {
      logger.info("Cambios detectados, actualizando Redis e histórico", {
        context: "CRON",
        meta: {
          added: diff.added.length,
          removed: diff.removed.length,
          total: nuevos.length,
        },
      });

      await saveComercios(nuevos);
      await addHistoryEntry({
        added: diff.added,
        removed: diff.removed,
        total: nuevos.length,
      });

      await updateSectorsFromComercios(nuevos);

      if (antiguos.length === 0) {
        logger.info("Carga inicial del catálogo: no se envía correo", {
          context: "CRON",
          meta: { total: nuevos.length },
        });
      } else if (diff.added.length > 0) {
        logger.info("Nuevos comercios detectados, enviando correo", {
          context: "CRON",
          meta: { added: diff.added.length },
        });
        await sendDiffEmail({
          added: diff.added,
          removed: diff.removed,
        });
      } else {
        logger.warn("No hay nuevos comercios para notificar por correo", {
          context: "CRON",
        });
      }
    } else {
      logger.success("Sin cambios detectados", { context: "CRON" });
    }

    await saveLastUpdate();
    return {
      ok: true,
      changed: diff.added.length > 0 || diff.removed.length > 0,
      total: nuevos.length,
      added: diff.added.length,
      removed: diff.removed.length,
    };
  } catch (err) {
    logger.error("Error en scrapeo", { context: "CRON", meta: err });
    return { ok: false, error: err.message };
  }
}

async function startCron() {
  logger.info("Cron programado cada 5 minutos", { context: "CRON" });
  cron.schedule("*/5 * * * *", () => runScrape(false));

  // Con Redis vacío (primer arranque o namespace nuevo) no se espera al primer tick.
  const actuales = await getComercios();
  if (actuales.length === 0) {
    logger.info("Catálogo vacío: scrapeo inicial", { context: "CRON" });
    await runScrape(false);
  }
}

module.exports = { runScrape, startCron };
