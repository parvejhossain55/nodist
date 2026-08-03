import Redis from 'ioredis';
import { config } from '@config/index';
import { logger } from '@common/logger';

export const redisClient = new Redis(config.redis.url, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 200, 5000),
  lazyConnect: true,
});

redisClient.on('connect', () => logger.info('Redis connected'));
redisClient.on('error', (err) => logger.error({ err }, 'Redis connection error'));

export async function connectRedis(): Promise<void> {
  await redisClient.connect();
}

export async function disconnectRedis(): Promise<void> {
  redisClient.disconnect();
}
