import { Router } from 'express';
import { validate } from '@common/middlewares/validate';
import { authenticate } from '@common/middlewares/authenticate';
import { notificationController } from './notification.controller';
import { listNotificationsSchema, markAsReadSchema } from './notification.validation';

const router = Router();

router.get('/', authenticate, validate(listNotificationsSchema), notificationController.list);
router.patch('/read-all', authenticate, notificationController.markAllAsRead);
router.patch(
  '/:id/read',
  authenticate,
  validate(markAsReadSchema),
  notificationController.markAsRead,
);

export const notificationRoutes = router;
