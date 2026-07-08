import type { DatabaseAdapter, Migration } from "./types.js";

export class MigrationRunner {
  private readonly adapter: DatabaseAdapter;

  constructor(adapter: DatabaseAdapter) {
    this.adapter = adapter;
  }

  async run(migrations: Migration[]): Promise<void> {
    const executed = await this.adapter.getExecutedMigrations();
    const pending = migrations.filter((m) => !executed.includes(m.id));
    pending.sort((a, b) => a.id.localeCompare(b.id));

    for (const migration of pending) {
      await this.adapter.runMigration(migration);
    }
  }

  async rollback(migrations: Migration[], targetId?: string): Promise<void> {
    const executed = await this.adapter.getExecutedMigrations();
    const toRollback = migrations.filter((m) => executed.includes(m.id)).reverse();

    for (const migration of toRollback) {
      if (targetId && migration.id === targetId) break;
      await this.adapter.raw(migration.down);
    }
  }
}
