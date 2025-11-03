const { getComercios, updateSectorsFromComercios, getSectors } = require("../src/services/redisService");

(async () => {
  try {
    console.log("🔍 Cargando comercios desde Redis...");
    const comercios = await getComercios();

    console.log(`📊 Total de comercios: ${comercios.length}`);
    await updateSectorsFromComercios(comercios);

    const sectors = await getSectors();
    console.log(`✅ Sectores actualizados (${sectors.length}):`);
    console.log(sectors.join(", "));
  } catch (err) {
    console.error("❌ Error actualizando sectores:", err.message);
  } finally {
    process.exit(0);
  }
})();
