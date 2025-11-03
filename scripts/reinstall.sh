#!/bin/bash
set -e

echo "💣 Eliminando completamente el stack de Castellón Comercios API..."

# Elimina contenedores, volúmenes e imágenes solo de este compose
docker compose down -v --rmi all

echo "🧱 Reconstruyendo app desde cero..."
docker compose build --no-cache
docker compose up -d

echo "✅ Reinstalación completa."
docker ps --filter "name=castellon"
