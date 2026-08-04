import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { AppError } from '@common/errors/AppError';
import { logger } from '@common/logger';
import { config } from '@config/index';

interface ErrorBody {
  success: false;
  message: string;
  details?: unknown;
  stack?: string;
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  let statusCode = 500;
  let message = 'Something went wrong';
  let details: unknown;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 422;
    message = 'Validation failed';
    details = err.issues.reduce<Record<string, string[]>>((acc, issue) => {
      const field = issue.path.slice(1).join('.') || issue.path.join('.');
      if (!acc[field]) acc[field] = [];
      acc[field].push(issue.message);
      return acc;
    }, {});
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid value for field '${err.path}'`;
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 422;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => e.message);
  } else if (isMongoDuplicateKeyError(err)) {
    statusCode = 409;
    message = 'Duplicate value for a unique field';
    details = err.keyValue;
  } else if (err instanceof Error) {
    message = config.isProduction ? message : err.message;
  }

  const isServerError = statusCode >= 500;

  logger[isServerError ? 'error' : 'warn'](
    {
      err: {
        name: err instanceof Error ? err.name : 'UnknownError',
        message,
        ...(isServerError && err instanceof Error ? { stack: err.stack } : {}),
      },
      path: req.originalUrl,
      method: req.method,
      statusCode,
    },
    message,
  );

  const body: ErrorBody = { success: false, message };
  if (details != undefined) body.details = details;
  if (!config.isProduction && err instanceof Error) body.stack = err.stack;

  res.status(statusCode).json(body);
}

function isMongoDuplicateKeyError(
  err: unknown,
): err is { code: number; keyValue: Record<string, unknown> } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === 11000
  );
}
