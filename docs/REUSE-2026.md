# Reutilizar el proyecto en 2026

Guía para volver a poner en marcha el sistema con el programa de bonos 2026. Trabajar con Claude: pídele "sigue `docs/REUSE-2026.md` del repo api".

## 0. Antes de nada: ¿existe la web 2026?
- Confirmar la URL del listado de adheridos de la edición 2026 (puede cambiar de dominio o ruta). `BASE_URL` en `src/scraper/index.js` es la única URL fuente.
- Descargar una página y comprobar la estructura (ver [SCRAPER.md](SCRAPER.md)). Si no es HTML estático paginado (p. ej. SPA o API JSON), conviene sustituir cheerio por llamadas al JSON.

## 1. Checklist de puesta en marcha
1. `cp .env.example .env` y rellenar Redis y SMTP. Usar un `REDIS_NAMESPACE` nuevo (p. ej. `bonos2026`) para **no mezclar** con el histórico 2025, o archivar antes los datos 2025.
2. Ajustar `BASE_URL` y selectores; probar el scraper aislado.
3. Actualizar textos con "2025"/edición si aparecen (README, plantilla de email, remitente "Bonos Castelló API").
4. Subir versión (`package.json` + `CHANGELOG.md`) siguiendo el flujo gitflow.
5. `docker compose up -d --build`, lanzar `POST /api/comercios/force-scrape` y verificar `/api/comercios/status`.
6. El **primer** scrapeo con Redis vacío marca todos los comercios como altas → enviará un email gigante. Poner `MAIL_ENABLED=false` en el primer arranque y reactivarlo después.
7. Actualizar `apiBaseUrl` en el front (ver su `docs/REUSE-2026.md`).
8. Revisar dependencias vulnerables (`npm audit`) y la imagen Node del Dockerfile.

## 2. Mejoras recomendadas (no implementadas)
Ordenadas por valor:
1. **Guarda contra scrapeo vacío**: si `nuevos.length === 0` (o cae >50% respecto a `antiguos`), abortar sin guardar y loguear error. Hoy una caída de la web vacía el catálogo y el siguiente scrapeo "re-añade" todo y envía email masivo.
2. **Proteger `force-scrape`** con token (`Authorization: Bearer`) o quitarlo del acceso público.
3. **Scrapeo inicial al arrancar** si `comercios` está vacío.
4. **Diff por clave estable** (nombre+dirección) y detectar modificaciones, no solo altas/bajas.
5. **Timeouts/reintentos** en axios y pausa entre páginas; HTTPS.
6. **Notificar bajas** por email (la plantilla ya tiene `removedSection`, hoy siempre vacío).
7. **Rotación real de logs** (usar `rotating-file-stream`, ya instalado) o quitar la dependencia.
8. **Tests** del scraper con un HTML fixture guardado y del `diff`.
9. Acotar CORS al dominio del front y configurar `trust proxy` si hay proxy inverso.
10. Limitar el tamaño del histórico o guardarlo en una lista de Redis en vez de un blob.
11. Si el programa 2026 es un listado que no cambia, el cron de 5 min puede reducirse (p. ej. cada hora) para ser amable con el servidor origen.
