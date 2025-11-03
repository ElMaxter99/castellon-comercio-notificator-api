#!/bin/bash
# ==================================================
# 🚀 Redeploy Castellón Comercios API (Docker)
# ==================================================
# Este script:
# 1️⃣ Detiene y elimina contenedores antiguos
# 2️⃣ Reconstruye la imagen de la app
# 3️⃣ Levanta todo con el nuevo código
# 4️⃣ Mantiene los datos persistentes de Redis
# ==================================================

set -e

echo "♻️  Redeploy Castellón Comercios API iniciado..."

# Ir al directorio del proyecto
cd "$(dirname "$0")/.." || exit 1

# 1️⃣ Detener contenedores actuales
echo "🛑 Deteniendo contenedores..."
docker compose down

# 2️⃣ Reconstruir imagen (sin usar caché)
echo "🔧 Reconstruyendo imagen Docker..."
docker compose build --no-cache

# 3️⃣ Levantar todo de nuevo
echo "🚀 Levantando nueva versión..."
docker compose up -d

# 4️⃣ Mostrar estado final
echo "✅ Redeploy completado con éxito."
docker compose ps
