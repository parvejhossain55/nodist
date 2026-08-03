import { Model, Document, FilterQuery, UpdateQuery } from 'mongoose';
import {
  FindManyOptions,
  IBaseRepository,
} from '@database/repositories/interfaces/IBaseRepository';

export class BaseMongoRepository<TDoc extends Document, TId = string> implements IBaseRepository<
  TDoc,
  TId
> {
  constructor(protected readonly model: Model<TDoc>) {}

  async create(data: Partial<TDoc>): Promise<TDoc> {
    const doc = await this.model.create(data);
    return doc;
  }

  async findById(id: TId): Promise<TDoc | null> {
    return this.model.findById(id as unknown as string).exec();
  }

  async findOne(filter: FilterQuery<TDoc>): Promise<TDoc | null> {
    return this.model.findOne(filter).exec();
  }

  async findMany(filter: FilterQuery<TDoc>, options: FindManyOptions = {}): Promise<TDoc[]> {
    const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;
    return this.model
      .find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
  }

  async updateById(id: TId, data: UpdateQuery<TDoc>): Promise<TDoc | null> {
    return this.model
      .findByIdAndUpdate(id as unknown as string, data, { new: true, runValidators: true })
      .exec();
  }

  async deleteById(id: TId): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id as unknown as string).exec();
    return result !== null;
  }

  async count(filter: FilterQuery<TDoc> = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }
}
