import { Router } from 'express';
import { userRoutes } from './user/user.routes';
import { authRoutes } from './auth/auth.routes';
import { healthRoutes } from './health/health.routes';

const router = Router();

router.use('/users', userRoutes);
router.use('/auth', authRoutes);
router.use('/health', healthRoutes);

export const routes = router;
