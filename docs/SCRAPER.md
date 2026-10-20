# Scraper (`src/scraper/index.js`)

Es la pieza más frágil: depende del HTML de la web oficial. Si el Ayuntamiento/organizador cambia la web (algo probable entre ediciones), hay que rehacer los selectores.

## Qué hace
1. Parte de `BASE_URL = http://bonoscastellodelaplana.es/establecimientos-adheridos-al-programa`.
2. `scrapePage(url)`: GET con `User-Agent: Mozilla/5.0`, carga el HTML en cheerio.
3. Cada comercio es un `.col-sm-12.col-md-6.col-xxl-4` que contiene una tabla:

| Campo | Selector dentro de la tarjeta |
|---|---|
| `name` | primer `td strong` |
| `sector` | `tr:nth-child(2) td:nth-child(2)` |
| `phone` | `tr:nth-child(3) td:nth-child(2)` |
| `address` | `tr:nth-child(4) td:nth-child(2)` |
| `img` | `img[src]`, reemplazando `../../` por `http://bonoscastellodelaplana.es/` |
| `mapsUrl` | `href` del primer `a` |

   Todos los textos pasan por `cleanText` (colapsa espacios). Solo se añade si `name` no está vacío.
4. Paginación: busca `a.page-link` cuyo texto incluya "Siguiente"; si `href` no es `#`, lo sigue (absoluto, o `BASE_URL/<href sin / inicial>`). Bucle hasta que no haya siguiente.
5. Devuelve el array completo de comercios.

No hay timeout, reintentos ni pausa entre páginas, y un fallo HTTP en cualquier página lanza excepción (aborta todo el scrapeo; `runScrape` lo captura y no toca Redis).

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

## Verificado / no verificado
El análisis de este documento se hizo leyendo el código; **no se ha podido contrastar contra la web real** (sin acceso de red en la sesión de documentación). Verifica los selectores contra la web 2026.
