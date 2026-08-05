import { Request, Response } from 'express';
import { catchAsync } from '@common/utils/catchAsync';
import { ApiResponse } from '@common/utils/ApiResponse';
import { ForbiddenError } from '@common/errors/AppError';
import { getVapidPublicKey } from '@common/utils/webPush';
import { PushSubscriptionRepository } from './push.repository';
import { PushService } from './push.service';

const pushService = new PushService(new PushSubscriptionRepository());

export const pushController = {
  getVapidPublicKey: catchAsync(async (_req: Request, res: Response) => {
    ApiResponse.ok(res, { publicKey: getVapidPublicKey() });
  }),

  register: catchAsync(async (req: Request, res: Response) => {
    const subscription = await pushService.register(req.user!.sub, req.body);
    ApiResponse.created(res, subscription, 'Push subscription registered');
  }),

  list: catchAsync(async (req: Request, res: Response) => {
    const subscriptions = await pushService.list(req.user!.sub);
    ApiResponse.ok(res, subscriptions);
  }),

  remove: catchAsync(async (req: Request, res: Response) => {
    await pushService.remove(req.user!.sub, req.params.id);
    ApiResponse.noContent(res);
  }),

  send: catchAsync(async (req: Request, res: Response) => {
    const body = req.body as {
      recipient?: string;
      title: string;
      message: string;
      url?: string;
      data?: Record<string, unknown>;
    };

    const recipient = body.recipient ?? req.user!.sub;
    if (recipient !== req.user!.sub && req.user!.role !== 'admin') {
      throw new ForbiddenError('Only admins can send push notifications to other users');
    }

    const result = await pushService.send(recipient, {
      title: body.title,
      message: body.message,
      url: body.url,
      data: body.data,
    });

    ApiResponse.ok(res, result, 'Push notification sent');
  }),
};
