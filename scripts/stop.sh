#!/bin/bash
set -e

echo "🧱 Deteniendo Castellón Comercios API..."
docker compose down

echo "🧹 Contenedores detenidos."
docker ps --filter "name=castellon"
