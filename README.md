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

Check installation:

```bash
node -v
npm -v
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
- Production should use trusted certificates.

---
