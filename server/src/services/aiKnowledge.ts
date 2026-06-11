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

interface TeamMember {
  gid: string;
  name: string;
  email?: string;
}

interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: ConversationMessage[];
  created_at: Date;
  updated_at: Date;
}

export class AIKnowledgeService {
  private knowledgeBase: DeepTask[] = [];
  private teamMembers: TeamMember[] = [];
  private lastSync: Date | null = null;
  private openRouterKey: string;
  private conversations: Map<string, Conversation> = new Map();

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

    // Sync team members first
    await this.syncTeamMembers(asana);

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
   * Sync team members from workspace
   */
  private async syncTeamMembers(asana: AsanaService): Promise<void> {
    try {
      console.log('👥 Syncing team members...');
      const { data } = await asana['api'].get(`/workspaces/${WORKSPACE_GID}/users`, {
        params: { opt_fields: 'name,gid,email' },
      });

      this.teamMembers = data.data.map((u: any) => ({
        gid: u.gid,
        name: u.name,
        email: u.email,
      }));

      console.log(`✅ Synced ${this.teamMembers.length} team members`);
      this.teamMembers.forEach(m => console.log(`   - ${m.name} (${m.gid})`));
    } catch (err) {
      console.error('⚠️  Failed to sync team members:', err);
      this.teamMembers = [];
    }
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

    // Use ALL tasks - DeepSeek V4 Flash has 1M+ token context window
    const tasksToSend = this.knowledgeBase;
    console.log(`📦 Sending ${tasksToSend.length} tasks to AI`);

    // Prepare detailed context for AI
    const systemPrompt = `You are a professional executive assistant for a CEO, providing sharp business insights about Media.Rian and Media Squad projects.

${knowledgeSummary}

## Your Communication Style:
- Write in clear, executive-level language - concise sentences that convey key information
- Present insights as readable narratives, NOT raw data dumps
- Use proper headings, bullet points, and formatting for easy scanning
- Highlight critical issues, opportunities, and action items
- Summarize complex information into digestible insights

## How to Structure Responses:
1. **Executive Summary** - 2-3 sentences capturing the essence
2. **Key Highlights** - Main points with brief context
3. **Critical Issues** - Red flags or blockers requiring attention
4. **Opportunities** - Positive developments or potential wins
5. **Recommended Actions** - If applicable

## What NOT to do:
- Don't list raw task data with pipes and separators (|)
- Don't show GIDs, technical IDs, or database-style formatting
- Don't write in table format or use technical notation
- Don't overwhelm with every detail - synthesize and prioritize

Example of GOOD formatting:
"**Jio KIDS** is our highest priority account. Ashish is negotiating rates at ₹10k per 30 minutes, which is 40% higher than traditional costs. Active discussions are underway."

Example of BAD formatting:
"| Jio KIDS Costing challenge | Ashish Shinde | In Progress | P0 - Critical | Jio pushing for sub-10k per 30 min rates..."

Remember: The CEO needs actionable insights, not data export. Write like a trusted advisor.`;

    const userPrompt = `User question: ${query}

Here are all the tasks in our knowledge base:
${JSON.stringify(tasksToSend, null, 2)}

Please provide a detailed, helpful answer based on this data.`;

    console.log(`📤 System prompt length: ${systemPrompt.length} characters`);
    console.log(`📤 User prompt length: ${userPrompt.length} characters`);
    console.log(`📤 Total prompt size: ${systemPrompt.length + userPrompt.length} characters`);

    try {
      console.log('🌐 Making API call to OpenRouter...');
      const requestPayload = {
        model: 'deepseek/deepseek-v4-flash',
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

  /**
   * Create a new conversation
   */
  createConversation(title: string = 'New Conversation'): Conversation {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const conversation: Conversation = {
      id,
      title,
      messages: [],
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.conversations.set(id, conversation);
    console.log(`✅ Created conversation: ${id}`);
    return conversation;
  }

  /**
   * Get all conversations
   */
  getConversations(): Conversation[] {
    return Array.from(this.conversations.values()).sort(
      (a, b) => b.updated_at.getTime() - a.updated_at.getTime()
    );
  }

  /**
   * Get a specific conversation
   */
  getConversation(id: string): Conversation | null {
    return this.conversations.get(id) || null;
  }

  /**
   * Delete a conversation
   */
  deleteConversation(id: string): boolean {
    return this.conversations.delete(id);
  }

  /**
   * Answer query within a conversation context
   */
  async answerQueryInConversation(
    conversationId: string,
    query: string,
    asanaAccessToken?: string
  ): Promise<{
    answer: string;
    insights?: any;
    sources?: Array<{ taskName: string; taskLink: string; taskGid: string }>;
  }> {
    console.log(`\n🤖 Processing query in conversation: ${conversationId}`);

    let conversation = this.conversations.get(conversationId);
    if (!conversation) {
      conversation = this.createConversation();
    }

    // Auto-sync if knowledge base is stale
    if (!this.lastSync || (Date.now() - this.lastSync.getTime()) > 5 * 60 * 1000) {
      console.log('⚠️  Knowledge base is stale, syncing...');
      const token = asanaAccessToken || process.env.ASANA_ACCESS_TOKEN;
      if (token) {
        await this.syncKnowledgeBase(token);
      }
    }

    // Check if this is an Asana action request
    const actionMatch = query.match(/(?:create|make|add|duplicate|post|leave|write|tag|ask|follow.*up|ping|mention|notify|comment|change|update|set|assign|delete|remove|list|show|get|fetch)/i);
    console.log(`🔍 Checking for Asana action - Match: ${actionMatch ? 'YES' : 'NO'}, Has token: ${!!asanaAccessToken}`);

    if (actionMatch && asanaAccessToken) {
      console.log('⚡ Detected Asana action request');
      const result = await this.handleAsanaAction(query, asanaAccessToken);

      // Add to conversation
      conversation.messages.push({ role: 'user', content: query });
      conversation.messages.push({ role: 'assistant', content: result.answer });
      conversation.updated_at = new Date();

      return result;
    }

    const knowledgeSummary = this.generateKnowledgeSummary();
    const tasksToSend = this.knowledgeBase;

    // Build conversation context - include all previous messages
    const systemPrompt = `You are a professional executive assistant for a CEO, providing sharp business insights about Media.Rian and Media Squad projects.

${knowledgeSummary}

## Your Communication Style:
- Write in clear, executive-level language - concise sentences that convey key information
- Present insights as readable narratives, NOT raw data dumps
- Use proper headings, bullet points, and formatting for easy scanning
- Highlight critical issues, opportunities, and action items
- When referencing specific tasks, include the task name and link like this: [Task Name](https://app.asana.com/0/0/TASK_GID)
- Always provide source citations when discussing specific tasks

## Important:
- DO NOT claim you can create tasks, post comments, or make any changes to Asana
- You are READ-ONLY - you can only provide insights and analysis based on the data
- If the user asks you to create tasks or post comments, tell them you cannot do that directly
- Focus on providing strategic insights, not claiming to take actions

Remember: The CEO needs actionable insights, not data export. Write like a trusted advisor.`;

    // Include conversation history in the messages
    const messages: ConversationMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversation.messages,  // Previous conversation context
      {
        role: 'user',
        content: `User question: ${query}

Here are all the tasks in our knowledge base:
${JSON.stringify(tasksToSend, null, 2)}

Please provide a detailed, helpful answer based on this data.`,
      },
    ];

    try {
      console.log(`🌐 Making API call with conversation context (${conversation.messages.length} previous messages)`);

      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'deepseek/deepseek-v4-flash',
          messages,
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
      console.log(`✅ AI response received (${answer.length} chars)`);

      // Extract source citations
      const sources: Array<{ taskName: string; taskLink: string; taskGid: string }> = [];
      const linkMatches = answer.matchAll(/\[([^\]]+)\]\(https:\/\/app\.asana\.com\/0\/0\/(\d+)\)/g);
      for (const match of linkMatches) {
        sources.push({
          taskName: match[1],
          taskLink: match[0],
          taskGid: match[2],
        });
      }

      // Add to conversation history
      conversation.messages.push({ role: 'user', content: query });
      conversation.messages.push({ role: 'assistant', content: answer });
      conversation.updated_at = new Date();

      return {
        answer,
        sources: sources.length > 0 ? sources : undefined,
        insights: this.generateInsights(),
      };
    } catch (error: any) {
      console.error('❌ AI query error:', error.message);
      const fallbackAnswer = this.fallbackAnswer(query);

      conversation.messages.push({ role: 'user', content: query });
      conversation.messages.push({ role: 'assistant', content: fallbackAnswer });
      conversation.updated_at = new Date();

      return {
        answer: fallbackAnswer,
        insights: this.generateInsights(),
      };
    }
  }

  /**
   * Unified handler for all Asana actions - extract intent, execute, and verify
   */
  private async handleAsanaAction(
    query: string,
    asanaAccessToken: string
  ): Promise<{ answer: string }> {
    console.log(`⚡ Processing Asana action: "${query}"`);

    const asana = new AsanaService(asanaAccessToken);

    // STEP 1: Extract intent from user query using AI
    try {
      // Build team context for the AI
      const teamContext = this.teamMembers.length > 0
        ? `\n\nTeam Members (for @mentions):\n${this.teamMembers.map(m => `- ${m.name}`).join('\n')}`
        : '';

      const parsePrompt = `You are an intelligent Asana assistant. Analyze the user's natural language request and extract structured actions.

User Request: "${query}"
${teamContext}

Your task is to understand:
1. What ACTION they want (create, comment, update, etc.)
2. Which TASK they're referring to (extract the core task name, ignoring descriptive words like "video", "sample", "file", "task")
3. Who they want to TAG (identify person names and format as @@FirstName LastName)
4. What CONTENT they want to include (comments, descriptions, etc.)

Be smart about context:
- "Anupama video" → task is probably "Anupama", not "Anupama video"
- "followup on X" → means post a comment to task X
- "ask Person about Y" → means post comment tagging @@Person asking about Y
- Words like "video", "sample", "file", "document" are usually NOT part of task names

When tagging people in comments:
- Use @@FirstName LastName format (e.g., "@@Samrudhi Patil")
- Match names from the team members list above
- Include the tag naturally in the comment text

Respond ONLY with valid JSON (no other text) in this exact format:
{
  "actions": [
    {
      "type": "create_task" | "duplicate_task" | "post_comment" | "change_assignee" | "set_due_date" | "add_subtask" | "delete_task" | "set_custom_field" | "list_custom_fields",
      "taskIdentifier": "string (core task name only)",
      "taskName": "string (for create/duplicate)",
      "project": "Media Squad" | "Media.Rian" (for create/duplicate),
      "description": "string or null",
      "assignee": "string or null",
      "dueDate": "YYYY-MM-DD or null",
      "baseTaskName": "string or null",
      "commentText": "string with @@mentions or null",
      "subtaskName": "string or null",
      "customFieldName": "string or null",
      "customFieldValue": "string or null"
    }
  ]
}

Examples:
- "create task Test in Media Squad" → {"actions":[{"type":"create_task","taskName":"Test","project":"Media Squad"}]}
- "followup on Anupama video asking Samrudhi about the mix file" → {"actions":[{"type":"post_comment","taskIdentifier":"Anupama","commentText":"@@Samrudhi Patil — When will the mix file be ready?"}]}
- "post on Pravas sample asking about QC vendor timeline" → {"actions":[{"type":"post_comment","taskIdentifier":"Pravas","commentText":"@@Samrudhi Patil — What's the update on the QC vendor timeline for hybrid output delivery?"}]}

Return ALL actions as an array.`;

      console.log('📤 Sending request to OpenRouter API...');
      console.log(`📤 Model: deepseek/deepseek-v4-flash`);
      console.log(`📤 Prompt length: ${parsePrompt.length} chars`);

      const parseResponse = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'deepseek/deepseek-v4-flash',
          messages: [{ role: 'user', content: parsePrompt }],
          max_tokens: 800,
          temperature: 0.3,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openRouterKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('📥 OpenRouter response received');
      console.log('📥 Response status:', parseResponse.status);
      console.log('📥 Response data:', JSON.stringify(parseResponse.data, null, 2));

      if (!parseResponse.data || !parseResponse.data.choices || !parseResponse.data.choices[0]) {
        console.error('❌ Invalid API response structure:', parseResponse.data);
        throw new Error(`OpenRouter API returned invalid response: ${JSON.stringify(parseResponse.data)}`);
      }

      const responseContent = parseResponse.data.choices[0].message?.content;
      console.log('🤖 AI parsing response:', responseContent);

      // Extract JSON from response - AI might include extra text
      let jsonContent = responseContent;
      if (!responseContent) {
        throw new Error('AI returned empty response');
      }

      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = responseContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1].trim();
        console.log('📦 Extracted JSON from code block');
      }

      // Try to find JSON object in the response
      const jsonObjectMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        jsonContent = jsonObjectMatch[0];
      }

      const parsed = JSON.parse(jsonContent);
      if (!parsed || !parsed.actions || !Array.isArray(parsed.actions)) {
        throw new Error('AI response missing "actions" array');
      }

      console.log('📝 Parsed actions:', JSON.stringify(parsed, null, 2));

      // STEP 2: Execute each action
      const results: Array<{ type: string; taskName: string; taskGid: string; success: boolean; message: string }> = [];

      for (const action of parsed.actions) {
        console.log(`\n⚙️  Executing action: ${action.type}`);

        try {
          const result = await this.executeAsanaAction(asana, action);
          results.push(result);
        } catch (error: any) {
          console.error(`❌ Action failed:`, error.message);
          results.push({
            type: action.type,
            taskName: action.taskIdentifier || action.taskName || 'Unknown',
            taskGid: '',
            success: false,
            message: error.message,
          });
        }
      }

      // STEP 3: Format and return results
      return this.formatActionResults(results);
    } catch (error: any) {
      console.error('❌ Asana action error:', error.message);
      console.error('Full error:', error);
      if (error.response) {
        console.error('API response error:', JSON.stringify(error.response.data, null, 2));
      }
      return { answer: `❌ Failed to process action: ${error.message}` };
    }
  }

  /**
   * Execute a single Asana action
   */
  private async executeAsanaAction(
    asana: AsanaService,
    action: any
  ): Promise<{ type: string; taskName: string; taskGid: string; success: boolean; message: string }> {
    switch (action.type) {
      case 'create_task':
        return await this.executeCreateTask(asana, action);

      case 'duplicate_task':
        return await this.executeDuplicateTask(asana, action);

      case 'post_comment':
        return await this.executePostComment(asana, action);

      case 'change_assignee':
        return await this.executeChangeAssignee(asana, action);

      case 'set_due_date':
        return await this.executeSetDueDate(asana, action);

      case 'add_subtask':
        return await this.executeAddSubtask(asana, action);

      case 'delete_task':
        return await this.executeDeleteTask(asana, action);

      case 'set_custom_field':
        return await this.executeSetCustomField(asana, action);

      case 'list_custom_fields':
        return await this.executeListCustomFields(asana, action);

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Format action results into user-friendly message
   */
  private formatActionResults(results: Array<{ type: string; taskName: string; taskGid: string; success: boolean; message: string }>): { answer: string } {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    if (successful.length === 0) {
      return {
        answer: `❌ **All actions failed**\n\n${failed.map(r => `- ${r.type}: ${r.message}`).join('\n')}`,
      };
    }

    let answer = `✅ **Actions completed successfully!**\n\n`;
    answer += `**Successful (${successful.length}):**\n`;
    successful.forEach(r => {
      const taskLink = r.taskGid ? `https://app.asana.com/0/0/${r.taskGid}` : '';
      answer += `- **${r.type}**: ${r.message}${taskLink ? ` - [View in Asana](${taskLink})` : ''}\n`;
    });

    if (failed.length > 0) {
      answer += `\n⚠️ **Failed (${failed.length}):**\n`;
      failed.forEach(r => {
        answer += `- **${r.type}**: ${r.message}\n`;
      });
    }

    answer += `\n✅ All changes verified in Asana.`;

    return { answer };
  }

  /**
   * OLD METHOD - kept for backwards compatibility but will be phased out
   * Handle task creation requests - extract intent, execute, and verify
   */
  private async handleTaskCreation(
    query: string,
    asanaAccessToken: string
  ): Promise<{ answer: string }> {
    console.log(`🔨 Processing task creation: "${query}"`);

    const asana = new AsanaService(asanaAccessToken);

    // STEP 1: Extract intent from user query
    try {
      const parsePrompt = `You are a task extraction assistant. Extract task creation details from this request: "${query}"

Respond ONLY with valid JSON (no other text) in this exact format:
{
  "action": "create_task" | "duplicate_task",
  "project": "Media Squad" | "Media.Rian",
  "taskName": "string",
  "description": "string or null",
  "assignee": "string or null",
  "baseTaskName": "string or null (if duplicating, extract the template task name)",
  "commentText": "string or null (comment to add to task or first subtask)"
}

Examples:
- "duplicate Dubbing Template task and call it Netflix" → {"action":"duplicate_task","project":"Media Squad","taskName":"Netflix","baseTaskName":"Dubbing Template","commentText":null,...}
- "create task called Test in Media.Rian" → {"action":"create_task","project":"Media.Rian","taskName":"Test",...}`;

      const parseResponse = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'deepseek/deepseek-v4-flash',
          messages: [{ role: 'user', content: parsePrompt }],
          max_tokens: 500,
          temperature: 0.3,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openRouterKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const responseContent = parseResponse.data.choices[0].message.content;
      console.log('🤖 AI parsing response:', responseContent);

      const parsed = JSON.parse(responseContent);
      console.log('📝 Parsed intent:', JSON.stringify(parsed, null, 2));

      // STEP 2: Execute the task creation based on parsed intent
      if (parsed.action === 'duplicate_task') {
        console.log(`🔍 Finding base task: "${parsed.baseTaskName}"`);

        // Find the base task
        const baseTask = this.knowledgeBase.find(t =>
          t.name.toLowerCase().includes(parsed.baseTaskName.toLowerCase())
        );

        if (!baseTask) {
          console.log(`❌ Base task not found: "${parsed.baseTaskName}"`);
          return { answer: `❌ Could not find task "${parsed.baseTaskName}" to duplicate.` };
        }

        console.log(`✅ Found base task: ${baseTask.name} (${baseTask.gid})`);

        const projectGid = parsed.project === 'Media Squad' ? MEDIA_SQUAD_PROJECT_GID : MEDIA_RIAN_PROJECT_GID;

        // Create new task by duplicating
        console.log(`📝 Creating new task: "${parsed.taskName}" in ${parsed.project}`);
        const { data: newTask } = await asana['api'].post('/tasks', {
          data: {
            name: parsed.taskName,
            projects: [projectGid],
            notes: parsed.description || baseTask.description,
            assignee: parsed.assignee ? await this.findUserGid(asana, parsed.assignee) : undefined,
          },
        });

        console.log(`✅ Created task with GID: ${newTask.data.gid}`);

        // Copy subtasks if they exist
        let subtaskCount = 0;
        if (baseTask.subtasks && baseTask.subtasks.length > 0) {
          console.log(`📋 Copying ${baseTask.subtasks.length} subtasks...`);

          for (const subtask of baseTask.subtasks) {
            const { data: newSubtask } = await asana['api'].post('/tasks', {
              data: {
                name: subtask.name,
                parent: newTask.data.gid,
              },
            });
            subtaskCount++;
            console.log(`  ✅ Created subtask ${subtaskCount}/${baseTask.subtasks.length}: ${subtask.name}`);

            // Add comment to first subtask if requested
            if (parsed.commentText && baseTask.subtasks.indexOf(subtask) === 0) {
              await asana['api'].post(`/tasks/${newSubtask.data.gid}/stories`, {
                data: { text: parsed.commentText },
              });
              console.log(`  💬 Added comment to first subtask`);
            }
          }
        }

        // STEP 3: Verify the task was created by fetching it
        console.log(`🔍 Verifying task creation...`);
        const { data: verifyTask } = await asana['api'].get(`/tasks/${newTask.data.gid}`, {
          params: {
            opt_fields: 'name,gid,permalink_url,created_at,completed,workspace.gid,workspace.name,memberships.project.gid,memberships.project.name',
          },
        });

        console.log(`✅ VERIFIED: Task exists in Asana - ${verifyTask.data.name} (${verifyTask.data.gid})`);
        console.log(`🔗 Task URL: ${verifyTask.data.permalink_url}`);
        console.log(`📋 Workspace: ${verifyTask.data.workspace?.name || 'Unknown'} (${verifyTask.data.workspace?.gid || 'N/A'})`);
        console.log(`🗂️  Project memberships:`, JSON.stringify(verifyTask.data.memberships || [], null, 2));
        console.log(`✔️  Completed: ${verifyTask.data.completed}`);

        // Check if task was somehow marked as deleted/completed
        if (verifyTask.data.completed) {
          console.log(`⚠️  WARNING: Task was marked as completed immediately after creation!`);
        }

        const taskLink = verifyTask.data.permalink_url || `https://app.asana.com/0/${projectGid}/${newTask.data.gid}`;

        // STEP 4: Return verified results
        return {
          answer: `✅ **Task created and verified!**

**New Task:** [${verifyTask.data.name}](${taskLink})
- **GID:** ${verifyTask.data.gid}
- **Project:** ${parsed.project}
- **Duplicated from:** ${baseTask.name}
- **Subtasks:** ${subtaskCount} subtasks copied${parsed.commentText ? '\n- **First subtask comment:** Added' : ''}
- **Created at:** ${new Date(verifyTask.data.created_at).toLocaleString()}
- **Status:** ${verifyTask.data.completed ? '⚠️ Completed (unusual!)' : 'Active'}

✅ Confirmed to exist in Asana.`,
        };
      }

      if (parsed.action === 'create_task') {
        const projectGid = parsed.project === 'Media Squad' ? MEDIA_SQUAD_PROJECT_GID : MEDIA_RIAN_PROJECT_GID;

        console.log(`📝 Creating new task: "${parsed.taskName}" in ${parsed.project}`);
        const { data: newTask } = await asana['api'].post('/tasks', {
          data: {
            name: parsed.taskName,
            projects: [projectGid],
            notes: parsed.description,
            assignee: parsed.assignee ? await this.findUserGid(asana, parsed.assignee) : undefined,
          },
        });

        console.log(`✅ Created task with GID: ${newTask.data.gid}`);

        // STEP 3: Verify the task was created
        console.log(`🔍 Verifying task creation...`);
        const { data: verifyTask } = await asana['api'].get(`/tasks/${newTask.data.gid}`, {
          params: {
            opt_fields: 'name,gid,permalink_url,created_at,assignee.name,completed,workspace.gid,workspace.name,memberships.project.gid,memberships.project.name',
          },
        });

        console.log(`✅ VERIFIED: Task exists in Asana - ${verifyTask.data.name} (${verifyTask.data.gid})`);
        console.log(`🔗 Task URL: ${verifyTask.data.permalink_url}`);
        console.log(`📋 Workspace: ${verifyTask.data.workspace?.name || 'Unknown'} (${verifyTask.data.workspace?.gid || 'N/A'})`);
        console.log(`🗂️  Project memberships:`, JSON.stringify(verifyTask.data.memberships || [], null, 2));
        console.log(`✔️  Completed: ${verifyTask.data.completed}`);

        // Check if task was somehow marked as deleted/completed
        if (verifyTask.data.completed) {
          console.log(`⚠️  WARNING: Task was marked as completed immediately after creation!`);
        }

        const taskLink = verifyTask.data.permalink_url || `https://app.asana.com/0/${projectGid}/${newTask.data.gid}`;

        // STEP 4: Return verified results
        return {
          answer: `✅ **Task created and verified!**

**New Task:** [${verifyTask.data.name}](${taskLink})
- **GID:** ${verifyTask.data.gid}
- **Project:** ${parsed.project}
${verifyTask.data.assignee?.name ? `- **Assigned to:** ${verifyTask.data.assignee.name}` : ''}
- **Created at:** ${new Date(verifyTask.data.created_at).toLocaleString()}
- **Status:** ${verifyTask.data.completed ? '⚠️ Completed (unusual!)' : 'Active'}

✅ Confirmed to exist in Asana.`,
        };
      }

      console.log('⚠️  Unknown action type:', parsed.action);
      return { answer: '❌ Could not understand task creation request. Please try rephrasing.' };
    } catch (error: any) {
      console.error('❌ Task creation error:', error.message);
      console.error('Full error:', error);
      if (error.response) {
        console.error('API response error:', JSON.stringify(error.response.data, null, 2));
      }
      return { answer: `❌ Failed to create task: ${error.message}` };
    }
  }

  /**
   * Handle comment posting requests - extract intent, execute, and verify
   */
  private async handleCommentPosting(
    query: string,
    asanaAccessToken: string
  ): Promise<{ answer: string }> {
    console.log(`💬 Processing comment posting: "${query}"`);

    const asana = new AsanaService(asanaAccessToken);

    // STEP 1: Extract intent from user query using AI
    try {
      const parsePrompt = `You are a comment extraction assistant. Extract comment details from this request: "${query}"

Respond ONLY with valid JSON (no other text) in this exact format:
{
  "comments": [
    {
      "taskIdentifier": "string (task name or partial task name)",
      "commentText": "string (the actual comment to post, including @ mentions)"
    }
  ]
}

Examples:
- "post comment on Chikoo Bunty task asking Samrudhi about Episode 1 timeline" → {"comments":[{"taskIdentifier":"Chikoo Bunty","commentText":"@@Samrudhi Patil — When can we expect the sample for Episode 1?"}]}
- "add follow up to Anupama arabic sample asking about mix file and QC vendor" → {"comments":[{"taskIdentifier":"Anupama arabic","commentText":"@@Samrudhi Patil — Two action items: (1) When will the mix file for the AI-dubbed Arabic version be ready? (2) Any update on identifying a QC vendor?"}]}

IMPORTANT: Extract ALL comments mentioned in the request. Return as an array.`;

      const parseResponse = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'deepseek/deepseek-v4-flash',
          messages: [{ role: 'user', content: parsePrompt }],
          max_tokens: 500,
          temperature: 0.3,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openRouterKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const responseContent = parseResponse.data.choices[0].message.content;
      console.log('🤖 AI parsing response:', responseContent);

      const parsed = JSON.parse(responseContent);
      console.log('📝 Parsed intent:', JSON.stringify(parsed, null, 2));

      // STEP 2: Execute comment posting for each task
      const results: Array<{ taskName: string; taskGid: string; success: boolean }> = [];

      for (const commentRequest of parsed.comments) {
        console.log(`\n🔍 Finding task: "${commentRequest.taskIdentifier}"`);

        // Find the task
        const task = this.knowledgeBase.find(t =>
          t.name.toLowerCase().includes(commentRequest.taskIdentifier.toLowerCase())
        );

        if (!task) {
          console.log(`❌ Task not found: "${commentRequest.taskIdentifier}"`);
          results.push({
            taskName: commentRequest.taskIdentifier,
            taskGid: '',
            success: false,
          });
          continue;
        }

        console.log(`✅ Found task: ${task.name} (${task.gid})`);

        // Post the comment
        console.log(`💬 Posting comment to task ${task.gid}...`);
        try {
          const { data: story } = await asana['api'].post(`/tasks/${task.gid}/stories`, {
            data: {
              text: commentRequest.commentText,
            },
          });

          console.log(`✅ Comment posted successfully (Story GID: ${story.data.gid})`);

          // STEP 3: Verify the comment was posted by fetching it
          console.log(`🔍 Verifying comment...`);
          const { data: verifyStory } = await asana['api'].get(`/stories/${story.data.gid}`, {
            params: {
              opt_fields: 'text,created_at,created_by.name',
            },
          });

          console.log(`✅ VERIFIED: Comment exists - Created by ${verifyStory.data.created_by?.name} at ${verifyStory.data.created_at}`);
          console.log(`📝 Comment text: "${verifyStory.data.text}"`);

          results.push({
            taskName: task.name,
            taskGid: task.gid,
            success: true,
          });
        } catch (error: any) {
          console.error(`❌ Failed to post comment to task ${task.gid}:`, error.message);
          results.push({
            taskName: task.name,
            taskGid: task.gid,
            success: false,
          });
        }
      }

      // STEP 4: Return verified results
      const successfulPosts = results.filter(r => r.success);
      const failedPosts = results.filter(r => !r.success);

      if (successfulPosts.length === 0) {
        return {
          answer: `❌ **Failed to post comments**\n\nCould not find the specified tasks or failed to post comments.`,
        };
      }

      let answer = `✅ **Comments posted and verified!**\n\n`;
      answer += `**Successfully posted to ${successfulPosts.length} task(s):**\n`;
      successfulPosts.forEach(r => {
        const taskLink = `https://app.asana.com/0/0/${r.taskGid}`;
        answer += `- [${r.taskName}](${taskLink})\n`;
      });

      if (failedPosts.length > 0) {
        answer += `\n⚠️ **Failed to post to ${failedPosts.length} task(s):**\n`;
        failedPosts.forEach(r => {
          answer += `- ${r.taskName || 'Unknown task'}\n`;
        });
      }

      answer += `\n✅ All comments confirmed to exist in Asana.`;

      return { answer };
    } catch (error: any) {
      console.error('❌ Comment posting error:', error.message);
      console.error('Full error:', error);
      if (error.response) {
        console.error('API response error:', JSON.stringify(error.response.data, null, 2));
      }
      return { answer: `❌ Failed to post comments: ${error.message}` };
    }
  }

  // ===== ACTION EXECUTORS =====

  /**
   * Create a new task
   */
  private async executeCreateTask(asana: AsanaService, action: any): Promise<{ type: string; taskName: string; taskGid: string; success: boolean; message: string }> {
    const projectGid = action.project === 'Media Squad' ? MEDIA_SQUAD_PROJECT_GID : MEDIA_RIAN_PROJECT_GID;

    console.log(`📝 Creating task: "${action.taskName}" in ${action.project}`);

    const { data: newTask } = await asana['api'].post('/tasks', {
      data: {
        name: action.taskName,
        projects: [projectGid],
        notes: action.description || '',
        assignee: action.assignee ? await this.findUserGid(asana, action.assignee) : undefined,
        due_on: action.dueDate || undefined,
      },
    });

    console.log(`✅ Task created: ${newTask.data.gid}`);

    // Verify
    const { data: verifyTask } = await asana['api'].get(`/tasks/${newTask.data.gid}`, {
      params: { opt_fields: 'name,gid,permalink_url' },
    });

    return {
      type: 'create_task',
      taskName: verifyTask.data.name,
      taskGid: verifyTask.data.gid,
      success: true,
      message: `Created task "${verifyTask.data.name}" in ${action.project}`,
    };
  }

  /**
   * Duplicate an existing task
   */
  private async executeDuplicateTask(asana: AsanaService, action: any): Promise<{ type: string; taskName: string; taskGid: string; success: boolean; message: string }> {
    const baseTask = this.knowledgeBase.find(t =>
      t.name.toLowerCase().includes(action.baseTaskName.toLowerCase())
    );

    if (!baseTask) {
      throw new Error(`Base task "${action.baseTaskName}" not found`);
    }

    const projectGid = action.project === 'Media Squad' ? MEDIA_SQUAD_PROJECT_GID : MEDIA_RIAN_PROJECT_GID;

    const { data: newTask } = await asana['api'].post('/tasks', {
      data: {
        name: action.taskName,
        projects: [projectGid],
        notes: baseTask.description,
        assignee: action.assignee ? await this.findUserGid(asana, action.assignee) : undefined,
      },
    });

    // Copy subtasks
    if (baseTask.subtasks && baseTask.subtasks.length > 0) {
      for (const subtask of baseTask.subtasks) {
        await asana['api'].post('/tasks', {
          data: { name: subtask.name, parent: newTask.data.gid },
        });
      }
    }

    return {
      type: 'duplicate_task',
      taskName: action.taskName,
      taskGid: newTask.data.gid,
      success: true,
      message: `Duplicated "${baseTask.name}" as "${action.taskName}" with ${baseTask.subtasks?.length || 0} subtasks`,
    };
  }

  /**
   * Post a comment to a task
   */
  private async executePostComment(asana: AsanaService, action: any): Promise<{ type: string; taskName: string; taskGid: string; success: boolean; message: string }> {
    const task = this.knowledgeBase.find(t =>
      t.name.toLowerCase().includes(action.taskIdentifier.toLowerCase())
    );

    if (!task) {
      throw new Error(`Task "${action.taskIdentifier}" not found`);
    }

    // Convert @@ mentions to Asana HTML format
    const htmlComment = this.convertMentionsToHtml(action.commentText);

    const { data: story } = await asana['api'].post(`/tasks/${task.gid}/stories`, {
      data: { html_text: htmlComment },
    });

    console.log(`✅ Comment posted: Story ${story.data.gid}`);
    console.log(`📝 Comment HTML: ${htmlComment}`);

    // Verify
    const { data: verifyStory } = await asana['api'].get(`/stories/${story.data.gid}`, {
      params: { opt_fields: 'text,html_text,created_at' },
    });

    return {
      type: 'post_comment',
      taskName: task.name,
      taskGid: task.gid,
      success: true,
      message: `Posted comment to "${task.name}"`,
    };
  }

  /**
   * Convert @@mentions to Asana HTML format
   * Converts "@@Samrudhi Patil" to '<body>Hello <a data-asana-gid="USER_GID"></a>, ...</body>'
   */
  private convertMentionsToHtml(text: string): string {
    if (!text) return '<body></body>';

    // Find all @@Name patterns and replace with HTML mentions
    let htmlText = text;

    // Match @@FirstName LastName pattern
    const mentionPattern = /@@([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
    const matches = [...text.matchAll(mentionPattern)];

    for (const match of matches) {
      const fullName = match[1]; // e.g., "Samrudhi Patil"

      // Find user in team members
      const user = this.teamMembers.find(m =>
        m.name.toLowerCase() === fullName.toLowerCase() ||
        m.name.toLowerCase().includes(fullName.toLowerCase())
      );

      if (user) {
        // Replace with Asana HTML mention format
        const mention = `<a data-asana-gid="${user.gid}"></a>`;
        htmlText = htmlText.replace(match[0], mention);
        console.log(`   🏷️  Converted @@${fullName} → ${user.name} (${user.gid})`);
      } else {
        // User not found, just remove the @@
        htmlText = htmlText.replace(match[0], `@${fullName}`);
        console.log(`   ⚠️  User not found: ${fullName}, using @${fullName} instead`);
      }
    }

    // Wrap in body tag as required by Asana API
    return `<body>${htmlText}</body>`;
  }

  /**
   * Change task assignee
   */
  private async executeChangeAssignee(asana: AsanaService, action: any): Promise<{ type: string; taskName: string; taskGid: string; success: boolean; message: string }> {
    const task = this.knowledgeBase.find(t =>
      t.name.toLowerCase().includes(action.taskIdentifier.toLowerCase())
    );

    if (!task) {
      throw new Error(`Task "${action.taskIdentifier}" not found`);
    }

    const assigneeGid = action.assignee ? await this.findUserGid(asana, action.assignee) : null;

    await asana['api'].put(`/tasks/${task.gid}`, {
      data: { assignee: assigneeGid },
    });

    console.log(`✅ Assignee changed for task ${task.gid}`);

    // Verify
    const { data: verifyTask } = await asana['api'].get(`/tasks/${task.gid}`, {
      params: { opt_fields: 'name,gid,assignee.name' },
    });

    return {
      type: 'change_assignee',
      taskName: task.name,
      taskGid: task.gid,
      success: true,
      message: `Changed assignee of "${task.name}" to ${verifyTask.data.assignee?.name || 'Unassigned'}`,
    };
  }

  /**
   * Set or update due date
   */
  private async executeSetDueDate(asana: AsanaService, action: any): Promise<{ type: string; taskName: string; taskGid: string; success: boolean; message: string }> {
    const task = this.knowledgeBase.find(t =>
      t.name.toLowerCase().includes(action.taskIdentifier.toLowerCase())
    );

    if (!task) {
      throw new Error(`Task "${action.taskIdentifier}" not found`);
    }

    await asana['api'].put(`/tasks/${task.gid}`, {
      data: { due_on: action.dueDate },
    });

    console.log(`✅ Due date set for task ${task.gid}`);

    return {
      type: 'set_due_date',
      taskName: task.name,
      taskGid: task.gid,
      success: true,
      message: `Set due date of "${task.name}" to ${action.dueDate}`,
    };
  }

  /**
   * Add a subtask
   */
  private async executeAddSubtask(asana: AsanaService, action: any): Promise<{ type: string; taskName: string; taskGid: string; success: boolean; message: string }> {
    const task = this.knowledgeBase.find(t =>
      t.name.toLowerCase().includes(action.taskIdentifier.toLowerCase())
    );

    if (!task) {
      throw new Error(`Task "${action.taskIdentifier}" not found`);
    }

    const { data: subtask } = await asana['api'].post('/tasks', {
      data: {
        name: action.subtaskName,
        parent: task.gid,
        assignee: action.assignee ? await this.findUserGid(asana, action.assignee) : undefined,
      },
    });

    console.log(`✅ Subtask created: ${subtask.data.gid}`);

    return {
      type: 'add_subtask',
      taskName: task.name,
      taskGid: task.gid,
      success: true,
      message: `Added subtask "${action.subtaskName}" to "${task.name}"`,
    };
  }

  /**
   * Delete a task
   */
  private async executeDeleteTask(asana: AsanaService, action: any): Promise<{ type: string; taskName: string; taskGid: string; success: boolean; message: string }> {
    const task = this.knowledgeBase.find(t =>
      t.name.toLowerCase().includes(action.taskIdentifier.toLowerCase())
    );

    if (!task) {
      throw new Error(`Task "${action.taskIdentifier}" not found`);
    }

    await asana['api'].delete(`/tasks/${task.gid}`);

    console.log(`✅ Task deleted: ${task.gid}`);

    return {
      type: 'delete_task',
      taskName: task.name,
      taskGid: task.gid,
      success: true,
      message: `Deleted task "${task.name}"`,
    };
  }

  /**
   * Set custom field value
   */
  private async executeSetCustomField(asana: AsanaService, action: any): Promise<{ type: string; taskName: string; taskGid: string; success: boolean; message: string }> {
    const task = this.knowledgeBase.find(t =>
      t.name.toLowerCase().includes(action.taskIdentifier.toLowerCase())
    );

    if (!task) {
      throw new Error(`Task "${action.taskIdentifier}" not found`);
    }

    // Get task custom fields to find the field GID
    const { data: taskData } = await asana['api'].get(`/tasks/${task.gid}`, {
      params: { opt_fields: 'custom_fields.gid,custom_fields.name,custom_fields.enum_options.gid,custom_fields.enum_options.name' },
    });

    const customField = taskData.data.custom_fields.find((f: any) =>
      f.name.toLowerCase() === action.customFieldName.toLowerCase()
    );

    if (!customField) {
      throw new Error(`Custom field "${action.customFieldName}" not found on task`);
    }

    // Find the enum option GID if it's an enum field
    let valueToSet = action.customFieldValue;
    if (customField.enum_options) {
      const enumOption = customField.enum_options.find((opt: any) =>
        opt.name.toLowerCase() === action.customFieldValue.toLowerCase()
      );
      valueToSet = enumOption ? enumOption.gid : action.customFieldValue;
    }

    await asana['api'].put(`/tasks/${task.gid}`, {
      data: {
        custom_fields: {
          [customField.gid]: valueToSet,
        },
      },
    });

    console.log(`✅ Custom field set for task ${task.gid}`);

    return {
      type: 'set_custom_field',
      taskName: task.name,
      taskGid: task.gid,
      success: true,
      message: `Set "${action.customFieldName}" to "${action.customFieldValue}" for "${task.name}"`,
    };
  }

  /**
   * List custom fields for a task
   */
  private async executeListCustomFields(asana: AsanaService, action: any): Promise<{ type: string; taskName: string; taskGid: string; success: boolean; message: string }> {
    const task = this.knowledgeBase.find(t =>
      t.name.toLowerCase().includes(action.taskIdentifier.toLowerCase())
    );

    if (!task) {
      throw new Error(`Task "${action.taskIdentifier}" not found`);
    }

    const { data: taskData } = await asana['api'].get(`/tasks/${task.gid}`, {
      params: { opt_fields: 'custom_fields.name,custom_fields.display_value,custom_fields.type' },
    });

    const fields = taskData.data.custom_fields.map((f: any) =>
      `${f.name}: ${f.display_value || 'Not set'}`
    ).join(', ');

    return {
      type: 'list_custom_fields',
      taskName: task.name,
      taskGid: task.gid,
      success: true,
      message: `Custom fields for "${task.name}": ${fields}`,
    };
  }

  /**
   * Find user GID by name
   */
  private async findUserGid(asana: AsanaService, name: string): Promise<string | undefined> {
    try {
      const { data } = await asana['api'].get(`/workspaces/${WORKSPACE_GID}/users`, {
        params: { opt_fields: 'name,gid' },
      });

      const user = data.data.find((u: any) =>
        u.name.toLowerCase().includes(name.toLowerCase())
      );

      return user?.gid;
    } catch (err) {
      console.error('Error finding user:', err);
      return undefined;
    }
  }
}
