const {
  getComercios,
  updateSectorsFromComercios,
  getSectors,
} = require("../src/services/redisService");
const logger = require("../src/utils/logger");

(async () => {
  try {
    logger.info("Cargando comercios desde Redis", { context: "SCRIPT:SECTORS" });
    const comercios = await getComercios();

    logger.info("Total de comercios", {
      context: "SCRIPT:SECTORS",
      meta: { total: comercios.length },
    });
    await updateSectorsFromComercios(comercios);

    const sectors = await getSectors();
    logger.success("Sectores actualizados", {
      context: "SCRIPT:SECTORS",
      meta: { total: sectors.length, sectors },
    });
  } catch (err) {
    logger.error("Error actualizando sectores", {
      context: "SCRIPT:SECTORS",
      meta: err,
    });
  } finally {
    process.exit(0);
  }
})();
