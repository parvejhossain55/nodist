import { IBaseRepository } from '@database/repositories/interfaces/IBaseRepository';
import { IUser } from './user.model';

export interface IUserRepository extends IBaseRepository<IUser> {
  findByEmail(email: string, withPassword?: boolean): Promise<IUser | null>;
  findByIDWithPassword(id: string): Promise<IUser | null>;
}
