import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { redisClient } from '@database/redis/connection';
import { ApiResponse } from '@common/utils/ApiResponse';

const router = Router();

router.get('/live', (_req: Request, res: Response) => {
  ApiResponse.ok(res, { status: 'up' }, 'Service is live');
});

router.get('/ready', async (_req: Request, res: Response) => {
  const mongoOk = mongoose.connection.readyState === 1;
  const redisOk = redisClient.status === 'ready';
  const ready = mongoOk && redisOk;

  ApiResponse.send(res, ready ? 200 : 503, ready ? 'Ready' : 'Not ready', {
    mongo: mongoOk ? 'up' : 'down',
    redis: redisOk ? 'up' : 'down',
  });
});

export const healthRoutes = router;
