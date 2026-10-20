# Hosting gratuito del API (Render + Upstash + pinger)

Guía para desplegar el API desde cero sin pagar. Los límites de los planes gratuitos cambian: **confírmalos en las webs oficiales** antes de depender de ellos (Render: <https://render.com/docs/free>, Upstash: <https://upstash.com/pricing>).

## Por qué hacen falta tres piezas
El API necesita (1) un proceso Node vivo, porque el cron de 5 min corre **dentro** del proceso; (2) un Redis persistente; (3) un proveedor de correo para los emails (en Render gratis, Resend: el SMTP está bloqueado).

| Pieza | Servicio gratuito | Notas |
|---|---|---|
| Proceso Node | [Render](https://render.com) Web Service (Docker) | Se duerme tras 15 min sin tráfico → necesita pinger |
| Redis | [Upstash](https://upstash.com) | Persistente; solo base 0 y TLS (`rediss://`) |
| Mantener despierto | UptimeRobot o cron-job.org | `GET /api/status` cada 5 min (a la vez da alertas) |
| Email | [Resend](https://resend.com) (API HTTPS) | **Render gratis bloquea el SMTP** (puertos 25/465/587), así que Gmail/SMTP no funciona ahí. O dejar `MAIL_ENABLED=false` |

## Pasos
### 1. Redis en Upstash
1. Crea una base **Redis** (plan gratuito) en la región más cercana (p. ej. Frankfurt).
2. Copia la URL TLS: `rediss://default:PASSWORD@HOST:6379`.

### 2. API en Render
1. Sube el repo a GitHub (ya está). En Render: **New → Blueprint** y elige este repo; detectará `render.yaml` (si prefieres a mano: **New → Web Service**, runtime *Docker*, plan *Free*, health check `/api/status`).
   - **Rama**: elige una que contenga el scraper 2026 (v1.1.0 o posterior). Una vez publicada la v2.0.0, usa `master`. Antes de esa release, `master` seguía en v1.0.2 (scraper antiguo, que no trata bien la web 2026) y había que desplegar `develop`. El `render.yaml` no fija la rama a propósito.
2. Rellena las variables marcadas `sync: false`:
   - `REDIS_URL` → la URL de Upstash.
   - `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_TO`, `FRONTEND_URL` (o déjalas vacías si dejas el correo desactivado; ver paso 5).
3. Despliega. En los logs deberías ver `Redis conectado correctamente`, `Catálogo vacío: scrapeo inicial` y `Scrapeo completado`.
4. Comprueba: `https://TU-SERVICIO.onrender.com/api/status` y `/api/comercios/status`.

Variables importantes (detalle en [OPERATIONS.md](OPERATIONS.md)):
- `NODE_ENV=prod` → usa la base 0 de Redis (Upstash no tiene más). Con `dev`/`staging` el cliente selecciona otra base (1 o 2), que Upstash no ofrece, y puede fallar.
- `TRUST_PROXY=1` → sin esto el rate limit ve la IP del proxy de Render y **todos los usuarios comparten el mismo límite** (120/min).
- `REDIS_NAMESPACE=bonos2026` → separa los datos de cada edición.

### 3. Monitor externo (imprescindible en el plan gratuito)
Render duerme el servicio tras 15 min sin tráfico y, al dormir, el cron deja de ejecutarse. Crea un monitor HTTP gratuito (UptimeRobot, cron-job.org…) que haga `GET https://TU-SERVICIO.onrender.com/api/health` **cada 5 minutos**:
- Mantiene el servicio despierto y el cron sigue su ritmo.
- **Te avisa** (el monitor marca "caído" con un 503) si Redis falla o si los datos llevan más de 15 minutos sin actualizarse, que es justo el síntoma de un cron parado o un scrapeo roto. Activa las alertas por correo del monitor.
- `/api/status` sigue valiendo como simple comprobación de que el proceso responde.

**Respaldo con GitHub Actions** (opcional): un workflow programado que llame a `/api/health` y falle si no responde 200; GitHub te avisa por correo cuando falla. Es gratis, pero el mínimo es de 5 minutos, suele retrasarse y se desactiva tras 60 días sin actividad en el repo. Está en `.github/workflows/uptime.yml`: define la variable de repositorio `API_URL` (*Settings → Secrets and variables → Actions → Variables*) con la URL del API.

### 3b. Token de administración
Para poder usar `POST /api/comercios/force-scrape` define `FORCE_SCRAPE_TOKEN` en Render (`openssl rand -hex 32`). Sin él la ruta está deshabilitada. Úsalo con `Authorization: Bearer <token>`.

### 4. Conectar el front
En el repo del front cambia `apiBaseUrl` en `src/environments/environment.prod.ts` y `environment.test.ts` (y los `mock.*` si se usan) por `https://TU-SERVICIO.onrender.com`, y vuelve a desplegar.

### 5. Emails (opcional)
Render **bloquea el SMTP saliente** en los servicios gratuitos ([changelog de Render](https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports)), así que allí hay que usar Resend, que envía por HTTPS:
1. Crea cuenta en [Resend](https://resend.com) y una **API key** (*API Keys → Create*, permiso de envío).
2. Remitente:
   - **Pruebas**: sin dominio, el remitente por defecto es `onboarding@resend.dev` y solo entrega al correo con el que te registraste en Resend. Pon `MAIL_TO` con ese correo.
   - **Producción**: añade y verifica un dominio tuyo en Resend (registros DNS) y pon `MAIL_FROM="Bonos Castelló <avisos@tudominio.es>"`. Podrás enviar a cualquier destinatario.
3. En Render: `MAIL_PROVIDER=resend` (ya viene así en `render.yaml`), `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_TO` (varios separados por comas) y `MAIL_ENABLED=true`.
4. El arranque loguea `Proveedor de correo: resend` y `Resend configurado`; al detectar comercios nuevos, `Correo enviado`.

En un servidor propio sin bloqueo de puertos (VM de Oracle, Docker en casa) puedes seguir usando SMTP (`MAIL_PROVIDER=smtp`, p. ej. Gmail con contraseña de aplicación).

## Consumo estimado de Redis
El cron hace ~2 comandos por ejecución (8.640 ejecuciones/mes ≈ 17 K) + 1 `PING` por cada `/api/status` del pinger (≈ 9 K/mes) + las consultas del front (2-3 por visita). Muy por debajo del cupo mensual gratuito indicado por Upstash en el momento de escribir esto (500 K comandos/mes).

## Limitaciones del plan gratuito
- ~750 h/mes de instancia gratuita: cubre un único servicio encendido todo el mes.
- Tras un despegue en frío (si el pinger falla) la primera petición tarda ~30-60 s.
- El disco es efímero: `logs/access.log` se pierde al reiniciar (los datos están en Upstash).
- El scraper sale a internet: Render lo permite. Si la web oficial bloquease IPs de datacenter, los logs mostrarán errores `SCRAPER` y el catálogo se conservará (protección de scrapeo vacío).

## Alternativa: VM gratuita (Oracle Cloud Always Free)
Una VM ARM siempre encendida permite usar `docker-compose.yml` tal cual (Redis incluido, sin pinger). Pide tarjeta para verificar la cuenta, suele haber falta de capacidad ("Out of capacity") y la cuota gratuita ha cambiado (revisa la oficial). Pasos: crear VM Ubuntu ARM → instalar Docker → clonar el repo → `cp .env.example .env` → `docker compose up -d --build` → abrir el puerto 12001 (o poner un proxy con HTTPS delante).

## Problemas frecuentes
| Síntoma | Causa probable |
|---|---|
| `ECONNREFUSED`/error TLS a Redis | Usaste `redis://` en vez de `rediss://`, o `NODE_ENV` distinto de `prod` |
| `Too many requests` con poco tráfico | Falta `TRUST_PROXY=1` |
| El cron "se para" | El pinger no está activo y Render durmió el servicio |
| 0 comercios | Mira logs `SCRAPER`/`CRON`; lanza `POST /api/comercios/force-scrape` con el token |
| `/api/health` da 503 | Datos sin actualizar >15 min: mira los logs `CRON`/`SCRAPER` (¿el servicio estuvo dormido? ¿la web oficial falla?) |
| `force-scrape` da 403 / 401 | Falta `FORCE_SCRAPE_TOKEN` en el servidor / token incorrecto |
| Email no llega / `Resend rechazó el envío` 403 | `MAIL_FROM` de un dominio sin verificar, o destinatario distinto al de tu cuenta usando `onboarding@resend.dev` |
| SMTP: timeout / `ETIMEDOUT` en Render | Render gratis bloquea 25/465/587: usa `MAIL_PROVIDER=resend` |
| Email enorme tras cambiar de edición | Reutilizaste el namespace de Redis: usa uno nuevo |
