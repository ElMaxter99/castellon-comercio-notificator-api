# Guía para retomar el proyecto en la edición 2027

> **Cómo usarla con Claude:** abre una sesión con los dos repos (`castellon-comercio-notificator-api` y `…-front`) y di: *«Sigue `docs/EDICION-2027.md` del repo API: ha empezado la edición 2027»*. Claude debe hacer primero la parte del API y después la del front ([`docs/EDICION-2027.md` del front](https://github.com/ElMaxter99/castellon-comercio-notificator-front/blob/develop/docs/EDICION-2027.md)).
>
> Este documento sustituye como punto de partida a [`REUSE-2026.md`](REUSE-2026.md) (que sigue siendo la checklist general de la edición 2026 y su histórico de mejoras).

---

## 1. Dónde lo dejamos (nov-2026)

| Pieza | Estado |
|---|---|
| **API** | v2.10.0 en `master`. **Desplegada en Render en `MOCK_MODE=true`**: sirve 32 comercios ficticios («… DEMO»), sin Redis, scrapeo ni correo. `GET /api/comercios/status` devuelve `"mode":"mock"`. |
| **Front** | v2.14.0 en `master`. Con el API en mock, la edición 2026 muestra el aviso naranja «Datos de demostración… La edición 2027 llegará en cuanto se abra la campaña». La 2025 sigue siendo siempre demo. |
| **Datos reales de 2026** | Siguen **intactos en Upstash/Redis** (no se borra nada al activar el mock), bajo las claves `<NODE_ENV>:<REDIS_NAMESPACE>:comercios`, `:history`, `:sectors` y `:last-update` (en Render `NODE_ENV` vale `production`; el namespace es el de la variable `REDIS_NAMESPACE`: mira su valor en Render, `render.yaml` sugiere `bonos2026`). |
| **Web oficial** | A finales de nov-2026 anunciaba «BONOS AGOTADOS» y en oct-2026 tuvo una parada técnica temporal (el listado devolvía 404 y la portada decía «Campaña paralizada temporalmente»). |
| **Tags** | Los sube una persona (el sandbox de Claude no puede). Últimos: API `v2.10.0`, front `v2.14.0`. |

### Hazlo ya (antes de olvidarlo): copia de seguridad de los datos 2026
En 2027 se usará otro namespace, pero conviene tener los datos de 2026 fuera de Redis por si el plan gratuito de Upstash se archiva. Con el `REDIS_URL` de Upstash:

```bash
NS=bonos2026   # el REDIS_NAMESPACE real de Render
for k in comercios history sectors last-update; do
  redis-cli -u "$REDIS_URL" --raw GET "production:$NS:$k" > "backup-2026-$k.json"
done
```
(También se puede hacer desde la consola web de Upstash.) Guarda los ficheros **fuera del repo** (contienen datos reales del programa; las capturas y mocks del repo son siempre ficticios).

---

## 2. ¿Ha empezado 2027? Señales
- La web [bonoscastellodelaplana.es](https://bonoscastellodelaplana.es) vuelve a mostrar el listado de establecimientos adheridos (ya no «BONOS AGOTADOS»/campaña cerrada), con comercios nuevos.
- La URL del listado puede haber cambiado de sitio. Compruébala **antes** de tocar nada:
  ```bash
  curl -s -o /dev/null -w "%{http_code}\n" -A "ComercioCastellonNotificator/dev" \
    https://bonoscastellodelaplana.es/establecimientos-adheridos-al-programa
  ```
- Mira también si hay cambios en las bases/condiciones (puede afectar a la privacidad o a los textos del front).

---

## 3. Parte API (hacer primero)

### 3.1 Preparar la rama
1. `git checkout develop && git pull` → rama `feature/edicion-2027` (gitflow; `master` solo recibe releases).
2. `npm ci` (el lock está versionado; con npm ≥ 11 si vas a cambiar dependencias) y `npm test` (deben pasar todos).
3. Dependencias e imagen: `npm audit`, subir lo que toque (Dependabot habrá dejado PRs) y revisar la imagen Node del `Dockerfile` (`node:26.x-trixie-slim` en 2026). Si cambias `dependencies`, regenera `package-lock.json` en el mismo PR (el CI usa `npm ci`).

### 3.2 Comprobar el scraper contra la web real (lo más frágil)
1. `node -e 'require("./src/scraper").scrapeComercios().then(r=>{console.log(r.length);console.log(r.slice(0,3))})'` (no necesita Redis ni cron; con `MOCK_MODE` sin definir).
2. Si devuelve 0 o falla, la web cambió: sigue [`SCRAPER.md`](SCRAPER.md) («Cómo repararlo si la web cambia»). Actualiza primero `test/fixtures/*.html` con páginas reales **ficticias/anonimizadas** (no subas datos reales) y arregla selectores hasta que `npm test` pase.
3. Comprobar que cada comercio sigue trayendo `mapsUrl` con `query=lat,lng` (el mapa del front depende de ello; los comercios sin coordenadas, hoy ~3 %, se muestran en lista pero sin pin).
4. Si el HTML es ahora una SPA o un JSON, valorar cambiar cheerio por llamadas al JSON.
5. `BASE_URL` en `src/scraper/index.js` es la única URL fuente. La web enlaza con `http://`: el scraper fuerza https.

### 3.3 Textos y plantilla con «2026»
Buscar y actualizar: `grep -rniE "2026|abonem" src README.md docs render.yaml .env.example` — plantilla del correo (`src/templates/updateEmail.html`), remitente, comentarios y `package.json`. El nombre del programa puede cambiar.

### 3.4 Pasar de mock a datos reales (en Render)
1. **Namespace nuevo**: `REDIS_NAMESPACE=bonos2027`. Si no, el primer scrapeo se compara con el catálogo 2026 y genera cientos de altas/bajas y un correo enorme (trampa 3 de `CLAUDE.md`).
2. Quitar `MOCK_MODE` (borrar la variable o `false`) y quitarlo también de `render.yaml`.
3. Revisar: `SCRAPE_CRON` (frecuencia; mínimo 5 min; sé amable con la web), `SCRAPER_USER_AGENT` (con un contacto), `MAIL_ENABLED`/`MAIL_TO`/`MAIL_FROM` (Resend; el dominio verificado), `FRONTEND_URL`, `FORCE_SCRAPE_TOKEN`, `TRUST_PROXY=1`.
4. Redesplegar. El primer arranque, con Redis vacío, hace un **scrapeo inicial sin enviar correo**. Comprobar:
   ```bash
   curl https://<api>/api/comercios/status   # "mode":"live", total > 0
   curl https://<api>/api/health             # 200
   ```
   y en el log: `Cron programado: …`, `User-Agent del scraper: …` y sin errores de Redis.
5. Monitor externo (UptimeRobot) sobre `/api/health`; si el cron no se completa, da 503 pasados unos minutos.
6. Si la web vuelve a dar problemas (mantenimiento, 404), el catálogo guardado se conserva (trampa 3) y `/api/health` avisará. Si el programa vuelve a cerrar, `MOCK_MODE=true` devuelve el estado de este documento.

### 3.5 Cierre de la parte API
`CHANGELOG.md` + `version` en `package.json`, PR a `develop`, release PR `develop → master` («Merge branch 'develop' into master (release vX.Y.Z)») y tag manual.

---

## 4. Parte front
Ver [`docs/EDICION-2027.md` del front](https://github.com/ElMaxter99/castellon-comercio-notificator-front/blob/develop/docs/EDICION-2027.md): decidir qué pasa con `/2026`, crear `/2027`, textos, privacidad, capturas y despliegue.

---

## 5. Lo que aprendimos en 2026 (para no repetirlo)
- **Redis gestionado (Upstash/Render Key Value) solo tiene la base 0**: la API elige la base con `REDIS_DB`/`REDIS_URL` (v2.4.1). Antes daba `ERR DB index is out of range`.
- **Render gratis duerme el servicio** (arranque en frío de hasta ~1 min): el front reintenta y avisa («despertando…»); no es un fallo.
- **El diff es por nombre normalizado**, y empareja homónimos por dirección. Un comercio cuyo sector, teléfono, dirección o mapa cambia se registra como «modificado» (no genera correo).
- **Dos scrapeos no se solapan** (candado): `force-scrape` responde 409 si ya hay uno.
- **Scraping responsable**: `User-Agent` descriptivo con contacto, frecuencia razonable y aviso previo a la organización (se les escribió en oct-2026).
- **Un 0 comercios nunca vacía el catálogo.** Una web caída o en mantenimiento es normal (pasó en oct-2026).
- **No subas datos reales** a tests, capturas ni mocks: todo debe ser ficticio.
- **Los tags y los merges los hace una persona**; Claude solo prepara PRs y releases.

## 6. Ideas aparcadas (backlog)
**API**
- Notificar **bajas** y modificaciones por correo (hoy solo altas; la plantilla ya tiene `removedSection`).
- Ampliar la guarda de scrapeo vacío a «caídas > 50 %» y añadir una pausa entre páginas.
- Acotar CORS al dominio del front.
- Guardar el histórico en una lista de Redis en vez de un único JSON.

**Front** (ramas ya hechas, **sin mergear**, que siguen en el remoto del repo del front)
- `claude/modificaciones-ui` — Novedades muestra los comercios «actualizados» (`modified` del API ≥ 2.8; hoy el front no los pinta).
- `claude/accesibilidad` — saltar al contenido, foco por página, `aria-label` con el nombre del comercio, Esc en la leyenda y contraste.
- `claude/pwa` — instalable y con modo sin conexión (`@angular/service-worker`).
- `claude/lockfile` — versionar `package-lock.json` y `npm ci` en el CI.
Rebasarlas sobre `develop` y reabrir las PR cuando se quiera (chocan en `CHANGELOG.md`/`package.json`).

## 7. Checklist final de lanzamiento
- [ ] Copia de seguridad de los datos 2026 hecha (§1).
- [ ] Scraper verificado contra la web real y tests en verde (§3.2).
- [ ] `REDIS_NAMESPACE` nuevo, `MOCK_MODE` fuera, API desplegada y `mode: "live"` (§3.4).
- [ ] Front 2027 desplegado, aviso de demo retirado, privacidad y metadatos al día.
- [ ] UptimeRobot activo, correo de avisos probado.
- [ ] Releases a `master` y tags subidos en ambos repos.
