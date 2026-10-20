# Changelog

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
