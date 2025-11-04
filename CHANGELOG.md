# Changelog
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
