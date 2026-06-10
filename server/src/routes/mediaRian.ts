import { Router, Request, Response } from 'express';
import { AsanaService } from '../services/asana.js';

const router = Router();

const MEDIA_RIAN_PROJECT_GID = '1215471459454088';
const WORKSPACE_GID = '1200057218350324';

// Helper to map Flag field to color
function mapFlagToColor(flag: string | null): 'red' | 'amber' | 'green' {
  if (!flag) return 'amber';
  const lower = flag.toLowerCase();
  if (lower.includes('red') || lower.includes('block')) return 'red';
  if (lower.includes('green') || lower.includes('track') || lower.includes('on')) return 'green';
  return 'amber';
}

// Helper to map Priority
function mapPriority(priority: string | null): string {
  if (!priority) return 'P2';
  if (priority.includes('Critical') || priority.includes('P0')) return 'P0';
  if (priority.includes('High') || priority.includes('P1')) return 'P1';
  if (priority.includes('Medium') || priority.includes('P2')) return 'P2';
  return 'P3';
}

// Helper to extract custom field value
function getCustomFieldValue(customFields: any[], fieldName: string): any {
  if (!customFields || !Array.isArray(customFields)) return null;

  const field = customFields.find((f: any) =>
    f.name?.toLowerCase() === fieldName.toLowerCase()
  );

  if (!field) return null;

  // Return the appropriate value based on field type
  if (field.enum_value?.name) return field.enum_value.name;
  if (field.multi_enum_values && Array.isArray(field.multi_enum_values)) {
    return field.multi_enum_values.map((v: any) => v.name).join(', ');
  }
  if (field.text_value) return field.text_value;
  if (field.number_value !== null && field.number_value !== undefined) return field.number_value;
  if (field.date_value) return field.date_value;

  return null;
}

// Transform Asana task to Initiative format
function transformTaskToInitiative(task: any): any {
  const customFields = task.custom_fields || [];

  const flag = getCustomFieldValue(customFields, 'Flag');
  const initiativeType = getCustomFieldValue(customFields, 'Initiative Type') || 'India BD';
  const priority = getCustomFieldValue(customFields, 'Priority');

  return {
    id: task.gid,
    gid: task.gid,
    name: task.name,
    desc: getCustomFieldValue(customFields, 'Short Description') || task.notes || '',
    type: initiativeType,
    overall: mapFlagToColor(flag),
    deliveryStatus: getCustomFieldValue(customFields, 'Delivery Status') || 'Not Started',
    priority: mapPriority(priority),
    region: getCustomFieldValue(customFields, 'Region') || '',
    client: getCustomFieldValue(customFields, 'Client') || '',
    valueL: getCustomFieldValue(customFields, 'Expected Value (₹L)'),
    conv: getCustomFieldValue(customFields, 'Conversion time estimation') || '',
    due: getCustomFieldValue(customFields, 'Commited Delivery Date') || '',
    owner: task.assignee?.name || 'Unassigned',
    permalink_url: task.permalink_url,
    updated_date: task.modified_at,
    comments: task.comments || [],
  };
}

