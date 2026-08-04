import { Request, Response } from 'express';
import { catchAsync } from '@common/utils/catchAsync';
import { ApiResponse } from '@common/utils/ApiResponse';
import { UnauthorizedError } from '@common/errors/AppError';
import { config } from '@config/index';
import { UserRepository } from '@modules/user/user.repository';
import { AuthService } from './auth.service';
import { parseExpiryToSeconds } from './auth.utils';

const authService = new AuthService(new UserRepository());

const REFRESH_COOKIE_NAME = 'refreshToken';

const cookieOptions = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: 'strict' as const,
  path: '/api/v1/auth',
  maxAge: parseExpiryToSeconds(config.jwt.refreshExpiresIn) * 1000, // seconds → ms
};

export const authController = {
  register: catchAsync(async (req: Request, res: Response) => {
    const { accessToken, refreshToken, user } = await authService.register(req.body);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);
    ApiResponse.created(res, { user, accessToken }, 'Registered successfully');
  }),

  login: catchAsync(async (req: Request, res: Response) => {
    const { accessToken, refreshToken, user } = await authService.login(req.body);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);
    ApiResponse.ok(res, { user, accessToken }, 'Logged in successfully');
  }),

  refresh: catchAsync(async (req: Request, res: Response) => {
    const token = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;
    if (!token) throw new UnauthorizedError('Refresh token missing');

    const { accessToken, refreshToken } = await authService.refresh(token);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);
    ApiResponse.ok(res, { accessToken }, 'Token refreshed');
  }),

  logout: catchAsync(async (req: Request, res: Response) => {
    if (req.user) await authService.logout(req.user.sub);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
    ApiResponse.ok(res, null, 'Logged out successfully');
  }),

  me: catchAsync(async (req: Request, res: Response) => {
    const user = await authService.getCurrentUser(req.user!.sub);
    ApiResponse.ok(res, user);
  }),
};
