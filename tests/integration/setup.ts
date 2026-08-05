import { readFileSync } from 'fs';
import mongoose from 'mongoose';
import { MONGO_URI_FILE } from './globalSetup';

/**
 * Replace external services with in-memory / fake implementations before any
 * test file imports the app:
 *
 * - `@database/redis/connection` → ioredis-mock (fast, in-memory Redis)
 * - `@common/utils/mailSender`   → jest.fn capturing sent emails (we need the
 *   raw verification/reset tokens to drive the email flows end-to-end)
 */
jest.mock('@database/redis/connection', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RedisMock = require('ioredis-mock');

  const client = new RedisMock();

  return {
    redisClient: client,
    connectRedis: async () => client.connect(),
    disconnectRedis: async () => client.disconnect(),
  };
});

jest.mock('@common/utils/mailSender', () => ({
  sendEmail: jest.fn(),
}));

beforeAll(async () => {
  const uri = readFileSync(MONGO_URI_FILE, 'utf8').trim();

  // Jest runs test files in parallel workers — give each worker its own
  // database so `dropDatabase` in one file can't wipe another file's data.
  await mongoose.connect(uri, { dbName: `nodist_test_${process.pid}` });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
