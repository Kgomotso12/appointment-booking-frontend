# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app

# Copy project files
COPY . .

# Install dependencies
RUN npm install

# Build app
RUN npm run build

# ---- runtime ----
FROM nginx:1.27.0-alpine3.19
WORKDIR /usr/share/nginx/html

# Copy built app
COPY --from=build /app/dist/spa /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy TLS certificates
COPY certs/frontend.crt /etc/nginx/certs/frontend.crt
COPY certs/frontend.key /etc/nginx/certs/frontend.key

EXPOSE 443