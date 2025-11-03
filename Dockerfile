# ==========
# Base
# ==========
FROM node:22.12.0

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

EXPOSE 12001

ENV PORT=12001

CMD ["npm", "start"]
