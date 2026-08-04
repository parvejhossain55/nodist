import { Router } from 'express';
import { validate } from '@common/middlewares/validate';
import { authenticate } from '@common/middlewares/authenticate';
import { authController } from './auth.controller';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validation';
import { sensitiveActionLimiter } from '@common/middlewares/rateLimiter';

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
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post(
  '/resend-verification',
  sensitiveActionLimiter,
  validate(resendVerificationSchema),
  authController.resendVerification,
);
router.post(
  '/forgot-password',
  sensitiveActionLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

export const authRoutes = router;
