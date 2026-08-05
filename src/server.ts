import http from 'http';
import { createApp } from 'app';
import { config } from '@config/index';
import { logger } from '@common/logger';
import { connectMongo, disconnectMongo } from '@database/mongodb/connection';
import { connectRedis, disconnectRedis } from '@database/redis/connection';
import { initSocket } from '@sockets/index';

async function bootstrap(): Promise<void> {
  await connectMongo();
  await connectRedis();

  const app = createApp();
  const httpServer = http.createServer(app);
  initSocket(httpServer);

  const server = httpServer.listen(config.port, () => {
    logger.info(`=> Nodist running on port ${config.port} [${config.env}]`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);

    server.close(async () => {
      try {
        await disconnectMongo();
        await disconnectRedis();

        logger.info('All connection closed. Existing.');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during shutdown');
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
    shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception');
    shutdown('uncaughtException');
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server: ', err);
  process.exit(1);
});
