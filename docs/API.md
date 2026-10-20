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

## `POST /api/comercios/force-scrape`
Ejecuta `runScrape(true)` y responde cuando termina:
```json
{ "ok": true, "message": "Scrapeo manual completado." }
```
**Sin autenticación.** Como `runScrape` captura sus errores, casi siempre responde `ok: true` aunque el scrapeo haya fallado (mirar logs). Protegerlo antes de exponerlo (ver `REUSE-2026.md`).

```bash
curl -X POST http://localhost:12001/api/comercios/force-scrape
```
