import { scrapeComercios } from "./scraper/index";
import { getComercios, saveComercios, saveLastUpdate, addHistoryEntry } from "./services/redisService";
import { diffComercios } from "./utils/diff";
import { sendDiffEmail } from "./services/mailService";
import cron from "node-cron";

export async function runScrape(manual = false) {
  console.log(manual ? "🧭 Scrapeo manual iniciado..." : "⏰ Ejecutando scrapeo automático...");
  try {
    const nuevos = await scrapeComercios();
    const antiguos = await getComercios();
    const diff = diffComercios(antiguos, nuevos);

    if (diff.added.length || diff.removed.length) {
      console.log("🔄 Cambios detectados, actualizando Redis, histórico y enviando correo...");
      await saveComercios(nuevos);
      await addHistoryEntry({ added: diff.added, removed: diff.removed, total: nuevos.length });
      await sendDiffEmail(diff);
    } else {
      console.log("OK Sin cambios detectados.");
    }

    await saveLastUpdate();
  } catch (err) {
    console.error("KO Error en scrapeo:", err.message);
  }
}

export function startCron() {
  console.log("🕓 Cron programado cada 5 minutos");
  cron.schedule("*/5 * * * *", () => runScrape(false));
}
