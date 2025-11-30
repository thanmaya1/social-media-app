# Social Media App (MERN)

This repository contains a production-ready scaffold for a social media application using the MERN stack (MongoDB, Express, React, Node). The current scaffold includes a minimal but functional authentication system (JWT access + refresh tokens) and a simple React frontend that can be used to extend the app.

## Structure

- `server/` - Express backend
- `client/` - React frontend

## Quick start (development)

1. Copy `.env.example` to `.env` in `server/` and set values.
2. From `server/`:

```powershell
cd server; npm install
# start in dev (requires nodemon)
npm run dev
```

3. From `client/`:

```powershell
cd client; npm install
npm start
```

## Next steps
- Implement posts, comments, uploads (Cloudinary/S3), sockets (Socket.io), tests, CI, and deployment.
- Harden security (CSP, CSRF tokens), add Redis for refresh token/session storage, and add full test coverage.
 
## API (selected endpoints)

Authentication
- `POST /api/auth/register` - body: `{ username, email, password }` -> returns `accessToken` and `refreshToken`
- `POST /api/auth/login` - body: `{ email, password }` -> returns `accessToken` and `refreshToken`
- `POST /api/auth/refresh-token` - body: `{ refreshToken }` -> returns new `accessToken` and rotated `refreshToken`
- `POST /api/auth/logout` - body: `{ refreshToken }` -> revokes the refresh token

Posts
- `POST /api/posts` - protected; multipart/form-data `content`, `files` -> creates a post. Files are saved to `/server/uploads` and served at `/uploads/<filename>`.
- `GET /api/posts` - public; query params `page`, `limit` -> returns feed posts
- `GET /api/posts/:id` - get single post
- `POST /api/posts/:id/like` - protected; toggles like for current user

WebSockets
- Server runs Socket.io and emits `new_post` when a post is created and `post_liked` when a post is liked. Connect the client to the server base URL (e.g. `http://localhost:5000`) using Socket.io client.

Messaging Socket API
- Client should connect with the `accessToken` set in `auth` payload: `io(url, { auth: { token: '<accessToken>' } })`.
- Events:
	- `send_message` (client -> server): payload `{ to, content, type }`. Server will ack with `{ ok: true, message }` or `{ error }`.
	- `receive_message` (server -> client): emitted to recipient with full message object when a new message arrives.
	- `typing` and `stop_typing` (client -> server and server -> client): notify counterpart when typing starts/stops.

Messaging REST API
- `GET /api/messages/:userId` - protected; returns messages between authenticated user and `userId`.
- `PUT /api/messages/:messageId/read` - protected; mark message as read (recipient only).

Notifications
- Notifications are created for message events and are available via the notifications endpoints documented above.

Static uploads
- Uploaded files are accessible at `http://<server>/uploads/<filename>` after upload.

Quick example: create a post with `curl` (requires a valid `Authorization: Bearer <accessToken>` header):

```powershell
curl -X POST "http://localhost:5000/api/posts" `
	-H "Authorization: Bearer <accessToken>" `
	-F "content=Hello world" `
	-F "files=@C:\path\to\image.jpg"
```

Tips
- For development use a local MongoDB or MongoDB Atlas. Set `MONGO_URI` in `server/.env`.
- Ensure `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` are long & random in production.

## Docker / Compose (local dev)

You can run the whole stack locally with Docker. The compose file starts MongoDB, the server and the client.

Copy `.env.example` to `server/.env` and set any secrets you want to persist (or rely on the values in `docker-compose.yml` for quick local testing).

Start the stack:

```powershell
cd d:\socials\social-media-app
docker-compose up --build
```

## Production checklist (quick)

- Use HTTPS/TLS (terminate at a reverse proxy or load balancer).
- Store secrets securely (Vault, cloud provider secrets manager, or env files protected by CI/CD).
- Use MongoDB Atlas or another managed DB and restrict network access.
- Use Redis for refresh token storage and session/lock management for refresh token rotation.
- Configure monitoring (Winston logs shipped to a log aggregator, Sentry for errors, Prometheus for metrics).
- Harden security: CSP, input validation, XSS sanitization (already added), rate limiting (already added), CSRF protection for cookie flows.
- Add E2E and security tests, and enable CI gates for tests and linting.
This exposes:
- `http://localhost:3000` — React frontend
- `http://localhost:5000` — Express API
- MongoDB runs at `mongodb://localhost:27017` (named volume used for persistence)

Uploaded files are mounted from `./server/uploads` so they persist between container restarts.

To stop and remove containers:

```powershell
docker-compose down
```

