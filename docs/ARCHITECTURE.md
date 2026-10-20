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
2. `getComercios()` → lista guardada.
3. `diffComercios(antiguos, nuevos)` compara **por `name`** (`Set` de nombres).
4. Si hay altas o bajas: `saveComercios(nuevos)`, `addHistoryEntry`, `updateSectorsFromComercios`.
5. Si hay altas: `sendDiffEmail({ added, removed })` (el email solo lista altas).
6. Siempre al final: `saveLastUpdate()`.
7. Cualquier excepción se loguea y se traga (el cron no muere).

Consecuencias del diff por nombre: si un comercio cambia teléfono/dirección/imagen pero no nombre, **no se detecta ni se guarda** el cambio. Dos comercios con el mismo nombre (sucursales) se colapsan en el diff.

## Redis (`src/config/redis.js`, `src/services/redisService.js`)
- Clave: `${NODE_ENV}:${REDIS_NAMESPACE}:${nombre}`; p. ej. `prod:bonos:comercios`.
- DB según entorno: `prod` → 0, `staging` → 1, cualquier otro → 2.
- Conexión: `REDIS_URL` si existe; si no, `redis://default[:PASS]@HOST:PORT`.

| Clave | Contenido |
|---|---|
| `comercios` | JSON array `[{ name, sector, phone, address, img, mapsUrl }]` |
| `last-update` | ISO string del último scrapeo terminado sin excepción |
| `history` | JSON array, **más reciente primero**: `{ timestamp, added: string[], removed: string[], countAfter }` (solo nombres) |
| `sectors` | JSON array de sectores únicos (`"Sin sector"` si vacío) |

Todo se guarda como un único blob JSON por clave (sin TTL). El histórico crece sin límite y se reescribe entero en cada cambio.

## Express (`src/app.js`)
Orden de middlewares: `x-powered-by` off → `express.json()` → CORS manual (`Access-Control-Allow-Origin: *`, preflight 204) → `rateLimiter` → `requestLogger` → rutas.
- `GET /api/status`: healthcheck (hace `redis.ping()`).
- `/api/comercios/*`: ver [API.md](API.md).
- Al hacer `listen`: `verifyMailer()` y luego `startCron()`. **El cron no ejecuta un scrapeo inmediato al arrancar**: el primer scrapeo ocurre en el siguiente múltiplo de 5 min (o con `force-scrape`). Con Redis vacío, el front verá 0 comercios hasta entonces.

## Middlewares
- **rateLimiter**: ventana fija por IP en un `Map` en memoria. `RATE_LIMIT_WINDOW_MS` (60000) y `RATE_LIMIT_MAX_REQUESTS` (120). Devuelve 429. Usa `req.ip`; detrás de un proxy inverso sin `trust proxy` todas las peticiones compartirán IP.
- **logger (HTTP)**: escribe en consola y en `logs/access.log` (se crea en `logs/`). La dependencia `rotating-file-stream` está instalada pero **no se usa** (el README dice "rotativo", en realidad es un append simple).

## Email
- `mailService.js`: transporter SMTP creado al cargar el módulo. `MAIL_ENABLED !== "true"` desactiva envío y verificación.
- `sendDiffEmail`: asunto "🆕 N nuevo(s) comercio(s) adherido(s) – fecha (Europe/Madrid)"; remitente `"Bonos Castelló API" <MAIL_USER>`; destinatario `MAIL_TO`.
- `templateService.js`: agrupa altas por sector, escapa todo con `escapeHtml`, sustituye `{{date}}`, `{{totalChanges}}`, `{{addedSection}}`, `{{removedSection}}`, `{{noChangesMessage}}`, `{{frontendUrl}}` en `src/templates/updateEmail.html`. Para añadir otra plantilla: nueva entrada en `src/enums/mailTemplates.js` + `case` en `getTemplateHtml`.

## Dependencias clave
express 4, axios, cheerio 1.0.0-rc, ioredis, node-cron, nodemailer 7, rotating-file-stream (sin uso).

## Despliegue de referencia (2025)
API en Docker (compose: `app` + `redis:7-alpine` con password y volumen), publicada como `https://bcc-api.alvaromaxter.es`. Front en Vercel.