// GET /api/media-rian/initiatives - Get all initiatives from Media.Rian project
router.get('/initiatives', async (req: Request, res: Response) => {
  try {
    // Use server-side ASANA_ACCESS_TOKEN for Media.Rian project
    const accessToken = process.env.ASANA_ACCESS_TOKEN;
    if (!accessToken) {
      return res.status(500).json({ error: 'ASANA_ACCESS_TOKEN not configured on server' });
    }

    const asana = new AsanaService(accessToken);

    console.log('\n=== Fetching Media.Rian initiatives ===');

    // Fetch tasks from Media.Rian project with all custom fields
    const { data } = await asana['api'].get(`/projects/${MEDIA_RIAN_PROJECT_GID}/tasks`, {
      params: {
        opt_fields: [
          'name',
          'gid',
          'assignee.name',
          'assignee.photo.image_60x60',
          'modified_at',
          'notes',
          'completed',
          'permalink_url',
          'custom_fields.name',
          'custom_fields.enum_value.name',
          'custom_fields.multi_enum_values.name',
          'custom_fields.text_value',
          'custom_fields.number_value',
          'custom_fields.date_value',
        ].join(','),
        limit: 100,
      },
    });

    console.log(`Found ${data.data.length} tasks in Media.Rian project`);

    // Transform tasks to initiatives
    const initiatives = data.data.map(transformTaskToInitiative);

    // Sort by most recently updated
    initiatives.sort(
      (a: any, b: any) =>
        new Date(b.updated_date).getTime() - new Date(a.updated_date).getTime()
    );

    console.log(`Transformed to ${initiatives.length} initiatives\n`);

    res.json({
      initiatives,
      totalTasks: initiatives.length,
      lastFetched: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching Media.Rian initiatives:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/media-rian/initiatives/:id - Get single initiative with comments
router.get('/initiatives/:id', async (req: Request, res: Response) => {
  try {
    // Use server-side ASANA_ACCESS_TOKEN for Media.Rian project
    const accessToken = process.env.ASANA_ACCESS_TOKEN;
    if (!accessToken) {
      return res.status(500).json({ error: 'ASANA_ACCESS_TOKEN not configured on server' });
    }

    const { id } = req.params;
    const asana = new AsanaService(accessToken);

    console.log(`\n=== Fetching initiative ${id} with comments ===`);

    // Fetch task details
    const { data: taskData } = await asana['api'].get(`/tasks/${id}`, {
      params: {
        opt_fields: [
          'name',
          'gid',
          'assignee.name',
          'assignee.photo.image_60x60',
          'modified_at',
          'notes',
          'completed',
          'permalink_url',
          'custom_fields.name',
          'custom_fields.enum_value.name',
          'custom_fields.multi_enum_values.name',
          'custom_fields.text_value',
          'custom_fields.number_value',
          'custom_fields.date_value',
        ].join(','),
      },
    });

    // Fetch comments
    const comments = await asana.getTaskComments(id);

    // Transform comments to match Initiative format
    const formattedComments = comments.map((comment: any) => ({
      gid: comment.gid,
      author: comment.created_by.name,
      text: comment.text,
      created_at: comment.created_at,
      ago: getTimeAgo(new Date(comment.created_at)),
      source: 'asana' as const,
    }));

    const initiative = transformTaskToInitiative(taskData.data);
    initiative.comments = formattedComments;

    console.log(`Fetched initiative with ${formattedComments.length} comments\n`);

    res.json({ initiative });
  } catch (error: any) {
    console.error('Error fetching initiative:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/media-rian/initiatives/:id/comments - Add comment to initiative
router.post('/initiatives/:id/comments', async (req: Request, res: Response) => {
  try {
    // Use server-side ASANA_ACCESS_TOKEN for Media.Rian project
    const accessToken = process.env.ASANA_ACCESS_TOKEN;
    if (!accessToken) {
      return res.status(500).json({ error: 'ASANA_ACCESS_TOKEN not configured on server' });
    }

    const { id } = req.params;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const asana = new AsanaService(accessToken);

    console.log(`\n=== Adding comment to initiative ${id} ===`);

    // Add comment to Asana task
    const { data } = await asana['api'].post(`/tasks/${id}/stories`, {
      data: {
        text: text.trim(),
      },
    });

    const newComment = {
      gid: data.data.gid,
      author: data.data.created_by.name,
      text: text.trim(),
      created_at: data.data.created_at,
      ago: 'now',
      source: 'dashboard' as const,
    };

    console.log(`Comment added successfully\n`);

    res.json({ comment: newComment });
  } catch (error: any) {
    console.error('Error adding comment:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Helper to calculate time ago
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  const intervals: { [key: string]: number } = {
    y: 31536000,
    mo: 2592000,
    w: 604800,
    d: 86400,
    h: 3600,
    m: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval}${unit}`;
    }
  }

  return 'now';
}

// POST /api/media-rian/chat - AI chat endpoint
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { query, initiatives } = req.body;

    if (!query || !initiatives) {
      return res.status(400).json({ error: 'Query and initiatives are required' });
    }

    // Use OpenRouter if API key is available
    const openRouterKey = process.env.OPENROUTER_API_KEY;

    if (openRouterKey) {
      const { OpenRouterService } = await import('../services/openrouter.js');
      const openRouter = new OpenRouterService(openRouterKey);
      const result = await openRouter.analyzeInitiatives(query, initiatives);
      return res.json(result);
    }

    // Fallback to simple pattern matching if no OpenRouter key
    const response = analyzeWithPatterns(query, initiatives);
    res.json(response);
  } catch (error: any) {
    console.error('Error processing chat query:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Simple pattern-based analysis (fallback)
function analyzeWithPatterns(query: string, initiatives: any[]): any {
  const lowerQuery = query.toLowerCase();

  if (/(block|red flag|stuck|why)/.test(lowerQuery)) {
    const blocked = initiatives.filter(i => i.overall === 'red');
    return {
      type: 'blocked',
      data: {
        count: blocked.length,
        initiatives: blocked.map(i => ({
          name: i.name,
          type: i.type,
          reason: i.desc?.slice(0, 100) || 'See task details'
        }))
      }
    };
  }

  if (/(summary|exec|overview|status|how are we)/.test(lowerQuery)) {
    const onTrack = initiatives.filter(i => i.overall === 'green').length;
    const atRisk = initiatives.filter(i => i.overall === 'amber').length;
    const blocked = initiatives.filter(i => i.overall === 'red').length;

    return {
      type: 'summary',
      data: {
        total: initiatives.length,
        onTrack,
        atRisk,
        blocked,
        message: `Portfolio health: ${onTrack} on track, ${atRisk} at risk, ${blocked} blocked across ${initiatives.length} initiatives.`
      }
    };
  }

  if (/(who|most|owner|workload)/.test(lowerQuery)) {
    const byOwner: any = {};
    initiatives.forEach(i => {
      if (!byOwner[i.owner]) {
        byOwner[i.owner] = { count: 0, blocked: 0 };
      }
      byOwner[i.owner].count++;
      if (i.overall === 'red') byOwner[i.owner].blocked++;
    });

    const sorted = Object.entries(byOwner)
      .sort((a: any, b: any) => b[1].count - a[1].count)
      .slice(0, 5);

    return {
      type: 'workload',
      data: {
        owners: sorted.map(([name, stats]: any) => ({
          name,
          count: stats.count,
          blocked: stats.blocked
        }))
      }
    };
  }

  if (/(deadline|overdue|late|due)/.test(lowerQuery)) {
    const withDates = initiatives
      .filter(i => i.due)
      .map(i => ({
        name: i.name,
        due: i.due,
        overall: i.overall,
        daysUntil: Math.floor((new Date(i.due).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      }))
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 6);

    return {
      type: 'deadlines',
      data: { initiatives: withDates }
    };
  }

  if (/(pipeline|value|revenue|by area)/.test(lowerQuery)) {
    const byType: any = {};
    initiatives.forEach(i => {
      if (!byType[i.type]) {
        byType[i.type] = { count: 0, red: 0, amber: 0, green: 0 };
      }
      byType[i.type].count++;
      byType[i.type][i.overall]++;
    });

    return {
      type: 'pipeline',
      data: { byType }
    };
  }

  // Default response
  return {
    type: 'general',
    data: {
      message: `I can help you analyze your ${initiatives.length} initiatives. Try asking about blocked items, executive summary, owner workload, deadlines, or pipeline by area.`
    }
  };
}

export default router;
