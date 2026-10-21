/**
 * Cierre ordenado ante SIGTERM/SIGINT (Render y Docker mandan SIGTERM en cada despliegue).
 * Ejecuta los pasos en orden; un paso que falla no impide los siguientes. Si todo tarda más
 * de `timeoutMs`, sale igualmente. Solo actúa la primera señal.
 */
function createShutdown({ steps, timeoutMs = 15000, exit = process.exit, log = () => {} }) {
  let started = false;

  return async function shutdown(signal) {
    if (started) return;
    started = true;
    log(`Señal ${signal}: cerrando ordenadamente`);

    let timer;
    const limit = new Promise((resolve) => {
      timer = setTimeout(() => resolve("timeout"), timeoutMs);
    });

    const run = (async () => {
      for (const [name, step] of steps) {
        try {
          await step();
        } catch (err) {
          log(`Fallo al cerrar «${name}»: ${err?.message || err}`, err);
        }
      }
      return "ok";
    })();

    const result = await Promise.race([run, limit]);
    clearTimeout(timer);
    if (result === "timeout") log(`Cierre forzado tras ${timeoutMs} ms`);
    exit(result === "timeout" ? 1 : 0);
  };
}

module.exports = { createShutdown };
