import { AsanaService } from './asana.js';
import axios from 'axios';

const MEDIA_RIAN_PROJECT_GID = '1215471459454088';
const MEDIA_SQUAD_PROJECT_GID = process.env.MEDIA_SQUAD_PROJECT_GID || '1215471459454088';
const WORKSPACE_GID = '1200057218350324';

interface DeepTask {
  gid: string;
  name: string;
  project: string;
  assignee: string;
  status: string;
  priority: string;
  flag: string;
  client: string;
  region: string;
  type: string;
  description: string;
  due_date: string;
  created_at: string;
  modified_at: string;
  completed: boolean;
  comments: Array<{
    author: string;
    text: string;
    created_at: string;
  }>;
  subtasks: Array<{
    name: string;
    completed: boolean;
    assignee: string;
  }>;
}

export class AIKnowledgeService {
  private knowledgeBase: DeepTask[] = [];
  private lastSync: Date | null = null;
  private openRouterKey: string;

  constructor(openRouterApiKey: string) {
    this.openRouterKey = openRouterApiKey;
  }

  /**
   * Deep sync: Fetch all tasks from Media Rian + Media Squad with full details
   */
  async syncKnowledgeBase(asanaAccessToken: string): Promise<void> {
    console.log('\n🧠 Starting deep AI knowledge sync...');

    const asana = new AsanaService(asanaAccessToken);
    this.knowledgeBase = [];

    // Sync both projects
    const projects = [
      { gid: MEDIA_RIAN_PROJECT_GID, name: 'Media.Rian' },
      { gid: MEDIA_SQUAD_PROJECT_GID, name: 'Media Squad' },
    ];

    for (const project of projects) {
      console.log(`📥 Syncing ${project.name}...`);

      // Fetch all tasks
      const { data } = await asana['api'].get(`/projects/${project.gid}/tasks`, {
        params: {
          opt_fields: [
            'name', 'gid', 'assignee.name', 'notes', 'completed',
            'created_at', 'modified_at', 'due_on',
            'custom_fields.name', 'custom_fields.enum_value.name',
            'custom_fields.text_value', 'custom_fields.number_value',
          ].join(','),
          limit: 100,
        },
      });

      // For each task, get deep details (comments + subtasks)
      for (const task of data.data) {
        try {
          const deepTask = await this.getDeepTaskDetails(asana, task, project.name);
          this.knowledgeBase.push(deepTask);
        } catch (err) {
          console.error(`Error fetching details for task ${task.gid}:`, err);
        }
      }
    }

    this.lastSync = new Date();
    console.log(`✅ Knowledge base synced: ${this.knowledgeBase.length} tasks with deep context\n`);
  }

  /**
   * Get deep details for a single task (comments, subtasks)
   */
  private async getDeepTaskDetails(
    asana: AsanaService,
    task: any,
    projectName: string
  ): Promise<DeepTask> {
    // Fetch comments
    const comments = await asana.getTaskComments(task.gid);

    // Fetch subtasks
    const { data: subtasksData } = await asana['api'].get(`/tasks/${task.gid}/subtasks`, {
      params: {
        opt_fields: 'name,completed,assignee.name',
      },
    });

    // Extract custom fields
    const customFields = task.custom_fields || [];
    const getFieldValue = (name: string) => {
      const field = customFields.find((f: any) => f.name?.toLowerCase() === name.toLowerCase());
      if (!field) return '';
      return field.enum_value?.name || field.text_value || field.number_value || '';
    };

    return {
      gid: task.gid,
      name: task.name,
      project: projectName,
      assignee: task.assignee?.name || 'Unassigned',
      status: task.completed ? 'Completed' : 'In Progress',
      priority: getFieldValue('Priority') || 'P2',
      flag: getFieldValue('Flag') || 'Amber',
      client: getFieldValue('Client'),
      region: getFieldValue('Region'),
      type: getFieldValue('Initiative Type') || 'General',
      description: task.notes || '',
      due_date: task.due_on || '',
      created_at: task.created_at,
      modified_at: task.modified_at,
      completed: task.completed || false,
      comments: comments.map((c: any) => ({
        author: c.created_by?.name || 'Unknown',
        text: c.text || '',
        created_at: c.created_at,
      })),
      subtasks: (subtasksData.data || []).map((st: any) => ({
        name: st.name,
        completed: st.completed || false,
        assignee: st.assignee?.name || 'Unassigned',
      })),
    };
  }

  /**
   * Generate comprehensive knowledge summary for AI context
   */
  private generateKnowledgeSummary(): string {
    const total = this.knowledgeBase.length;
    const byProject: Record<string, number> = {};
    const byAssignee: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const blocked: DeepTask[] = [];

    this.knowledgeBase.forEach(task => {
      byProject[task.project] = (byProject[task.project] || 0) + 1;
      byAssignee[task.assignee] = (byAssignee[task.assignee] || 0) + 1;
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
      byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;

      if (task.flag.toLowerCase().includes('red') || task.flag.toLowerCase().includes('block')) {
        blocked.push(task);
      }
    });

    return `
# Knowledge Base Summary (Last sync: ${this.lastSync?.toISOString()})

Total Tasks: ${total}

## By Project:
${Object.entries(byProject).map(([p, c]) => `- ${p}: ${c} tasks`).join('\n')}

## By Assignee (Workload):
${Object.entries(byAssignee)
  .sort((a, b) => b[1] - a[1])
  .map(([person, count]) => `- ${person}: ${count} tasks`)
  .join('\n')}

## By Status:
${Object.entries(byStatus).map(([s, c]) => `- ${s}: ${c}`).join('\n')}

## By Priority:
${Object.entries(byPriority).map(([p, c]) => `- ${p}: ${c}`).join('\n')}

## Blocked Tasks (Red Flag):
${blocked.length > 0 ? blocked.map(t => `- ${t.name} (${t.assignee}): ${t.description.slice(0, 100)}`).join('\n') : 'None'}

## Recent Activity:
${this.knowledgeBase
  .sort((a, b) => new Date(b.modified_at).getTime() - new Date(a.modified_at).getTime())
  .slice(0, 10)
  .map(t => `- ${t.name} - Last updated: ${new Date(t.modified_at).toLocaleDateString()}`)
  .join('\n')}
`;
  }

