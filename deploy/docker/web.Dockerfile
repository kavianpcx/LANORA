FROM node:24.22.1-alpine AS web-build
WORKDIR /src
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci
COPY apps/web/index.html apps/web/vite.config.ts apps/web/tsconfig.json ./
COPY apps/web/src ./src
COPY apps/web/public ./public
ARG VITE_BASE_PATH=/
ENV VITE_BASE_PATH=${VITE_BASE_PATH}
RUN npm run build

FROM caddy:2.11.9-alpine
COPY deploy/docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=web-build /src/dist /srv
