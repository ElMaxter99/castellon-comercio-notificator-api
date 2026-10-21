# Referencia del API

Base: `http://localhost:12001` en local; producción 2025: `https://bcc-api.alvaromaxter.es`.
CORS abierto (`*`). Rate limit por defecto: 120 peticiones/min/IP → `429 {"ok":false,"error":"Too many requests, please try again later."}`.

## `GET /api/status`
Healthcheck general.
```json
{ "ok": true, "redis": "PONG", "message": "API running" }
```
Error de Redis: `500 {"ok":false,"error":"Redis unreachable"}`.

## `GET /api/comercios`
Todos los comercios guardados (`[]` si Redis está vacío).
```json
[{
  "name": "Panadería San Blas",
  "sector": "Alimentación",
  "phone": "964 123 456",
  "address": "C/ Mayor, 12",
  "img": "https://bonoscastellodelaplana.es/imagenes/usuariosWeb/panaderia.jpg",
  "mapsUrl": "https://www.google.com/maps/search/?api=1&query=39.98,-0.03"
}]
```
> `mapsUrl` **debe** contener `query=lat,lng` para que el front pueda pintar el marcador en el mapa.

## `GET /api/comercios/status`
```json
{ "environment": "prod", "total": 248, "lastUpdate": "2025-11-03T14:55:22.134Z" }
```
`lastUpdate` es `null` si nunca se ha scrapeado. (El front asume string; ver docs del front.)

## `GET /api/comercios/history`
Más reciente primero. Solo nombres, no objetos completos.
```json
[{ "timestamp": "2025-11-03T14:55:22.000Z", "added": ["Librería Roma"], "removed": ["Bar Pepe"], "countAfter": 248 }]
```

## `GET /api/comercios/filter?name=&sector=`
Filtro `includes` insensible a mayúsculas (sin normalizar acentos). Ambos opcionales; si no son `string` → `400`. (El front actual **no** usa este endpoint: filtra en cliente.)

## `GET /api/comercios/sectors`
`["Alimentación", "Moda", ...]` (catálogo reconstruido en cada cambio).

## `POST /api/comercios/force-scrape` 🔒
Ejecuta un scrapeo ahora y responde cuando termina. **Requiere token**: `Authorization: Bearer $FORCE_SCRAPE_TOKEN`. Si `FORCE_SCRAPE_TOKEN` no está definido en el servidor, la ruta queda **deshabilitada** (403): es seguro por defecto.

```bash
curl -X POST -H "Authorization: Bearer $FORCE_SCRAPE_TOKEN" https://TU-API/api/comercios/force-scrape
```

| Resultado | HTTP | Cuerpo |
|---|---|---|
| Scrapeo correcto | 200 | `{ "ok": true, "changed": false, "total": 70, "added": 0, "removed": 0, "message": "Scrapeo manual completado." }` |
| Ya hay un scrapeo en curso (cron u otra llamada) | 409 | `{ "ok": false, "error": "Ya hay un scrapeo en curso" }` |
| El scrapeo falla o devuelve 0 comercios | 502 | `{ "ok": false, "error": "..." }` (el catálogo anterior se conserva) |
| Token ausente o incorrecto | 401 | `{ "ok": false, "error": "Token inválido o ausente." }` |
| `FORCE_SCRAPE_TOKEN` sin definir | 403 | `{ "ok": false, "error": "Ruta deshabilitada: ..." }` |

## `GET /api/health`
Salud para **monitores externos** (UptimeRobot, etc.). Devuelve `503` si Redis falla o si los datos llevan más de `HEALTH_MAX_AGE_MINUTES` (15 por defecto; si cambias `SCRAPE_CRON`, se deduce de la frecuencia) sin actualizarse, es decir, si el cron no está corriendo o el scrapeo no se completa. Tras un arranque hay 6 minutos de gracia (el cron tarda hasta 5 min en su primer tick).
```json
{ "ok": true, "redis": "PONG", "lastUpdate": "2026-10-20T13:50:03.781Z", "ageMinutes": 1.2, "maxAgeMinutes": 15 }
```
Con datos obsoletos: `503` y `"ok": false` con un campo `error`. A diferencia de `/api/status` (solo comprueba que el proceso y Redis responden), este detecta que **los datos están parados**.
