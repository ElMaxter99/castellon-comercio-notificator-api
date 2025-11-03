# ==========
# Base
# ==========
FROM node:22.12.0

# Directorio de trabajo
WORKDIR /usr/src/app

# Copiamos solo package.json primero
COPY package*.json ./

# Instalamos dependencias (solo las de producción)
RUN npm install --omit=dev

# Copiamos el resto del código SIN borrar node_modules
COPY . .

# Exponemos puerto
EXPOSE 12001

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=12001

# Arranque de la app
CMD ["npm", "start"]
