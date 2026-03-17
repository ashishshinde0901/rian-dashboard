import { GoogleGenerativeAI } from '@google/generative-ai';
import { SalesTask } from '../types/index.js';

interface DailyUpdateSection {
  changesSinceYesterday: string[];
  keyProgress: string[];
  deliveriesAwaitingFeedback: string[];
  activeProduction: string[];
  majorMilestones: string[];
  blockedItems: string[];
  operationalUpdates: string[];
  upcomingFocus: string[];
}

export interface DeliveryTask {
  gid: string;
  name: string;
  task_status: string | null;
  due_on: string | null;
  completed: boolean;
  committed_delivery_date: string | null;
  planned_margin: number | null;
  actual_margin: number | null;
  comments: Array<{
    text: string;
    created_at: string;
    created_by?: { name: string };
  }>;
  subtasks?: Array<{
    gid: string;
    name: string;
    completed: boolean;
    due_on: string | null;
  }>;
}

export interface DeliveryIntelligence {
  upcomingDeliveries: string[];
  overdueOrAtRisk: string[];
  marginAnalysis: string[];
  qualityInsights: string[];
  deliveryVelocity: string[];
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Using Gemini 2.5 Flash - fast, efficient, and supports 1M tokens
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  /**
   * Generate intelligent daily update using Gemini AI
   */
  async generateDailyUpdate(tasks: SalesTask[]): Promise<DailyUpdateSection> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // Prepare task data for Gemini
    const taskData = tasks.map((task) => {
      // Get ALL comments (not just ones starting with "Update:")
      const allComments = task.comments.map((c) => ({
        text: c.text.trim(),
        created_at: c.created_at,
        author: c.created_by?.name || 'Unknown',
      }));

      // Get recent comments (last 24 hours)
      const recentComments = allComments.filter((c) => {
        const commentDate = new Date(c.created_at);
        return commentDate >= yesterday;
      });

      return {
        name: task.name,
        status: task.task_status || 'Unknown',
        completed: task.completed,
        dealValue: task.deal_value,
        expectedStartDate: task.expected_start_date,
        allUpdates: allComments,
        recentUpdates: recentComments,
      };
    });

