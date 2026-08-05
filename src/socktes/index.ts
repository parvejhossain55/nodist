import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from '@config/index';
import { logger } from '@common/logger';
import { verifyAccessToken } from '@modules/auth/auth.utils';

let io: Server;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: config.cors.origin, credentials: true },
  });

  io.use((socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error('Authentication required'));

      const payload = verifyAccessToken(token);
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    logger.info({ userId: socket.data.user?.sub }, 'Socket connected');

    socket.on('disconnect', (reason) => {
      logger.info({ userId: socket.data.user?.sub, reason }, 'Socket disconnected');
    });
  });

  logger.info('=> Socket.io initialized');
  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io not initialized. Call initSocket() first.');
  return io;
}
