import { Pool } from 'pg';

// Create PostgreSQL connection pool
let pool: Pool | null = null;

export const getPool = (): Pool => {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      console.warn('⚠️  DATABASE_URL not configured. Database features will be disabled.');
      throw new Error('DATABASE_URL environment variable is not set');
    }

    pool = new Pool({
      connectionString: databaseUrl,
      ssl:
        process.env.NODE_ENV === 'production'
          ? {
              rejectUnauthorized: false, // Railway requires this
            }
          : false,
    });

    console.log('✅ PostgreSQL connection pool created');
  }

  return pool;
};

// Close pool gracefully
export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('🔌 PostgreSQL connection pool closed');
  }
};

// Initialize database schema
export const initializeDatabase = async (): Promise<void> => {
  try {
    const pool = getPool();

    // Create delivery_metrics table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS delivery_metrics (
        id SERIAL PRIMARY KEY,
        asana_task_gid VARCHAR(255) UNIQUE NOT NULL,
        project_name VARCHAR(500),
        committed_delivery_date DATE,
        planned_margin DECIMAL(10, 2),
        actual_margin DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create index for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_asana_task_gid
      ON delivery_metrics(asana_task_gid);
    `);

    console.log('✅ Database schema initialized');
  } catch (error: any) {
    if (error.message.includes('DATABASE_URL')) {
      console.log('⏸️  Database initialization skipped (no DATABASE_URL configured)');
    } else {
      console.error('❌ Error initializing database:', error);
      throw error;
    }
  }
};
