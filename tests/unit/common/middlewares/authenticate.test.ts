import { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '@common/errors/AppError';
import { authenticate, authorize } from '@common/middlewares/authenticate';
import { generateAccessToken } from '@modules/auth/auth.utils';

function mockCtx() {
  const req = { headers: {} } as Request;
  const res = {} as Response;
  const next = jest.fn() as jest.MockedFunction<NextFunction>;
  return { req, res, next };
}

describe('authenticate', () => {
  it('sets req.user from a valid Bearer token', () => {
    const { req, res, next } = mockCtx();
    const token = generateAccessToken({ sub: 'u1', role: 'admin' });
    req.headers.authorization = `Bearer ${token}`;

    authenticate(req, res, next);

    // jwt.sign adds iat/exp to the payload — check the app-specific claims.
    expect(req.user).toMatchObject({ sub: 'u1', role: 'admin' });
    expect(next).toHaveBeenCalledWith();
  });

  it('throws UnauthorizedError when the header is missing', () => {
    const { req, res, next } = mockCtx();

    expect(() => authenticate(req, res, next)).toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError for a malformed header', () => {
    const { req, res, next } = mockCtx();
    req.headers.authorization = 'Basic abc123';

    expect(() => authenticate(req, res, next)).toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError for an invalid token', () => {
    const { req, res, next } = mockCtx();
    req.headers.authorization = 'Bearer not-a-real-token';

    expect(() => authenticate(req, res, next)).toThrow(UnauthorizedError);
  });
});

describe('authorize', () => {
  it('allows a user with a permitted role', () => {
    const { req, res, next } = mockCtx();
    req.user = { sub: 'u1', role: 'admin' };

    authorize('admin')(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects a user without a permitted role', () => {
    const { req, res, next } = mockCtx();
    req.user = { sub: 'u1', role: 'user' };

    expect(() => authorize('admin')(req, res, next)).toThrow(UnauthorizedError);
  });

  it('throws when no user is attached', () => {
    const { req, res, next } = mockCtx();

    expect(() => authorize('admin')(req, res, next)).toThrow(UnauthorizedError);
  });
});
