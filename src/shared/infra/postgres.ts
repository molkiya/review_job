import postgres from 'postgres';
import { config } from '@/config/index.js';

export const sql = postgres(config.POSTGRES_URL, {
  max: 10,
  prepare: true,
});

export async function checkConnection(): Promise<void> {
  const result = await sql`SELECT 1 AS check`;
  if (result.length === 0) {
    throw new Error('PostgreSQL connection check failed');
  }
}
