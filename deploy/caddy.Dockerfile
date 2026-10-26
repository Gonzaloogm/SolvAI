# Build the React app, then serve it with Caddy (which also terminates HTTPS and proxies /api)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# No VITE_API_BASE_URL: the app calls the API on the same origin under /api
RUN npm run build

FROM caddy:2.8-alpine
COPY --from=build /app/dist /srv
