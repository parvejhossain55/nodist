import { Types } from 'mongoose';
import { ForbiddenError, NotFoundError } from '@common/errors/AppError';
import { logger } from '@common/logger';
import { sendWebPush } from '@common/utils/webPush';
import { IPushSubscription } from './push.model';
import { IPushSubscriptionRepository } from './push.repository.interface';
import { RegisterPushSubscriptionInput, SendPushInput } from './push.validation';

const PUSH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface SendPushSummary {
  sent: number;
  failed: number;
  removedExpired: number;
}

export class PushService {
  constructor(private readonly pushSubscriptionRepository: IPushSubscriptionRepository) {}

  /**
   * Register (or refresh) a device subscription for a user.
   * Push endpoints are per-browser/per-origin, so a device that logs into a
   * different account simply gets re-assigned to the new owner.
   */
  async register(userId: string, input: RegisterPushSubscriptionInput): Promise<IPushSubscription> {
    const existing = await this.pushSubscriptionRepository.findByEndpoint(input.endpoint);

    if (existing) {
      existing.user = new Types.ObjectId(userId);
      existing.keys = input.keys;
      if (input.userAgent) existing.userAgent = input.userAgent;
      return existing.save();
    }

    return this.pushSubscriptionRepository.create({
      user: new Types.ObjectId(userId),
      endpoint: input.endpoint,
      keys: input.keys,
      userAgent: input.userAgent,
    });
  }

  async list(userId: string): Promise<IPushSubscription[]> {
    return this.pushSubscriptionRepository.findByUser(userId);
  }

  async remove(userId: string, id: string): Promise<IPushSubscription> {
    const subscription = await this.pushSubscriptionRepository.findById(id);
    if (!subscription) throw new NotFoundError('Push subscription not found');

    if (subscription.user.toString() !== userId) {
      throw new ForbiddenError('You can only remove your own push subscriptions');
    }

    await this.pushSubscriptionRepository.deleteById(id);
    return subscription;
  }

  /**
   * Send a web push notification to all devices subscribed by a user.
   * Subscriptions the push service reports as invalid (404/410) are removed.
   */
  async send(userId: string, input: SendPushInput): Promise<SendPushSummary> {
    const subscriptions = await this.pushSubscriptionRepository.findByUser(userId);
    if (subscriptions.length === 0) {
      return { sent: 0, failed: 0, removedExpired: 0 };
    }

    const payload = JSON.stringify({
      title: input.title,
      message: input.message,
      url: input.url,
      data: input.data,
      sentAt: new Date().toISOString(),
    });

    const options = { TTL: PUSH_TTL_SECONDS };

    let sent = 0;
    let failed = 0;
    const expiredIds: string[] = [];

    await Promise.all(
      subscriptions.map(async (subscription) => {
        const result = await sendWebPush(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys,
            expirationTime: null,
          },
          payload,
          options,
        );

        if (result.ok) {
          sent += 1;
        } else if (result.reason === 'expired') {
          expiredIds.push(subscription.id);
        } else {
          failed += 1;
        }
      }),
    );

    if (expiredIds.length > 0) {
      await Promise.all(expiredIds.map((id) => this.pushSubscriptionRepository.deleteById(id)));
      logger.info({ count: expiredIds.length }, 'web-push: removed expired subscriptions');
    }

    return { sent, failed, removedExpired: expiredIds.length };
  }
}
