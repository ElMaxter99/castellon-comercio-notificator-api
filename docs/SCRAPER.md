# Scraper (`src/scraper/index.js`)

Es la pieza más frágil: depende del HTML de la web oficial. Si el Ayuntamiento/organizador cambia la web (algo probable entre ediciones), hay que rehacer los selectores.

## Qué hace
1. Parte de `BASE_URL = https://bonoscastellodelaplana.es/establecimientos-adheridos-al-programa` (la web 2026 sirve https; sus enlaces internos siguen siendo `http://`, por eso se fuerzan a https).
2. `scrapePage(url)`: GET con `User-Agent: Mozilla/5.0`, timeout 20 s y 2 reintentos, carga el HTML en cheerio.
3. Cada comercio es un `.col-sm-12.col-md-6.col-xxl-4` que contiene una tabla:

| Campo | Selector dentro de la tarjeta |
|---|---|
| `name` | primer `td strong` |
| `sector` | `tr:nth-child(2) td:nth-child(2)` |
| `phone` | `tr:nth-child(3) td:nth-child(2)` |
| `address` | `tr:nth-child(4) td:nth-child(2)`, quitando el sufijo `CASTELLÓ DE LA PLANA / CASTELLÓN DE LA PLANA, COMUNITAT VALENCIANA, CP, ESPAÑA` (`cleanAddress`) |
| `img` | `img[src]` resuelto contra la web (`../../imagenes/...` → `https://bonoscastellodelaplana.es/imagenes/...`) |
| `mapsUrl` | `href` del `a.card`: `https://www.google.com/maps/search/?api=1&query=lat,lng` |

   Todos los textos pasan por `cleanText` (colapsa espacios). Solo se añade si `name` no está vacío.
4. Paginación: busca `a.page-link` cuyo texto incluya "Siguiente"; si `href` no es `#`, lo sigue (`/pagina2`, `/pagina3`…). Termina cuando no hay siguiente, y tiene guardas ante bucles (URL repetida o más de 200 páginas).
5. Devuelve el array completo de comercios.

Un fallo HTTP persistente en cualquier página lanza excepción (aborta todo el scrapeo; `runScrape` lo captura y no toca Redis). Si el scrapeo devuelve 0 comercios, `runScrape` lo trata como error y conserva el catálogo.

## Saneado de coordenadas (`src/utils/geo.js`)
La web oficial geocodifica mal a algunos comercios (p. ej. una avenida de Castelló situada en Alicante) y contiene alguna entrada ajena. Un solo punto lejano rompe el mapa del front, así que tras el scrapeo se aplica:
- **Dentro de la zona** (30 km alrededor de Castelló, configurable con `GEO_*`) → sin cambios.
- **Fuera de la zona** → se sustituye `mapsUrl` por una búsqueda de Google Maps por dirección (`…/maps/search/?api=1&query=<dirección>, Castelló de la Plana`). El comercio sigue en la lista, "Cómo llegar" funciona y el front simplemente no dibuja su marcador (no hay `lat,lng`).
- **Fuera de la zona y con código postal de otra provincia** (distinto de `12xxx`) → se **excluye** del catálogo (p. ej. el proveedor de la web, en León).
Los casos corregidos y excluidos se registran en un `WARN` `[SCRAPER]` con su distancia. Con los datos del 20-oct-2026: 3 corregidos y 1 excluido de 71.

## Cómo repararlo si la web cambia
1. Descargar una página real: `curl -s -A "Mozilla/5.0" "<URL>" > /tmp/page.html` y abrirla.
2. Localizar el contenedor repetido de cada comercio y actualizar el selector de `$(".col-...")`.
3. Actualizar los selectores de campo y la lógica del enlace "Siguiente".
4. Probar sin Redis ni cron:
   ```bash
   node -e 'require("./src/scraper").scrapeComercios().then(r=>{console.log(r.length);console.log(r.slice(0,3))})'
   ```
5. Comprobar que `mapsUrl` sigue trayendo `query=lat,lng` (el front lo necesita para el mapa). Si el nuevo enlace es otro formato (p. ej. `/@lat,lng` o `q=`), adaptar `extractCoordinates` en el front (`commerce-map.component.ts`) o normalizar `mapsUrl` aquí.
6. Antes de dejar el cron en marcha con datos nuevos, vaciar/respaldar Redis si el formato de `name` cambió: el diff es por nombre y generaría cientos de altas/bajas y un email enorme.

## Estructura verificada (20-oct-2026, edición 2026)
Comprobado contra la web real: 3 páginas (20 + 20 + 19 → **59 comercios**), 13 sectores en uso (el desplegable de la web lista 18), todos con teléfono, imagen y `mapsUrl` con `query=lat,lng`. Cada tarjeta es una tabla de 4 filas (nombre, sector, teléfono, dirección); no hay indicador de disponibilidad en la tarjeta (la web tiene un filtro "solo disponibles" que guarda el filtro en **sesión** vía POST; el scraper no lo usa).
Particularidades: el sector llega con el nombre largo oficial (p. ej. "Tecnología, informática, electrónica y electrodomésticos"); alguna dirección viene irregular y puede conservar texto extra.

Probar contra la web real:
```bash
node -e 'require("./src/scraper").scrapeComercios().then(r=>console.log(r.length))'
```
