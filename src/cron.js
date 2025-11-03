import { scrapeComercios } from "./scraper/index.js";
import {
  getComercios,
  saveComercios,
  saveLastUpdate,
  addHistoryEntry,
} from "./services/redisService.js";
import { diffComercios } from "./utils/diff.js";
import { sendDiffEmail } from "./services/mailService.js";
import cron from "node-cron";

export async function runScrape(manual = false) {
  console.log(manual ? "🧭 Scrapeo manual iniciado..." : "⏰ Ejecutando scrapeo automático...");

  try {
    const nuevos = await scrapeComercios();
    const antiguos = await getComercios();
    const diff = diffComercios(antiguos, nuevos);

    if (diff.added.length || diff.removed.length) {
      console.log("🔄 Cambios detectados, actualizando Redis e histórico...");

      // Guardar los cambios en Redis
      await saveComercios(nuevos);
      await addHistoryEntry({
        added: diff.added,
        removed: diff.removed,
        total: nuevos.length,
      });

      // 📩 Enviar email solo si hay nuevos comercios añadidos
      if (diff.added.length > 0) {
        console.log(`📬 Nuevos comercios detectados (${diff.added.length}), enviando correo...`);
        await sendDiffEmail({
          added: diff.added,
          removed: [], // 🔇 no notificamos eliminados
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

export function startCron() {
  console.log("🕓 Cron programado cada 5 minutos");
  cron.schedule("*/5 * * * *", () => runScrape(false));
}
