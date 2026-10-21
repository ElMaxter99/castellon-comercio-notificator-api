# Changelog

## v2.5.0 - 2026-10-21

### Añadido
- **Sin scrapeos solapados** (`src/utils/runGuard.js`): si ya hay un scrapeo en curso, el cron o `force-scrape` no lanzan otro (antes podían compararse ambos contra el mismo catálogo y duplicar el correo de altas). `force-scrape` responde **409** en ese caso.
- **Cierre ordenado** ante `SIGTERM`/`SIGINT` (cada despliegue de Render/Docker): para el cron, espera hasta 10 s al scrapeo en curso, cierra el servidor HTTP y Redis; tope de 15 s.
- **Caché HTTP**: `Cache-Control: public, max-age=60` (configurable con `CACHE_MAX_AGE_SECONDS`) en los GET de `/api/comercios/*`, con `ETag`; `/api/status` y `/api/health` van con `no-store`.
- **Cabeceras de seguridad**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`.
- Tests: 57 (12 nuevos).

## v2.4.1 - 2026-10-21

### Corregido
- **`ERR DB index is out of range` en Render/Upstash**: con `NODE_ENV=production` la API pedía la base 2 (`SELECT 2`), que los Redis gestionados no tienen. Ahora, con `REDIS_URL`, usa la base 0 (o la de la URL); nueva variable opcional `REDIS_DB`. Sin `REDIS_URL` (Docker local) el mapeo no cambia. Las claves siguen siendo las mismas (`production:bonos:*`), no hay que migrar datos.
- El log de arranque ya no dice «cada 5 min» fijo (el detalle lo da `Cron programado: …`).

## v2.4.0 - 2026-10-21

### Añadido
- **El scraper se identifica**: el `User-Agent` deja de ser `Mozilla/5.0` y pasa a ser configurable con `SCRAPER_USER_AGENT`. Por defecto: `ComercioCastellonNotificator/<versión> (+https://bono-castellon.alvaromaxter.es/; proyecto independiente sin ánimo de lucro)`, de modo que la web oficial sabe quién consulta y puede contactar. Un valor inválido (no ASCII, saltos de línea, >300 caracteres) se ignora con aviso. Se registra al arrancar. Comprobado: la web oficial responde igual (200) con el nuevo valor. Tests: 40 (4 nuevos).

## v2.3.0 - 2026-10-21

### Añadido
- **Frecuencia del scrapeo configurable** con `SCRAPE_CRON` (expresión cron de 5 campos; por defecto `*/5 * * * *`, igual que antes) y `SCRAPE_CRON_TIMEZONE` (zona IANA opcional). Se valida en el arranque (`src/utils/schedule.js`): una expresión inválida, con segundos, que casi nunca se ejecute o más seguida que cada **5 minutos** se ignora con un aviso `WARN [CRON]` y se usa la de por defecto (así no se castiga la web oficial por un error de configuración).
- **`/api/health` se adapta a la frecuencia**: si no se define `HEALTH_MAX_AGE_MINUTES`, la antigüedad máxima se deduce como 1,5 × el mayor hueco entre ejecuciones (mínimo 15 min) y el periodo de gracia tras arrancar se alarga igual. Con un cron horario ya no hay falsos 503. `HEALTH_MAX_AGE_MINUTES` explícito sigue mandando.
- `render.yaml`, `.env.example`, README y `docs/` actualizados. Tests: 36 (14 nuevos).

## v2.2.3 - 2026-10-21

### Corregido
- `.gitignore`: en la v2.2.1 se añadió `logs/` sin salto de línea y quedó pegado a la línea anterior (`package-lock.jsonlogs/`), con lo que **ni `package-lock.json` ni `logs/` se ignoraban**. Se restauran las dos líneas.
- Se **deja de versionar `package-lock.json`** (1 417 líneas que se colaron en esa misma versión; el repo no lo versiona a propósito, ver `CLAUDE.md`).

## v2.2.2 - 2026-10-21

### Docs
- README: sección «Privacidad y datos personales» (qué registra la API, IP incluida, y cuánto se conserva), alineada con la página `/privacidad` del front.
- `OPERATIONS`, `ARCHITECTURE` y `REUSE-2026` corregidos: el log de accesos ya rota con `rotating-file-stream` (antes decían que no rotaba y que la dependencia no se usaba).

## v2.2.1 - 2026-10-20

### Seguridad
- Log de accesos con rotación (`rotating-file-stream`, 10 MB × 5 ficheros) en lugar de `appendFile` sin límite (Snyk CWE-770). El rate limiter ya se aplica antes del logger.
- La IP del log sale de `req.ip` (respeta `TRUST_PROXY`) y no de la cabecera `X-Forwarded-For` en crudo.
- `test/queryParser.test.js` usa `fetch` en lugar de `http.get` (aviso CWE-319 sobre un test a `127.0.0.1`).
- `logs/` añadido a `.gitignore`.

## v2.2.0 - 2026-10-20

Actualización de dependencias (saltos de versión mayor, verificados uno a uno) y ajuste previo de Express.

### Cambio
- **Express 4 → 5.3**, **ioredis 5 → 6**, **node-cron 3 → 4.6**, **nodemailer 7 → 10.1**: probados contra `master` (endpoints, cron con expresión real, correo SMTP con autenticación, Redis con contraseña, selección de DB, reconexión y TLS `rediss://`) sin diferencias de comportamiento. Requieren Node ≥ 20.
- Imagen base `node:26.12.0-trixie-slim` (probado el API completo con Node 26.12).
- GitHub Actions: `actions/checkout` y `actions/setup-node` a la v7.

### Corrección
- El parseador de query de Express se fija explícitamente a *extended* (`utils/expressSetup.js`): Express 5 usa *simple* por defecto y el filtro `/api/comercios/filter` dejaría de rechazar `?name[]=x` y `?sector[a]=1`. Incluye un test que lo protege (verificado: falla con Express 5 sin el ajuste).

## v2.1.1 - 2026-10-20

### Agregado
- **CI** con GitHub Actions (`.github/workflows/ci.yml`): en cada PR y push a `develop`/`master` ejecuta los tests y la comprobación de sintaxis, un *smoke test* (arranca el API contra un Redis real y comprueba `/api/status`, `/api/health` y que `force-scrape` está deshabilitado sin token) y el build de la imagen Docker.
- Dependabot: npm (semanal), imagen Docker y GitHub Actions (mensual), contra `develop`.

## v2.1.0 - 2026-10-20

### Agregado
- `GET /api/health`: salud para monitores externos; responde 503 si Redis falla o si los datos llevan más de `HEALTH_MAX_AGE_MINUTES` (15) sin actualizarse. Periodo de gracia de 6 min tras arrancar.
- Saneado de coordenadas (`utils/geo.js`): los comercios con coordenadas fuera de la zona (30 km alrededor de Castelló, configurable con `GEO_*`) pasan a usar una búsqueda por dirección en `mapsUrl`, y los de otra provincia se excluyen (p. ej. una entrada del proveedor de la web, en León).
- Tests con el runner integrado de Node (`npm test`): geo, autenticación y salud.
- Workflow de GitHub Actions opcional (`.github/workflows/uptime.yml`) que comprueba `/api/health`.

### Cambio
- **`POST /api/comercios/force-scrape` requiere `Authorization: Bearer $FORCE_SCRAPE_TOKEN`**; sin la variable la ruta queda deshabilitada (403) en vez de abierta. Quien la use debe definir el token.
- `force-scrape` responde 502 con el error cuando el scrapeo falla (antes respondía siempre `ok: true`) y devuelve un resumen (`changed`, `total`, `added`, `removed`).

## v2.0.0 - 2026-10-20

Versión mayor por el cambio de edición: el API pasa a la web 2026 del programa (alineada con el front 2.0.0).

### Cambio
- El scraper apunta a la web de la edición 2026 y normaliza datos de forma distinta a 1.0.x (direcciones sin el sufijo de municipio/país, URLs en https). **Al actualizar desde 1.0.x usa un `REDIS_NAMESPACE` nuevo** (p. ej. `bonos2026`) o vacía las claves: si no, el primer scrapeo se compara con el catálogo 2025 y genera altas/bajas masivas.
- Despliegue gratuito documentado y preparado (`render.yaml`, `docs/HOSTING.md`: Render + Upstash + pinger) y correo configurable (SMTP o Resend). Resumen de lo incorporado desde 1.0.2: scraper 2026 (1.1.0), `TRUST_PROXY`, Blueprint de Render (1.1.1) y Resend (1.2.0).

### Corrección
- Documentación al día: ejemplo de imagen en `https`, menciones a Resend, estado de la guía de reutilización y rama de despliegue.

## v1.2.0 - 2026-10-20
### Agregado
- Envío de correo con **Resend** (API HTTPS) como alternativa al SMTP tradicional: `MAIL_PROVIDER=smtp|resend`, `RESEND_API_KEY` y `MAIL_FROM`. Necesario en Render gratis, que bloquea el SMTP saliente.
- `MAIL_TO` admite varios destinatarios separados por comas; `MAIL_FROM` opcional también en SMTP.

### Cambio
- `render.yaml` y `docs/HOSTING.md` usan Resend; la guía anterior recomendaba Gmail por SMTP, que no funciona en Render gratis.

## v1.1.1 - 2026-10-20
### Agregado
- `render.yaml` (Blueprint de Render) y `docs/HOSTING.md` con la guía de hosting gratuito (Render + Upstash + pinger).
- Variable `TRUST_PROXY` para que el rate limit use la IP real del cliente detrás de un proxy inverso.

## v1.1.0 - 2026-10-20
### Agregado
- Scrapeo inicial automático cuando Redis no tiene comercios (sin enviar correo en esa carga inicial).
- Timeout de 20 s y 2 reintentos al descargar cada página; guardas ante bucles de paginación.

### Cambio
- Scraper adaptado a la web 2026: https, URLs de paginación e imágenes normalizadas y direcciones sin el sufijo "CASTELLÓ DE LA PLANA / …, ESPAÑA".

### Corrección
- Un scrapeo que devuelve 0 comercios ya no vacía el catálogo ni registra bajas masivas.

## v1.0.2 - 2025-11-05
### Agregado
- Add in-memory rate limiter before request logging #10
- Validate query parameter types in comercios filter route #12

### Correción
- [Snyk] Security upgrade nodemailer from 6.10.1 to 7.0.7 #7
- [Snyk] Security upgrade node from 25.1.0 to 25.1.0-trixie-slim #8
- Disable Express X-Powered-By header #9
- Sanitize HTML in diff notification emails #11

## v1.0.1 - 2025-11-04
### Correción
- [Snyk] Security upgrade node from 22.12.0 to 25.1.0 #6

## v1.0.0 - 2025-11-03
### Agregado
- API REST con Express que expone los endpoints `/api/comercios` para listar comercios, `/api/comercios/status` para conocer el estado, `/api/comercios/history` para revisar el histórico, `/api/comercios/filter` para filtrar por nombre o sector, `/api/comercios/sectors` para consultar sectores y `/api/comercios/force-scrape` para lanzar el scrapeo manual. También incluye `/api/status` para el healthcheck general.
- Middleware de logging HTTP que registra cada petición en consola y en un fichero rotativo, con formateo enriquecido en consola.
- Integración con Redis para almacenar el catálogo actual, la fecha del último scrapeo, el histórico de cambios y el catálogo de sectores, con namespacing por entorno.
- Scheduler con `node-cron` que ejecuta el scraper cada 5 minutos, detecta diferencias entre ejecuciones y actualiza Redis en consecuencia.
- Motor de scraping basado en `axios` + `cheerio` que recorre todas las páginas de la web oficial y normaliza la información de cada comercio (nombre, sector, teléfono, dirección, imagen y enlace a Maps).
- Servicio de notificaciones por correo que agrupa los comercios nuevos por sector y envía un email HTML con la plantilla `updateEmail` cuando hay altas.
- Sistema de plantillas HTML personalizable para correos, con renderizado server-side y sustitución de variables dinámica.
- Utilidades de diferencias y logging estructurado para diagnosticar incidencias y rastrear cambios.
- Configuración de Redis resiliente mediante `ioredis`, con reconexión automática y selección de base según entorno.
- Dockerfile y `docker-compose.yml` listos para levantar la API junto a Redis y ejecutar el cron automáticamente.
- Script de arranque (`npm start`) que inicializa Express, verifica el mailer SMTP y arranca el cron.
