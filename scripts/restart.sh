#!/bin/bash
# ==================================================
# ♻️  Restart Castellón Comercios API (Docker)
# ==================================================

set -e

echo "🔄 Reiniciando contenedores de Castellón Comercios API..."

# Ir al directorio del proyecto
cd "$(dirname "$0")/.." || exit 1

# Detener los contenedores (sin eliminar datos)
docker compose down

# Iniciar nuevamente en modo background
docker compose up -d

echo "✅ Aplicación reiniciada correctamente."
docker compose ps
