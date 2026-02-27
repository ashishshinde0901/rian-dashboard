import axios, { AxiosInstance } from 'axios';
import { AsanaComment, SalesTask, DashboardResponse } from '../types/index.js';

export class AsanaService {
  private api: AxiosInstance;

  constructor(accessToken: string) {
    this.api = axios.create({
      baseURL: 'https://app.asana.com/api/1.0',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  // ─── Get all workspaces ───
  async getWorkspaces() {
    const { data } = await this.api.get('/workspaces');
    return data.data;
  }

  // ─── Get all custom fields for a workspace ───
  async getCustomFields(workspaceGid: string) {
    const { data } = await this.api.get(`/workspaces/${workspaceGid}/custom_fields`, {
      params: {
        opt_fields: 'gid,name,resource_subtype,enum_options.gid,enum_options.name,enum_options.enabled',
        limit: 100
      }
    });

    console.log(`\n=== Found ${data.data.length} total custom fields in workspace ===`);

    // Log ALL fields to debug
    data.data.forEach((field: any) => {
      console.log(`  - "${field.name}" (type: ${field.resource_subtype}, options: ${field.enum_options?.length || 0})`);
    });

    // Filter to only enum/dropdown fields (including multi_enum) with enabled options
    const enumFields = data.data.filter((field: any) => {
      const isEnum = field.resource_subtype === 'enum' || field.resource_subtype === 'multi_enum';
      const hasOptions = field.enum_options && field.enum_options.length > 0;

      if (isEnum && hasOptions) {
        // Filter to only enabled options
        field.enum_options = field.enum_options.filter((opt: any) => opt.enabled !== false);
      }

      return isEnum && hasOptions;
    });

    console.log(`\n=== Returning ${enumFields.length} enum custom fields ===`);
    enumFields.forEach((field: any) => {
      console.log(`  ✓ ${field.name} (${field.enum_options.length} options)`);
    });
    console.log('');

    return enumFields;
  }

  // ─── Get all tags in a workspace, find "Sales Initiative" ───
  async findSalesInitiativeTag(workspaceGid: string): Promise<string | null> {
    let offset: string | null = null;
    do {
      const params: any = { workspace: workspaceGid, limit: 100, opt_fields: 'name' };
      if (offset) params.offset = offset;

      const { data } = await this.api.get('/tags', { params });
      const tag = data.data.find(
        (t: any) => t.name.toLowerCase() === 'sales initiative'
      );
      if (tag) return tag.gid;

      offset = data.next_page?.offset || null;
    } while (offset);

    return null;
  }

  // ─── Alternative: Find via Custom Field (dropdown with "Sales Initiative" option) ───
  async findSalesInitiativeCustomField(workspaceGid: string): Promise<{ fieldGid: string; optionGid: string } | null> {
    const { data } = await this.api.get(`/workspaces/${workspaceGid}/custom_fields`, {
      params: { opt_fields: 'name,enum_options.name', limit: 100 }
    });

    for (const field of data.data) {
      if (field.enum_options) {
        const option = field.enum_options.find(
          (opt: any) => opt.name.toLowerCase() === 'sales initiative'
        );
        if (option) {
          return { fieldGid: field.gid, optionGid: option.gid };
        }
      }
    }
    return null;
  }

  // ─── Get tasks by tag ───
  async getTasksByTag(tagGid: string): Promise<any[]> {
    let tasks: any[] = [];
    let url = `/tags/${tagGid}/tasks`;
    let params: any = {
      opt_fields: [
        'name',
        'assignee.name',
        'assignee.photo.image_60x60',
        'modified_at',
        'notes',
        'completed',
        'permalink_url',
      ].join(','),
      limit: 100,
    };

    while (url) {
      const { data } = await this.api.get(url, { params });
      tasks.push(...data.data);
      if (data.next_page) {
        url = data.next_page.uri;
        params = {}; // next_page URI includes params
      } else {
        url = '';
      }
    }

    return tasks;
  }

  // ─── Get ALL tasks and filter by custom field (works for both enum and multi_enum) ───
  async getTasksByCustomField(
    workspaceGid: string,
    customFieldGid: string,
    optionGid: string
  ): Promise<any[]> {
    console.log(`\nFetching tasks with custom field ${customFieldGid} = ${optionGid}...`);

    // Get all tasks from workspace with a minimal filter (incomplete tasks)
    // Then we'll filter by custom field client-side
    const { data } = await this.api.get(
      `/workspaces/${workspaceGid}/tasks/search`,
      {
        params: {
          'is_subtask': 'false', // Required filter for search API
          opt_fields: [
            'name',
            'assignee.name',
            'assignee.photo.image_60x60',
            'modified_at',
            'notes',
            'completed',
            'permalink_url',
            `custom_fields`,
          ].join(','),
          limit: 100,
        },
      }
    );

    console.log(`Found ${data.data.length} total tasks, filtering by custom field...`);

    // Filter tasks that have the selected option
    const filtered = data.data.filter((task: any) => {
      if (!task.custom_fields || !Array.isArray(task.custom_fields)) return false;

      const customField = task.custom_fields.find((cf: any) => cf.gid === customFieldGid);

      if (!customField) return false;

      // For enum fields, check if value matches
      if (customField.enum_value && customField.enum_value.gid === optionGid) {
        return true;
      }

      // For multi_enum fields, check if the option is in the array
      if (customField.multi_enum_values && Array.isArray(customField.multi_enum_values)) {
        return customField.multi_enum_values.some((val: any) => val.gid === optionGid);
      }

      return false;
    });

    console.log(`Filtered to ${filtered.length} matching tasks\n`);
    return filtered;
  }

  // ─── Get ALL comments for a task (sorted newest first) ───
  async getTaskComments(taskGid: string): Promise<AsanaComment[]> {
    const { data } = await this.api.get(`/tasks/${taskGid}/stories`, {
      params: {
        opt_fields: 'text,created_by.name,created_at,type',
      },
    });

    // Filter to only human comments (not system-generated stories)
    const comments = data.data
      .filter((story: any) => story.type === 'comment')
      .sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

    return comments;
  }

  // ─── Get tasks by custom field filter ───
  async getTasksByFilter(
    workspaceGid: string,
    customFieldGid: string,
    optionGid: string
  ): Promise<DashboardResponse> {
    const tasks = await this.getTasksByCustomField(workspaceGid, customFieldGid, optionGid);
    return this.enrichTasks(tasks, workspaceGid);
  }

  // ─── Build full dashboard payload (legacy - kept for compatibility) ───
  async getSalesInitiativeTasks(workspaceGid: string): Promise<DashboardResponse> {
    // Step 1: Find the "Sales Initiative" tag
    const tagGid = await this.findSalesInitiativeTag(workspaceGid);

    if (!tagGid) {
      // Fallback: try custom field
      const cf = await this.findSalesInitiativeCustomField(workspaceGid);
      if (!cf) {
        throw new Error(
          'Could not find "Sales Initiative" tag or custom field in this workspace. ' +
          'Please create a tag named "Sales Initiative" in Asana and tag your tasks.'
        );
      }
      // Use custom field search
      const tasks = await this.getTasksByCustomField(workspaceGid, cf.fieldGid, cf.optionGid);
      return this.enrichTasks(tasks, workspaceGid);
    }

    // Step 2: Get all tasks with that tag
    const tasks = await this.getTasksByTag(tagGid);
    return this.enrichTasks(tasks, workspaceGid);
  }

  // ─── Enrich tasks with comments ───
  private async enrichTasks(rawTasks: any[], workspaceGid: string): Promise<DashboardResponse> {
    // Fetch comments for all tasks in parallel (with concurrency limit)
    const CONCURRENCY = 5;
    const enriched: SalesTask[] = [];

    for (let i = 0; i < rawTasks.length; i += CONCURRENCY) {
      const batch = rawTasks.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (task) => {
          const comments = await this.getTaskComments(task.gid);

          // Extract "Task Status" custom field value
          let taskStatus: string | undefined = undefined;
          if (task.custom_fields && Array.isArray(task.custom_fields)) {
            const statusField = task.custom_fields.find(
              (cf: any) => cf.name?.toLowerCase() === 'task status'
            );
            if (statusField) {
              // For enum fields
              if (statusField.enum_value?.name) {
                taskStatus = statusField.enum_value.name;
              }
              // For multi_enum fields, join all selected values
              else if (statusField.multi_enum_values && Array.isArray(statusField.multi_enum_values)) {
                taskStatus = statusField.multi_enum_values.map((v: any) => v.name).join(', ');
              }
            }
          }

          return {
            gid: task.gid,
            name: task.name,
            updated_date: task.modified_at,
            user: task.assignee?.name || 'Unassigned',
            user_avatar: task.assignee?.photo?.image_60x60 || undefined,
            description: task.notes || '',
            completed: task.completed,
            comments: comments,
            total_comments: comments.length,
            permalink_url: task.permalink_url || undefined,
            task_status: taskStatus,
          };
        })
      );
      enriched.push(...results);
    }

    // Sort by most recently updated
    enriched.sort(
      (a, b) => new Date(b.updated_date).getTime() - new Date(a.updated_date).getTime()
    );

    // Get workspace name
    const workspaces = await this.getWorkspaces();
    const workspace = workspaces.find((w: any) => w.gid === workspaceGid);

    return {
      tasks: enriched,
      total_tasks: enriched.length,
      last_fetched: new Date().toISOString(),
      workspace_name: workspace?.name || 'Unknown Workspace',
    };
  }
}
