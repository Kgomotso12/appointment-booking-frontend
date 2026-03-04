# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app

# Copy everything first so Quasar postinstall can run successfully
COPY . .

# Install deps (postinstall: quasar prepare will now find the project)
RUN npm install

# Build-time Vite env (comes from a .env file in the project)
# Make sure your .env.production (or .env) is included in the build context
RUN npm run build

# ---- runtime ----
FROM nginx:1.27.0-alpine3.19
WORKDIR /usr/share/nginx/html

# Copy built app
COPY --from=build /app/dist/spa /usr/share/nginx/html
# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80