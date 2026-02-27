import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { AsanaService } from '../services/asana.js';

const router = Router();

// Get all workspaces (for workspace selector)
router.get('/workspaces', requireAuth, async (req, res) => {
  try {
    const asana = new AsanaService(req.session.asana!.accessToken);
    const workspaces = await asana.getWorkspaces();
    res.json({ workspaces });
  } catch (error: any) {
    console.error('Error fetching workspaces:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
    });
  }
});

// Get custom fields for a workspace
router.get('/custom-fields/:workspaceGid', requireAuth, async (req, res) => {
  try {
    const asana = new AsanaService(req.session.asana!.accessToken);
    const customFields = await asana.getCustomFields(req.params.workspaceGid);
    res.json({ customFields });
  } catch (error: any) {
    console.error('Error fetching custom fields:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
    });
  }
});

// Get tasks filtered by custom field
router.get('/tasks/:workspaceGid/filter', requireAuth, async (req, res) => {
  try {
    const { customFieldGid, optionGid } = req.query;

    if (!customFieldGid || !optionGid) {
      return res.status(400).json({
        error: 'Missing required query parameters: customFieldGid and optionGid'
      });
    }

    const asana = new AsanaService(req.session.asana!.accessToken);
    const data = await asana.getTasksByFilter(
      req.params.workspaceGid,
      customFieldGid as string,
      optionGid as string
    );
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching tasks:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
    });
  }
});

// Get sales initiative tasks for a workspace (legacy endpoint)
router.get('/sales-tasks/:workspaceGid', requireAuth, async (req, res) => {
  try {
    const asana = new AsanaService(req.session.asana!.accessToken);
    const data = await asana.getSalesInitiativeTasks(req.params.workspaceGid);
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching tasks:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
    });
  }
});

// Get comments for a specific task (for lazy-loading remaining comments)
router.get('/tasks/:taskGid/comments', requireAuth, async (req, res) => {
  try {
    const asana = new AsanaService(req.session.asana!.accessToken);
    const comments = await asana.getTaskComments(req.params.taskGid);
    res.json({ comments });
  } catch (error: any) {
    console.error('Error fetching comments:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
    });
  }
});

export default router;
