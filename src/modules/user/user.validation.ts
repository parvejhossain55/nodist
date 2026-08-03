import { z } from 'zod';

export const createUserSchema = z.object({
  body: {
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8).max(72),
  },
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({ id: z.string().min(1) }),
});

export const getUserSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const listUserSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
