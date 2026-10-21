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
const { getSchedule } = require("./utils/schedule");
const { getUserAgent } = require("./utils/userAgent");
const { createRunGuard } = require("./utils/runGuard");

const scrapeGuard = createRunGuard();
let cronTask = null;

/**
 * Ejecuta un scrapeo si no hay otro en curso (cron + force-scrape no se solapan).
 * Si ya hay uno, devuelve `{ ok: false, skipped: true }`.
 */
async function runScrape(manual = false) {
  const outcome = await scrapeGuard.run(() => doScrape(manual));
  if (outcome.skipped) {
    logger.warn("Ya hay un scrapeo en curso; se omite esta ejecución", {
      context: "CRON",
      meta: { manual },
    });
    return { ok: false, skipped: true, error: "Ya hay un scrapeo en curso" };
  }
  return outcome.value;
}

async function doScrape(manual) {
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
  const userAgent = getUserAgent();
  for (const warning of userAgent.warnings) {
    logger.warn(warning, { context: "CRON" });
  }
  logger.info(`User-Agent del scraper: ${userAgent.value}`, { context: "CRON" });
  const schedule = getSchedule();
  for (const warning of schedule.warnings) {
    logger.warn(warning, { context: "CRON" });
  }
  logger.info(
    `Cron programado: "${schedule.expression}"${schedule.timezone ? ` (${schedule.timezone})` : ""}`,
    {
      context: "CRON",
      meta: {
        minIntervaloMin: schedule.minGapMinutes,
        maxIntervaloMin: schedule.maxGapMinutes,
        saludMaxMin: schedule.healthMaxAgeMinutes,
      },
    }
  );
  cronTask = cron.schedule(
    schedule.expression,
    () => runScrape(false),
    schedule.timezone ? { timezone: schedule.timezone } : undefined
  );

  // Con Redis vacío (primer arranque o namespace nuevo) no se espera al primer tick.
  const actuales = await getComercios();
  if (actuales.length === 0) {
    logger.info("Catálogo vacío: scrapeo inicial", { context: "CRON" });
    await runScrape(false);
  }
}

/** Para el cron y espera (hasta `timeoutMs`) a que termine el scrapeo en curso. */
async function stopCron(timeoutMs = 10000) {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
  }
  return scrapeGuard.whenIdle(timeoutMs);
}

module.exports = { runScrape, startCron, stopCron };
