import { ConflictError, UnauthorizedError } from '@common/errors/AppError';
import { redisClient } from '@database/redis/connection';
import { sendEmail } from '@common/utils/mailSender';
import { generateRefreshToken } from '@modules/auth/auth.utils';
import { AuthService } from '@modules/auth/auth.service';
import type { IUser } from '@modules/user/user.model';
import type { IUserRepository } from '@modules/user/user.repository.interface';
import type { NotificationService } from '@modules/notification/notification.service';

jest.mock('@database/redis/connection', () => ({
  redisClient: { set: jest.fn(), get: jest.fn(), del: jest.fn() },
}));

jest.mock('@common/utils/mailSender', () => ({
  sendEmail: jest.fn(),
}));

const redis = redisClient as unknown as { set: jest.Mock; get: jest.Mock; del: jest.Mock };
const mail = sendEmail as jest.Mock;

const USER_ID = '507f1f77bcf86cd799439011';

function makeUser(overrides: Partial<Record<string, unknown>> = {}): IUser {
  const doc = {
    _id: USER_ID,
    id: USER_ID,
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashed-password',
    role: 'user',
    isActive: true,
    isEmailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    ...doc,
    ...overrides,
    comparePassword: jest.fn().mockResolvedValue(true),
    save: jest.fn().mockResolvedValue(undefined),
    toObject: jest.fn().mockReturnValue({ ...doc, ...overrides }),
  } as unknown as IUser;
}

