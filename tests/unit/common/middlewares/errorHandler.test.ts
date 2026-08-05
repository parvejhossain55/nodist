import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { AppError, NotFoundError } from '@common/errors/AppError';
import { errorHandler } from '@common/middlewares/errorHandler';

function mockCtx() {
  const json = jest.fn();
  const res = { status: jest.fn().mockReturnValue({ json }) } as unknown as Response;
  const req = { originalUrl: '/api/v1/test', method: 'GET' } as Request;
  const next = jest.fn() as jest.MockedFunction<NextFunction>;
  return { res, req, next, json };
}

describe('errorHandler', () => {
  it('responds with the AppError status and message', () => {
    const { res, req, next, json } = mockCtx();

    errorHandler(new NotFoundError('Missing thing'), req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Missing thing' }),
    );
  });

  it('keeps error details for AppError subclasses', () => {
    const { res, req, next, json } = mockCtx();

    errorHandler(new AppError('Conflict', 409, { field: 'email' }), req, res, next);

    expect(json.mock.calls[0][0]).toMatchObject({
      message: 'Conflict',
      details: { field: 'email' },
    });
  });

  it('maps ZodError to 422 with per-field issues', () => {
    const { res, req, next, json } = mockCtx();
    let zodErr: unknown;
    try {
      z.object({ body: z.object({ email: z.string().email() }) }).parse({
        body: { email: 'nope' },
      });
    } catch (err) {
      zodErr = err;
    }

    errorHandler(zodErr, req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(json.mock.calls[0][0].details.email).toEqual(['Invalid email address']);
  });

  it('maps mongoose CastError to 400', () => {
    const { res, req, next } = mockCtx();
    const castError = new mongoose.Error.CastError('ObjectId', 'abc', 'id');

    errorHandler(castError, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('maps mongoose ValidationError to 422', () => {
    const { res, req, next } = mockCtx();
    const validationError = new mongoose.Error.ValidationError();
    validationError.errors = {
      email: new mongoose.Error.ValidatorError({ message: 'Email is invalid', path: 'email' }),
    };

    errorHandler(validationError, req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('maps duplicate key errors to 409', () => {
    const { res, req, next, json } = mockCtx();
    const dupError = { code: 11000, keyValue: { email: 'taken@example.com' } };

    errorHandler(dupError, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(json.mock.calls[0][0].message).toBe('Duplicate value for a unique field');
  });

  it('maps unknown errors to 500 and exposes the message outside production', () => {
    const { res, req, next, json } = mockCtx();

    errorHandler(new Error('kaboom'), req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(json.mock.calls[0][0]).toMatchObject({
      success: false,
      message: 'kaboom',
    });
    expect(json.mock.calls[0][0].stack).toBeTruthy();
  });
});
