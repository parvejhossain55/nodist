import { z } from 'zod';

export interface CreateNotificationInput {
  recipient: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export const listNotificationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

export const markAsReadSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});
