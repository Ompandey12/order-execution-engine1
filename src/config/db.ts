// src/config/db.ts
import { Pool, QueryResult, QueryResultRow } from 'pg';
import { env } from './env';

export const pool = new Pool({
  connectionString: env.databaseUrl
});

/**
 * Generic wrapper around pg Pool.query
 * Constrain T to QueryResultRow so pg types are satisfied.
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}
