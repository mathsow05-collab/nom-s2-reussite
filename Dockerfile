# ---- Étape 1 : build du frontend React (Vite) ----
FROM node:20-alpine AS build
WORKDIR /app
COPY client/package*.json client/
RUN cd client && npm install --no-audit --no-fund
COPY client client
RUN cd client && npm run build

# ---- Étape 2 : serveur de production ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Outils de compilation au cas où better-sqlite3 doive compiler pour musl
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY server server
COPY scripts scripts
COPY --from=build /app/client/dist client/dist
RUN mkdir -p uploads/maths uploads/physique-chimie uploads/francais uploads/histoire-geographie uploads/metiers data
EXPOSE 3000
USER node
CMD ["node", "server/index.js"]
