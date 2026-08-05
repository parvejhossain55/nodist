import request from 'supertest';
import { createApp } from 'app';
import { UserModel } from '@modules/user/user.model';
import { NotificationModel } from '@modules/notification/notification.model';
import { redisClient } from '@database/redis/connection';
import { sendEmail } from '@common/utils/mailSender';

const API = '/api/v1';
const app = createApp();
const mailMock = sendEmail as jest.Mock;

const validUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123',
};

async function register(overrides: Record<string, unknown> = {}) {
  return request(app)
    .post(`${API}/auth/register`)
    .send({ ...validUser, ...overrides });
}

async function login(email: string = validUser.email, password: string = validUser.password) {
  return request(app).post(`${API}/auth/login`).send({ email, password });
}

function extractToken(html: string, path: 'verify-email' | 'reset-password'): string {
  const match = html.match(new RegExp(`${path}\\?token=([^"&]+)`));
  if (!match) throw new Error(`${path} token not found in sent email`);
  return match[1];
}

function accessTokenOf(res: request.Response): string {
  return res.body.data.accessToken as string;
}

function refreshCookieOf(res: request.Response): string {
  const setCookie = res.headers['set-cookie'] as unknown as string[];
  const cookie = setCookie.find((c) => c.startsWith('refreshToken='));
  if (!cookie) throw new Error('refreshToken cookie was not set');
  return cookie.split(';')[0];
}

