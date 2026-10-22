# Arquitectura del API

## Objetivo
Consumir mejor el listado de establecimientos adheridos al programa de bonos de Castelló de la Plana (edición 2025): la web oficial solo ofrece un listado paginado sin buscador, sin histórico y sin avisos. Este servicio lo convierte en datos estructurados, detecta cambios y avisa.

## Vista general
```
 bonoscastellodelaplana.es ──(HTTP GET, cheerio)──► scraper
                                                      │ cada 5 min (node-cron) o POST /force-scrape
                                                      ▼
                                        cron.runScrape()
                         ┌─────────── diffComercios(antiguos, nuevos) ──────────┐
                         │ cambios?                                              │ sin cambios
                         ▼                                                       ▼
        Redis: comercios, history, sectors                               solo saveLastUpdate
                         │ si hay altas
                         ▼
                 sendDiffEmail (SMTP)

 Front Angular ──► Express /api/comercios/* ──► lee de Redis (nunca scrapea en una petición GET)
```

## Flujo de `runScrape(manual)` (`src/cron.js`)
1. `scrapeComercios()` → lista nueva (todas las páginas).
2. `getComercios()` → lista guardada. **Si la lista nueva está vacía se aborta** (error en log, Redis intacto).
3. `diffComercios(antiguos, nuevos)` compara **por nombre** (sin mayúsculas, acentos ni espacios repetidos). Con nombres repetidos cuenta cuántos hay y usa la dirección solo para decidir cuál es el alta o la baja.
4. Si hay altas o bajas: `saveComercios(nuevos)`, `addHistoryEntry`, `updateSectorsFromComercios`.
5. Si hay altas y ya había catálogo: `sendDiffEmail({ added, removed })` (el email solo lista altas). En la **carga inicial** (catálogo previo vacío) no se envía correo.
6. Siempre al final: `saveLastUpdate()`.
7. Cualquier excepción se loguea y se traga (el cron no muere).

Consecuencias del diff por nombre: un cambio solo de imagen no se detecta ni se guarda; un cambio de nombre es una baja más una alta. Dos comercios con el mismo nombre (sucursales) sí se distinguen (se emparejan por dirección). Un comercio emparejado cuyo `sector`, `phone`, `address` o `mapsUrl` cambian es una **modificación** (`modified`): se guarda el catálogo nuevo y se anota en el histórico, sin correo (la imagen se ignora).

## Saneado, administración y salud
- `utils/geo.js` limpia coordenadas atípicas tras el scrapeo (ver [SCRAPER.md](SCRAPER.md)).
- `middleware/adminAuth.js` protege `force-scrape` con `FORCE_SCRAPE_TOKEN` (comparación en tiempo constante; deshabilitada si no hay token). `runScrape` devuelve `{ ok, changed, total, added, removed }` o `{ ok: false, error }`, y la ruta responde 502 si falla.
- `GET /api/health` (`utils/health.js`) detecta datos parados para los monitores externos.

## Redis (`src/config/redis.js`, `src/services/redisService.js`)
- Clave: `${NODE_ENV}:${REDIS_NAMESPACE}:${nombre}`; p. ej. `prod:bonos:comercios`.
- DB según entorno: `prod` → 0, `staging` → 1, cualquier otro → 2.
- Conexión: `REDIS_URL` si existe; si no, `redis://default[:PASS]@HOST:PORT`.

| Clave | Contenido |
|---|---|
| `comercios` | JSON array `[{ name, sector, phone, address, img, mapsUrl }]` |
| `last-update` | ISO string del último scrapeo terminado sin excepción |
| `history` | JSON array, **más reciente primero**: `{ timestamp, added: string[], removed: string[], countAfter }` (solo nombres; `modified` lleva `{ name, changes }`); acotado a `HISTORY_MAX_ENTRIES` (500) |
| `sectors` | JSON array de sectores únicos (`"Sin sector"` si vacío) |

Todo se guarda como un único blob JSON por clave (sin TTL). El histórico crece sin límite y se reescribe entero en cada cambio.

## Express (`src/app.js`)
Orden de middlewares: `x-powered-by` off → `express.json()` → CORS manual (`Access-Control-Allow-Origin: *`, preflight 204) → `rateLimiter` → `requestLogger` → rutas.
- `GET /api/status`: healthcheck (hace `redis.ping()`).
- `/api/comercios/*`: ver [API.md](API.md).
- Al hacer `listen`: `verifyMailer()` y luego `startCron()`. `startCron()` programa el cron según `SCRAPE_CRON` (`utils/schedule.js`: valida la expresión, impone ≥ 5 min entre ejecuciones y deduce la antigüedad máxima para `/api/health`) y, si Redis no tiene comercios, lanza un scrapeo inicial inmediato (si ya hay datos espera al siguiente múltiplo de 5 min).

## Middlewares
- **rateLimiter**: ventana fija por IP en un `Map` en memoria. `RATE_LIMIT_WINDOW_MS` (60000) y `RATE_LIMIT_MAX_REQUESTS` (120). Devuelve 429. Usa `req.ip`; detrás de un proxy inverso sin `trust proxy` todas las peticiones compartirán IP.
- **logger (HTTP)**: escribe en consola y en `logs/access.log` (se crea en `logs/`, ignorado por git) con rotación de `rotating-file-stream` (10 MB × 5 ficheros). La IP sale de `req.ip` (respeta `TRUST_PROXY`), no de `X-Forwarded-For` en crudo.

## Email
- `mailService.js` elige el proveedor con `MAIL_PROVIDER` (`smtp` por defecto, `resend`; un valor desconocido avisa y usa `smtp`). `MAIL_ENABLED !== "true"` desactiva envío y verificación.
  - **smtp**: nodemailer (transporter creado en el primer uso). Verifica la conexión al arrancar.
  - **resend**: `POST https://api.resend.com/emails` con axios (sin SDK; timeout 15 s, `Authorization: Bearer RESEND_API_KEY`). Al arrancar solo valida la configuración (no hay "ping" para claves de solo envío). Los errores se registran con estado HTTP y detalle, **sin cabeceras** (no se filtra la API key). Es la opción para hosts que bloquean el SMTP saliente (Render gratis).
- `sendDiffEmail`: asunto "🆕 N nuevo(s) comercio(s) adherido(s) – fecha (Europe/Madrid)"; remitente `MAIL_FROM` (smtp: `"Bonos Castelló API" <MAIL_USER>` si no se define; resend: `onboarding@resend.dev` si no se define, que solo entrega al correo de tu cuenta de Resend); `MAIL_TO` admite varias direcciones separadas por comas. Un fallo de envío se loguea y no interrumpe el cron.
- Para añadir otro proveedor: objeto con `verify()` y `send({ to, subject, html })` en el mapa `providers`.
- `templateService.js`: agrupa altas por sector, escapa todo con `escapeHtml`, sustituye `{{date}}`, `{{totalChanges}}`, `{{addedSection}}`, `{{removedSection}}`, `{{noChangesMessage}}`, `{{frontendUrl}}` en `src/templates/updateEmail.html`. Para añadir otra plantilla: nueva entrada en `src/enums/mailTemplates.js` + `case` en `getTemplateHtml`.

## Dependencias clave
express 5, axios, cheerio 1.0.0-rc, ioredis 6, node-cron 4, nodemailer 10, rotating-file-stream.

## Despliegue de referencia (2025)
API en Docker (compose: `app` + `redis:7-alpine` con password y volumen), publicada como `https://bcc-api.alvaromaxter.es`. Front en Vercel.
