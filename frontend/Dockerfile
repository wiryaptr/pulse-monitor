# Tahap 1: build file statis
FROM docker.io/library/node:22-slim@sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Alamat API yang dilihat browser. /api berarti lewat proxy Caddy di image ini (lihat Caddyfile).
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Tahap 2: Caddy menyajikan file statis dan meneruskan /api ke backend
FROM docker.io/library/caddy:2-alpine@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f

LABEL org.opencontainers.image.source="https://github.com/wiryaptr/pulse-monitor" \
      org.opencontainers.image.description="Pulse Monitor web (frontend + Caddy)"
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
RUN adduser -S -H -u 10001 pulse
# Caddy menulis state kecil ke XDG_*. Arahkan ke /tmp (jalankan dengan --tmpfs /tmp bila rootfs read-only)
ENV XDG_DATA_HOME=/tmp/xdg/data XDG_CONFIG_HOME=/tmp/xdg/config
USER 10001
EXPOSE 8080

# Lihat catatan HEALTHCHECK di api/Dockerfile (podman build --format docker)
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/"]
