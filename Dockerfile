FROM node:22-alpine

WORKDIR /app

# Instalar dependencias de compilación para Better-SQLite3 si son necesarias
RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm install

COPY . .

# Directorio persistente para la base de datos SQLite
RUN mkdir -p /app/data

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production
ENV DB_PATH=/app/data/gastos.db

CMD ["node", "src/server.js"]