    const prompt = this.buildPrompt(taskData);

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse the AI response into structured sections
      return this.parseAIResponse(text);
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw new Error('Failed to generate AI-powered summary');
    }
  }

  /**
   * Build comprehensive prompt for Gemini
   */
  private buildPrompt(taskData: any[]): string {
    const tasksJSON = JSON.stringify(taskData, null, 2);

    return `You are an executive intelligence analyst for Media Squad, a media production and localization company. Your job is to analyze daily task updates from Asana and create a comprehensive executive intelligence report for the CEO and management team.

**INPUT DATA:**
${tasksJSON}

**YOUR TASK:**
Analyze all the task updates and create a daily intelligence report with 8 sections. Each section should contain SPECIFIC, ACTIONABLE, and DETAILED bullet points that tell a clear story of what's happening in the business.

**CRITICAL INSTRUCTIONS:**
1. Use the EXACT task names from the data (e.g., "B4U Bhojpuri movies", "Mitesh @ Hollywood producer", "CodieBlock Pilot")
2. Include SPECIFIC details: numbers, dates, names, amounts, deliverables, client names
3. Write in a PROFESSIONAL, CONCISE business intelligence style
4. Focus on ACTIONABLE information that executives need to make decisions
5. Each bullet point should be 1-2 sentences maximum
6. DO NOT use generic phrases like "Task XYZ progressed" - be SPECIFIC about what happened
7. For blocked items, clearly state the PROBLEM and IMPACT
8. Include financial details when mentioned (deal values, pricing, costs)
9. Name specific people when relevant (clients, team members)
10. Use present tense for active work, past tense for completed items

**OUTPUT FORMAT:**
Return ONLY a JSON object with this exact structure (no markdown, no code blocks, just raw JSON):

{
  "changesSinceYesterday": [
    "Specific bullet point about what changed in last 24 hours with task name and details"
  ],
  "keyProgress": [
    "Specific progress update with deliverable details, numbers, and current status"
  ],
  "deliveriesAwaitingFeedback": [
    "Specific delivery with client name, what was delivered, when, and what feedback is expected"
  ],
  "activeProduction": [
    "Specific ongoing work with task name, current stage, expected completion, blockers if any"
  ],
  "majorMilestones": [
    "Completed deliverables with full details: what, when, volume/quantity, languages/formats"
  ],
  "blockedItems": [
    "CRITICAL issues with task name, specific problem, impact, and action needed - use URGENT language"
  ],
  "operationalUpdates": [
    "Internal operations, R&D, infrastructure, process improvements with specific outcomes"
  ],
  "upcomingFocus": [
    "3-5 strategic priorities for next few days based on blocked items, pending deliveries, and active work"
  ]
}

**SECTION GUIDELINES:**

1. **Changes Since Yesterday**: Only include tasks with updates in the last 24 hours. Be specific about what changed.
   Example: "B4U Bhojpuri movies progressed with song recording initiated today after lyrics approval from Sandeep"

2. **Key Execution Progress Today**: Major work happening today - deliveries, completions, significant progress.
   Example: "Bono Bono - 10 episode dubbing (TTS) delivered across all three languages: Hindi (10/10), Tamil (10/10), and Marathi (10/10)"

3. **Deliveries Sent – Awaiting Feedback**: Items delivered to clients waiting for response. Include what, when, to whom.
   Example: "Invesco - PDT to HTML demo (Japanese + Tamil) delivered Mar 12, awaiting client feedback"

4. **Active Production Work**: Ongoing work in progress. Include current status and next steps.
   Example: "Brown Hearts POC - Telugu script review pending from client; Tamil, Gujarati, Marathi dubbing tracks expected by end of week"

5. **Major Milestones**: Completed work. Celebrate achievements with full details.
   Example: "TV Tokyo Gintama - Full movie subtitle translation completed and redelivered after QC revisions"

6. **Blocked or Slow Moving Items**: CRITICAL section. Use urgent language. State problem, impact, and needed action.
   Example: "CodieBlock Pilot (Portuguese) - CRITICAL QUALITY ISSUE: Client rejected due to dialect mixing; requires immediate voice clone regeneration"

7. **Operational Updates**: R&D, infrastructure, process improvements, internal initiatives.
   Example: "RVC — Voice Model Training & Testing - Vishal completed benchmarking with documented best practices (200-300 epochs, 48k sample rate)"

8. **Focus for the Next Few Days**: 3-5 strategic priorities based on the analysis. Be specific and actionable.
   Example: "Resolve CodieBlock Portuguese crisis - Regenerate with proper European Portuguese voice cloning to recover client relationship"

**IMPORTANT:**
- If a section has no relevant data, return an empty array []
- Combine related updates from the same task into one comprehensive bullet point
- Prioritize recent updates (last 24 hours) over older ones
- Use task status to help categorize (blocked, in progress, completed)
- Look for keywords in updates: "delivered", "awaiting", "blocked", "critical", "completed", "in progress"

Now analyze the data and generate the intelligence report.`;
  }

  /**
   * Parse AI response into structured sections
   */
  private parseAIResponse(text: string): DailyUpdateSection {
    try {
      // Remove markdown code blocks if present
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(cleanText);

      return {
        changesSinceYesterday: parsed.changesSinceYesterday || [],
        keyProgress: parsed.keyProgress || [],
        deliveriesAwaitingFeedback: parsed.deliveriesAwaitingFeedback || [],
        activeProduction: parsed.activeProduction || [],
        majorMilestones: parsed.majorMilestones || [],
        blockedItems: parsed.blockedItems || [],
        operationalUpdates: parsed.operationalUpdates || [],
        upcomingFocus: parsed.upcomingFocus || [],
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.error('Raw response:', text);
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Generate delivery intelligence report for management
   */
  async generateDeliveryIntelligence(deliveryTasks: DeliveryTask[]): Promise<DeliveryIntelligence> {
    const today = new Date();
    const next7Days = new Date();
    next7Days.setDate(today.getDate() + 7);

    // Prepare delivery task data for Gemini
    const taskData = deliveryTasks.map((task) => {
      const allComments = task.comments.map((c) => ({
        text: c.text.trim(),
        created_at: c.created_at,
        author: c.created_by?.name || 'Unknown',
      }));

      // Calculate subtask completion
      const totalSubtasks = task.subtasks?.length || 0;
      const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;
      const subtaskProgress = totalSubtasks > 0 ? `${completedSubtasks}/${totalSubtasks}` : 'N/A';

      return {
        name: task.name,
        status: task.task_status || 'Unknown',
        completed: task.completed,
        dueOn: task.due_on,
        committedDeliveryDate: task.committed_delivery_date,
        plannedMargin: task.planned_margin,
        actualMargin: task.actual_margin,
        subtaskProgress,
        subtasks: task.subtasks || [],
        comments: allComments,
      };
    });

    const prompt = this.buildDeliveryPrompt(taskData);

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseDeliveryResponse(text);
    } catch (error) {
      console.error('Error calling Gemini API for delivery intelligence:', error);
      throw new Error('Failed to generate delivery intelligence');
    }
  }

  /**
   * Build prompt for delivery intelligence
   */
  private buildDeliveryPrompt(taskData: any[]): string {
    const tasksJSON = JSON.stringify(taskData, null, 2);

    return `You are a delivery management analyst for Media Squad. Your job is to analyze delivery projects and provide executive intelligence on delivery timelines, risks, margins, and quality.

**INPUT DATA:**
${tasksJSON}

**YOUR TASK:**
Analyze all delivery projects and create a management intelligence report with 5 focused sections. Provide SPECIFIC, ACTIONABLE insights for management decision-making.

**CRITICAL INSTRUCTIONS:**
1. Use EXACT project names from the data
2. Include SPECIFIC dates, margin percentages, and metrics
3. Focus on RISKS, TRENDS, and ACTIONABLE ITEMS
4. Identify patterns across projects (timeline slippage, margin erosion, quality issues)
5. Use URGENT language for critical items
6. Compare planned vs actual margins when both are available
7. Analyze subtask completion to predict delivery risks
8. Look for quality-related keywords in comments: "bug", "issue", "rework", "revision", "feedback"

**OUTPUT FORMAT:**
Return ONLY a JSON object with this exact structure (no markdown, no code blocks, just raw JSON):

{
  "upcomingDeliveries": [
    "Project name - Due/committed date, current status, subtask completion %, any risks or blockers"
  ],
  "overdueOrAtRisk": [
    "CRITICAL: Project name - Days overdue OR risk factor, impact, immediate action needed"
  ],
  "marginAnalysis": [
    "Project name - Planned margin X%, Actual margin Y%, variance analysis, profitability insight"
  ],
  "qualityInsights": [
    "Project name - Quality issue/feedback details, rework required, client satisfaction status"
  ],
  "deliveryVelocity": [
    "Overall delivery trends, completion rates, timeline adherence, capacity insights"
  ]
}

**SECTION GUIDELINES:**

1. **Upcoming Deliveries (Next 7 Days)**: Projects due soon with readiness assessment.
   Example: "Mitesh Hollywood Localization - Due Mar 20 (3 days), 80% subtasks complete, on track"

2. **Overdue or At Risk**: CRITICAL section - overdue projects or those at risk of missing deadlines.
   Example: "CRITICAL: Invesco Translations - 5 days overdue, blocked awaiting client feedback, revenue at risk"

3. **Margin Analysis**: Compare planned vs actual margins, identify profitability concerns.
   Example: "CodieBlock Pilot - Planned margin 25%, Actual margin 12%, -13% variance due to rework costs"

4. **Quality Insights**: Client feedback, revisions, quality issues from comments.
   Example: "TV Tokyo Gintama - Multiple QC revision rounds, client requested subtitle timing adjustments"

5. **Delivery Velocity & Trends**: Overall delivery performance metrics and patterns.
   Example: "70% of projects meeting committed dates, average margin erosion of 5% due to scope creep"

**IMPORTANT:**
- If a section has no relevant data, return an empty array []
- Focus on projects with recent activity or upcoming deadlines
- Highlight margin variances > 10%
- Flag overdue items as CRITICAL
- Analyze comment sentiment for quality issues

Now analyze the delivery data and generate the intelligence report.`;
  }

  /**
   * Parse delivery intelligence response
   */
  private parseDeliveryResponse(text: string): DeliveryIntelligence {
    try {
      // Remove markdown code blocks if present
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(cleanText);

      return {
        upcomingDeliveries: parsed.upcomingDeliveries || [],
        overdueOrAtRisk: parsed.overdueOrAtRisk || [],
        marginAnalysis: parsed.marginAnalysis || [],
        qualityInsights: parsed.qualityInsights || [],
        deliveryVelocity: parsed.deliveryVelocity || [],
      };
    } catch (error) {
      console.error('Error parsing delivery intelligence response:', error);
      console.error('Raw response:', text);
      throw new Error('Failed to parse delivery intelligence response');
    }
  }
}
