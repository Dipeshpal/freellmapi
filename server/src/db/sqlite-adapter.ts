import Database from 'better-sqlite3';
import type { DbAdapter } from './adapter.js';

export class SqliteAdapter implements DbAdapter {
  readonly dialect = 'sqlite' as const;

  constructor(private db: Database.Database) {}

  async get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  async all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...params) as T[];
  }

  async run(sql: string, params: unknown[] = []): Promise<{ lastInsertId: number; changes: number }> {
    const result = this.db.prepare(sql).run(...params);
    return {
      lastInsertId: Number(result.lastInsertRowid),
      changes: result.changes,
    };
  }

  async transaction<T>(fn: (db: DbAdapter) => Promise<T>): Promise<T> {
    this.db.exec('BEGIN');
    try {
      const result = await fn(this);
      this.db.exec('COMMIT');
      return result;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
