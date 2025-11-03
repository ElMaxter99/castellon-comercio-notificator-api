# 🏙️ Castellón Comercio Notificator API

API automatizada que monitoriza los **comercios adheridos** al programa de bonos del Ayuntamiento de Castellón.  
Se encarga de **scrapear periódicamente** la web oficial, **detectar cambios**, **enviar notificaciones por correo** y **mantener un histórico completo de actualizaciones**.

---

## 🚀 Características principales

- 🔁 Scrapeo automático cada 5 minutos (configurable con `cron`)
- 💾 Almacenamiento en **Redis** (con separación por entorno)
- 🕒 Histórico completo de cambios (comercios añadidos o eliminados)
- ✉️ Notificaciones automáticas por email cuando hay diferencias
- 📦 API REST para consultar:
  - Comercios actuales
  - Estado del sistema
  - Histórico completo de actualizaciones
  - Forzar un nuevo scrapeo manualmente

---

## 🧩 Requisitos

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- (Opcional) Node.js ≥ 22.12.0 si deseas ejecutarlo sin Docker

---

## ⚙️ Variables de entorno (`.env`)

Ejemplo de configuración:

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
*Si usas Gmail, debes generar una App Password (no usar la contraseña normal).

## 🐳 Ejecución con Docker Compose

Construir y arrancar:
```bash
docker compose up --build
```

Detener y limpiar:
```bash
docker compose down -v
```


## 🌐 Endpoints disponibles

### 1️⃣ GET /api/comercios
Devuelve todos los comercios actuales almacenados en Redis.

Ejemplo de respuesta:
```json
[
  {
    "name": "Panadería San Blas",
    "sector": "Alimentación",
    "phone": "964 123 456",
    "address": "C/ Mayor, 12",
    "img": "http://bonoscastellodelaplana.es/uploads/panaderia.jpg",
    "mapsUrl": "https://goo.gl/maps/xxxx"
  },
  ...
]

```

### 2️⃣ GET /api/comercios/status
Devuelve información sobre el estado del sistema y la última actualización.

Ejemplo de respuesta:
```json
{
  "environment": "staging",
  "total": 248,
  "lastUpdate": "2025-11-03T14:55:22.134Z"
}

```

### 3️⃣ GET /api/comercios/history
Devuelve todos los comercios actuales almacenados en Redis.

Ejemplo de respuesta:
```json
[
  {
    "timestamp": "2025-11-03T14:55:22.000Z",
    "added": ["Librería Roma", "Zapatería Central"],
    "removed": ["Bar Pepe"],
    "countAfter": 248
  },
  {
    "timestamp": "2025-11-02T18:00:01.000Z",
    "added": ["Floristería Sol"],
    "removed": [],
    "countAfter": 246
  }
]

```

### 4️⃣ POST /api/comercios/force-scrape
Fuerza un scrapeo manual inmediato, sin esperar al cron automático.

Ejemplo de respuesta:
```json
{
  "ok": true,
  "message": "Scrapeo manual completado."
}


```