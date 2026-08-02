import pino from 'pino';
import { config } from '@config/index';

export const logger = pino({
  level: config.log.level,
  transport: config.isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname,env,test',
          singleLine: true,
        },
      }
    : undefined,
  base: {
    env: config.env,
  },
});
