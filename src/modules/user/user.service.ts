import { NotFoundError } from '@common/errors/AppError';
import { IUserRepository } from './user.repository.interface';
import { UpdateUserInput } from './user.validation';
import { sanitize } from './user.utils';

export class UserService {
  constructor(private readonly userRepository: IUserRepository) {}

  async getById(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundError('User not found');
    return sanitize(user);
  }

  async list(page: number, limit: number) {
    const [items, total] = await Promise.all([
      this.userRepository.findMany({}, { page, limit }),
      this.userRepository.count({}),
    ]);

    return { items: items.map(sanitize), total, page, limit };
  }

  async update(id: string, input: UpdateUserInput) {
    const user = await this.userRepository.updateById(id, input);
    if (!user) throw new NotFoundError('User not found');
    return sanitize(user);
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.userRepository.deleteById(id);
    if (!deleted) throw new NotFoundError('User not found');
  }
}
