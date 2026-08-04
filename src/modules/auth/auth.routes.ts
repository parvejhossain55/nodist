import { Router } from 'express';
import { validate } from '@common/middlewares/validate';
import { authenticate } from '@common/middlewares/authenticate';
import { authController } from './auth.controller';
import { registerSchema, loginSchema, changePasswordSchema } from './auth.validation';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword,
);

export const authRoutes = router;
