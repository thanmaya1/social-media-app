# Deployment Guide

This document outlines recommended steps to deploy the application in production using Docker, PM2, and managed services.

Important: ensure environment secrets (JWT secrets, DB URI, Cloudinary keys) are stored securely (Vault/Secrets Manager) and never committed.

1) Docker & Docker Compose (recommended for simple deployments)

- Build images:

```powershell
cd ./server
docker build -t social-media-server .
cd ../client
docker build -t social-media-client .
```

- Run compose for production-style setup (replace environment values):

```powershell
docker compose -f docker-compose.yml up -d --build
```

2) PM2 (process manager)

- Install PM2 on your server and copy `server/ecosystem.config.js`.

```powershell
npm install -g pm2
pm2 start server/ecosystem.config.js
pm2 save
pm2 startup
```

3) MongoDB Atlas

- Use a managed MongoDB Atlas cluster and provide the connection string in `MONGO_URI`.
- Ensure your Atlas IP whitelist and user roles are configured.

4) Cloudinary (optional)

- Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in environment.

5) Environment variables (example)

```
PORT=5000
MONGO_URI=your_mongo_uri
ACCESS_TOKEN_SECRET=supersecret
REFRESH_TOKEN_SECRET=anothersecret
CLIENT_URL=https://your.client.domain
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

6) Monitoring & logging

- Ship Winston JSON logs to a log aggregator (Logstash/Datadog) or use PM2 logs with a log forwarder.

7) HTTPS / Reverse proxy

- Put Nginx/Traefik in front of the Node and React apps to terminate TLS and proxy requests.

8) Production security & performance checklist

- Ensure `NODE_ENV=production` to enable HSTS and stricter CSP in `server/app.js`.
- Terminate TLS at the reverse proxy and set `CLIENT_URL` to your HTTPS origin.
- Set `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` to long, random values and rotate periodically.
- Enable Redis by setting `REDIS_URL` for caching and session/refresh token rotation. Install `ioredis` in production.
- Configure Cloudinary or a durable object store for large file uploads; ensure `CLOUDINARY_*` env vars are present if used.
- Enable process monitoring (PM2) and set up log forwarding to your log aggregator.
- Use `compression` (already included) and consider enabling a CDN for static assets and uploaded files.

9) CSP & nonce usage

- The server generates a per-request CSP nonce and injects it into the served `index.html` as a `<meta name="csp-nonce">` tag. If your client needs to run inline scripts, read this meta tag and use the nonce when creating inline script blocks.
- Avoid `unsafe-eval` and `unsafe-inline` in production: update `server/app.js` CSP directives if you remove inline scripts.

10) Notes on scheduled jobs

- The app ships with a lightweight scheduler. In high-scale setups prefer an external job queue (BullMQ/Redis + worker processes) and set `DISABLE_SCHEDULER=1` for the in-process scheduler.
