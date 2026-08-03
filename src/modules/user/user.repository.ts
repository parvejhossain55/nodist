import { BaseMongoRepository } from '@database/repositories/mongo/BaseMongoRepository';
import { UserModel, IUser } from './user.model';
import { IUserRepository } from './user.repository.interface';

export class UserRepository extends BaseMongoRepository<IUser> implements IUserRepository {
  constructor() {
    super(UserModel);
  }

  async findByEmail(email: string, withPassword?: boolean): Promise<IUser | null> {
    const query = this.model.findOne({ email: email.toLocaleLowerCase() });
    if (withPassword) query.select('+password');
    return query.exec();
  }
}
