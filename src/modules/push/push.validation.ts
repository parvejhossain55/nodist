import { z } from 'zod';

export const registerPushSubscriptionSchema = z.object({
  body: z.object({
    endpoint: z.string().url('endpoint must be a valid URL'),
    keys: z.object({
      p256dh: z.string().min(1, 'p256dh is required'),
      auth: z.string().min(1, 'auth is required'),
    }),
    userAgent: z.string().max(300).optional(),
  }),
});

export const sendPushSchema = z.object({
  body: z.object({
    recipient: z.string().min(1).optional(),
    title: z.string().min(1).max(200),
    message: z.string().min(1).max(1000),
    url: z.string().url().optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  }),
});

export const removePushSubscriptionSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export type RegisterPushSubscriptionInput = z.infer<typeof registerPushSubscriptionSchema>['body'];

export type SendPushInput = z.infer<typeof sendPushSchema>['body'];
