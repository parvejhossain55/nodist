import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ZodError } from 'zod';
import { validate } from '@common/middlewares/validate';

describe('validate middleware', () => {
  const schema = z.object({
    body: z.object({ name: z.string().min(2) }),
    query: z.object({ page: z.coerce.number().default(1) }),
  });

  function mockCtx() {
    const req = { body: {}, query: {}, params: {} } as Request;
    const res = {} as Response;
    const next = jest.fn() as jest.MockedFunction<NextFunction>;
    return { req, res, next };
  }

  it('parses valid input and calls next', () => {
    const { req, res, next } = mockCtx();
    req.body = { name: 'Alice' };
    req.query = { page: '2' };

    validate(schema)(req, res, next);

    expect(req.body).toEqual({ name: 'Alice' });
    expect(req.query).toEqual({ page: 2 });
    expect(next).toHaveBeenCalledWith();
  });

  it('passes ZodError through for invalid input', () => {
    const { req, res, next } = mockCtx();
    req.body = { name: 'A' };

    expect(() => validate(schema)(req, res, next)).toThrow(ZodError);
    expect(next).not.toHaveBeenCalled();
  });
});
