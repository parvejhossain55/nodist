import express, { Application } from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from '@config/index';
import { requestLogger } from '@common/middlewares/requestLogger';
import { rateLimiter } from '@common/middlewares/rateLimiter';
import { notFoundHandler } from '@common/middlewares/notFoundHandler';
import { errorHandler } from '@common/middlewares/errorHandler';
import { routes } from '@modules/routes';

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: config.cors.origin, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  app.use(cookieParser());
  app.use(requestLogger);
  app.use(rateLimiter);

  app.use(express.static(path.join(process.cwd(), 'public')));

  app.use(config.apiPrefix, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
