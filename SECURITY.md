# Security Policy

## Reporting a vulnerability

Please don't open a public issue for security problems. Instead, report them privately through GitHub's **private vulnerability reporting** for this repository:

https://github.com/parvejhossain55/nodist/security/advisories

That keeps details out of the public issue tracker until a fix is out.

What we'd like in the report:

- Which version / commit you tested against.
- A short description of the flaw and the impact, as you see it.
- Steps to reproduce, or a minimal proof of concept.
- If you have a suggested fix, that's a bonus — not required.

What you can expect:

- **Acknowledgment within 48 hours** of the report reaching us.
- A fix attempt and a release note as soon as we've confirmed the issue and its severity.
- Credit in the changelog if you'd like it. Tell us how you want to be named (or stay anonymous — that's fine too).

## What the template already does

The security posture here is mostly "sensible defaults baked into the template", so if you deploy it you start from a decent baseline:

- **Boot-time env validation.** Required secrets are checked before the server starts, so a misconfigured deployment fails loudly rather than running half-secured.
- **Password hashing.** bcrypt (cost factor 12) via a Mongoose pre-save hook. Passwords are excluded from query results by default (`select: false`) and sanitised before leaving the API.
- **Token hygiene.** Access tokens are short-lived (15 min default) and stateless; refresh tokens carry a `jti` that is stored in Redis, so they can be revoked on logout, password change and password reset. Email verification and password-reset tokens are stored **hashed** — a leaked Redis dump never yields a usable token.
- **HTTP hardening.** helmet, CORS, compression, rate limiting (global + a 5/15-min limiter on email-sending endpoints), and 10kb JSON body caps.
- **Cookies.** The refresh token is httpOnly, `sameSite: strict`, and `secure` in production.
- **Structured logging.** pino with request IDs; 5xx errors are logged with stack traces, and error responses never leak internals in production.

## Known caveats

These are trade-offs we made on purpose, but you should know about them before going to production:

- **`CORS_ORIGIN` defaults to `*`.** Set it to your real frontend origin before deploying.
- **Refresh cookie path is hardcoded** to `/api/v1/auth` in `auth.controller.ts`. If you change `API_PREFIX`, the cookie path does not follow (`TODO: verify`).
- **VAPID keys are required at boot.** The placeholder keys in `.env.example` are intentionally rejected; generate real ones with `pnpm generate:vapid`.
- **No authentication bypass protections beyond what's listed.** There's no rate limiting on login/register beyond the global limiter, no lockout policy, and no refresh-token rotation on concurrent-use detection. If your deployment needs those, they're fair game for a PR.

## Supported versions

The project is at `1.0.0` and there's no formal release train yet. In practice: the current `main` branch receives fixes first, and security fixes are backported on request. If you're running an older state of the repo and hit a vulnerability, the fix will land on `main` — pull it into your fork.
