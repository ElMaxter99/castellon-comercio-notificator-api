# CLAUDE.md — castellon-comercio-notificator-api

Guía para Claude Code. Léela entera antes de tocar nada.

## Qué es
Backend Node.js/Express que **scrapea periódicamente** (por defecto cada 5 min, configurable con `SCRAPE_CRON`) el listado oficial de establecimientos adheridos al programa de bonos de Castelló de la Plana (`bonoscastellodelaplana.es`), lo guarda en **Redis**, calcula **altas/bajas** respecto a la ejecución anterior, guarda un **histórico** y **envía un email** cuando hay comercios nuevos. Expone todo por REST para el front (repo `castellon-comercio-notificator-front`).

Proyecto independiente y sin ánimo de lucro; no tiene relación oficial con el Ayuntamiento.

## Mapa rápido
| Fichero | Rol |
|---|---|
| `src/app.js` | Arranque Express: CORS `*`, rate limiter, logger HTTP, rutas, `/api/status`, verifica el correo y lanza el cron |
| `src/cron.js` | `runScrape(manual)` + `startCron()` (frecuencia: `SCRAPE_CRON`, por defecto `*/5 * * * *`) |
| `src/utils/schedule.js` | Resuelve `SCRAPE_CRON`/`SCRAPE_CRON_TIMEZONE`: valida, mínimo 5 min, y deduce `HEALTH_MAX_AGE_MINUTES` y el periodo de gracia del arranque |
| `src/scraper/index.js` | axios + cheerio, recorre la paginación de la web oficial. **Punto más frágil** |
| `src/routes/comercios.js` | Endpoints `/api/comercios/*` |
| `src/services/redisService.js` | Lectura/escritura en Redis (claves `ENV:NAMESPACE:nombre`) |
| `src/services/mailService.js` | Email con proveedor `smtp` (nodemailer) o `resend` (API HTTPS), `sendDiffEmail` (solo altas) |
| `src/services/templateService.js` + `src/templates/updateEmail.html` | Render del email (escapa HTML) |
| `src/utils/diff.js` | Diff por **nombre** (altas/bajas) |
| `src/utils/geo.js` · `src/utils/health.js` · `src/middleware/adminAuth.js` | Saneado de coordenadas, evaluación de salud y token de administración |
| `src/middleware/rateLimiter.js` | Límite en memoria por IP |
| `scripts/*.sh`, `scripts/syncSectors.js` | Operación Docker y reparación de sectores |

## Documentación detallada (`docs/`)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — flujo de datos, módulos, Redis, decisiones.
- [`docs/API.md`](docs/API.md) — todos los endpoints con ejemplos.
- [`docs/SCRAPER.md`](docs/SCRAPER.md) — cómo funciona el scraping y cómo repararlo si la web cambia.
- [`docs/OPERATIONS.md`](docs/OPERATIONS.md) — variables de entorno, Docker, despliegue, logs.
- [`docs/HOSTING.md`](docs/HOSTING.md) — hosting gratuito (Render + Upstash + pinger) y `render.yaml`.
- [`docs/REUSE-2026.md`](docs/REUSE-2026.md) — **checklist para reutilizar el proyecto en la edición 2026**.

## Comandos
```bash
npm install
npm start                 # node src/app.js (necesita Redis accesible)
docker compose up --build # API + Redis
node scripts/syncSectors.js   # reconstruye el catálogo de sectores desde Redis
```
`npm test` ejecuta los tests (`node --test`, carpeta `test/`: geo, auth, salud, parser de query y frecuencia del cron). El **CI** (`.github/workflows/ci.yml`) corre en cada PR: tests + sintaxis, arranque real con Redis (`/api/status`, `/api/health`, 403 de `force-scrape`) y build de la imagen Docker. No hay linter ni build step.

## Convenciones
- CommonJS (`require`), Node ≥ 22 (el Dockerfile usa `node:26.12.0-trixie-slim`; las dependencias exigen Node ≥ 20).
- Logs siempre vía `src/utils/logger.js` con `{ context, meta }`; no usar `console.log` directo.
- Mensajes de log y textos de usuario en español.
- Los PR deben pasar el CI. Añade tests para la lógica nueva (`test/`).
- Cada release actualiza `CHANGELOG.md` y `version` de `package.json` (flujo gitflow: `develop`, `release/vX.Y.Z`, `master`).
- No commitear `.env` (ignorado). Plantilla en `.env.example`.

## Imágenes del README
- `docs/assets/` (banner, logo, `email.png`). **Usa SIEMPRE datos ficticios** en cualquier captura: `tools/readme-screenshots.cjs` renderiza la plantilla del correo con comercios inventados. Nunca publiques datos reales del programa.
- El README enlaza al repo del front y viceversa; mantén las referencias cruzadas al cambiar nombres o rutas.

## Trampas conocidas (no las "arregles" sin preguntar)
1. El scraper usa **selectores CSS acoplados al HTML** de la web oficial; si no devuelve nada, ver `docs/SCRAPER.md`.
2. `runScrape` **guarda en Redis solo si hay diferencias**, y `saveLastUpdate` se ejecuta aunque no las haya.
3. Si el scrapeo devuelve 0 comercios se aborta y se conserva el catálogo (`force-scrape` responde 502). Un cambio de edición con el mismo namespace de Redis genera altas/bajas masivas: cambiar `REDIS_NAMESPACE`.
4. `POST /api/comercios/force-scrape` exige `FORCE_SCRAPE_TOKEN`; sin la variable está **deshabilitada** (403). `/api/health` da 503 si los datos llevan >15 min sin actualizarse.
5. **Express y el filtro**: `/api/comercios/filter` rechaza (400) `?name[]=x` o `?sector[a]=1`; eso exige el parseador de query *extended* (`utils/expressSetup.js`). Express 5 usa *simple* por defecto: no quites esa configuración al actualizar Express (hay un test que lo protege).
6. La web oficial enlaza con `http://`; el scraper fuerza https en todas las URLs que sigue.
7. `package-lock.json` está en `.gitignore`.
