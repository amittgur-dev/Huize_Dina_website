# Build natively on the runner: the output is static, so only the final stage
# needs to be per-platform (avoids running Node under QEMU emulation).
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts ./scripts
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
LABEL app=huize-dina
EXPOSE 80
