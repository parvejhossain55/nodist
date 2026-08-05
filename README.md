# Nodist

A modular Node.js backend template. Express + TypeScript + MongoDB + Redis, with auth, real-time notifications and web push wired up and working out of the box. Clone it, add your `.env`, and start writing your feature — not infrastructure glue.

<!-- ![build](https://img.shields.io/badge/build-coming_soon-lightgrey)
![coverage](https://img.shields.io/badge/coverage-coming_soon-lightgrey)
![license](https://img.shields.io/badge/license-MIT-green)
![version](https://img.shields.io/badge/version-1.0.0-blue) -->

## Key features

- **Modular feature folders.** Each module owns its routes, controller, service, repository, model and validation. No sprawling `services/` graveyard.
- **Full auth flow.** Register and login with bcrypt-hashed passwords, access + refresh JWT rotation, and refresh tokens tracked in Redis so they can be revoked on logout, password change or password reset.
- **Email verification and password reset.** One-time tokens that are hashed before they're stored, expiring automatically, with HTML emails sent over SMTP.
- **Role-based access control.** `user` / `admin` roles, with an `authorize()` middleware guarding admin-only endpoints.
- **Centralised error handling.** Typed `AppError` classes, Zod validation failures mapped to 422 with per-field details, Mongo duplicate-key errors mapped to 409. One consistent error shape everywhere.
- **Real-time notifications.** Socket.io with access-token auth and per-user rooms, plus web push notifications via VAPID keys — no third-party push service required.
- **Boot-time env validation.** Every environment variable is checked against a Zod schema before the server starts. Missing `MONGO_URI`? The process exits with a readable error instead of failing mid-request in production.
- **Structured logging.** pino + pino-http with a request ID (`x-request-id`) echoed on every response, pretty-printed in development.
- **Repository pattern.** A base Mongo repository gives every module CRUD and pagination for free.
- **Graceful shutdown.** SIGTERM / SIGINT drain the HTTP server and close Mongo and Redis before exiting. There's a 10s escape hatch so you never hang forever.
- **Security middleware.** helmet, CORS, rate limiting (global plus a stricter limiter on email-sending endpoints), 10kb JSON body caps.

## Architecture

```
nodist/
├── src/
│   ├── app.ts                    # Express app factory: middleware chain, static files, route mounting
│   ├── server.ts                 # Bootstrap: DB connections, HTTP server, socket.io, graceful shutdown
│   ├── config/                   # Zod-validated env vars + a typed config object
│   ├── common/
│   │   ├── middlewares/          # authenticate, authorize, validate, rateLimit, errorHandler, ...
│   │   ├── errors/AppError.ts    # AppError base + typed subclasses (400/401/403/404/409/422/429/500)
│   │   ├── utils/                # ApiResponse, catchAsync, mailSender, webPush
│   │   └── logger/               # pino setup
│   ├── database/
│   │   ├── mongodb/              # Mongoose connection (pool sizing, timeouts)
│   │   ├── redis/                # ioredis client
│   │   └── repositories/         # IBaseRepository + BaseMongoRepository (CRUD, pagination)
│   ├── modules/                  # Feature modules — one folder per feature
│   │   ├── routes.ts             # Central registry that mounts every feature router
│   │   ├── auth/                 # Register, login, refresh, logout, verification, password reset
│   │   ├── user/                 # User CRUD + role management
│   │   ├── health/               # Liveness + readiness probes
│   │   ├── notification/         # In-app notifications, stored in Mongo, pushed over sockets
│   │   └── push/                 # Web push subscriptions and sending (VAPID)
│   └── sockets/                  # Socket.io server with token auth and per-user rooms
├── public/                       # Static files — sample service worker (sw.js)
├── scripts/                      # Dev tooling (generate-vapid-keys)
├── docs/                         # In-depth guides (web-push.md, architecture.md)
├── tests/                        # Test suites (empty for now — see Testing)
└── .github/workflow/             # CI workflows (placeholder file, not filled in yet)
```

Every feature module follows the same shape, so learning one means you know them all:

```
src/modules/user/
├── user.routes.ts                # Express router + middleware chain
├── user.controller.ts            # HTTP layer — parse, delegate, respond with ApiResponse
├── user.service.ts               # Business logic
├── user.repository.ts            # Mongo implementation of the repository interface
├── user.repository.interface.ts  # What the service needs from storage
├── user.model.ts                 # Mongoose schema
├── user.validation.ts            # Zod schemas for body / query / params
└── user.utils.ts                 # sanitize() — strips password before it leaves the API
```

**Why this structure?** Every module is self-contained. You can copy `src/modules/user` to start a new feature and rename things — the wiring (route registry, base repository, error handling, validation) is already there. It keeps PRs small and merge conflicts rare.

## Tech stack

| Layer | Choice |
| ----- | ------ |
| Language | TypeScript 5.9 (strict mode) |
| Runtime | Node.js ≥ 24 |
| Framework | Express 4.22 |
| Database | MongoDB with Mongoose 8 |
| Cache / token store | Redis with ioredis 5 |
| Validation | Zod 4 |
| Auth | jsonwebtoken 9 (JWT), bcryptjs |
| Real-time | Socket.io 4 |
| Web push | web-push 3 (VAPID) |
| Email | nodemailer 6 (SMTP) |
| Logging | pino, pino-http, pino-pretty (dev) |
| Security | helmet, cors, express-rate-limit, cookie-parser, compression |
| Tooling | tsx, husky, lint-staged, commitlint, eslint, prettier |

## Prerequisites

- **Node.js ≥ 24** — the `engines` field enforces it.
- **pnpm** — this repo uses pnpm, not npm or yarn.
- **MongoDB** running locally (or point `MONGO_URI` at a hosted instance).
- **Redis** running locally (or point `REDIS_URL` at a hosted instance).

## Installation

```bash
git clone https://github.com/parvejhossain55/nodist.git
cd nodist
pnpm install
cp .env.example .env
```

Then open `.env` and set the required values — at minimum `MONGO_URI`, `REDIS_URL`, both JWT secrets and the SMTP credentials. The server refuses to start without them, so you can't get it wrong silently.

## Quick start

```bash
pnpm dev
```

The dev server (tsx watch) starts in well under 2 seconds and hot-reloads on change.

- Server: http://localhost:4000
- Health check: http://localhost:4000/api/v1/health/live

Planning to use web push? Generate VAPID keys once and paste them into `.env`:

```bash
pnpm generate:vapid
```

See [docs/web-push.md](docs/web-push.md) for the full web push setup.

## Environment variables

All variables are validated at boot by `src/config/env.ts`. Required ones have no default; missing or malformed values abort startup with a clear error.

| Variable | Description | Default | Required |
| -------- | ----------- | ------- | -------- |
| `NODE_ENV` | `development`, `test` or `production` | `development` | no |
| `PORT` | HTTP port | `4000` | no |
| `API_PREFIX` | Global prefix for every route | `/api/v1` | no |
| `MONGO_URI` | MongoDB connection string | – | **yes** |
| `REDIS_URL` | Redis connection string | – | **yes** |
| `FRONTEND_URL` | Base URL used in email verification / reset links | `http://localhost:3000` | no |
| `JWT_ACCESS_SECRET` | Signs access tokens (min 32 chars) | – | **yes** |
| `JWT_REFRESH_SECRET` | Signs refresh tokens (min 32 chars, use a different value) | – | **yes** |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime (`15m`, `7d`, …) | `15m` | no |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime | `7d` | no |
| `CORS_ORIGIN` | Allowed origin for CORS and socket.io | `*` | no |
| `RATE_LIMIT_WINDOW_MS` | Global rate-limit window in ms | `900000` (15 min) | no |
| `RATE_LIMIT_MAX` | Max requests per window per IP | `300` | no |
| `LOG_LEVEL` | pino level: `fatal` … `trace` | `info` | no |
| `SMTP_HOST` | SMTP server for outbound email | – | **yes** |
| `SMTP_PORT` | SMTP port (`465` switches to TLS) | `587` | no |
| `SMTP_USER` | SMTP username | – | **yes** |
| `SMTP_PASSWORD` | SMTP password | – | **yes** |
| `SMTP_FROM` | From address on outgoing mail | `noreply@nodist.dev` | no |
| `VAPID_SUBJECT` | `mailto:` or `https:` contact for web push | `mailto:noreply@nodist.dev` | no |
| `VAPID_PUBLIC_KEY` | VAPID public key (`pnpm generate:vapid`) | – | **yes** |
| `VAPID_PRIVATE_KEY` | VAPID private key — keep it secret | – | **yes** |

## API reference

Base URL: `http://localhost:4000/api/v1` (or `{API_PREFIX}` on your deployment).

**Auth.** Access tokens go in the `Authorization: Bearer <token>` header. The refresh token lives in an httpOnly cookie named `refreshToken`, scoped to the `/api/v1/auth` path, and is rotated on every refresh. Secure flag is on only in production.

**Response shape.** Success responses are `{ success, message, data, meta? }`. Errors are `{ success: false, message, details?, stack? }` — `stack` appears only outside production.

### Health

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| GET | `/health/live` | no | Liveness probe, always 200 when the process is up |
| GET | `/health/ready` | no | Readiness probe — 200 when Mongo and Redis are both connected, 503 otherwise |

```bash
curl http://localhost:4000/api/v1/health/live
```

```json
{ "success": true, "message": "Service is live", "data": { "status": "up" } }
```

```bash
curl http://localhost:4000/api/v1/health/ready
```

```json
{ "success": true, "message": "Ready", "data": { "mongo": "up", "redis": "up" } }
```

### Auth

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| POST | `/auth/register` | no | Create an account, set refresh cookie, send verification email |
| POST | `/auth/login` | no | Log in, set refresh cookie |
| POST | `/auth/refresh` | cookie | Rotate the refresh token, issue a new access token |
| POST | `/auth/logout` | yes | Revoke the refresh token, clear the cookie |
| GET | `/auth/me` | yes | Current user |
| POST | `/auth/change-password` | yes | Change password, revoke all refresh tokens |
| POST | `/auth/verify-email` | no | Verify email with the one-time token |
| POST | `/auth/resend-verification` | no | Resend verification email (limited to 5 / 15 min) |
| POST | `/auth/forgot-password` | no | Send a password reset link (limited to 5 / 15 min) |
| POST | `/auth/reset-password` | no | Set a new password with the reset token |

**Register:**

```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Jane Doe","email":"jane@example.com","password":"correct-horse-battery"}'
```

```json
{
  "success": true,
  "message": "Registered successfully",
  "data": {
    "user": {
      "_id": "66d2c1a0e9f4c5b1a2b3c4d5",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "user",
      "isActive": true,
      "isEmailVerified": false,
      "createdAt": "2026-08-05T10:00:00.000Z",
      "updatedAt": "2026-08-05T10:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Login** returns the same shape. Registering or logging in also sets the `refreshToken` httpOnly cookie, so the browser sends it automatically on `/auth/refresh` and `/auth/logout`.

**Validation error example** (any endpoint with a Zod schema):

```json
{
  "success": false,
  "message": "Validation failed",
  "details": { "email": ["Invalid email"] }
}
```

### Users

All user endpoints require auth. Deleting a user requires the `admin` role.

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| GET | `/users?page=1&limit=20` | admin | List users (paginated) |
| GET | `/users/:id` | yes | Get one user |
| PATCH | `/users/:id` | yes | Update `name` / `isActive` |
| DELETE | `/users/:id` | admin | Delete a user |

```bash
curl 'http://localhost:4000/api/v1/users?page=1&limit=10' \
  -H 'Authorization: Bearer <accessToken>'
```

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "_id": "66d2c1a0e9f4c5b1a2b3c4d5",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "user",
      "isActive": true,
      "isEmailVerified": true
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 1 }
}
```

### Notifications

In-app notifications, persisted in Mongo. When one is created, it's pushed live over socket.io to the recipient's room (see below) and, if the user has push subscriptions, delivered as a web push too.

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| GET | `/notifications?page=1&limit=20` | yes | List own notifications + `unreadCount` in meta |
| PATCH | `/notifications/read-all` | yes | Mark everything read |
| PATCH | `/notifications/:id/read` | yes | Mark one notification read |

### Web push

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| GET | `/push/vapid-public-key` | no | VAPID public key the frontend needs to subscribe |
| POST | `/push/subscriptions` | yes | Register a device subscription |
| GET | `/push/subscriptions` | yes | List own subscriptions |
| DELETE | `/push/subscriptions/:id` | yes | Remove a subscription (owner only) |
| POST | `/push/send` | yes | Send a push to yourself (admins can target any user) |

The full integration guide — setup, service worker, example payloads — is in [docs/web-push.md](docs/web-push.md).

### Socket.io

A socket.io server runs on the same port. Connect with the access token in a `token` handshake header, and the server joins you to a personal room. Listen for the `notification` event:

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', {
  extraHeaders: { token: '<accessToken>' },
});

socket.on('notification', (notification) => {
  console.log('New notification:', notification);
});
```

### Common pitfalls

- **The server won't boot with placeholder secrets.** JWT secrets must be ≥ 32 chars and VAPID keys must be real generated keys. That's deliberate — `.env.example` placeholders are meant to be replaced.
- **Refresh cookie path.** The cookie is scoped to `/api/v1/auth`, so cross-origin frontends need `credentials` handling; and if you change `API_PREFIX`, that path is hardcoded in `auth.controller.ts:line-54`.
- **`CORS_ORIGIN` defaults to `*`.** Fine for development, but set it explicitly before you deploy — it applies to both HTTP and socket.io.

## Testing

There's no test suite yet. The `tests/` folder is empty and no test runner is configured. We know — it's near the top of the list. Until then, `pnpm lint` and `pnpm build` are your safety nets. `TODO: verify` — see [CONTRIBUTING.md](CONTRIBUTING.md) if you'd like to add the first tests.

## Docker

No Dockerfile or docker-compose setup exists in this repo yet. If you need containerised deployments, that's an open gap. `TODO: verify`.

## npm scripts

| Script | Command | What it does |
| ------ | ------- | ------------ |
| `dev` | `tsx watch src/server.ts` | Hot-reloading dev server |
| `build` | `tsc -p tsconfig.json && tsc-alias` | Type-check and compile to `dist/` (aliases resolved) |
| `start` | `node dist/server.js` | Run the compiled build (run `build` first) |
| `lint` | `eslint "src/**/*.ts"` | Lint all source files |
| `lint:fix` | `eslint "src/**/*.ts" --fix` | Lint and auto-fix |
| `format` | `prettier --write "src/**/*.ts"` | Format all source files |
| `generate:vapid` | `tsx scripts/generate-vapid-keys.ts` | Generate VAPID keys for web push |
| `prepare` | `husky` | Install git hooks on `pnpm install` |

Commits are guarded by husky hooks: `lint-staged` runs eslint + prettier on staged files, and `commitlint` enforces [conventional commits](https://www.conventionalcommits.org/).

## Contributing

Pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the setup, branch strategy and the PR checklist.

## License

[MIT](https://github.com/parvejhossain55/nodist/blob/main/LICENSE) — see the LICENSE file for the full terms.
