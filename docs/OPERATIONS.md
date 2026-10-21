# Operación

## Variables de entorno (`.env`, plantilla `.env.example`)
| Variable | Defecto | Uso |
|---|---|---|
| `NODE_ENV` | `dev` | `prod`→Redis DB 0, `staging`→1, otro→2; prefijo de claves |
| `PORT` | `12001` | Puerto HTTP |
| `FORCE_SCRAPE_TOKEN` | — | Token de `POST /api/comercios/force-scrape` (`Authorization: Bearer`). Sin definir, la ruta está deshabilitada. Genera uno largo: `openssl rand -hex 32` |
| `SCRAPER_USER_AGENT` | `ComercioCastellonNotificator/<versión> (+https://bono-castellon.alvaromaxter.es/; …)` | `User-Agent` del scraper. Vacío → el de por defecto; con caracteres no ASCII, saltos de línea o más de 300 caracteres se ignora (aviso `WARN [CRON]`). Conviene incluir un contacto |
| `SCRAPE_CRON` | `*/5 * * * *` | Frecuencia del scrapeo: expresión cron de **5 campos**. Mínimo 5 min entre ejecuciones; una expresión inválida, con segundos o más frecuente se ignora y se usa la de por defecto (aviso `WARN [CRON]` en el arranque). Ejemplos: `*/15 * * * *`, `0 * * * *`, `0 8-22 * * *` |
| `SCRAPE_CRON_TIMEZONE` | zona del servidor | Zona horaria IANA de `SCRAPE_CRON` (p. ej. `Europe/Madrid`; en Docker/Render el servidor va en UTC) |
| `HEALTH_MAX_AGE_MINUTES` | deducida | Antigüedad máxima de los datos para que `/api/health` responda 200. Sin definir: 1,5 × el mayor hueco entre ejecuciones de `SCRAPE_CRON` (mínimo 15), así un cron horario no da falsas alarmas |
| `GEO_CENTER_LAT` · `GEO_CENTER_LNG` · `GEO_RADIUS_KM` · `GEO_CITY` | Castelló · 30 km | Zona válida para las coordenadas de los comercios (ver `SCRAPER.md`) |
| `TRUST_PROXY` | — | Nº de proxies inversos delante (Render = 1). Necesario para que el rate limit distinga IPs |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Ventana del rate limit |
| `RATE_LIMIT_MAX_REQUESTS` | `120` | Máx. peticiones por IP y ventana |
| `REDIS_URL` | — | Si existe, ignora host/port/password |
| `CACHE_MAX_AGE_SECONDS` | `60` | `Cache-Control: public, max-age=N` en los GET de `/api/comercios/*` (con `ETag`, tras caducar se revalida con 304). `0` → `no-cache`. `/api/status` y `/api/health`: `no-store` |
| `REDIS_DB` | según entorno | Con `REDIS_URL`: la base de la URL o la 0 (los Redis gestionados solo tienen la 0); sin URL: prod 0, staging 1, resto 2 |
| `REDIS_HOST` / `REDIS_PORT` | `redis` / `6379` | |
| `REDIS_PASSWORD` | — | También lo usa `docker-compose` para `--requirepass` |
| `REDIS_NAMESPACE` | `bonos` | Segundo segmento de las claves |
| `MAIL_PROVIDER` | `smtp` | `smtp` o `resend` (ver [Email](ARCHITECTURE.md#email)) |
| `MAIL_HOST` `MAIL_PORT` `MAIL_SECURE` `MAIL_USER` `MAIL_PASS` | puerto 587 | Solo `smtp` (en Gmail, contraseña de aplicación). `secure` si `MAIL_SECURE=true` o puerto 465 |
| `RESEND_API_KEY` | — | Solo `resend`: API key (`re_...`) |
| `MAIL_FROM` | smtp: `"Bonos Castelló API" <MAIL_USER>`; resend: `onboarding@resend.dev` | Remitente. Con Resend debe ser de un dominio verificado |
| `MAIL_TO` | — | Destinatario(s) de las alertas, separados por comas |
| `MAIL_ENABLED` | `true` | `false` desactiva envío y verificación |
| `FRONTEND_URL` | web oficial | Enlace del email |

## Docker
`docker-compose.yml`: servicio `app` (build local, puerto 12001, `restart: always`) + `redis:7-alpine` (password, volumen `redis_data`, red interna, sin puerto público). Nombres de contenedor: `castellon-comercios-api`, `castellon-redis`.

Scripts (`scripts/`): `start.sh`, `stop.sh`, `restart.sh` (conserva datos), `redeploy.sh` (down + build --no-cache + up), `reinstall.sh` (**borra volúmenes e imágenes: pierdes el histórico**).

## Local sin Docker
Redis accesible (`REDIS_HOST=localhost`), `npm install`, `npm start`. Atención: `REDIS_HOST` por defecto es `redis` (nombre del servicio docker).

## Logs
- Consola con colores y niveles INFO/SUCCESS/WARN/ERROR/DEBUG/REQUEST con `[contexto]` (`APP`, `CRON`, `SCRAPER`, `REDIS`, `MAIL`, `HTTP`, `ROUTE:*`).
- `logs/access.log`: una línea por petición (fecha, método, URL, IP de `req.ip`). Rota con `rotating-file-stream` (10 MB × 5 ficheros); en Docker no es un volumen, se pierde al recrear el contenedor. Contiene IPs: ver «Privacidad y datos personales» del README.

## Mantenimiento habitual
- Forzar scrapeo: `curl -X POST -H "Authorization: Bearer $FORCE_SCRAPE_TOKEN" <api>/api/comercios/force-scrape`.
- Comprobar la salud de los datos: `curl <api>/api/health` (503 si el scrapeo está parado).
- Tests: `npm test` (runner integrado de Node, sin dependencias). El CI (`.github/workflows/ci.yml`) ejecuta además un *smoke test* con un Redis real y construye la imagen Docker; Dependabot propone actualizaciones de npm (semanal), Docker y Actions (mensual) a `develop`.
- Reconstruir sectores: `docker compose exec app node scripts/syncSectors.js`.
- Ver datos: `docker compose exec redis redis-cli -a $REDIS_PASSWORD -n <db> GET prod:bonos:comercios`.
- Reiniciar de cero una edición: borrar claves `*:bonos:comercios|history|sectors|last-update` (ver `REUSE-2026.md`).

## Seguridad aplicada (v1.0.2)
Cabecera `X-Powered-By` desactivada, rate limit, validación de tipos en `/filter`, HTML de emails escapado, nodemailer 10, imagen base `-slim`.
