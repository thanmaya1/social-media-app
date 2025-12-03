Redis (optional) — setup notes

This application optionally uses Redis for caching and token storage. If you want to enable Redis in production or development, follow these steps.

1) Install Redis
- Linux: `sudo apt install redis-server` or use Docker
- macOS: `brew install redis` or use Docker
- Windows: use Docker image `redis:7` (recommended)

2) Configure environment
- Set `REDIS_URL` (or `REDIS_HOST`/`REDIS_PORT`), for example:

  - `REDIS_URL=redis://localhost:6379`

3) Restart the server
- The server will automatically detect Redis via `utils/redisClient.js` and enable caching when available.

4) Health-check
- The app exposes `/api/health` which reports `mongo` and `redis` status. Use it from your load-balancer or monitoring:

  GET /api/health

5) Development notes
- Local dev without Redis works fine — the app falls back to in-memory/no-op cache.
- For CI/testing, avoid relying on Redis unless tests explicitly start a Redis instance. See `server/tests/setup.js` for test teardown behavior.

6) Troubleshooting
- If Redis is reachable but `PING` fails, check firewall and credentials.
- For Docker Compose, add a `redis` service and set `REDIS_URL` accordingly.

Example docker-compose snippet:

services:
  web:
    build: ./server
    environment:
      - REDIS_URL=redis://redis:6379
  redis:
    image: redis:7
    restart: unless-stopped
