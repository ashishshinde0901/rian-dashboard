import { AsanaService } from './asana.js';
import axios from 'axios';

const MEDIA_RIAN_PROJECT_GID = '1215471459454088';
const MEDIA_SQUAD_PROJECT_GID = '1213024317030114';
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
    console.log(`📊 Knowledge base contains: ${this.knowledgeBase.length} tasks`);

    // Auto-sync if knowledge base is empty or stale (>5 minutes)
    if (!this.lastSync || (Date.now() - this.lastSync.getTime()) > 5 * 60 * 1000) {
      console.log('⚠️  Knowledge base is stale, syncing...');
      const token = process.env.ASANA_ACCESS_TOKEN;
      if (token) {
        await this.syncKnowledgeBase(token);
      }
    } else {
      console.log(`✅ Knowledge base is fresh (last sync: ${this.lastSync.toISOString()})`);
    }

    const knowledgeSummary = this.generateKnowledgeSummary();
    console.log(`📝 Generated knowledge summary: ${knowledgeSummary.length} characters`);

    // Filter to most relevant tasks to stay within token limits
    // DeepSeek has 32k token limit, we need to keep prompts under ~25k tokens (~100k chars)
    const relevantTasks = this.filterRelevantTasks(query);
    console.log(`📦 Filtered to ${relevantTasks.length} relevant tasks (from ${this.knowledgeBase.length} total)`);

    // Prepare detailed context for AI
    const systemPrompt = `You are an AI assistant with deep knowledge of two Asana projects: Media.Rian and Media Squad.

${knowledgeSummary}

Your job is to:
1. Answer questions about tasks, people, workload, status with specific details
2. Provide insights and trends
3. Be conversational and helpful
4. Use markdown formatting for better readability

Always provide specific task names, assignees, and numbers when available.`;

    const userPrompt = `User question: ${query}

Here are the most relevant tasks for this query:
${JSON.stringify(relevantTasks, null, 2)}

Please provide a detailed, helpful answer based on this data.`;

    console.log(`📤 System prompt length: ${systemPrompt.length} characters`);
    console.log(`📤 User prompt length: ${userPrompt.length} characters`);
    console.log(`📤 Total prompt size: ${systemPrompt.length + userPrompt.length} characters`);

    try {
      console.log('🌐 Making API call to OpenRouter...');
      const requestPayload = {
        model: 'deepseek/deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      };

      console.log(`📨 Request model: ${requestPayload.model}`);
      console.log(`📨 Request max_tokens: ${requestPayload.max_tokens}`);

      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        requestPayload,
        {
          headers: {
            'Authorization': `Bearer ${this.openRouterKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ OpenRouter API response received');
      console.log(`📊 Response status: ${response.status}`);
      console.log(`📊 Response data:`, JSON.stringify(response.data, null, 2));

      const answer = response.data.choices[0].message.content;
      console.log(`📝 AI answer length: ${answer.length} characters`);

      // Extract chart data if AI provided it
      const chartDataMatch = answer.match(/```json\n([\s\S]*?)\n```/);
      let chartData = null;
      if (chartDataMatch) {
        try {
          chartData = JSON.parse(chartDataMatch[1]);
          console.log('📈 Chart data extracted successfully');
        } catch (e) {
          console.error('❌ Failed to parse chart data:', e);
        }
      }

      console.log('✅ AI query answered successfully\n');

      return {
        answer,
        chartData,
        insights: this.generateInsights(),
      };
    } catch (error: any) {
      console.error('❌ AI query error occurred');
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
      });

      // Fallback to pattern-based response
      console.log('⚠️  Using fallback pattern-based response');
      return {
        answer: this.fallbackAnswer(query),
        insights: this.generateInsights(),
      };
    }
  }

  /**
   * Filter knowledge base to most relevant tasks based on query
   * Limits to ~30 tasks max to stay within token limits
   */
  private filterRelevantTasks(query: string): DeepTask[] {
    const lowerQuery = query.toLowerCase();
    const keywords = lowerQuery.split(/\s+/);

    // Score each task based on relevance
    const scoredTasks = this.knowledgeBase.map(task => {
      let score = 0;

      // Match keywords in task name (high weight)
      keywords.forEach(keyword => {
        if (task.name.toLowerCase().includes(keyword)) score += 10;
        if (task.description.toLowerCase().includes(keyword)) score += 5;
        if (task.type.toLowerCase().includes(keyword)) score += 8;
        if (task.client.toLowerCase().includes(keyword)) score += 6;
      });

      // Boost recent activity
      const daysSinceModified = (Date.now() - new Date(task.modified_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceModified < 7) score += 5;
      if (daysSinceModified < 3) score += 10;

      // Boost priority tasks
      if (task.priority === 'P0') score += 15;
      if (task.priority === 'P1') score += 10;

      // Boost blocked/red flag tasks
      if (task.flag.toLowerCase().includes('red')) score += 12;
      if (task.flag.toLowerCase().includes('block')) score += 12;

      // Boost incomplete tasks
      if (!task.completed) score += 3;

      // Query-specific boosts
      if (/(block|stuck|red|flag|issue)/i.test(lowerQuery)) {
        if (task.flag.toLowerCase().includes('red')) score += 20;
      }
      if (/(sales|delivery)/i.test(lowerQuery)) {
        if (task.type.toLowerCase().includes('sales') || task.type.toLowerCase().includes('delivery')) score += 15;
      }
      if (/(latest|recent|update|new)/i.test(lowerQuery)) {
        if (daysSinceModified < 7) score += 15;
      }
      if (/(summary|overview|all)/i.test(lowerQuery)) {
        // For summary queries, prioritize diverse task representation
        score += 2;
      }

      return { task, score };
    });

    // Sort by score and take top 30
    const topTasks = scoredTasks
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map(item => item.task);

    // If query is very general (summary/overview), ensure diversity
    if (/(summary|overview|all|everything)/i.test(lowerQuery)) {
      // Mix: top priority, recent, blocked, and representative from each project
      const priority = this.knowledgeBase
        .filter(t => t.priority === 'P0' || t.priority === 'P1')
        .slice(0, 10);
      const recent = this.knowledgeBase
        .sort((a, b) => new Date(b.modified_at).getTime() - new Date(a.modified_at).getTime())
        .slice(0, 10);
      const blocked = this.knowledgeBase
        .filter(t => t.flag.toLowerCase().includes('red'))
        .slice(0, 5);

      // Combine and dedupe
      const combined = [...priority, ...recent, ...blocked];
      const unique = Array.from(new Map(combined.map(t => [t.gid, t])).values());
      return unique.slice(0, 30);
    }

    return topTasks;
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
