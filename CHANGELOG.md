# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases aim to follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Test suite** — Jest with a unit project (services, utils, validation, middlewares, fully mocked) and an integration project (supertest against the real HTTP stack with `mongodb-memory-server` + `ioredis-mock`)
- **CI workflow** — `.github/workflow/CI.yaml` now runs lint, type-check, unit + integration tests with coverage, and the build on every push/PR
- **Pre-commit tests** — husky now runs the fast unit suite alongside lint-staged

### Docs

- Add README with setup guide, environment variable reference and full API documentation
- Add contributing guide covering branch strategy, commit convention and the PR checklist
- Add security policy and vulnerability reporting process
- Add architecture overview with request lifecycle and error-handling diagrams

## [1.0.0] — initial template release

First tagged state of the template. Everything below was shipped feature-by-feature and merged to `main`.

### Added

- **Authentication** — register, login, logout, `GET /me`, change password, and refresh-token rotation with revocation tracked in Redis. Emails handled by nodemailer over SMTP.
- **Email verification** — one-time hashed tokens stored in Redis with a 24h TTL, plus a resend endpoint behind a stricter rate limiter.
- **Password reset** — forgot/reset flow with 15-minute expiring tokens, plus session invalidation on reset.
- **Health checks** — liveness probe (`/health/live`) and readiness probe (`/health/ready`) that verifies both Mongo and Redis connections.
- **User module** — CRUD with pagination, role-based access (admin-only user deletion) and password sanitisation on every response.
- **Socket.io** — JWT-authenticated real-time layer with per-user rooms for targeted emits.
- **Notifications** — Mongo-persisted in-app notifications with list/read endpoints, real-time delivery over sockets, and an unread count.
- **Web push** — VAPID-based push notifications with no third-party service: subscription registration, listing and removal, ad-hoc sending, auto-removal of expired subscriptions, and a sample service worker (`public/sw.js`).
- **Infrastructure** — Zod-validated boot-time env config, pino structured logging with request IDs, centralised error handling with typed error classes, base Mongo repository with pagination, graceful shutdown, and husky + commitlint + lint-staged quality gates.

### Security

- Refresh token `jti` values tracked in Redis; tokens revoked on logout, password change and password reset
- Email verification / password-reset tokens stored hashed; raw tokens only ever sent by email
- Passwords hashed with bcrypt (cost 12) and excluded from all API responses

### Known gaps (at the time of release)

- No Dockerfile or docker-compose setup
