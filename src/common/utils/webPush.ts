import webpush from 'web-push';
import { config } from '@config/index';
import { logger } from '@common/logger';

/**
 * Configure VAPID details once at boot. If the configured keys are invalid
 * (e.g. placeholders copied from .env.example), log a warning and keep the
 * server running — only actual push sending will fail with a clear error.
 */
try {
  webpush.setVapidDetails(config.vapid.subject, config.vapid.publicKey, config.vapid.privateKey);
} catch (error) {
  logger.error(
    { error },
    'web-push: invalid VAPID configuration. Generate valid keys with `pnpm generate:vapid`.',
  );
}

export type WebPushResult =
  | { ok: true; statusCode: number }
  | { ok: false; reason: 'expired' | 'error'; statusCode?: number };

/**
 * Send a web push notification to a single subscription.
 *
 * Push services answer 404/410 when a subscription is no longer valid
 * (device unregistered / endpoint expired). Callers should remove those
 * subscriptions from the database.
 */
export async function sendWebPush(
  subscription: webpush.PushSubscription,
  payload: string | Buffer,
  options?: webpush.RequestOptions,
): Promise<WebPushResult> {
  try {
    const result = await webpush.sendNotification(subscription, payload, options);
    return { ok: true, statusCode: result.statusCode };
  } catch (error) {
    if (error instanceof webpush.WebPushError) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        logger.info({ statusCode: error.statusCode }, 'web-push: subscription no longer valid');
        return { ok: false, reason: 'expired', statusCode: error.statusCode };
      }

      logger.warn(
        { statusCode: error.statusCode, message: error.message },
        'web-push: send failed',
      );
      return { ok: false, reason: 'error', statusCode: error.statusCode };
    }

    logger.error({ error }, 'web-push: unexpected send error');
    return { ok: false, reason: 'error' };
  }
}

export function getVapidPublicKey(): string {
  return config.vapid.publicKey;
}
