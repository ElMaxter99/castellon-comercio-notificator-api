# ==========
# Base
# ==========
FROM node:26.12.0-trixie-slim

# Directorio de trabajo
WORKDIR /usr/src/app

# Copiamos solo package.json y package-lock.json primero (caché de capas)
COPY package*.json ./

# Instalamos exactamente lo del lock (solo las de producción)
RUN npm ci --omit=dev

# Copiamos el resto del código SIN borrar node_modules
COPY . .

# Exponemos puerto
EXPOSE 12001

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=12001

# Arranque de la app
CMD ["npm", "start"]
