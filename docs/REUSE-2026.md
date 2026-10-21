# Reutilizar el proyecto en 2026

Guía para volver a poner en marcha el sistema con el programa de bonos 2026. Trabajar con Claude: pídele "sigue `docs/REUSE-2026.md` del repo api".

## 0. Antes de nada: ¿existe la web 2026?
- Confirmar la URL del listado de adheridos de la edición 2026 (puede cambiar de dominio o ruta). `BASE_URL` en `src/scraper/index.js` es la única URL fuente.
- Descargar una página y comprobar la estructura (ver [SCRAPER.md](SCRAPER.md)). Si no es HTML estático paginado (p. ej. SPA o API JSON), conviene sustituir cheerio por llamadas al JSON.

> **Estado (v2.0.0)**: el scraper está adaptado y verificado contra la web 2026 (59 comercios, 3 páginas), usa https, y están implementados la guarda de scrapeo vacío, el scrapeo inicial, el hosting gratuito (ver [HOSTING.md](HOSTING.md)) y el correo por SMTP o Resend. Ver [SCRAPER.md](SCRAPER.md).

## 1. Checklist de puesta en marcha
1. `cp .env.example .env` y rellenar Redis y correo (SMTP o Resend). **Importante**: usar un `REDIS_NAMESPACE` nuevo (p. ej. `bonos2026`) o vaciar las claves 2025; si no, el primer scrapeo 2026 se compara con el catálogo 2025 y genera bajas/altas masivas y un email enorme.
2. ~~Ajustar `BASE_URL` y selectores~~ Hecho para 2026; reverificar con `scrapeComercios()` si la web cambia.
3. Actualizar textos con "2025"/edición si aparecen (README, plantilla de email, remitente "Bonos Castelló API").
4. Subir versión (`package.json` + `CHANGELOG.md`) siguiendo el flujo gitflow.
5. `docker compose up -d --build`, lanzar `POST /api/comercios/force-scrape` (con `Authorization: Bearer $FORCE_SCRAPE_TOKEN`) y verificar `/api/comercios/status`.
6. ~~Primer scrapeo = email gigante~~ Resuelto: la carga inicial (Redis vacío) no envía correo.
7. Actualizar `apiBaseUrl` en el front (ver su `docs/REUSE-2026.md`).
8. Revisar dependencias vulnerables (`npm audit`) y la imagen Node del Dockerfile.

## 2. Mejoras recomendadas (no implementadas)
Ordenadas por valor:
1. ~~Guarda contra scrapeo vacío~~ Hecho (solo cubre 0 comercios; se podría ampliar a caídas >50%).
2. ~~Proteger `force-scrape`~~ Hecho (`FORCE_SCRAPE_TOKEN`; sin él la ruta está deshabilitada).
3. ~~Scrapeo inicial al arrancar~~ Hecho.
4. **Diff por clave estable** (nombre+dirección) y detectar modificaciones, no solo altas/bajas.
5. ~~Timeouts/reintentos y HTTPS~~ Hecho (falta pausa entre páginas).
6. **Notificar bajas** por email (la plantilla ya tiene `removedSection`, hoy siempre vacío).
7. ~~Rotación real de logs~~ Hecho (`rotating-file-stream`, 10 MB × 5).
8. **Tests** del scraper con un HTML fixture guardado y del `diff`.
9. Acotar CORS al dominio del front y configurar `trust proxy` si hay proxy inverso.
10. Limitar el tamaño del histórico o guardarlo en una lista de Redis en vez de un blob.
11. Si el programa 2026 es un listado que no cambia, el cron de 5 min puede reducirse (p. ej. cada hora) para ser amable con el servidor origen.
