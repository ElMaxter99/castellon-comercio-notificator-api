# Operación

## Variables de entorno (`.env`, plantilla `.env.example`)
| Variable | Defecto | Uso |
|---|---|---|
| `NODE_ENV` | `dev` | `prod`→Redis DB 0, `staging`→1, otro→2; prefijo de claves |
| `PORT` | `12001` | Puerto HTTP |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Ventana del rate limit |
| `RATE_LIMIT_MAX_REQUESTS` | `120` | Máx. peticiones por IP y ventana |
| `REDIS_URL` | — | Si existe, ignora host/port/password |
| `REDIS_HOST` / `REDIS_PORT` | `redis` / `6379` | |
| `REDIS_PASSWORD` | — | También lo usa `docker-compose` para `--requirepass` |
| `REDIS_NAMESPACE` | `bonos` | Segundo segmento de las claves |
| `MAIL_HOST` `MAIL_PORT` `MAIL_SECURE` `MAIL_USER` `MAIL_PASS` | puerto 587 | SMTP (en Gmail, contraseña de aplicación). `secure` si `MAIL_SECURE=true` o puerto 465 |
| `MAIL_TO` | — | Destinatario de las alertas |
| `MAIL_ENABLED` | `true` | `false` desactiva envío y verificación SMTP |
| `FRONTEND_URL` | web oficial | Enlace del email |

## Docker
`docker-compose.yml`: servicio `app` (build local, puerto 12001, `restart: always`) + `redis:7-alpine` (password, volumen `redis_data`, red interna, sin puerto público). Nombres de contenedor: `castellon-comercios-api`, `castellon-redis`.

Scripts (`scripts/`): `start.sh`, `stop.sh`, `restart.sh` (conserva datos), `redeploy.sh` (down + build --no-cache + up), `reinstall.sh` (**borra volúmenes e imágenes: pierdes el histórico**).

## Local sin Docker
Redis accesible (`REDIS_HOST=localhost`), `npm install`, `npm start`. Atención: `REDIS_HOST` por defecto es `redis` (nombre del servicio docker).

## Logs
- Consola con colores y niveles INFO/SUCCESS/WARN/ERROR/DEBUG/REQUEST con `[contexto]` (`APP`, `CRON`, `SCRAPER`, `REDIS`, `MAIL`, `HTTP`, `ROUTE:*`).
- `logs/access.log`: una línea por petición. No rota; en Docker no es un volumen, se pierde al recrear el contenedor.

## Mantenimiento habitual
- Forzar scrapeo: `curl -X POST <api>/api/comercios/force-scrape`.
- Reconstruir sectores: `docker compose exec app node scripts/syncSectors.js`.
- Ver datos: `docker compose exec redis redis-cli -a $REDIS_PASSWORD -n <db> GET prod:bonos:comercios`.
- Reiniciar de cero una edición: borrar claves `*:bonos:comercios|history|sectors|last-update` (ver `REUSE-2026.md`).

## Seguridad aplicada (v1.0.2)
Cabecera `X-Powered-By` desactivada, rate limit, validación de tipos en `/filter`, HTML de emails escapado, nodemailer 7, imagen base `-slim`.
