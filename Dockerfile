# Imagen base
FROM node:22.12.0

# Crear directorio de la app
WORKDIR /usr/src/app

# Copiar archivos
COPY package*.json ./

# Instalar dependencias
RUN npm ci --omit=dev

# Copiar el resto del código
COPY . .

# Exponer el puerto configurado
EXPOSE 12001

# Comando de inicio
CMD ["npm", "start"]
