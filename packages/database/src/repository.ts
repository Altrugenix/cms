import type { DatabaseAdapter, QueryOptions } from "./types.js";

export class Repository {
  private readonly adapter: DatabaseAdapter;
  private readonly collection: string;

  constructor(adapter: DatabaseAdapter, collection: string) {
    this.adapter = adapter;
    this.collection = collection;
  }

  async findById(id: string): Promise<Record<string, unknown> | null> {
    return this.adapter.findOne(this.collection, id);
  }

  async findMany(
    options?: QueryOptions,
  ): Promise<{ data: Record<string, unknown>[]; total: number }> {
    return this.adapter.findMany(this.collection, options);
  }

  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.adapter.create(this.collection, data);
  }

  async update(id: string, data: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    return this.adapter.update(this.collection, id, data);
  }

  async delete(id: string): Promise<boolean> {
    return this.adapter.delete(this.collection, id);
  }

  async transaction<T>(fn: (repo: Repository) => Promise<T>): Promise<T> {
    return this.adapter.transaction(async () => fn(this));
  }
}
