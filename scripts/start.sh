#!/bin/bash
set -e

echo "🚀 Iniciando Castellón Comercios API..."
docker compose up -d

echo "✅ App levantada."
docker ps --filter "name=castellon"
