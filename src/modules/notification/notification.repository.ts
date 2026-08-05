import { BaseMongoRepository } from '@database/repositories/mongo/BaseMongoRepository';
import { INotification, NotificationModel } from './notification.model';
import { INotificationRepository } from './notification.repository.interface';

export class NotificationRepository
  extends BaseMongoRepository<INotification>
  implements INotificationRepository
{
  constructor() {
    super(NotificationModel);
  }

  async markAsRead(id: string): Promise<INotification | null> {
    return this.model.findByIdAndUpdate(id, { isRead: true }, { new: true }).exec();
  }

  async markAllAsRead(recipient: string): Promise<number> {
    const result = await this.model.updateMany({ recipient, isRead: false }, { isRead: true });
    return result.modifiedCount;
  }

  async countUnread(recipient: string): Promise<number> {
    return this.model.countDocuments({ recipient, isRead: false }).exec();
  }
}
