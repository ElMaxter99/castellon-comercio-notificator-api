import cron from "node-cron";
import { scrapeComercios } from "./scraper/index.js";
import { getComercios, saveComercios, saveLastUpdate } from "./services/redisService.js";
import { diffComercios } from "./utils/diff.js";
import { sendDiffEmail } from "./services/mailService.js";

export function startCron() {
  cron.schedule("*/5 * * * *", async () => {
    console.log("⏰ Ejecutando scrapeo automático...");
    try {
      const nuevos = await scrapeComercios();
      const antiguos = await getComercios();
      const diff = diffComercios(antiguos, nuevos);

      if (diff.added.length || diff.removed.length) {
        console.log("🔄 Cambios detectados, actualizando Redis y enviando correo...");
        await saveComercios(nuevos);
        await sendDiffEmail(diff);
      } else {
        console.log("✅ Sin cambios detectados.");
      }

      // Guardar última fecha de actualización
      await saveLastUpdate();
      console.log("🕓 Última actualización registrada en Redis.");
    } catch (err) {
      console.error("❌ Error en cron:", err.message);
    }
  });
}