describe('auth & notification API', () => {
  beforeEach(async () => {
    mailMock.mockClear();
    // Tests share one database (per worker) — start each test from a clean slate.
    await UserModel.deleteMany({});
    await NotificationModel.deleteMany({});
    await redisClient.flushall();
  });

  describe('POST /auth/register', () => {
    it('creates a user, issues tokens and sets the refresh cookie', async () => {
      const res = await register();

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('test@example.com');
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.accessToken).toBeTruthy();
      expect(refreshCookieOf(res)).toMatch(/^refreshToken=/);
      // verification email is "sent"
      expect(mailMock).toHaveBeenCalledTimes(1);
      expect(mailMock.mock.calls[0][0].to).toBe('test@example.com');
    });

    it('rejects duplicate emails with 409', async () => {
      await register();
      const res = await register();

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('rejects invalid payloads with 422', async () => {
      const res = await register({ password: 'short' });

      expect(res.status).toBe(422);
      expect(res.body.details.password).toBeDefined();
    });
  });

  describe('POST /auth/login', () => {
    it('logs in and returns tokens', async () => {
      await register();
      const res = await login();

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeTruthy();
      expect(refreshCookieOf(res)).toMatch(/^refreshToken=/);
    });

    it('rejects a wrong password with 401', async () => {
      await register();
      const res = await login(validUser.email, 'wrong-password');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects an unknown email with 401', async () => {
      const res = await login('nobody@example.com', 'password123');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /auth/me', () => {
    it('returns the current user when authenticated', async () => {
      const registerRes = await register();
      const token = accessTokenOf(registerRes);

      const res = await request(app).get(`${API}/auth/me`).set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('test@example.com');
      expect(res.body.data.password).toBeUndefined();
    });

    it('rejects requests without a token', async () => {
      const res = await request(app).get(`${API}/auth/me`);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('rotates the refresh token', async () => {
      await register();
      const loginRes = await login();
      const cookie = refreshCookieOf(loginRes);

      const res = await request(app).post(`${API}/auth/refresh`).set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('rejects a missing refresh cookie with 401', async () => {
      const res = await request(app).post(`${API}/auth/refresh`);

      expect(res.status).toBe(401);
    });
  });

  describe('email verification flow', () => {
    it('verifies the email and creates a welcome notification', async () => {
      const registerRes = await register();
      const token = accessTokenOf(registerRes);

      const verifyHtml = mailMock.mock.calls[0][0].html as string;
      const verifyToken = extractToken(verifyHtml, 'verify-email');

      const verifyRes = await request(app)
        .post(`${API}/auth/verify-email`)
        .send({ token: verifyToken });
      expect(verifyRes.status).toBe(200);

      const notificationsRes = await request(app)
        .get(`${API}/notifications`)
        .set('Authorization', `Bearer ${token}`);
      expect(notificationsRes.status).toBe(200);
      expect(notificationsRes.body.data).toHaveLength(1);
      expect(notificationsRes.body.data[0].type).toBe('welcome');
      expect(notificationsRes.body.meta.unreadCount).toBe(1);

      const notificationId = notificationsRes.body.data[0]._id as string;
      const markRes = await request(app)
        .patch(`${API}/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${token}`);
      expect(markRes.status).toBe(200);
      expect(markRes.body.data.isRead).toBe(true);
    });

    it('rejects an invalid verification token with 401', async () => {
      await register();

      const res = await request(app).post(`${API}/auth/verify-email`).send({ token: 'invalid' });

      expect(res.status).toBe(401);
    });
  });

  describe('change password', () => {
    it('changes the password and allows login with the new one', async () => {
      await register();
      const loginRes = await login();
      const token = accessTokenOf(loginRes);

      const changeRes = await request(app)
        .post(`${API}/auth/change-password`)
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'password123', newPassword: 'new-password-456' });
      expect(changeRes.status).toBe(200);

      const oldLogin = await login(validUser.email, 'password123');
      expect(oldLogin.status).toBe(401);

      const newLogin = await login(validUser.email, 'new-password-456');
      expect(newLogin.status).toBe(200);
    });
  });

  describe('logout and refresh revocation', () => {
    it('logs out and revokes the refresh token', async () => {
      await register();
      const loginRes = await login();
      const token = accessTokenOf(loginRes);
      const cookie = refreshCookieOf(loginRes);

      const logoutRes = await request(app)
        .post(`${API}/auth/logout`)
        .set('Authorization', `Bearer ${token}`);
      expect(logoutRes.status).toBe(200);

      const refreshRes = await request(app).post(`${API}/auth/refresh`).set('Cookie', cookie);
      expect(refreshRes.status).toBe(401);
    });
  });

  describe('password reset flow', () => {
    it('resets the password via the emailed link', async () => {
      await register();

      const forgotRes = await request(app)
        .post(`${API}/auth/forgot-password`)
        .send({ email: validUser.email });
      expect(forgotRes.status).toBe(200);

      // locate the reset email by subject rather than call index
      const resetEmail = mailMock.mock.calls
        .map((call) => call[0] as { subject: string; html: string })
        .find((email) => email.subject === 'Reset your password');
      expect(resetEmail).toBeDefined();
      const resetToken = extractToken(resetEmail!.html, 'reset-password');

      const resetRes = await request(app)
        .post(`${API}/auth/reset-password`)
        .send({ token: resetToken, newPassword: 'reset-password-789' });
      expect(resetRes.status).toBe(200);

      const newLogin = await login(validUser.email, 'reset-password-789');
      expect(newLogin.status).toBe(200);
    });
  });

  describe('admin user management', () => {
    it('lists users for admins only', async () => {
      const registerRes = await register();
      const token = accessTokenOf(registerRes);

      const forbidden = await request(app)
        .get(`${API}/users`)
        .set('Authorization', `Bearer ${token}`);
      expect(forbidden.status).toBe(401);

      await UserModel.updateOne({ email: validUser.email }, { role: 'admin' });
      // role lives in the JWT — log in again to get a token minted for the admin role
      const adminLogin = await login();
      const adminToken = accessTokenOf(adminLogin);

      const res = await request(app)
        .get(`${API}/users?page=1&limit=10`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.total).toBe(1);
    });
  });

  describe('push subscription flow', () => {
    let token: string;

    beforeEach(async () => {
      const res = await register();
      token = accessTokenOf(res);
    });

    it('exposes the VAPID public key without auth', async () => {
      const res = await request(app).get(`${API}/push/vapid-public-key`);

      expect(res.status).toBe(200);
      expect(res.body.data.publicKey).toBeTruthy();
    });

    it('registers, lists and removes a subscription', async () => {
      const subscription = {
        endpoint: 'https://push.example.com/device-1',
        keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
        userAgent: 'jest-test-agent',
      };

      const createRes = await request(app)
        .post(`${API}/push/subscriptions`)
        .set('Authorization', `Bearer ${token}`)
        .send(subscription);
      expect(createRes.status).toBe(201);

      const listRes = await request(app)
        .get(`${API}/push/subscriptions`)
        .set('Authorization', `Bearer ${token}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data).toHaveLength(1);
      expect(listRes.body.data[0].endpoint).toBe(subscription.endpoint);

      const subscriptionId = listRes.body.data[0]._id as string;
      const deleteRes = await request(app)
        .delete(`${API}/push/subscriptions/${subscriptionId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(deleteRes.status).toBe(204);

      const emptyRes = await request(app)
        .get(`${API}/push/subscriptions`)
        .set('Authorization', `Bearer ${token}`);
      expect(emptyRes.body.data).toHaveLength(0);
    });

    it('sends push and reports an empty summary when nothing is subscribed', async () => {
      const res = await request(app)
        .post(`${API}/push/send`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Hello', message: 'World' });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ sent: 0, failed: 0, removedExpired: 0 });
    });
  });
});
