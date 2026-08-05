import { Types } from 'mongoose';
import { BaseMongoRepository } from '@database/repositories/mongo/BaseMongoRepository';
import { IPushSubscription, PushSubscriptionModel } from './push.model';
import { IPushSubscriptionRepository } from './push.repository.interface';

export class PushSubscriptionRepository
  extends BaseMongoRepository<IPushSubscription>
  implements IPushSubscriptionRepository
{
  constructor() {
    super(PushSubscriptionModel);
  }

  async findByUser(userId: string): Promise<IPushSubscription[]> {
    return this.model
      .find({ user: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByEndpoint(endpoint: string): Promise<IPushSubscription | null> {
    return this.model.findOne({ endpoint }).exec();
  }

  async deleteByEndpoint(endpoint: string): Promise<boolean> {
    const result = await this.model.deleteOne({ endpoint }).exec();
    return result.deletedCount > 0;
  }
}
