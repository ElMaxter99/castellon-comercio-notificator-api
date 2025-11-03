const { scrapeComercios } = require("./scraper");
const {
  getComercios,
  saveComercios,
  saveLastUpdate,
  addHistoryEntry,
} = require("./services/redisService");
const { diffComercios } = require("./utils/diff");
const { sendDiffEmail } = require("./services/mailService");
const cron = require("node-cron");

async function runScrape(manual = false) {
  console.log(manual ? "🧭 Scrapeo manual iniciado..." : "⏰ Ejecutando scrapeo automático...");

  try {
    const nuevos = await scrapeComercios();
    const antiguos = await getComercios();
    const diff = diffComercios(antiguos, nuevos);

    if (diff.added.length || diff.removed.length) {
      console.log("🔄 Cambios detectados, actualizando Redis, histórico y enviando correo...");
      await saveComercios(nuevos);
      await addHistoryEntry({
        added: diff.added,
        removed: diff.removed,
        total: nuevos.length,
      });
      await sendDiffEmail(diff);
    } else {
      console.log("OK Sin cambios detectados.");
    }

    await saveLastUpdate();
  } catch (err) {
    console.error("KO Error en scrapeo:", err.message);
  }
}

function startCron() {
  console.log("🕓 Cron programado cada 5 minutos");
  cron.schedule("*/5 * * * *", () => runScrape(false));
}

module.exports = {
  runScrape,
  startCron,
};
