import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { config } from '@config/index';

export interface AccessTokenPayload {
  sub: string;
  role: string;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string; // unique token ID to track on redis
}

export function generateAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expiresIn: config.jwt.accessExpiresIn as any,
  });
}

export function generateRefreshToken(userId: string): { refreshToken: string; jti: string } {
  const jti = randomUUID();
  const token = jwt.sign({ sub: userId, jti } as RefreshTokenPayload, config.jwt.refreshSecret, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expiresIn: config.jwt.refreshExpiresIn as any,
  });
  return { refreshToken: token, jti };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.jwt.accessSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, config.jwt.refreshSecret) as RefreshTokenPayload;
}

export function parseExpiryToSeconds(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60; // fallback: 7 days
  const [, value, unit] = match;
  const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[unit] ?? 86400;
  return Number(value) * multiplier;
}
