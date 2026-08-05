import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  parseExpiryToSeconds,
  generateSecureToken,
  hashToken,
} from '@modules/auth/auth.utils';

describe('auth.utils', () => {
  describe('parseExpiryToSeconds', () => {
    it.each([
      ['30s', 30],
      ['15m', 900],
      ['1h', 3600],
      ['2d', 172800],
    ])('parses "%s" to %i seconds', (input, expected) => {
      expect(parseExpiryToSeconds(input)).toBe(expected);
    });

    it('falls back to 7 days for unknown formats', () => {
      expect(parseExpiryToSeconds('garbage')).toBe(7 * 24 * 60 * 60);
      expect(parseExpiryToSeconds('')).toBe(7 * 24 * 60 * 60);
    });
  });

  describe('generateSecureToken', () => {
    it('returns a 64-char hex string', () => {
      const token = generateSecureToken();
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('generates unique tokens', () => {
      expect(generateSecureToken()).not.toBe(generateSecureToken());
    });
  });

  describe('hashToken', () => {
    it('produces a deterministic sha256 hex digest', () => {
      expect(hashToken('abc')).toMatch(/^[0-9a-f]{64}$/);
      expect(hashToken('abc')).toBe(hashToken('abc'));
      expect(hashToken('abc')).not.toBe(hashToken('abd'));
    });
  });

  describe('JWT tokens', () => {
    it('signs and verifies an access token', () => {
      const token = generateAccessToken({ sub: 'user-1', role: 'admin' });
      const payload = verifyAccessToken(token);

      expect(payload.sub).toBe('user-1');
      expect(payload.role).toBe('admin');
    });

    it('signs and verifies a refresh token with a jti', () => {
      const { refreshToken, jti } = generateRefreshToken('user-1');
      const payload = verifyRefreshToken(refreshToken);

      expect(payload.sub).toBe('user-1');
      expect(payload.jti).toBe(jti);
    });

    it('generates a fresh jti on every refresh token', () => {
      const first = generateRefreshToken('user-1');
      const second = generateRefreshToken('user-1');

      expect(first.jti).not.toBe(second.jti);
      expect(first.refreshToken).not.toBe(second.refreshToken);
    });
  });
});
