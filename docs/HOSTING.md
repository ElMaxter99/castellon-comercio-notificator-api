# Hosting gratuito del API (Render + Upstash + pinger)

Guía para desplegar el API desde cero sin pagar. Los límites de los planes gratuitos cambian: **confírmalos en las webs oficiales** antes de depender de ellos (Render: <https://render.com/docs/free>, Upstash: <https://upstash.com/pricing>).

## Por qué hacen falta tres piezas
El API necesita (1) un proceso Node vivo, porque el cron de 5 min corre **dentro** del proceso; (2) un Redis persistente; (3) SMTP para los emails.

| Pieza | Servicio gratuito | Notas |
|---|---|---|
| Proceso Node | [Render](https://render.com) Web Service (Docker) | Se duerme tras 15 min sin tráfico → necesita pinger |
| Redis | [Upstash](https://upstash.com) | Persistente; solo base 0 y TLS (`rediss://`) |
| Mantener despierto | UptimeRobot o cron-job.org | `GET /api/status` cada 5 min (a la vez da alertas) |
| Email | Gmail + contraseña de aplicación | O dejar `MAIL_ENABLED=false` |

## Pasos
### 1. Redis en Upstash
1. Crea una base **Redis** (plan gratuito) en la región más cercana (p. ej. Frankfurt).
2. Copia la URL TLS: `rediss://default:PASSWORD@HOST:6379`.

### 2. API en Render
1. Sube el repo a GitHub (ya está). En Render: **New → Blueprint** y elige este repo; detectará `render.yaml` (si prefieres a mano: **New → Web Service**, runtime *Docker*, plan *Free*, health check `/api/status`).
   - **Rama**: elige una que contenga el scraper 2026 (v1.1.0 o posterior). Siguiendo gitflow, eso significa `develop` hasta que hagas la release a `master`; si despliegas `master` antes, ejecutará el scraper antiguo (v1.0.2), que no trata bien la web 2026. El `render.yaml` no fija la rama a propósito.
2. Rellena las variables marcadas `sync: false`:
   - `REDIS_URL` → la URL de Upstash.
   - `MAIL_USER`, `MAIL_PASS`, `MAIL_TO`, `FRONTEND_URL` (o déjalas vacías si dejas el correo desactivado).
3. Despliega. En los logs deberías ver `Redis conectado correctamente`, `Catálogo vacío: scrapeo inicial` y `Scrapeo completado`.
4. Comprueba: `https://TU-SERVICIO.onrender.com/api/status` y `/api/comercios/status`.

Variables importantes (detalle en [OPERATIONS.md](OPERATIONS.md)):
- `NODE_ENV=prod` → usa la base 0 de Redis (Upstash no tiene más). Con `dev`/`staging` el cliente selecciona otra base (1 o 2), que Upstash no ofrece, y puede fallar.
- `TRUST_PROXY=1` → sin esto el rate limit ve la IP del proxy de Render y **todos los usuarios comparten el mismo límite** (120/min).
- `REDIS_NAMESPACE=bonos2026` → separa los datos de cada edición.

### 3. Pinger (imprescindible en el plan gratuito)
Render duerme el servicio tras 15 min sin tráfico y, al dormir, el cron deja de ejecutarse. Crea un monitor HTTP gratuito que haga `GET https://TU-SERVICIO.onrender.com/api/status` **cada 5 minutos**. Con eso el servicio no llega a dormirse y el cron sigue su ritmo.

### 4. Conectar el front
En el repo del front cambia `apiBaseUrl` en `src/environments/environment.prod.ts` y `environment.test.ts` (y los `mock.*` si se usan) por `https://TU-SERVICIO.onrender.com`, y vuelve a desplegar.

### 5. Emails (opcional)
En la cuenta de Google activa la verificación en dos pasos y crea una **contraseña de aplicación**. En Render: `MAIL_ENABLED=true`, `MAIL_USER` (tu Gmail), `MAIL_PASS` (la contraseña de aplicación), `MAIL_TO` (destinatario). El arranque loguea `SMTP verificado correctamente` si va bien.

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
| 0 comercios | Mira logs `SCRAPER`/`CRON`; lanza `POST /api/comercios/force-scrape` |
| Email enorme tras cambiar de edición | Reutilizaste el namespace de Redis: usa uno nuevo |
