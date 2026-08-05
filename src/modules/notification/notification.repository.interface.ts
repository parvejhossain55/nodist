import { IBaseRepository } from '@database/repositories/interfaces/IBaseRepository';
import { INotification } from './notification.model';

export interface INotificationRepository extends IBaseRepository<INotification> {
  markAsRead(id: string): Promise<INotification | null>;
  markAllAsRead(recipient: string): Promise<number>;
  countUnread(recipient: string): Promise<number>;
}
