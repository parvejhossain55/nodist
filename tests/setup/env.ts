/**
 * Test environment variables.
 *
 * `src/config/env.ts` validates the environment at import time, so every
 * required variable must be present before any source module is loaded.
 * This file runs first via jest `setupFiles`.
 *
 * Note: `dotenv` never overrides already-set variables, so a local `.env`
 * file will NOT clobber these values.
 */
process.env.NODE_ENV = 'test';
process.env.PORT = '4000';
process.env.API_PREFIX = '/api/v1';

// Database / Redis — never actually connected in tests (unit tests mock the
// repositories / redis module; integration tests use mongodb-memory-server).
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/nodist-test';
process.env.REDIS_URL = 'redis://127.0.0.1:6379';

// Auth — must be >= 32 chars per the env schema.
process.env.JWT_ACCESS_SECRET = 'test-access-secret-0123456789abcdef0123456789abcdef';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-0123456789abcdef0123456789abcdef';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

// CORS / rate limiting.
process.env.CORS_ORIGIN = '*';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '1000';

// Logging — keep test output quiet.
process.env.LOG_LEVEL = 'fatal';

// SMTP — never reached; mailSender is mocked in tests.
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_PORT = '1025';
process.env.SMTP_USER = 'test';
process.env.SMTP_PASSWORD = 'test';
process.env.SMTP_FROM = 'test@nodist.dev';

process.env.FRONTEND_URL = 'http://localhost:3000';

// Web Push — placeholders; web-push only validates on send.
process.env.VAPID_SUBJECT = 'mailto:test@nodist.dev';
process.env.VAPID_PUBLIC_KEY = 'test-vapid-public-key';
process.env.VAPID_PRIVATE_KEY = 'test-vapid-private-key';
