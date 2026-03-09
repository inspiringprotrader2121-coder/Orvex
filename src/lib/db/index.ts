import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const globalForDb = global as unknown as {
  db: ReturnType<typeof drizzle<typeof schema>> | undefined
  pool: Pool | undefined
};

const getPool = () => {
  if (!globalForDb.pool) {
    globalForDb.pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://launchlayer:launchlayer_secret@localhost:5432/launchlayer',
    });
  }
  return globalForDb.pool;
};

export const db = globalForDb.db ?? drizzle(getPool(), { schema });

if (process.env.NODE_ENV !== 'production') globalForDb.db = db;

// Exporting the raw pool just in case legacy code needs it
export const pool = getPool();
