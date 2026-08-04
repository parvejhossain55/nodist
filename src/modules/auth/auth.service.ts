import { ConflictError, UnauthorizedError } from '@common/errors/AppError';
import { config } from '@config/index';
import { redisClient } from '@database/redis/connection';
import { IUser } from '@modules/user/user.model';
import { IUserRepository } from '@modules/user/user.repository.interface';
import { LoginInput, RegisterInput } from './auth.validation';
import {
  generateAccessToken,
  generateRefreshToken,
  parseExpiryToSeconds,
  verifyRefreshToken,
} from './auth.utils';
import { sanitize } from '@modules/user/user.utils';

interface RefreshTokenResult {
  accessToken: string;
  refreshToken: string;
}

interface AuthResult extends RefreshTokenResult {
  user: Record<string, unknown>;
}

const REFRESH_TOKEN_PREFIX = 'refresh_token:';

export class AuthService {
  constructor(private readonly userRepository: IUserRepository) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await this.userRepository.findByEmail(input.email, true);
    if (existing) throw new ConflictError('Email already registered');

    const user = await this.userRepository.create(input);
    return await this.issueTokens(user);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.userRepository.findByEmail(input.email, true);
    if (!user) throw new UnauthorizedError('Invalid email or password');

    const isValid = await user.comparePassword(input.password);
    if (!isValid) throw new UnauthorizedError('Invalid email or password');

    return await this.issueTokens(user);
  }

  async refresh(token: string): Promise<RefreshTokenResult> {
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new UnauthorizedError('Invalid or expire refresh token');
    }

    const storedJti = await redisClient.get(`${REFRESH_TOKEN_PREFIX}${payload.sub}`);
    if (!storedJti || storedJti !== payload.jti) {
      throw new UnauthorizedError('Refresh token has been revoked');
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user) throw new UnauthorizedError('User no longer exist');

    return await this.issueTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await redisClient.del(`${REFRESH_TOKEN_PREFIX}${userId}`);
  }

  async getCurrentUser(userId: string): Promise<Record<string, unknown>> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UnauthorizedError('User no longer exists');
    return sanitize(user);
  }

  private async issueTokens(user: IUser): Promise<AuthResult> {
    const accessToken = generateAccessToken({ sub: user.id, role: user.role });
    const { refreshToken, jti } = generateRefreshToken(user.id);

    const ttlSeconds = parseExpiryToSeconds(config.jwt.refreshExpiresIn);
    await redisClient.set(`${REFRESH_TOKEN_PREFIX}${user.id}`, jti, 'EX', ttlSeconds);

    return { user: sanitize(user), accessToken, refreshToken };
  }
}
