import express from 'express';
import { AsanaService } from '../services/asana.js';
import { DeliveryMetricsService } from '../services/deliveryMetrics.js';

const router = express.Router();

/**
 * GET /api/delivery/dashboard
 * Get delivery dashboard with Asana tasks merged with private metrics
 */
router.get('/dashboard', async (req, res) => {
  try {
    const accessToken = req.session.asana?.accessToken;
    if (!accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { workspaceGid, customFieldGid, optionGid } = req.query;

    if (!workspaceGid || !customFieldGid || !optionGid) {
      return res.status(400).json({
        error: 'Missing required parameters: workspaceGid, customFieldGid, optionGid',
      });
    }

    // Fetch Delivery tasks from Asana
    const asana = new AsanaService(accessToken);
    const dashboard = await asana.getTasksByFilter(
      workspaceGid as string,
      customFieldGid as string,
      optionGid as string
    );

    // Get task GIDs
    const taskGids = dashboard.tasks.map((task) => task.gid);

    // Fetch private metrics for all tasks in bulk
    const metricsMap = await DeliveryMetricsService.getMetricsForTasks(taskGids);

    // Merge Asana data with private metrics
    const enrichedTasks = dashboard.tasks.map((task) => {
      const metric = metricsMap.get(task.gid);

      return {
        ...task,
        // Private management fields
        committed_delivery_date: metric?.committed_delivery_date || null,
        planned_margin: metric?.planned_margin || null,
        actual_margin: metric?.actual_margin || null,
        // Extract only "Update:" comments for display
        updateComments: task.comments
          .filter((c) => c.text.trim().toLowerCase().startsWith('update:'))
          .map((c) => ({
            text: c.text.replace(/^update:\s*/i, '').trim(),
            created_at: c.created_at,
            author: c.created_by?.name || 'Unknown',
          })),
      };
    });

    res.json({
      tasks: enrichedTasks,
    });
  } catch (error: any) {
    console.error('Error fetching delivery dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/delivery/metrics
 * Create or update delivery metrics for a task
 */
router.post('/metrics', async (req, res) => {
  console.log('📝 POST /api/delivery/metrics - Request received');
  console.log('Request body:', req.body);

  try {
    const { asana_task_gid, project_name, committed_delivery_date, planned_margin, actual_margin } =
      req.body;

    if (!asana_task_gid) {
      console.log('❌ Missing asana_task_gid');
      return res.status(400).json({ error: 'asana_task_gid is required' });
    }

    console.log('💾 Attempting to save metric for task:', asana_task_gid);

    const metric = await DeliveryMetricsService.upsertMetric({
      asana_task_gid,
      project_name,
      committed_delivery_date,
      planned_margin: planned_margin ? parseFloat(planned_margin) : null,
      actual_margin: actual_margin ? parseFloat(actual_margin) : null,
    });

    console.log('✅ Metric saved successfully:', metric);
    res.json(metric);
  } catch (error: any) {
    console.error('❌ Error saving delivery metric:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/delivery/metrics/:taskGid
 * Get delivery metrics for a specific task
 */
router.get('/metrics/:taskGid', async (req, res) => {
  try {
    const { taskGid } = req.params;

    const metric = await DeliveryMetricsService.getMetric(taskGid);

    if (!metric) {
      return res.status(404).json({ error: 'Metric not found' });
    }

    res.json(metric);
  } catch (error: any) {
    console.error('Error fetching delivery metric:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/delivery/metrics/:taskGid
 * Delete delivery metrics for a task
 */
router.delete('/metrics/:taskGid', async (req, res) => {
  try {
    const { taskGid } = req.params;

    const deleted = await DeliveryMetricsService.deleteMetric(taskGid);

    if (!deleted) {
      return res.status(404).json({ error: 'Metric not found' });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting delivery metric:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
