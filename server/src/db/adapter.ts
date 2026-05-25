export interface DbAdapter {
  readonly dialect: 'sqlite' | 'postgres';
  get<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | undefined>;
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  run(sql: string, params?: unknown[]): Promise<{ lastInsertId: number; changes: number }>;
  transaction<T>(fn: (db: DbAdapter) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
