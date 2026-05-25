import { Pool, PoolClient } from 'pg';
import type { DbAdapter } from './adapter.js';

export class PostgresAdapter implements DbAdapter {
  readonly dialect = 'postgres' as const;
  private pool: Pool;
  private client?: PoolClient;
  private schema: string;

  constructor(connectionString: string, schema = 'FREE_LLM') {
    this.pool = new Pool({
      connectionString,
      statement_timeout: 30000,
    });
    this.schema = schema;
    // Set search_path for all connections
    this.pool.on('connect', async (client) => {
      await client.query(`SET search_path TO "${this.schema}", public`);
    });
  }

  async ensureSchema(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${this.schema}"`);
      await client.query(`SET search_path TO "${this.schema}", public`);
    } finally {
      client.release();
    }
  }

  private get executor() {
    return this.client ?? this.pool;
  }

  private convertPlaceholders(sql: string, params: unknown[]): { sql: string; params: unknown[] } {
    let i = 0;
    const converted = sql.replace(/\?/g, () => `$${++i}`);
    return { sql: converted, params };
  }

  private rewriteForPostgres(sql: string): string {
    let result = sql;
    // INSERT OR IGNORE INTO ... → INSERT INTO ... ON CONFLICT DO NOTHING
    result = result.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
    if (/INSERT\s+INTO/i.test(result) && !/ON\s+CONFLICT/i.test(result)) {
      result = result.replace(/;?\s*$/, '') + ' ON CONFLICT DO NOTHING';
    }
    // datetime('now') → to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    result = result.replace(
      /datetime\('now'\)/gi,
      `to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`
    );
    // datetime('now', 'start of month') → date_trunc('month', NOW() AT TIME ZONE 'UTC')::text
    result = result.replace(
      /datetime\('now'\s*,\s*'start of month'\)/gi,
      `date_trunc('month', NOW() AT TIME ZONE 'UTC')::text`
    );
    return result;
  }

  async get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const rewritten = this.rewriteForPostgres(sql);
    const { sql: converted, params: p } = this.convertPlaceholders(rewritten, params);
    const result = await this.executor.query(converted, p);
    return result.rows[0] as T | undefined;
  }

  async all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const rewritten = this.rewriteForPostgres(sql);
    const { sql: converted, params: p } = this.convertPlaceholders(rewritten, params);
    const result = await this.executor.query(converted, p);
    return result.rows as T[];
  }

  async run(sql: string, params: unknown[] = []): Promise<{ lastInsertId: number; changes: number }> {
    let rewritten = this.rewriteForPostgres(sql);
    // For INSERT, append RETURNING id if not present and no ON CONFLICT
    const isInsert = /^\s*INSERT\s/i.test(rewritten);
    const hasConflict = /ON\s+CONFLICT/i.test(rewritten);
    if (isInsert && !/RETURNING/i.test(rewritten) && !hasConflict) {
      rewritten = rewritten.replace(/;?\s*$/, '') + ' RETURNING id';
    }
    const { sql: converted, params: p } = this.convertPlaceholders(rewritten, params);
    const result = await this.executor.query(converted, p);
    return {
      lastInsertId: result.rows[0]?.id ?? 0,
      changes: result.rowCount ?? 0,
    };
  }

  async transaction<T>(fn: (db: DbAdapter) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    const txAdapter = new PostgresAdapter('', this.schema); // Dummy, will use executor
    txAdapter.client = client;
    txAdapter.pool = this.pool;
    await client.query(`SET search_path TO "${this.schema}", public`);
    await client.query('BEGIN');
    try {
      const result = await fn(txAdapter);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
      txAdapter.client = undefined;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
