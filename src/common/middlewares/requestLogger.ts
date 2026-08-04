import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import { logger } from '@common/logger';
import { config } from '@config/index';

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers['x-request-id'];
    const id = (existing as string) || randomUUID();
    res.setHeader('x-request-id', id);
    return id;
  },
  customLogLevel: (_req, res) => {
    if (res.statusCode >= 400) return 'silent';
    return 'info';
  },
  autoLogging: {
    ignore: (req) => req.url === `${config.apiPrefix}/health/live`,
  },
  serializers: config.isDevelopment
    ? {
        req: (req) => ({ method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      }
    : undefined,
});
