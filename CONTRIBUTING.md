# Contributing to Nodist

Thanks for wanting to help. This guide covers how to get the project running locally, how we structure branches and commits, and what we check before a pull request gets merged.

## Development setup

1. Fork the repo and clone your fork:

   ```bash
   git clone https://github.com/parvejhossain55/nodist.git
   cd nodist
   ```

2. Install dependencies. We use **pnpm**, so please don't commit a `package-lock.json` or `yarn.lock`:

   ```bash
   pnpm install
   ```

3. Create your `.env` and fill in the required values:

   ```bash
   cp .env.example .env
   ```

   The server validates env vars at boot and exits with a clear error if anything required is missing. `MONGO_URI` and `REDIS_URL` must point at running instances — a local MongoDB and Redis work fine.

4. If you're touching web push code, generate real VAPID keys:

   ```bash
   pnpm generate:vapid
   ```

   Copy the output into `.env`. The placeholder keys in `.env.example` will make the server refuse to start.

5. Run the dev server:

   ```bash
   pnpm dev
   ```

   It listens on `http://localhost:4000` and reloads on save.

## Branch strategy

- Branch off `main`. Use a descriptive name with a `type/` prefix, matching the change:

  ```
  feat/email-templates
  fix/refresh-token-race
  docs/api-reference
  refactor/user-service
  ```

- One logical change per branch. If you're fixing a bug and adding a feature, that's two branches.
- Push the branch and open a pull request into `main`. Keep PRs small — the review is faster and the blame stays readable.

## Commit convention

We use [conventional commits](https://www.conventionalcommits.org/), enforced by commitlint in a husky `commit-msg` hook. Non-conventional messages are rejected at commit time, so there's no escaping this.

```
<type>(<optional scope>): <short summary>
```

Common types: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `perf`, `style`, `build`, `ci`.

Good examples:

```
feat(auth): add email verification resend endpoint
fix(notification): emit socket event after transaction completes
docs: add README with setup and API reference
```

Keep the summary under ~70 chars, written in the imperative ("add", not "added"). If the change needs more explanation, use the commit body.

## Before you open a PR

Husky runs `lint-staged` on every commit, which lints and formats the staged files. On top of that, run the full checks locally:

```bash
pnpm lint        # eslint on src/**/*.ts
pnpm build       # type-check + compile (strict mode, so this catches real issues)
```

Both must pass. There's no `format` check in CI, but running `pnpm format` before pushing keeps diffs tidy.

## Testing

`tests/` is currently empty and no test runner is configured — this is the biggest gap in the project, and test contributions are very welcome. If you add tests:

- Put them in `tests/`, one folder per module (e.g. `tests/auth/`).
- Wire the runner into `package.json` and document it in the README `Testing` section.

## PR checklist

- [ ] Branch is up to date with `main`
- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes (this is the type-check)
- [ ] Commit messages follow conventional commits
- [ ] Only files related to this change are touched (no lockfile churn unless deps changed)
- [ ] New env vars are added to `.env.example` and documented in the README table
- [ ] New endpoints include a Zod validation schema and are documented in the README API reference
- [ ] New behaviour that creates notifications / web pushes is wired through `NotificationService` or `PushService` rather than duplicated

That's it. If something in this guide is out of date, fix it in the same PR — docs rot fast.
