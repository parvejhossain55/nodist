import webpush from 'web-push';
import { sendWebPush } from '@common/utils/webPush';

const mockSendNotification = jest.fn();

jest.mock('web-push', () => ({
  __esModule: true,
  default: {
    setVapidDetails: jest.fn(),
    sendNotification: (...args: unknown[]) => mockSendNotification(...args),
    WebPushError: class WebPushError extends Error {
      statusCode: number;
      constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
      }
    },
  },
}));

const subscription = {
  endpoint: 'https://push.example.com/device',
  keys: { p256dh: 'k1', auth: 'k2' },
  expirationTime: null,
};

const WebPushError = webpush.WebPushError as unknown as new (
  message: string,
  statusCode: number,
) => Error & { statusCode: number };

describe('sendWebPush', () => {
  beforeEach(() => {
    mockSendNotification.mockReset();
  });

  it('returns ok for a successful delivery', async () => {
    mockSendNotification.mockResolvedValue({ statusCode: 201 });

    await expect(sendWebPush(subscription, 'payload')).resolves.toEqual({
      ok: true,
      statusCode: 201,
    });
  });

  it('flags 404/410 responses as expired', async () => {
    mockSendNotification.mockRejectedValue(new WebPushError('gone', 410));

    await expect(sendWebPush(subscription, 'payload')).resolves.toEqual({
      ok: false,
      reason: 'expired',
      statusCode: 410,
    });
  });

  it('flags other WebPushErrors as errors', async () => {
    mockSendNotification.mockRejectedValue(new WebPushError('provider error', 500));

    await expect(sendWebPush(subscription, 'payload')).resolves.toEqual({
      ok: false,
      reason: 'error',
      statusCode: 500,
    });
  });

  it('handles unexpected errors without a status code', async () => {
    mockSendNotification.mockRejectedValue(new Error('boom'));

    await expect(sendWebPush(subscription, 'payload')).resolves.toEqual({
      ok: false,
      reason: 'error',
    });
  });
});
