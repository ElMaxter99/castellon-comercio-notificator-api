const { scrapeComercios } = require("./scraper/index");
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
  console.log(manual ? "🧭 Scrapeo manual iniciado..." : "⏰ Ejecutando scrapeo automático...");

  try {
    const nuevos = await scrapeComercios();
    const antiguos = await getComercios();
    const diff = diffComercios(antiguos, nuevos);

    if (diff.added.length || diff.removed.length) {
      console.log("🔄 Cambios detectados, actualizando Redis e histórico...");

      await saveComercios(nuevos);
      await addHistoryEntry({
        added: diff.added,
        removed: diff.removed,
        total: nuevos.length,
      });

      await updateSectorsFromComercios(nuevos);

      if (diff.added.length > 0) {
        console.log(`📬 Nuevos comercios detectados (${diff.added.length}), enviando correo...`);
        await sendDiffEmail({
          added: diff.added,
          removed: diff.removed,
        });
      } else {
        console.log("ℹ️ No hay nuevos comercios para notificar por correo.");
      }
    } else {
      console.log("✅ Sin cambios detectados.");
    }

    await saveLastUpdate();
  } catch (err) {
    console.error("❌ Error en scrapeo:", err.message);
  }
}

function startCron() {
  console.log("🕓 Cron programado cada 5 minutos");
  cron.schedule("*/5 * * * *", () => runScrape(false));
}

module.exports = { runScrape, startCron };
