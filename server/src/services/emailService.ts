import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { SalesTask, AsanaComment } from '../types/index.js';
import { GeminiService } from './geminiService.js';

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

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private resend: Resend | null = null;
  private geminiService: GeminiService | null;
  private useResend: boolean = false;

  constructor() {
    // Check if using Resend (if RESEND_API_KEY is provided)
    const resendApiKey = process.env.RESEND_API_KEY || process.env.EMAIL_PASSWORD;

    if (resendApiKey && resendApiKey.startsWith('re_')) {
      // Using Resend
      this.resend = new Resend(resendApiKey);
      this.useResend = true;
      console.log('📧 Email service using Resend');
    } else {
      // Using SMTP (nodemailer) - fallback only, won't work on Railway
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      } as any);
      console.log('📧 Email service using SMTP (not recommended for Railway)');
    }

    // Initialize Gemini service if API key is available
    try {
      this.geminiService = new GeminiService();
      console.log('✨ Gemini AI service initialized for intelligent summaries');
    } catch (error) {
      console.log('⚠️  Gemini API key not found. Using keyword-based analysis.');
      this.geminiService = null;
    }
  }

  /**
   * Generate daily intelligence update email from Sales Initiative tasks
   */
  async sendDailyUpdate(tasks: SalesTask[]): Promise<void> {
    let sections: DailyUpdateSection;

    // Use Gemini AI if available, otherwise fall back to keyword-based analysis
    if (this.geminiService) {
      try {
        console.log('🤖 Generating AI-powered intelligent summary...');
        sections = await this.geminiService.generateDailyUpdate(tasks);
      } catch (error) {
        console.error('⚠️  Gemini AI failed, falling back to keyword-based analysis:', error);
        sections = this.analyzeTasks(tasks);
      }
    } else {
      console.log('📊 Generating keyword-based summary...');
      sections = this.analyzeTasks(tasks);
    }

    const emailContent = this.generateEmailHTML(sections);

    const recipientEmails = (process.env.RECIPIENT_EMAILS || '').split(',').filter(Boolean);

    if (recipientEmails.length === 0) {
      console.log('⚠️  No recipient emails configured. Skipping email send.');
      return;
    }

    const today = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const subject = `Media Squad – Daily Execution Intelligence Update – ${today}`;
    const fromEmail = process.env.EMAIL_USER || 'noreply@rian.io';

    if (this.useResend && this.resend) {
      // Send via Resend
      console.log('📤 Sending via Resend...');
      console.log('From:', fromEmail);
      console.log('To:', recipientEmails);
      console.log('Subject:', subject);

      try {
        const result = await this.resend.emails.send({
          from: fromEmail,
          to: recipientEmails,
          subject: subject,
          html: emailContent,
        });
        console.log('✅ Resend response:', JSON.stringify(result, null, 2));
      } catch (error: any) {
        console.error('❌ Resend error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }
    } else if (this.transporter) {
      // Send via SMTP
      await this.transporter.sendMail({
        from: fromEmail,
        to: recipientEmails.join(', '),
        subject: subject,
        html: emailContent,
      });
    } else {
      throw new Error('No email service configured');
    }

    console.log(`✅ Daily update email sent to: ${recipientEmails.join(', ')}`);
  }

  /**
   * Analyze tasks and categorize updates into sections
   */
  private analyzeTasks(tasks: SalesTask[]): DailyUpdateSection {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const changesSinceYesterday: string[] = [];
    const keyProgress: string[] = [];
    const deliveriesAwaitingFeedback: string[] = [];
    const activeProduction: string[] = [];
    const majorMilestones: string[] = [];
    const blockedItems: string[] = [];
    const operationalUpdates: string[] = [];
    const upcomingFocus: string[] = [];

    tasks.forEach((task) => {
      // Get all "Update:" comments
      const updateComments = task.comments.filter((c) =>
        c.text.trim().toLowerCase().startsWith('update:')
      );

      // Get recent updates (last 24 hours)
      const recentUpdates = updateComments.filter((c) => {
        const commentDate = new Date(c.created_at);
        return commentDate >= yesterday;
      });

      // Get latest update
      const latestUpdate = updateComments[0];

      // Categorize based on content and status
      const taskPrefix = `${task.name}`;
      const allCommentText = task.comments.map((c) => c.text.toLowerCase()).join(' ');

      // Changes Since Yesterday - any task with recent updates
      if (recentUpdates.length > 0) {
        recentUpdates.forEach((update) => {
          const text = update.text.replace(/^update:\s*/i, '').trim();
          changesSinceYesterday.push(`${taskPrefix} - ${text}`);
        });
      }

      // Blocked Items
      if (
        task.task_status?.toLowerCase().includes('blocked') ||
        allCommentText.includes('blocked') ||
        allCommentText.includes('critical') ||
        allCommentText.includes('issue')
      ) {
        if (latestUpdate) {
          const text = latestUpdate.text.replace(/^update:\s*/i, '').trim();
          blockedItems.push(`${taskPrefix} - ${text}`);
        }
      }

      // Deliveries Awaiting Feedback
      if (
        allCommentText.includes('awaiting') ||
        allCommentText.includes('pending feedback') ||
        allCommentText.includes('waiting for')
      ) {
        if (latestUpdate) {
          const text = latestUpdate.text.replace(/^update:\s*/i, '').trim();
          deliveriesAwaitingFeedback.push(`${taskPrefix} - ${text}`);
        }
      }

      // Active Production
      if (
        task.task_status?.toLowerCase().includes('in progress') ||
        task.task_status?.toLowerCase().includes('delivery') ||
        allCommentText.includes('in progress')
      ) {
        if (latestUpdate) {
          const text = latestUpdate.text.replace(/^update:\s*/i, '').trim();
          activeProduction.push(`${taskPrefix} - ${text}`);
        }
      }

      // Major Milestones (completed items)
      if (
        task.completed ||
        task.task_status?.toLowerCase().includes('completed') ||
        allCommentText.includes('delivered') ||
        allCommentText.includes('complete')
      ) {
        if (latestUpdate) {
          const text = latestUpdate.text.replace(/^update:\s*/i, '').trim();
          majorMilestones.push(`${taskPrefix} - ${text}`);
        }
      }

      // Key Progress (all updates from today)
      if (recentUpdates.length > 0) {
        recentUpdates.forEach((update) => {
          const text = update.text.replace(/^update:\s*/i, '').trim();
          keyProgress.push(`${taskPrefix} - ${text}`);
        });
      }
    });

    // Generate upcoming focus from blocked and pending items
    if (blockedItems.length > 0) {
      upcomingFocus.push('Resolve all blocked items and critical issues');
    }
    if (deliveriesAwaitingFeedback.length > 0) {
      upcomingFocus.push('Follow up on pending client feedback for deliveries');
    }
    if (activeProduction.length > 0) {
      upcomingFocus.push('Continue active production work to meet deadlines');
    }

    return {
      changesSinceYesterday: this.deduplicate(changesSinceYesterday),
      keyProgress: this.deduplicate(keyProgress),
      deliveriesAwaitingFeedback: this.deduplicate(deliveriesAwaitingFeedback),
      activeProduction: this.deduplicate(activeProduction),
      majorMilestones: this.deduplicate(majorMilestones),
      blockedItems: this.deduplicate(blockedItems),
      operationalUpdates: this.deduplicate(operationalUpdates),
      upcomingFocus,
    };
  }

  /**
   * Remove duplicate entries
   */
  private deduplicate(items: string[]): string[] {
    return Array.from(new Set(items));
  }

  /**
   * Generate email preview without sending
   */
  async generatePreview(tasks: SalesTask[]): Promise<string> {
    let sections: DailyUpdateSection;

    // Use Gemini AI if available, otherwise fall back to keyword-based analysis
    if (this.geminiService) {
      try {
        console.log('🤖 Generating AI-powered preview...');
        sections = await this.geminiService.generateDailyUpdate(tasks);
      } catch (error) {
        console.error('⚠️  Gemini AI failed, falling back to keyword-based analysis:', error);
        sections = this.analyzeTasks(tasks);
      }
    } else {
      console.log('📊 Generating keyword-based preview...');
      sections = this.analyzeTasks(tasks);
    }

    return this.generateEmailHTML(sections);
  }

  /**
   * Generate HTML email content
   */
  private generateEmailHTML(sections: DailyUpdateSection): string {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      margin: 0;
    }
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    .header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      padding: 48px 40px;
      text-align: center;
      position: relative;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    }
    .header .date {
      font-size: 13px;
      color: #9ca3af;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
    }
    .header h1 {
      font-size: 26px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    .header .subtitle {
      font-size: 14px;
      color: #667eea;
      font-weight: 600;
    }
    .content {
      padding: 40px;
      background: #fafbfc;
    }
    .section-grid {
      display: grid;
      gap: 20px;
    }
    .section-card {
      background: #ffffff;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      border: 1px solid #e5e7eb;
      transition: transform 0.2s;
    }
    .section-header {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid #f3f4f6;
    }
    .section-badge {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      margin-right: 12px;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #1f2937;
      line-height: 1.3;
    }
    .item-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 10px;
    }
    .item {
      padding: 14px 16px;
      background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
      border-left: 3px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      line-height: 1.6;
      color: #374151;
      position: relative;
    }
    .milestone-card {
      border: 2px solid #93c5fd;
      background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
    }
    .milestone-card .section-badge {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
    }
    .milestone-card .item {
      background: #ffffff;
      border-left-color: #3b82f6;
    }
    .blocked-card {
      border: 2px solid #fca5a5;
      background: linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%);
    }
    .blocked-card .section-badge {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
    }
    .blocked-card .item {
      background: #ffffff;
      border-left-color: #ef4444;
    }
    .focus-card {
      border: 2px solid #fcd34d;
      background: linear-gradient(135deg, #fef3c7 0%, #fefce8 100%);
    }
    .focus-card .section-badge {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
    }
    .focus-card .item {
      background: #ffffff;
      border-left-color: #f59e0b;
    }
    .footer {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      padding: 32px 40px;
      text-align: center;
    }
    .footer p {
      font-size: 13px;
      color: #9ca3af;
      margin: 0;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
    }
    .footer a:hover {
      color: #764ba2;
    }
    @media only screen and (max-width: 600px) {
      body { padding: 20px 10px; }
      .header { padding: 32px 24px; }
      .content { padding: 24px; }
      .header h1 { font-size: 22px; }
      .section-card { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <div class="date">${today}</div>
      <h1>Daily Intelligence Update</h1>
      <div class="subtitle">Media Squad · Rian.io</div>
    </div>
    <div class="content">
      <div class="section-grid">
`;

    if (sections.changesSinceYesterday.length > 0) {
      html += this.createSection('1', 'Changes Since Yesterday', sections.changesSinceYesterday);
    }

    if (sections.keyProgress.length > 0) {
      html += this.createSection('2', 'Key Execution Progress Today', sections.keyProgress);
    }

    if (sections.deliveriesAwaitingFeedback.length > 0) {
      html += this.createSection(
        '3',
        'Deliveries Sent – Awaiting Feedback',
        sections.deliveriesAwaitingFeedback
      );
    }

    if (sections.activeProduction.length > 0) {
      html += this.createSection('4', 'Active Production Work', sections.activeProduction);
    }

    if (sections.majorMilestones.length > 0) {
      html += this.createSection(
        '5',
        'Major Delivery or Production Milestones',
        sections.majorMilestones,
        'milestone'
      );
    }

    if (sections.blockedItems.length > 0) {
      html += this.createSection(
        '6',
        'Blocked or Slow Moving Items',
        sections.blockedItems,
        'blocked'
      );
    }

    if (sections.operationalUpdates.length > 0) {
      html += this.createSection('7', 'Other Operational Updates', sections.operationalUpdates);
    }

    if (sections.upcomingFocus.length > 0) {
      html += this.createSection(
        '8',
        'Focus for the Next Few Days',
        sections.upcomingFocus,
        'focus'
      );
    }

    html += `
      </div>
    </div>
    <div class="footer">
      <p>Powered by AI Intelligence · <a href="https://rian.io">Rian.io</a></p>
    </div>
  </div>
</body>
</html>`;

    return html;
  }

  /**
   * Create a section card in the email
   */
  private createSection(
    number: string,
    title: string,
    items: string[],
    type: 'default' | 'milestone' | 'blocked' | 'focus' = 'default'
  ): string {
    const cardClass =
      type === 'default'
        ? 'section-card'
        : type === 'milestone'
        ? 'section-card milestone-card'
        : type === 'blocked'
        ? 'section-card blocked-card'
        : 'section-card focus-card';

    return `
    <div class="${cardClass}">
      <div class="section-header">
        <span class="section-badge">${number}</span>
        <div class="section-title">${title}</div>
      </div>
      <ul class="item-list">
        ${items.map((item) => `<li class="item">${item}</li>`).join('')}
      </ul>
    </div>`;
  }
}
