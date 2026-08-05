import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  verifyEmailSchema,
  resetPasswordSchema,
} from '@modules/auth/auth.validation';

const validRegister = {
  body: { name: 'Test User', email: 'test@example.com', password: 'password123' },
};

describe('auth validation schemas', () => {
  describe('registerSchema', () => {
    it('accepts a valid payload', () => {
      expect(() => registerSchema.parse(validRegister)).not.toThrow();
    });

    it('rejects a short password', () => {
      expect(() =>
        registerSchema.parse({ body: { ...validRegister.body, password: 'short' } }),
      ).toThrow();
    });

    it('rejects an invalid email', () => {
      expect(() =>
        registerSchema.parse({ body: { ...validRegister.body, email: 'not-an-email' } }),
      ).toThrow();
    });

    it('rejects a name that is too short', () => {
      expect(() => registerSchema.parse({ body: { ...validRegister.body, name: 'A' } })).toThrow();
    });
  });

  describe('loginSchema', () => {
    it('accepts a valid payload', () => {
      expect(() =>
        loginSchema.parse({ body: { email: 'test@example.com', password: 'x' } }),
      ).not.toThrow();
    });

    it('rejects a missing password', () => {
      expect(() => loginSchema.parse({ body: { email: 'test@example.com' } })).toThrow();
    });
  });

  describe('changePasswordSchema', () => {
    it('accepts a valid payload', () => {
      expect(() =>
        changePasswordSchema.parse({
          body: { currentPassword: 'old-pass', newPassword: 'new-password-123' },
        }),
      ).not.toThrow();
    });

    it('rejects a new password that is too short', () => {
      expect(() =>
        changePasswordSchema.parse({
          body: { currentPassword: 'old-pass', newPassword: 'abc' },
        }),
      ).toThrow();
    });
  });

  describe('verifyEmailSchema', () => {
    it('requires a non-empty token', () => {
      expect(() => verifyEmailSchema.parse({ body: { token: '' } })).toThrow();
      expect(() => verifyEmailSchema.parse({ body: { token: 'tok' } })).not.toThrow();
    });
  });

  describe('resetPasswordSchema', () => {
    it('accepts a valid payload', () => {
      expect(() =>
        resetPasswordSchema.parse({ body: { token: 'tok', newPassword: 'new-password-123' } }),
      ).not.toThrow();
    });

    it('rejects a missing token', () => {
      expect(() =>
        resetPasswordSchema.parse({ body: { newPassword: 'new-password-123' } }),
      ).toThrow();
    });
  });
});
