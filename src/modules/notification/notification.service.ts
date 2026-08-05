import { NotFoundError } from '@common/errors/AppError';
import { logger } from '@common/logger';
import { getIO, userRoom } from '@sockets/index';
import { PushService } from '@modules/push/push.service';
import { INotification } from './notification.model';
import { INotificationRepository } from './notification.repository.interface';
import { CreateNotificationInput } from './notification.validation';

export class NotificationService {
  constructor(
    private readonly notificationRepository: INotificationRepository,
    private readonly pushService: PushService,
  ) {}

  private emit(recipient: string, notification: INotification): void {
    try {
      const io = getIO();
      io.to(userRoom(recipient)).emit('notification', notification);
    } catch (error) {
      logger.error(error, 'Socket error');
    }
  }

  /**
   * Best-effort web push delivery to the recipient's subscribed devices.
   * Failures are logged but never break the notification creation flow.
   */
  private async sendWebPush(notification: INotification): Promise<void> {
    try {
      await this.pushService.send(notification.recipient, {
        title: notification.title,
        message: notification.message,
        data: notification.data,
      });
    } catch (error) {
      logger.error(error, 'Web push error');
    }
  }

  async create(input: CreateNotificationInput): Promise<INotification> {
    const notification = await this.notificationRepository.create(input);
    this.emit(input.recipient, notification);
    void this.sendWebPush(notification);
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
