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

      if (diff.added.length > 0) {
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
  } catch (err) {
    logger.error("Error en scrapeo", { context: "CRON", meta: err });
  }
}

function startCron() {
  logger.info("Cron programado cada 5 minutos", { context: "CRON" });
  cron.schedule("*/5 * * * *", () => runScrape(false));
}

module.exports = { runScrape, startCron };
