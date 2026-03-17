import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { AsanaService } from '../services/asana.js';
import { getUserRole, getRoleFunctionFilter } from '../config.js';

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

// Get projects for a workspace
router.get('/projects/:workspaceGid', requireAuth, async (req, res) => {
  try {
    const asana = new AsanaService(req.session.asana!.accessToken);
    const projects = await asana.getProjects(req.params.workspaceGid);
    res.json({ projects });
  } catch (error: any) {
    console.error('Error fetching projects:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
    });
  }
});

// Get tasks filtered by project and custom field
router.get('/tasks/project/:projectGid/filter', requireAuth, async (req, res) => {
  try {
    const { customFieldGid, optionGid } = req.query;

    if (!customFieldGid || !optionGid) {
      return res.status(400).json({
        error: 'Missing required query parameters: customFieldGid and optionGid'
      });
    }

    const asana = new AsanaService(req.session.asana!.accessToken);
    const data = await asana.getTasksByProjectAndFilter(
      req.params.projectGid,
      customFieldGid as string,
      optionGid as string
    );
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching project tasks:', error.response?.data || error.message);
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

// Get role-based tasks (automatically applies role filter)
router.get('/tasks/:workspaceGid/role-based', requireAuth, async (req, res) => {
  try {
    const user = req.session.asana!.user;
    const role = getUserRole(user.email || '');
    const asana = new AsanaService(req.session.asana!.accessToken);

    // For super admins and department heads, we need to get the Function custom field
    // and filter by their role's function value
    if (role !== 'user') {
      const customFields = await asana.getCustomFields(req.params.workspaceGid);
      const functionField = customFields.find((f: any) =>
        f.name.toLowerCase() === 'function'
      );

      if (!functionField) {
        return res.status(404).json({
          error: 'Function custom field not found in this workspace'
        });
      }

      const roleFilter = getRoleFunctionFilter(role);

      if (role === 'super_admin') {
        // Super admins see all tasks (including unassigned function) + their personal tasks
        const allTasks: any[] = [];

        for (const option of functionField.enum_options) {
          const tasks = await asana.getTasksByCustomField(
            req.params.workspaceGid,
            functionField.gid,
            option.gid,
            false // Don't include unassigned here, we'll fetch them separately
          );
          allTasks.push(...tasks);
        }

        // Get tasks with no Function assigned
        const unassignedTasks = await asana.getTasksByCustomField(
          req.params.workspaceGid,
          functionField.gid,
          '', // Empty option - we only care about unassigned
          true // Include unassigned
        );
        allTasks.push(...unassignedTasks);

        // Get user's personal tasks (assigned to them or following)
        const userTasks = await asana.getUserTasks(req.params.workspaceGid, user.gid);

        // Merge and deduplicate by task gid
        const taskMap = new Map();
        [...allTasks, ...userTasks].forEach(task => {
          taskMap.set(task.gid, task);
        });
        const mergedTasks = Array.from(taskMap.values());

        const enrichedData = await asana.enrichTasks(mergedTasks, req.params.workspaceGid);
        return res.json(enrichedData);
      }

      if (roleFilter) {
        // Department heads see: their function tasks + unassigned function tasks + their personal tasks
        const option = functionField.enum_options.find((opt: any) =>
          opt.name === roleFilter
        );

        if (!option) {
          return res.status(404).json({
            error: `Function option "${roleFilter}" not found`
          });
        }

        // Get role-based tasks (including tasks with no Function assigned)
        const roleTasks = await asana.getTasksByCustomField(
          req.params.workspaceGid,
          functionField.gid,
          option.gid,
          true // Include tasks with no Function value set
        );

        // Get user's personal tasks (assigned to them or following)
        const userTasks = await asana.getUserTasks(req.params.workspaceGid, user.gid);

        // Merge and deduplicate by task gid
        const taskMap = new Map();
        [...roleTasks, ...userTasks].forEach(task => {
          taskMap.set(task.gid, task);
        });
        const mergedTasks = Array.from(taskMap.values());

        const data = await asana.enrichTasks(mergedTasks, req.params.workspaceGid);
        return res.json(data);
      }
    }

    // Regular users see only what they have access to
    // For now, return empty or fetch based on current filter
    res.json({
      tasks: [],
      total_tasks: 0,
      last_fetched: new Date().toISOString(),
      workspace_name: 'Your Workspace',
      message: 'Please select a filter to view tasks'
    });

  } catch (error: any) {
    console.error('Error fetching role-based tasks:', error.response?.data || error.message);
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
