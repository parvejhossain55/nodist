import {
  registerPushSubscriptionSchema,
  sendPushSchema,
  removePushSubscriptionSchema,
} from '@modules/push/push.validation';

const validSubscription = {
  body: {
    endpoint: 'https://push.example.com/device-1',
    keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
  },
};

describe('push validation schemas', () => {
  describe('registerPushSubscriptionSchema', () => {
    it('accepts a valid subscription', () => {
      expect(() => registerPushSubscriptionSchema.parse(validSubscription)).not.toThrow();
    });

    it('accepts an optional userAgent', () => {
      expect(() =>
        registerPushSubscriptionSchema.parse({
          body: { ...validSubscription.body, userAgent: 'Chrome/120' },
        }),
      ).not.toThrow();
    });

    it('rejects a non-URL endpoint', () => {
      expect(() =>
        registerPushSubscriptionSchema.parse({
          body: { ...validSubscription.body, endpoint: 'not-a-url' },
        }),
      ).toThrow();
    });

    it('rejects missing auth key', () => {
      expect(() =>
        registerPushSubscriptionSchema.parse({
          body: { endpoint: 'https://push.example.com/d', keys: { p256dh: 'k' } },
        }),
      ).toThrow();
    });
  });

  describe('sendPushSchema', () => {
    it('accepts a valid payload', () => {
      expect(() => sendPushSchema.parse({ body: { title: 'Hi', message: 'Hello' } })).not.toThrow();
    });

    it('rejects a missing title', () => {
      expect(() => sendPushSchema.parse({ body: { message: 'Hello' } })).toThrow();
    });

    it('rejects an invalid url', () => {
      expect(() =>
        sendPushSchema.parse({ body: { title: 'Hi', message: 'Hello', url: 'nope' } }),
      ).toThrow();
    });
  });

  describe('removePushSubscriptionSchema', () => {
    it('requires params.id', () => {
      expect(() => removePushSubscriptionSchema.parse({ params: { id: 'sub-1' } })).not.toThrow();
      expect(() => removePushSubscriptionSchema.parse({})).toThrow();
    });
  });
});
