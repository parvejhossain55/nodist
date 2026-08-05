import { Router } from 'express';
import { userRoutes } from './user/user.routes';
import { authRoutes } from './auth/auth.routes';
import { healthRoutes } from './health/health.routes';
import { notificationRoutes } from './notification/notification.routes';
import { pushRoutes } from './push/push.routes';

const router = Router();

router.use('/users', userRoutes);
router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
router.use('/notifications', notificationRoutes);
router.use('/push', pushRoutes);

export const routes = router;