describe('AuthService', () => {
  let userRepository: IUserRepository;
  let notificationService: NotificationService;
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();

    userRepository = {
      findByEmail: jest.fn(),
      findByIDWithPassword: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      findMany: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
      count: jest.fn(),
    } as unknown as IUserRepository;

    notificationService = { create: jest.fn() } as unknown as NotificationService;
    service = new AuthService(userRepository, notificationService);
  });

  describe('register', () => {
    it('creates the user, sends a verification email and issues tokens', async () => {
      const user = makeUser();
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (userRepository.create as jest.Mock).mockResolvedValue(user);

      const result = await service.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com', true);
      expect(userRepository.create).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mail).toHaveBeenCalledTimes(1);
      expect(mail.mock.calls[0][0]).toMatchObject({ to: 'test@example.com' });
      // refresh token + email-verify token are both stored
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('refresh_token:'),
        expect.any(String),
        'EX',
        expect.any(Number),
      );
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('email_verify:'),
        USER_ID,
        'EX',
        expect.any(Number),
      );
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.user.password).toBeUndefined();
    });

    it('throws ConflictError when the email is already registered', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(makeUser());

      await expect(
        service.register({
          name: 'Test User',
          email: 'taken@example.com',
          password: 'password123',
        }),
      ).rejects.toBeInstanceOf(ConflictError);
      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('logs in a valid user and issues tokens', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(makeUser());

      const result = await service.login({ email: 'test@example.com', password: 'password123' });

      expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com', true);
      expect(result.accessToken).toBeTruthy();
      expect(result.user.email).toBe('test@example.com');
    });

    it('throws UnauthorizedError for an unknown email', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'password123' }),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it('throws UnauthorizedError for a wrong password', async () => {
      const user = makeUser();
      (user.comparePassword as jest.Mock).mockResolvedValue(false);
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(user);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });

  describe('refresh', () => {
    it('rotates the refresh token', async () => {
      const user = makeUser();
      const { refreshToken, jti } = generateRefreshToken(user.id);
      redis.get.mockResolvedValue(jti);
      (userRepository.findById as jest.Mock).mockResolvedValue(user);

      const result = await service.refresh(refreshToken);

      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(redis.set).toHaveBeenCalledWith(
        `refresh_token:${user.id}`,
        expect.any(String),
        'EX',
        expect.any(Number),
      );
    });

    it('throws UnauthorizedError for an invalid token', async () => {
      await expect(service.refresh('not-a-valid-token')).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it('throws UnauthorizedError when the token has been revoked', async () => {
      const user = makeUser();
      const { refreshToken } = generateRefreshToken(user.id);
      redis.get.mockResolvedValue('a-different-jti');
      (userRepository.findById as jest.Mock).mockResolvedValue(user);

      await expect(service.refresh(refreshToken)).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it('throws UnauthorizedError when the user no longer exists', async () => {
      const { refreshToken, jti } = generateRefreshToken(USER_ID);
      redis.get.mockResolvedValue(jti);
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.refresh(refreshToken)).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });

  describe('logout', () => {
    it('removes the stored refresh token', async () => {
      await service.logout(USER_ID);
      expect(redis.del).toHaveBeenCalledWith(`refresh_token:${USER_ID}`);
    });
  });

  describe('getCurrentUser', () => {
    it('returns the sanitized user', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(makeUser());

      const result = await service.getCurrentUser(USER_ID);

      expect(result.email).toBe('test@example.com');
      expect(result.password).toBeUndefined();
    });

    it('throws UnauthorizedError when the user is missing', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.getCurrentUser(USER_ID)).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });

  describe('changePassword', () => {
    it('updates the password and invalidates refresh tokens', async () => {
      const user = makeUser();
      (userRepository.findByIDWithPassword as jest.Mock).mockResolvedValue(user);

      await service.changePassword(USER_ID, {
        currentPassword: 'old-password',
        newPassword: 'new-password-123',
      });

      expect(user.comparePassword).toHaveBeenCalledWith('old-password');
      expect(user.password).toBe('new-password-123');
      expect(user.save).toHaveBeenCalled();
      expect(redis.del).toHaveBeenCalledWith(`refresh_token:${USER_ID}`);
    });

    it('throws UnauthorizedError when the current password is wrong', async () => {
      const user = makeUser();
      (user.comparePassword as jest.Mock).mockResolvedValue(false);
      (userRepository.findByIDWithPassword as jest.Mock).mockResolvedValue(user);

      await expect(
        service.changePassword(USER_ID, {
          currentPassword: 'wrong',
          newPassword: 'new-password-123',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedError);
      expect(user.save).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedError when the user does not exist', async () => {
      (userRepository.findByIDWithPassword as jest.Mock).mockResolvedValue(null);

      await expect(
        service.changePassword(USER_ID, {
          currentPassword: 'old-password',
          newPassword: 'new-password-123',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });

  describe('verifyEmail', () => {
    it('marks the email verified and creates a welcome notification', async () => {
      const user = makeUser();
      redis.get.mockResolvedValue(USER_ID);
      (userRepository.findById as jest.Mock).mockResolvedValue(user);

      await service.verifyEmail('raw-verification-token');

      expect(user.isEmailVerified).toBe(true);
      expect(user.save).toHaveBeenCalled();
      expect(notificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({ recipient: USER_ID, type: 'welcome' }),
      );
      expect(redis.del).toHaveBeenCalledWith(expect.stringContaining('email_verify:'));
    });

    it('throws UnauthorizedError for an invalid/expired token', async () => {
      redis.get.mockResolvedValue(null);

      await expect(service.verifyEmail('bad-token')).rejects.toBeInstanceOf(UnauthorizedError);
      expect(notificationService.create).not.toHaveBeenCalled();
    });
  });

  describe('resendVerification', () => {
    it('sends a new verification email for an unverified user', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(makeUser());

      await service.resendVerification('test@example.com');

      expect(mail).toHaveBeenCalledTimes(1);
    });

    it('does nothing for a verified user', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(
        makeUser({ isEmailVerified: true }),
      );

      await service.resendVerification('test@example.com');

      expect(mail).not.toHaveBeenCalled();
    });

    it('does nothing when no user exists', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      await service.resendVerification('nobody@example.com');

      expect(mail).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('sends a reset email for an existing user', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(makeUser());

      await service.forgotPassword('test@example.com');

      expect(mail).toHaveBeenCalledTimes(1);
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('password_reset:'),
        USER_ID,
        'EX',
        expect.any(Number),
      );
    });

    it('stays silent when no user exists', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      await service.forgotPassword('nobody@example.com');

      expect(mail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('resets the password and invalidates tokens', async () => {
      const user = makeUser();
      redis.get.mockResolvedValue(USER_ID);
      (userRepository.findById as jest.Mock).mockResolvedValue(user);

      await service.resetPassword({ token: 'raw-reset-token', newPassword: 'fresh-password-1' });

      expect(user.password).toBe('fresh-password-1');
      expect(user.save).toHaveBeenCalled();
      expect(redis.del).toHaveBeenCalledTimes(2);
    });

    it('throws UnauthorizedError for an invalid token', async () => {
      redis.get.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'bad-token', newPassword: 'fresh-password-1' }),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });
});
