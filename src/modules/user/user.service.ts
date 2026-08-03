import { ConflictError, NotFoundError } from '@common/errors/AppError';
import { IUser } from './user.model';
import { IUserRepository } from './user.repository.interface';
import { CreateUserInput, UpdateUserInput } from './user.validation';

function sanitize(user: IUser): Record<string, unknown> {
  const obj = user.toObject();
  delete (obj as { password?: string }).password;
  return obj;
}
export class UserService {
  constructor(private readonly userRepository: IUserRepository) {}

  async register(input: CreateUserInput) {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) throw new ConflictError('Email already registered');

    const user = await this.userRepository.create(input);
    return sanitize(user);
  }

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
