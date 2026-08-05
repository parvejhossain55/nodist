import { Router } from 'express';
import { validate } from '@common/middlewares/validate';
import { authenticate, authorize } from '@common/middlewares/authenticate';
import { userController } from './user.controller';
import { getUserSchema, listUsersSchema, updateUserSchema } from './user.validation';

const router = Router();

router.get('/', authenticate, authorize('admin'), validate(listUsersSchema), userController.list);

router
  .route('/:id')
  .get(authenticate, validate(getUserSchema), userController.getById)
  .patch(authenticate, validate(updateUserSchema), userController.update)
  .delete(authenticate, authorize('admin'), userController.remove);

export const userRoutes = router;
