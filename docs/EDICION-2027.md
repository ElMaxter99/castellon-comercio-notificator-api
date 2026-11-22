# Edición 2027: de «demo» a datos reales

El programa 2026 termina y la API se deja en **modo mock** hasta que arranque el de 2027. Este documento dice cómo está ahora y cómo volver a poner en marcha el scrapeo (ver también [REUSE-2026.md](REUSE-2026.md), que sigue siendo la checklist general).

## Estado actual: `MOCK_MODE=true`
- Las rutas `/api/comercios/*` sirven datos **ficticios** (`src/mock/*.json`: 32 comercios «DEMO», 5 entradas de histórico, fecha de actualización fija). No se abre la conexión con Redis, no hay cron ni scrapeo ni correo y no se toca la web oficial.
- `GET /api/comercios/status` devuelve `mode: "mock"`; el front lo usa para mostrar el aviso «datos de demostración». `/api/health` está siempre en verde.
- `POST /api/comercios/force-scrape` responde `409`.
- **Los datos reales de 2026 siguen en Redis, intactos** (no se borra nada): quitar `MOCK_MODE` los vuelve a servir (sin scrapeo no se actualizan).

Cómo se activa: variable `MOCK_MODE=true` en Render (o `.env`); es la que trae `render.yaml`.

## Cuando empiece 2027
1. **Antes de tocar nada**, mira la web oficial: ¿cambió la URL del listado (`BASE_URL` en `src/scraper/index.js`) o el HTML? Descarga una página y pasa `npm test` con fixtures nuevos (`test/fixtures/`, ver [SCRAPER.md](SCRAPER.md)).
2. **Namespace nuevo de Redis**: `REDIS_NAMESPACE=bonos2027` (o vaciar las claves). Si no, el primer scrapeo se compara con el catálogo 2026 y genera altas/bajas masivas y un correo enorme (trampa 3 de `CLAUDE.md`).
3. Quita `MOCK_MODE` (o ponlo a `false`) y redespliega. Con el catálogo vacío hay scrapeo inicial y no se envía correo.
4. Revisa `SCRAPE_CRON` (frecuencia), `SCRAPER_USER_AGENT` (con contacto) y `MAIL_TO`.
5. Front: ver el `docs/EDITIONS.md` del repo del front (nueva edición `/2027`, retirar el aviso de demostración).
6. Si hay cambios de estructura de datos, actualiza modelos del front (`CommerceStatus`, `Commerce`) y este repo a la vez.
