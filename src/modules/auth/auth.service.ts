import { ConflictError, UnauthorizedError } from '@common/errors/AppError';
import { config } from '@config/index';
import { redisClient } from '@database/redis/connection';
import { IUser } from '@modules/user/user.model';
import { IUserRepository } from '@modules/user/user.repository.interface';
import {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from './auth.validation';
import {
  generateAccessToken,
  generateRefreshToken,
  generateSecureToken,
  hashToken,
  parseExpiryToSeconds,
  verifyRefreshToken,
} from './auth.utils';
import { sanitize } from '@modules/user/user.utils';
import { sendEmail } from '@common/utils/mailSender';
import { NotificationService } from '@modules/notification/notification.service';

interface RefreshTokenResult {
  accessToken: string;
  refreshToken: string;
}

interface AuthResult extends RefreshTokenResult {
  user: Record<string, unknown>;
}

const REFRESH_TOKEN_PREFIX = 'refresh_token:';
const EMAIL_VERIFY_PREFIX = 'email_verify:';
const PASSWORD_RESET_PREFIX = 'password_reset:';

const EMAIL_VERIFY_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const PASSWORD_RESET_TTL_SECONDS = 15 * 60; // 15 minutes

export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly notificationService: NotificationService,
  ) {}

  private async issueTokens(user: IUser): Promise<AuthResult> {
    const accessToken = generateAccessToken({ sub: user.id, role: user.role });
    const { refreshToken, jti } = generateRefreshToken(user.id);

    const ttlSeconds = parseExpiryToSeconds(config.jwt.refreshExpiresIn);
    await redisClient.set(`${REFRESH_TOKEN_PREFIX}${user.id}`, jti, 'EX', ttlSeconds);

    return { user: sanitize(user), accessToken, refreshToken };
  }

  private async sendVerificationEmail(user: IUser): Promise<void> {
    const token = generateSecureToken();
    await redisClient.set(
      `${EMAIL_VERIFY_PREFIX}${hashToken(token)}`,
      user.id,
      'EX',
      EMAIL_VERIFY_TTL_SECONDS,
    );

    const verifyUrl = `${config.frontendUrl}/verify-email?token=${token}`;
    await sendEmail({
      to: user.email,
      subject: 'Verify your email address',
      html: `<p>Hi ${user.name},</p><p>Please verify your email address by clicking the link below. This link expires in 24 hours.</p><p><a href="${verifyUrl}">Verify Email</a></p><p>If you didn't create this account, you can safely ignore this email.</p>`,
    });
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await this.userRepository.findByEmail(input.email, true);
    if (existing) throw new ConflictError('Email already registered');

    const user = await this.userRepository.create(input);
    await this.sendVerificationEmail(user);
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

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.userRepository.findByIDWithPassword(userId);
    if (!user) throw new UnauthorizedError('User no longer exists');

    const isValid = await user.comparePassword(input.currentPassword);
    if (!isValid) throw new UnauthorizedError('Current password is incorrect');

    user.password = input.newPassword;
    await user.save();

    await redisClient.del(`${REFRESH_TOKEN_PREFIX}${userId}`);
  }

  async verifyEmail(token: string): Promise<void> {
    const key = `${EMAIL_VERIFY_PREFIX}${hashToken(token)}`;
    const userId = await redisClient.get(key);
    if (!userId) throw new UnauthorizedError('Invalid or expired verification token');

    const user = await this.userRepository.findById(userId);
    if (!user) throw new UnauthorizedError('User no longer exists');

    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
      await user.save();
    }

    await this.notificationService.create({
      recipient: user.id,
      type: 'welcome',
      title: 'Welcome to Nodist!',
      message: `Hi ${user.name}, your email has been verified and your account is now active.`,
    });

    await redisClient.del(key);
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user || user.isEmailVerified) return;

    await this.sendVerificationEmail(user);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) return;

    const token = generateSecureToken();
    await redisClient.set(
      `${PASSWORD_RESET_PREFIX}${hashToken(token)}`,
      user.id,
      'EX',
      PASSWORD_RESET_TTL_SECONDS,
    );

    const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;
    await sendEmail({
      to: user.email,
      subject: 'Reset your password',
      html: `<p>Hi ${user.name},</p><p>We received a request to reset your password. This link expires in 15 minutes.</p><p><a href="${resetUrl}">Reset Password</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
    });
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const key = `${PASSWORD_RESET_PREFIX}${hashToken(input.token)}`;
    const userId = await redisClient.get(key);
    if (!userId) throw new UnauthorizedError('Invalid or expired reset token');

    const user = await this.userRepository.findById(userId);
    if (!user) throw new UnauthorizedError('User no longer exists');

    user.password = input.newPassword;
    await user.save();

    await redisClient.del(key);
    await redisClient.del(`${REFRESH_TOKEN_PREFIX}${userId}`);
  }
}
