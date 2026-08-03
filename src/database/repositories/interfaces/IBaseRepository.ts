export interface IBaseRepository<TEntity, TId = string> {
  create(data: Partial<TEntity>): Promise<TEntity>;
  findById(id: TId): Promise<TEntity | null>;
  findOne(filter: Partial<TEntity> | Record<string, unknown>): Promise<TEntity | null>;
  findMany(
    filter?: Partial<TEntity> | Record<string, unknown>,
    options?: FindManyOptions,
  ): Promise<TEntity[]>;
  updateById(id: TId, data: Partial<TEntity>): Promise<TEntity | null>;
  deleteById(id: TId): Promise<boolean>;
  count(filter?: Partial<TEntity> | Record<string, unknown>): Promise<number>;
}

export interface FindManyOptions {
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
}
