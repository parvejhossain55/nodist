import { IBaseRepository } from '@database/repositories/interfaces/IBaseRepository';
import { IPushSubscription } from './push.model';

export interface IPushSubscriptionRepository extends IBaseRepository<IPushSubscription> {
  findByUser(userId: string): Promise<IPushSubscription[]>;
  findByEndpoint(endpoint: string): Promise<IPushSubscription | null>;
  deleteByEndpoint(endpoint: string): Promise<boolean>;
}
