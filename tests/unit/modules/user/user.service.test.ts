import { NotFoundError } from '@common/errors/AppError';
import { UserService } from '@modules/user/user.service';
import type { IUser } from '@modules/user/user.model';
import type { IUserRepository } from '@modules/user/user.repository.interface';

const USER_ID = '507f1f77bcf86cd799439011';

function makeUser(overrides: Partial<Record<string, unknown>> = {}): IUser {
  const doc = {
    _id: USER_ID,
    id: USER_ID,
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashed',
    role: 'user',
    isActive: true,
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    ...doc,
    ...overrides,
    comparePassword: jest.fn(),
    save: jest.fn(),
    toObject: jest.fn().mockReturnValue({ ...doc, ...overrides }),
  } as unknown as IUser;
}

describe('UserService', () => {
  let userRepository: IUserRepository;
  let service: UserService;

  beforeEach(() => {
    jest.clearAllMocks();

    userRepository = {
      findByEmail: jest.fn(),
      findByIDWithPassword: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      findMany: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
      count: jest.fn(),
    } as unknown as IUserRepository;

    service = new UserService(userRepository);
  });

  describe('getById', () => {
    it('returns the sanitized user', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(makeUser());

      const result = await service.getById(USER_ID);

      expect(userRepository.findById).toHaveBeenCalledWith(USER_ID);
      expect(result.email).toBe('test@example.com');
      expect(result.password).toBeUndefined();
    });

    it('throws NotFoundError when the user is missing', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.getById(USER_ID)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('list', () => {
    it('returns paginated, sanitized users with a total count', async () => {
      const users = [makeUser(), makeUser({ email: 'second@example.com' })];
      (userRepository.findMany as jest.Mock).mockResolvedValue(users);
      (userRepository.count as jest.Mock).mockResolvedValue(2);

      const result = await service.list(1, 20);

      expect(userRepository.findMany).toHaveBeenCalledWith({}, { page: 1, limit: 20 });
      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].password).toBeUndefined();
    });
  });

  describe('update', () => {
    it('updates and returns the sanitized user', async () => {
      (userRepository.updateById as jest.Mock).mockResolvedValue(makeUser({ name: 'Renamed' }));

      const result = await service.update(USER_ID, { name: 'Renamed' });

      expect(userRepository.updateById).toHaveBeenCalledWith(USER_ID, { name: 'Renamed' });
      expect(result.name).toBe('Renamed');
    });

    it('throws NotFoundError when the user is missing', async () => {
      (userRepository.updateById as jest.Mock).mockResolvedValue(null);

      await expect(service.update(USER_ID, { name: 'Renamed' })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe('remove', () => {
    it('deletes the user', async () => {
      (userRepository.deleteById as jest.Mock).mockResolvedValue(true);

      await expect(service.remove(USER_ID)).resolves.toBeUndefined();
      expect(userRepository.deleteById).toHaveBeenCalledWith(USER_ID);
    });

    it('throws NotFoundError when nothing was deleted', async () => {
      (userRepository.deleteById as jest.Mock).mockResolvedValue(false);

      await expect(service.remove(USER_ID)).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
