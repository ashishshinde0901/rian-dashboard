import { getPool } from '../db/database.js';

export interface DeliveryMetric {
  id?: number;
  asana_task_gid: string;
  project_name?: string;
  committed_delivery_date?: string | null;
  planned_margin?: number | null;
  actual_margin?: number | null;
  cost?: number | null;
  price?: number | null;
  visible_to_roles?: string[] | null;
  created_at?: Date;
  updated_at?: Date;
}

export class DeliveryMetricsService {
  /**
   * Get delivery metric for a specific task
   */
  static async getMetric(asanaTaskGid: string): Promise<DeliveryMetric | null> {
    try {
      const pool = getPool();
      const result = await pool.query(
        'SELECT * FROM delivery_metrics WHERE asana_task_gid = $1',
        [asanaTaskGid]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching delivery metric:', error);
      return null;
    }
  }

  /**
   * Get all delivery metrics
   */
  static async getAllMetrics(): Promise<DeliveryMetric[]> {
    try {
      const pool = getPool();
      const result = await pool.query('SELECT * FROM delivery_metrics ORDER BY updated_at DESC');

      return result.rows;
    } catch (error) {
      console.error('Error fetching all delivery metrics:', error);
      return [];
    }
  }

  /**
   * Create or update delivery metric
   */
  static async upsertMetric(metric: DeliveryMetric): Promise<DeliveryMetric | null> {
    try {
      const pool = getPool();

      const result = await pool.query(
        `INSERT INTO delivery_metrics
          (asana_task_gid, project_name, committed_delivery_date, planned_margin, actual_margin, cost, price, visible_to_roles, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        ON CONFLICT (asana_task_gid)
        DO UPDATE SET
          project_name = EXCLUDED.project_name,
          committed_delivery_date = EXCLUDED.committed_delivery_date,
          planned_margin = EXCLUDED.planned_margin,
          actual_margin = EXCLUDED.actual_margin,
          cost = EXCLUDED.cost,
          price = EXCLUDED.price,
          visible_to_roles = EXCLUDED.visible_to_roles,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *`,
        [
          metric.asana_task_gid,
          metric.project_name || null,
          metric.committed_delivery_date || null,
          metric.planned_margin || null,
          metric.actual_margin || null,
          metric.cost || null,
          metric.price || null,
          metric.visible_to_roles || null,
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error upserting delivery metric:', error);
      throw error;
    }
  }

  /**
   * Delete delivery metric
   */
  static async deleteMetric(asanaTaskGid: string): Promise<boolean> {
    try {
      const pool = getPool();
      const result = await pool.query(
        'DELETE FROM delivery_metrics WHERE asana_task_gid = $1',
        [asanaTaskGid]
      );

      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting delivery metric:', error);
      return false;
    }
  }

  /**
   * Get metrics for multiple tasks (bulk fetch)
   */
  static async getMetricsForTasks(taskGids: string[]): Promise<Map<string, DeliveryMetric>> {
    try {
      const pool = getPool();
      const result = await pool.query(
        'SELECT * FROM delivery_metrics WHERE asana_task_gid = ANY($1::text[])',
        [taskGids]
      );

      const metricsMap = new Map<string, DeliveryMetric>();
      result.rows.forEach((row) => {
        metricsMap.set(row.asana_task_gid, row);
      });

      return metricsMap;
    } catch (error) {
      console.error('Error fetching metrics for tasks:', error);
      return new Map();
    }
  }
}
