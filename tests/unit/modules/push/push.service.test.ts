import { Types } from 'mongoose';
import { ForbiddenError, NotFoundError } from '@common/errors/AppError';
import { sendWebPush } from '@common/utils/webPush';
import { PushService } from '@modules/push/push.service';
import type { IPushSubscription } from '@modules/push/push.model';
import type { IPushSubscriptionRepository } from '@modules/push/push.repository.interface';

jest.mock('@common/utils/webPush', () => ({
  sendWebPush: jest.fn(),
}));

const OWNER_ID = '507f1f77bcf86cd799439011';
const OTHER_ID = '507f1f77bcf86cd799439022';

function makeSub(overrides: Partial<Record<string, unknown>> = {}): IPushSubscription {
  return {
    id: 'sub-1',
    user: new Types.ObjectId(OWNER_ID),
    endpoint: 'https://push.example.com/device-1',
    keys: { p256dh: 'k1', auth: 'k2' },
    userAgent: 'test-agent',
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as IPushSubscription;
}

describe('PushService', () => {
  let repository: IPushSubscriptionRepository;
  let service: PushService;

  beforeEach(() => {
    jest.clearAllMocks();

    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      findMany: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
      count: jest.fn(),
      findByUser: jest.fn(),
      findByEndpoint: jest.fn(),
      deleteByEndpoint: jest.fn(),
    } as unknown as IPushSubscriptionRepository;

    service = new PushService(repository);
  });

  describe('register', () => {
    it('creates a new subscription for a fresh endpoint', async () => {
      const sub = makeSub();
      (repository.findByEndpoint as jest.Mock).mockResolvedValue(null);
      (repository.create as jest.Mock).mockResolvedValue(sub);

      const result = await service.register(OWNER_ID, {
        endpoint: 'https://push.example.com/device-1',
        keys: { p256dh: 'k1', auth: 'k2' },
        userAgent: 'test-agent',
      });

      expect(repository.findByEndpoint).toHaveBeenCalledWith('https://push.example.com/device-1');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.any(Types.ObjectId),
          endpoint: 'https://push.example.com/device-1',
          keys: { p256dh: 'k1', auth: 'k2' },
          userAgent: 'test-agent',
        }),
      );
      expect(result).toBe(sub);
    });

    it('reassigns an existing endpoint to the new owner', async () => {
      const existing = makeSub();
      (repository.findByEndpoint as jest.Mock).mockResolvedValue(existing);

      await service.register(OTHER_ID, {
        endpoint: 'https://push.example.com/device-1',
        keys: { p256dh: 'new-k1', auth: 'new-k2' },
        userAgent: 'new-agent',
      });

      expect(existing.user.toString()).toBe(OTHER_ID);
      expect(existing.keys).toEqual({ p256dh: 'new-k1', auth: 'new-k2' });
      expect(existing.userAgent).toBe('new-agent');
      expect(existing.save).toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('returns all subscriptions for the user', async () => {
      const subs = [makeSub()];
      (repository.findByUser as jest.Mock).mockResolvedValue(subs);

      await expect(service.list(OWNER_ID)).resolves.toEqual(subs);
      expect(repository.findByUser).toHaveBeenCalledWith(OWNER_ID);
    });
  });

  describe('remove', () => {
    it('throws NotFoundError for an unknown subscription', async () => {
      (repository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.remove(OWNER_ID, 'sub-1')).rejects.toBeInstanceOf(NotFoundError);
    });

    it("throws ForbiddenError when removing another user's subscription", async () => {
      (repository.findById as jest.Mock).mockResolvedValue(makeSub());

      await expect(service.remove(OTHER_ID, 'sub-1')).rejects.toBeInstanceOf(ForbiddenError);
      expect(repository.deleteById).not.toHaveBeenCalled();
    });

    it('removes an owned subscription', async () => {
      const sub = makeSub();
      (repository.findById as jest.Mock).mockResolvedValue(sub);
      (repository.deleteById as jest.Mock).mockResolvedValue(true);

      await expect(service.remove(OWNER_ID, 'sub-1')).resolves.toBe(sub);
      expect(repository.deleteById).toHaveBeenCalledWith('sub-1');
    });
  });

  describe('send', () => {
    it('returns zeros when the user has no subscriptions', async () => {
      (repository.findByUser as jest.Mock).mockResolvedValue([]);

      await expect(service.send(OWNER_ID, { title: 'Hi', message: 'Hello' })).resolves.toEqual({
        sent: 0,
        failed: 0,
        removedExpired: 0,
      });
      expect(sendWebPush).not.toHaveBeenCalled();
    });

    it('summarizes sent, failed and expired deliveries and cleans up expired ones', async () => {
      const subs = [makeSub({ id: 's1' }), makeSub({ id: 's2' }), makeSub({ id: 's3' })];
      (repository.findByUser as jest.Mock).mockResolvedValue(subs);
      (sendWebPush as jest.Mock)
        .mockResolvedValueOnce({ ok: true, statusCode: 201 })
        .mockResolvedValueOnce({ ok: false, reason: 'expired', statusCode: 410 })
        .mockResolvedValueOnce({ ok: false, reason: 'error', statusCode: 500 });

      const result = await service.send(OWNER_ID, {
        title: 'Hi',
        message: 'Hello',
        url: 'https://app.dev/x',
      });

      expect(sendWebPush).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ sent: 1, failed: 1, removedExpired: 1 });
      expect(repository.deleteById).toHaveBeenCalledTimes(1);
      expect(repository.deleteById).toHaveBeenCalledWith('s2');
    });
  });
});
