# 🏙️ Castellón Comercio Notificator API

## 🌟 Finalidad del proyecto
Proyecto independiente sin ánimo de lucro. Esta aplicación nace por amor al arte para ofrecer una perspectiva alternativa, positiva y centrada en los comercios adheridos al programa oficial. Los datos se obtienen de la iniciativa municipal disponible en [bonoscastellodelaplana.es](https://bonoscastellodelaplana.es) y se muestran aquí sin ningún fin comercial.

El servicio se encarga de monitorizar periódicamente la web oficial de bonos municipales, detectar cambios, almacenar el histórico en Redis y disparar notificaciones cuando aparecen nuevas altas o bajas en el listado de comercios.

---

## 📚 Documentación para desarrolladores (y para Claude)
- [`CLAUDE.md`](CLAUDE.md) · [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/API.md`](docs/API.md) · [`docs/SCRAPER.md`](docs/SCRAPER.md) · [`docs/OPERATIONS.md`](docs/OPERATIONS.md) · [`docs/REUSE-2026.md`](docs/REUSE-2026.md)
- Frontend: [castellon-comercio-notificator-front](https://github.com/ElMaxter99/castellon-comercio-notificator-front)

---

## 🚀 Características principales
- 🔁 Scrapeo automático y programable mediante `cron`.
- 💾 Almacenamiento en **Redis** con separación por entorno (`dev`, `staging`, `prod`).
- 🕒 Histórico completo de altas/bajas para auditar la evolución del programa.
- ✉️ Notificaciones automáticas por correo electrónico cuando se detectan cambios.
- 📦 API REST para consultar el estado del sistema, los comercios vigentes y el histórico de variaciones.

---

## 🧱 Arquitectura
| Componente | Descripción |
|------------|-------------|
| **Express API** | Expone endpoints REST `/api/comercios/**` para consumo externo. |
| **Scraper (cron)** | Tarea programada que visita la web oficial, parsea con `cheerio` y normaliza los datos. |
| **Redis** | Cachea la información actual y guarda snapshots históricos. |
| **Mailer** | Notifica por SMTP cuando se detectan diferencias entre ejecuciones consecutivas. |

---

## ⚙️ Configuración de entorno
Crea un archivo `.env` en la raíz del proyecto con valores similares a:

```bash
# App
NODE_ENV=dev
PORT=12001

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_NAMESPACE=bonos
REDIS_PASSWORD=supersecurepass

# Correo (SMTP)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_SECURE=true
MAIL_USER=tuemail@gmail.com
MAIL_PASS=app_password_generado
MAIL_TO=destinatario@gmail.com
MAIL_ENABLED=true

# URL del frontend (opcional)
FRONTEND_URL=http://localhost:4200
```
> 💡 Si utilizas Gmail, genera una contraseña de aplicación; no uses la contraseña habitual.

---

## 🐳 Puesta en marcha con Docker Compose
```bash
docker compose up --build
```
Esto levantará el API, Redis y ejecutará el cron de scrapeo en segundo plano.

Para detener y limpiar los contenedores:
```bash
docker compose down -v
```

---

## 🧪 Ejecución local sin Docker
1. Asegúrate de tener **Node.js ≥ 22.12.0** y **Redis** accesible.
2. Instala dependencias:
   ```bash
   npm install
   ```
3. Arranca el servicio:
   ```bash
   npm start
   ```

---

## 🌐 Uso de la API
Todas las rutas están prefijadas con `/api/comercios`.

### 1️⃣ `GET /api/comercios`
Devuelve el listado actual de comercios disponibles.

**Ejemplo de respuesta**
```json
[
  {
    "name": "Panadería San Blas",
    "sector": "Alimentación",
    "phone": "964 123 456",
    "address": "C/ Mayor, 12",
    "img": "https://bonoscastellodelaplana.es/uploads/panaderia.jpg",
    "mapsUrl": "https://goo.gl/maps/xxxx"
  }
]
```

### 2️⃣ `GET /api/comercios/status`
Informa sobre el entorno activo, el número de comercios y la fecha del último scrapeo.

**Ejemplo de respuesta**
```json
{
  "environment": "staging",
  "total": 248,
  "lastUpdate": "2025-11-03T14:55:22.134Z"
}
```

### 3️⃣ `GET /api/comercios/history`
Devuelve el histórico completo de diferencias detectadas entre ejecuciones.

**Ejemplo de respuesta**
```json
[
  {
    "timestamp": "2025-11-03T14:55:22.000Z",
    "added": ["Librería Roma", "Zapatería Central"],
    "removed": ["Bar Pepe"],
    "countAfter": 248
  }
]
```

### 4️⃣ `POST /api/comercios/force-scrape`
Fuerza un nuevo scrapeo manual inmediato sin esperar al cron.

**Ejemplo de respuesta**
```json
{
  "ok": true,
  "message": "Scrapeo manual completado."
}
```

**Notas**
- El endpoint requiere que el proceso de scraper esté habilitado.
- Se recomienda proteger esta ruta tras autenticación o mediante token si se expone públicamente.

---

## 🛡️ Buenas prácticas y recomendaciones
- Ejecutar el cron en intervalos razonables para no sobrecargar la web origen.
- Configurar alertas en caso de errores de conexión a Redis o de envío SMTP.
- Asegurar el despliegue tras HTTPS y restringir IPs si se expone a Internet.
- Mantener actualizadas las dependencias y revisar los logs rotativos generados por `rotating-file-stream`.

---

## 🤝 Contribuciones
¡Las sugerencias son bienvenidas! Abre un issue o una pull request con tu propuesta.

---

## 📝 Licencia
Uso exclusivamente informativo y sin fines comerciales. Respeta siempre las condiciones de uso de los datos oficiales del Ayuntamiento de Castellón.
