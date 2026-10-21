/**
 * Evita que dos ejecuciones de la misma tarea se solapen (cron + force-scrape, o un
 * scrapeo más lento que el intervalo). Si ya hay una en curso, la nueva se omite.
 */
function createRunGuard() {
  let current = null;

  return {
    isRunning: () => current !== null,

    /** Ejecuta `fn` si no hay otra en curso; si la hay devuelve `{ skipped: true }`. */
    async run(fn) {
      if (current) return { skipped: true };
      current = Promise.resolve().then(fn);
      try {
        return { skipped: false, value: await current };
      } finally {
        current = null;
      }
    },

    /** Espera a la ejecución en curso (si la hay) hasta `timeoutMs`. Devuelve true si terminó. */
    async whenIdle(timeoutMs = 0) {
      const running = current;
      if (!running) return true;
      let timer;
      const timeout = new Promise((resolve) => {
        timer = setTimeout(() => resolve(false), timeoutMs);
      });
      const done = running.then(
        () => true,
        () => true
      );
      try {
        return await Promise.race([done, timeout]);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

module.exports = { createRunGuard };
