import { Router } from 'express';
import { validate } from '@common/middlewares/validate';
import { authenticate } from '@common/middlewares/authenticate';
import { pushController } from './push.controller';
import {
  registerPushSubscriptionSchema,
  removePushSubscriptionSchema,
  sendPushSchema,
} from './push.validation';

const router = Router();

router.get('/vapid-public-key', pushController.getVapidPublicKey);

router.post(
  '/subscriptions',
  authenticate,
  validate(registerPushSubscriptionSchema),
  pushController.register,
);
router.get('/subscriptions', authenticate, pushController.list);
router.delete(
  '/subscriptions/:id',
  authenticate,
  validate(removePushSubscriptionSchema),
  pushController.remove,
);

router.post('/send', authenticate, validate(sendPushSchema), pushController.send);

export const pushRoutes = router;