  /**
   * Answer user query using AI with full knowledge base context
   */
  async answerQuery(query: string): Promise<{
    answer: string;
    insights?: any;
    chartData?: any;
  }> {
    console.log(`\n🤖 Processing AI query: "${query}"`);

    // Auto-sync if knowledge base is empty or stale (>5 minutes)
    if (!this.lastSync || (Date.now() - this.lastSync.getTime()) > 5 * 60 * 1000) {
      console.log('Knowledge base is stale, syncing...');
      const token = process.env.ASANA_ACCESS_TOKEN;
      if (token) {
        await this.syncKnowledgeBase(token);
      }
    }

    const knowledgeSummary = this.generateKnowledgeSummary();

    // Prepare detailed context for AI
    const systemPrompt = `You are an AI assistant with deep knowledge of two Asana projects: Media.Rian and Media Squad.

You have access to complete task data including:
- All tasks, assignees, priorities, statuses, flags
- All comments and subtasks
- Custom fields: Client, Region, Initiative Type, Delivery Status, etc.
- Historical activity and updates

${knowledgeSummary}

Your job is to:
1. Answer questions about tasks, people, workload, status
2. Provide insights and trends
3. Generate data for charts/infographics when requested
4. Be specific with task names, people, and numbers

When providing chart data, format as JSON with clear labels and values.`;

    const userPrompt = `${query}

Relevant tasks context:
${JSON.stringify(this.knowledgeBase, null, 2)}`;

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'deepseek/deepseek-chat', // Very cost-effective, excellent quality
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 2000,
          temperature: 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openRouterKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const answer = response.data.choices[0].message.content;

      // Extract chart data if AI provided it
      const chartDataMatch = answer.match(/```json\n([\s\S]*?)\n```/);
      let chartData = null;
      if (chartDataMatch) {
        try {
          chartData = JSON.parse(chartDataMatch[1]);
        } catch (e) {
          console.error('Failed to parse chart data:', e);
        }
      }

      console.log('✅ AI query answered\n');

      return {
        answer,
        chartData,
        insights: this.generateInsights(),
      };
    } catch (error: any) {
      console.error('AI query error:', error.response?.data || error.message);

      // Fallback to pattern-based response
      return {
        answer: this.fallbackAnswer(query),
        insights: this.generateInsights(),
      };
    }
  }

  /**
   * Generate key insights from knowledge base
   */
  private generateInsights() {
    const blocked = this.knowledgeBase.filter(t =>
      t.flag.toLowerCase().includes('red') || t.flag.toLowerCase().includes('block')
    );

    const workload: Record<string, number> = {};
    this.knowledgeBase.forEach(t => {
      workload[t.assignee] = (workload[t.assignee] || 0) + 1;
    });

    const mostBusy = Object.entries(workload).sort((a, b) => b[1] - a[1])[0];

    return {
      totalTasks: this.knowledgeBase.length,
      blockedCount: blocked.length,
      mostBusyPerson: mostBusy ? { name: mostBusy[0], count: mostBusy[1] } : null,
      lastSync: this.lastSync,
    };
  }

  /**
   * Fallback pattern-based answer
   */
  private fallbackAnswer(query: string): string {
    const lowerQuery = query.toLowerCase();

    if (/(who.*busy|workload|most.*task)/.test(lowerQuery)) {
      const workload: Record<string, number> = {};
      this.knowledgeBase.forEach(t => {
        workload[t.assignee] = (workload[t.assignee] || 0) + 1;
      });

      const sorted = Object.entries(workload).sort((a, b) => b[1] - a[1]).slice(0, 5);
      return `Top 5 busiest people:\n${sorted.map(([name, count]) => `- ${name}: ${count} tasks`).join('\n')}`;
    }

    if (/(block|stuck|red)/.test(lowerQuery)) {
      const blocked = this.knowledgeBase.filter(t =>
        t.flag.toLowerCase().includes('red') || t.flag.toLowerCase().includes('block')
      );
      return `${blocked.length} blocked tasks:\n${blocked.slice(0, 5).map(t => `- ${t.name} (${t.assignee})`).join('\n')}`;
    }

    return `I have knowledge of ${this.knowledgeBase.length} tasks across Media.Rian and Media Squad projects. Ask me about workload, blockers, status, or specific people!`;
  }

  /**
   * Get knowledge base stats
   */
  getStats() {
    return {
      totalTasks: this.knowledgeBase.length,
      lastSync: this.lastSync,
      projects: [...new Set(this.knowledgeBase.map(t => t.project))],
      assignees: [...new Set(this.knowledgeBase.map(t => t.assignee))],
    };
  }
}
