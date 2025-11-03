import { getComercios, updateSectorsFromComercios, getSectors } from "../src/services/redisService.js";

(async () => {
  console.log("🔍 Cargando comercios desde Redis...");
  const comercios = await getComercios();

  console.log(`📊 Total de comercios: ${comercios.length}`);
  await updateSectorsFromComercios(comercios);

  const sectors = await getSectors();
  console.log(`✅ Sectores actualizados (${sectors.length}):`);
  console.log(sectors.join(", "));
  process.exit(0);
})();
