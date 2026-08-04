import { NotFoundError } from '@common/errors/AppError';
import { Request, Response, NextFunction } from 'express';

export function notFoundHandler(req: Request, _: Response, next: NextFunction): void {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
}
