import { NotFoundError } from '@common/errors/AppError';
import { getIO } from '@sockets/index';
import { NotificationService } from '@modules/notification/notification.service';
import type { PushService } from '@modules/push/push.service';
import type { INotification } from '@modules/notification/notification.model';
import type { INotificationRepository } from '@modules/notification/notification.repository.interface';

jest.mock('@sockets/index', () => ({
  getIO: jest.fn(),
  userRoom: (userId: string) => `user:${userId}`,
}));

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

function makeNotification(overrides: Partial<Record<string, unknown>> = {}): INotification {
  return {
    id: 'n1',
    recipient: 'u1',
    type: 'info',
    title: 'Hello',
    message: 'A notification',
    isRead: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as INotification;
}

describe('NotificationService', () => {
  let repository: INotificationRepository;
  let pushService: PushService;
  let service: NotificationService;
  let ioMock: { to: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      findMany: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
      count: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      countUnread: jest.fn(),
    } as unknown as INotificationRepository;

    pushService = { send: jest.fn() } as unknown as PushService;
    service = new NotificationService(repository, pushService);

    ioMock = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) };
    (getIO as jest.Mock).mockReturnValue(ioMock);
  });

  describe('create', () => {
    it('persists the notification and emits it in real time', async () => {
      const notification = makeNotification();
      (repository.create as jest.Mock).mockResolvedValue(notification);

      const result = await service.create({
        recipient: 'u1',
        type: 'info',
        title: 'Hello',
        message: 'A notification',
      });

      expect(repository.create).toHaveBeenCalledWith({
        recipient: 'u1',
        type: 'info',
        title: 'Hello',
        message: 'A notification',
      });
      expect(ioMock.to).toHaveBeenCalledWith('user:u1');
      expect(ioMock.to.mock.results[0].value.emit).toHaveBeenCalledWith(
        'notification',
        notification,
      );
      expect(result).toBe(notification);

      await flushPromises();
      expect(pushService.send).toHaveBeenCalledWith('u1', {
        title: 'Hello',
        message: 'A notification',
        data: undefined,
      });
    });

    it('still succeeds when the socket layer is unavailable', async () => {
      (getIO as jest.Mock).mockImplementation(() => {
        throw new Error('Socket.io not initialized');
      });
      (repository.create as jest.Mock).mockResolvedValue(makeNotification());

      await expect(
        service.create({ recipient: 'u1', type: 'info', title: 'Hi', message: 'Hey' }),
      ).resolves.toBeDefined();

      await flushPromises();
      expect(pushService.send).toHaveBeenCalled();
    });

    it('never lets a web push failure break the flow', async () => {
      (repository.create as jest.Mock).mockResolvedValue(makeNotification());
      (pushService.send as jest.Mock).mockRejectedValue(new Error('push provider down'));

      await expect(
        service.create({ recipient: 'u1', type: 'info', title: 'Hi', message: 'Hey' }),
      ).resolves.toBeDefined();
      await flushPromises();
    });
  });

  describe('list', () => {
    it('returns items with pagination and unread count', async () => {
      const items = [makeNotification()];
      (repository.findMany as jest.Mock).mockResolvedValue(items);
      (repository.count as jest.Mock).mockResolvedValue(1);
      (repository.countUnread as jest.Mock).mockResolvedValue(1);

      const result = await service.list('u1', 1, 20);

      expect(repository.findMany).toHaveBeenCalledWith({ recipient: 'u1' }, { page: 1, limit: 20 });
      expect(result).toEqual({ items, total: 1, page: 1, limit: 20, unreadCount: 1 });
    });
  });

  describe('markAsRead', () => {
    it('marks a notification as read', async () => {
      const notification = makeNotification({ isRead: true });
      (repository.markAsRead as jest.Mock).mockResolvedValue(notification);

      await expect(service.markAsRead('n1')).resolves.toBe(notification);
    });

    it('throws NotFoundError when the notification is missing', async () => {
      (repository.markAsRead as jest.Mock).mockResolvedValue(null);

      await expect(service.markAsRead('n1')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('markAllAsRead', () => {
    it('returns the number of updated notifications', async () => {
      (repository.markAllAsRead as jest.Mock).mockResolvedValue(4);

      await expect(service.markAllAsRead('u1')).resolves.toBe(4);
    });
  });
});
