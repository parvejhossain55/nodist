import { NotFoundError } from '@common/errors/AppError';
import { getIO, userRoom } from '@sockets/index';
import { INotification } from './notification.model';
import { INotificationRepository } from './notification.repository.interface';
import { CreateNotificationInput } from './notification.validation';
import { logger } from '@common/logger';

export class NotificationService {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  private emit(recipient: string, notification: INotification): void {
    try {
      const io = getIO();
      io.to(userRoom(recipient)).emit('notification', notification);
    } catch (error) {
      logger.error(error, 'Socket error');
    }
  }

  async create(input: CreateNotificationInput): Promise<INotification> {
    const notification = await this.notificationRepository.create(input);
    this.emit(input.recipient, notification);
    return notification;
  }

  async list(recipient: string, page: number, limit: number) {
    const [items, total, unreadCount] = await Promise.all([
      this.notificationRepository.findMany({ recipient }, { page, limit }),
      this.notificationRepository.count({ recipient }),
      this.notificationRepository.countUnread(recipient),
    ]);
    return { items, total, page, limit, unreadCount };
  }

  async markAsRead(id: string): Promise<INotification> {
    const notification = await this.notificationRepository.markAsRead(id);
    if (!notification) throw new NotFoundError('Notification not found');
    return notification;
  }

  async markAllAsRead(recipient: string): Promise<number> {
    return this.notificationRepository.markAllAsRead(recipient);
  }
}
