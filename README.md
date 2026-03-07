# Appointment Booking Frontend

Frontend application for the appointment booking system.

---

# Tech Stack

- Vue 3
- Quasar Framework
- FullCalendar
- Pinia (state management)

---

# Features

- Branch selection
- Appointment calendar
- Create appointments
- Edit appointments
- Reschedule appointments
- Public booking view
- Public cancel flow

Example public cancel route:

```
https://localhost:9000/#/cancel/{token}
```

---

# Prerequisites

Install the following before running the project:

- Node.js 20+
- npm
- Docker (optional for containerized deployment)

Check installation:

```bash
node -v
npm -v
docker -v
```

---

# Project Setup

Install dependencies:

```bash
npm install
```

---

# Run the Frontend

Start the development server:

```bash
npm run dev
```

or

```bash
quasar dev
```

The application will run on:

```
https://localhost:9000
```

---

# Local HTTPS / TLS Setup

The frontend runs on HTTPS during development to avoid browser mixed-content errors when calling the backend.

---

# Generate Local Certificate

Create a `certs` directory in the project root and generate a self-signed certificate.

```bash
mkdir -p certs

openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout certs/frontend.key \
  -out certs/frontend.crt \
  -subj "/CN=localhost"
```

This creates:

```
certs/
 ├── frontend.crt
 └── frontend.key
```

---

# Quasar HTTPS Configuration

The Quasar dev server is configured to use the certificate.

Example configuration in `quasar.config.ts`:

```ts
devServer: {
  port: 9000,
  https: {
    key: fs.readFileSync('./certs/frontend.key'),
    cert: fs.readFileSync('./certs/frontend.crt')
  },
  proxy: {
    '/api': {
      target: 'https://localhost:8443',
      changeOrigin: true,
      secure: false
    }
  }
}
```

---

# Backend Proxy

API calls are proxied to the backend.

Frontend requests:

```
/api/v1/appointments/...
```

are forwarded to:

```
https://localhost:8443/api/v1/appointments/...
```

This keeps the frontend code using **relative API paths** and avoids CORS issues.

---

# Browser Certificate Warning

Because the certificate is self-signed, the browser will show a warning such as:

```
NET::ERR_CERT_AUTHORITY_INVALID
```

This is expected for local development.

To continue:

1. Click **Advanced**
2. Click **Proceed to localhost**

---

# Useful Scripts

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Build production frontend:

```bash
quasar build
```

---

# Production Build

Build the frontend:

```bash
quasar build
```

The output will be generated in:

```
dist/spa
```

These files can be served by **Nginx** or any static file server.

---

# Run with Docker

The frontend can also be built and served using Docker. The production build is generated and served with **Nginx**.

---

## Build Docker Image

From the project root run:

```bash
docker build -t appointment-booking-frontend .
```

---

## Run Container

```bash
docker run \
  --network appointment-net \
  -p 9000:80 \
  -p 9443:443 \
  appointment-booking-frontend

```

The application will be available at:

```
https://localhost:9443
```

---

# Docker Architecture

The Docker image uses a **multi-stage build**.

### Stage 1 – Build

A Node container installs dependencies and builds the Quasar production bundle.

### Stage 2 – Runtime

An Nginx container serves the compiled SPA.

```
Node (build stage)
   │
   │ npm install
   │ quasar build
   ▼
dist/spa
   │
   ▼
Nginx (runtime stage)
   │
   ▼
Browser
```

---

# Dockerfile Overview

The project uses a multi-stage Docker build:

```dockerfile
# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app

COPY . .
RUN npm install
RUN npm run build

# ---- runtime ----
FROM nginx:1.27.0-alpine3.19

COPY --from=build /app/dist/spa /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

---

# Docker + Backend

When running the backend locally, the frontend will call the backend API via:

```
https://localhost:8443/api
```

Ensure the backend service is running before accessing the frontend.

---

# Running Both Services

Typical local development setup:

```
Browser
   │
   │ https://localhost:9443
   ▼
Frontend (Quasar Dev Server)
   │
   │ /api
   ▼
Backend (Spring Boot)
```

Docker production setup:

```
Browser
   │
   │ http://localhost:9000
   ▼
Frontend (Nginx container)
   │
   │ /api
   ▼
Backend (Spring Boot)
```

Example ports:

```
Frontend → 9443
Backend  → 8443
```

---

# Production Architecture

Typical production setup:

```
Browser
   │
   │ HTTPS
   ▼
Nginx
   │
   ├── Static frontend
   │
   └── /api → Spring Boot backend
```

In production, TLS is usually terminated at **Nginx** using certificates from **Let's Encrypt**.

---

# Notes

- Local certificates are only for development.
- Docker serves the **production build**, not the development server.
- Production should use trusted certificates.

---
