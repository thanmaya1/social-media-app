# Social Media App (MERN)

This workspace contains a full-stack social-media application (server + client). The repository has been implemented and tested to cover core features: authentication, posts, comments, messaging, notifications, follow/unfollow, profile updates, and realtime delivery via Socket.IO.

Important: per the project scope Docker, CI, and Cypress E2E were intentionally left out.

## Quick start (development)

# Social Media App (MERN)

This repository contains a full-stack social media app (Express + MongoDB backend, React + Vite frontend). The workspace implements core features: authentication, posts, comments, messaging, notifications, follow/unfollow, profile updates, and realtime delivery via Socket.IO.

This README summarizes how to run the app locally and the important environment variables.

## Quick start (development)

Prerequisites:
- Node.js 18+ and npm

1) Install dependencies (server + client):

```powershell
cd d:/socials/social-media-app/server
npm install
cd ../client
npm install
```

2) Start the backend (development):

```powershell
cd d:/socials/social-media-app/server
npm run dev
```

3) Start the frontend (development):

```powershell
cd d:/socials/social-media-app/client
npm run dev
```

4) Open the app in your browser. Vite prints the dev URL in the terminal (commonly `http://localhost:5173` or another port if 5173 is in use).

## Environment variables (`server/.env`)

Create `server/.env` with these recommended values for development:

```dotenv
PORT=5000
MONGO_URI=your-mongodb-uri   # optional for local development (tests use in-memory DB)
ACCESS_TOKEN_SECRET=change_this
REFRESH_TOKEN_SECRET=change_this
CLIENT_URL=http://localhost:5173
# Optional integrations
REDIS_URL=
CLOUDINARY_URL=
SENTRY_DSN=
NODE_ENV=development

# Optional behavior
# AUTO_VERIFY_SOCIAL — when set to `true` new social (OAuth) signups are automatically marked verified. This can also be controlled at runtime by an admin via the Admin UI (`/api/admin/settings` and `/api/admin/settings/auto-verify`).
```

### OAuth / Social login env vars

- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` — Google OAuth app credentials
- `GOOGLE_CALLBACK_URL` — optional callback URL (defaults to `SERVER_URL + /api/auth/google/callback`)
- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` — GitHub OAuth app credentials
- `GITHUB_CALLBACK_URL` — optional callback URL (defaults to `SERVER_URL + /api/auth/github/callback`)
- `SERVER_URL` — public server base URL used for constructing callbacks

### Scheduler

- `DISABLE_SCHEDULER` — set to `1` to disable server-side scheduled post publishing (defaults to enabled)

Notes
- After enabling OAuth env vars the server exposes `/api/auth/google` and `/api/auth/github` to start the social login flow. The callback redirects back to `CLIENT_URL` with `accessToken` and `refreshToken` in the query string.
- Scheduled posts: set `scheduledAt` when creating a post to schedule it for future publishing. The server runs a simple scheduler to publish due posts (can be disabled with `DISABLE_SCHEDULER`).

## CSRF protection

The server exposes a lightweight endpoint that SPAs can call to obtain a double-submit CSRF token cookie.

- `GET /api/csrf-token` — sets a `XSRF-TOKEN` cookie (not httpOnly) and returns `{ ok: true }`.

Client usage: read the `XSRF-TOKEN` cookie and include it in the `x-csrf-token` header for any mutating request (POST/PUT/PATCH/DELETE). CSRF protection is disabled when `NODE_ENV=test` to simplify automated tests.

## Email (password reset / verification)

The server ships with a stubbed email sender for development. By default emails are logged instead of being sent. To enable real email delivery provide SMTP credentials in `server/.env` or use a provider like SendGrid.

Recommended env variables (add to `server/.env`):

```dotenv
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_SECURE=false # true for port 465
EMAIL_FROM="My App <no-reply@example.com>"
```

Notes:
- If `SMTP_HOST` and `SMTP_USER` are not provided the app will log (stub) emails instead of sending them.
- Password reset and email verification flows are implemented in `POST /api/auth/forgot-password`, `POST /api/auth/reset/:token`, `POST /api/auth/verify-email` and `POST /api/auth/resend-verification`.

- `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` must be set for auth to work reliably.
- `CLIENT_URL` is used for CORS and socket origins.

## Important endpoints (selected)

- `POST /api/auth/register` — register (returns access + refresh tokens)
- `POST /api/auth/login` — login (returns access + refresh tokens)
- `GET /api/posts` — public feed
- `POST /api/posts` — create post (protected, multipart/form-data)
- `GET /api/notifications` — list notifications (supports pagination)
- `GET /api/notifications/unread-count` — unread count

WebSockets (Socket.IO): connect with auth token via `io(url, { auth: { token } })`. Server emits `receive_message`, `new_notification`, and other events described in code.

## Running tests (optional)

The server contains Jest tests that use an in-memory MongoDB. To run:

```powershell
cd d:/socials/social-media-app/server
npm test -- --runInBand --detectOpenHandles
```

Tests are optional for dev flow — you can skip them if you want to iterate on UI features quickly.

## Troubleshooting

- If the client Vite server picks a different port, open the URL printed by Vite in the client terminal.
- If uploads fail, check `server/uploads` exists and is writable, or configure `CLOUDINARY_URL`.

## Next steps (suggested)

- Manual smoke check (register/login → post → comment → message → notification flows).
- Add client E2E tests (Cypress) for critical UI paths.
- Configure Docker / CI for reproducible deployments.

If you want, I will continue finishing remaining UI polish and then run a final manual smoke verification when you're ready.
Run client in development (Vite):

## Production quick run

Recommended minimal environment for production deployment (example):

```dotenv
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://mongo:27017/social_media_app
ACCESS_TOKEN_SECRET=<long-random-secret>
REFRESH_TOKEN_SECRET=<long-random-secret>
CLIENT_URL=https://your-app.example.com
REDIS_URL=redis://redis:6379
CLOUDINARY_URL=...
```

Start the server (recommended under a process manager such as PM2):

```powershell
cd d:/socials/social-media-app/server
npm install --production
node ./bin/www.js # or use PM2/ecosystem.config.js
```

Notes:
- Ensure `CLIENT_URL` uses HTTPS and set `NODE_ENV=production` to enable stricter CSP/HSTS behavior in `server/app.js`.
- Enabling `REDIS_URL` provides caching and refresh-token rotation support. Install `ioredis` in production if using Redis.


