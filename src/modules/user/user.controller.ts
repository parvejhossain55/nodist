import { Request, Response } from 'express';
import { ApiResponse } from '@common/utils/ApiResponse';
import { catchAsync } from '@common/utils/catchAsync';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

const userService = new UserService(new UserRepository());

export const userController = {
  register: catchAsync(async (req: Request, res: Response) => {
    const user = await userService.register(req.body);
    ApiResponse.created(res, user, 'User register successfully');
  }),

  getById: catchAsync(async (req: Request, res: Response) => {
    const user = await userService.getById(req.params.id);
    ApiResponse.ok(res, user);
  }),

  list: catchAsync(async (req: Request, res: Response) => {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const result = await userService.list(page, limit);
    ApiResponse.ok(res, result.items, 'Success', {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  }),

  update: catchAsync(async (req: Request, res: Response) => {
    const user = await userService.update(req.params.id, req.body);
    ApiResponse.ok(res, user, 'User update successfully');
  }),

  remove: catchAsync(async (req: Request, res: Response) => {
    await userService.remove(req.params.id);
    ApiResponse.noContent(res);
  }),
};
