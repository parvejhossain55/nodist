import { Request, Response } from 'express';
import { catchAsync } from '@common/utils/catchAsync';
import { ApiResponse } from '@common/utils/ApiResponse';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './notification.repository';

const notificationService = new NotificationService(new NotificationRepository());

export const notificationController = {
  list: catchAsync(async (req: Request, res: Response) => {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const result = await notificationService.list(req.user!.sub, page, limit);
    ApiResponse.ok(res, result.items, 'Success', {
      page: result.page,
      limit: result.limit,
      total: result.total,
      unreadCount: result.unreadCount,
    });
  }),

  markAsRead: catchAsync(async (req: Request, res: Response) => {
    const notification = await notificationService.markAsRead(req.params.id);
    ApiResponse.ok(res, notification, 'Marked as read');
  }),

  markAllAsRead: catchAsync(async (req: Request, res: Response) => {
    const count = await notificationService.markAllAsRead(req.user!.sub);
    ApiResponse.ok(res, { modifiedCount: count }, 'All notifications marked as read');
  }),
};
