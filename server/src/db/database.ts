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
        cost DECIMAL(12, 2),
        price DECIMAL(12, 2),
        visible_to_roles TEXT[], -- Array of roles that can see this metric
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Rename project_value to cost (migration for existing databases)
    await pool.query(`
      DO $$
      BEGIN
        -- If old column exists, rename it
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='delivery_metrics' AND column_name='project_value'
        ) THEN
          ALTER TABLE delivery_metrics RENAME COLUMN project_value TO cost;
        -- If neither exists, add cost column
        ELSIF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='delivery_metrics' AND column_name='cost'
        ) THEN
          ALTER TABLE delivery_metrics ADD COLUMN cost DECIMAL(12, 2);
        END IF;
      END $$;
    `);

    // Add price column if it doesn't exist (migration for existing databases)
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='delivery_metrics' AND column_name='price'
        ) THEN
          ALTER TABLE delivery_metrics ADD COLUMN price DECIMAL(12, 2);
        END IF;
      END $$;
    `);

    // Add visible_to_roles column if it doesn't exist (for role-based access)
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='delivery_metrics' AND column_name='visible_to_roles'
        ) THEN
          ALTER TABLE delivery_metrics ADD COLUMN visible_to_roles TEXT[];
        END IF;
      END $$;
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
