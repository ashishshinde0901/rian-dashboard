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
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.7;
      color: #1f2937;
      background-color: #f3f4f6;
      margin: 0;
      padding: 20px;
    }
    .email-container {
      max-width: 650px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      padding: 32px 40px;
      border-bottom: 3px solid #667eea;
    }
    .header h1 {
      color: #ffffff;
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 8px 0;
    }
    .header .date {
      color: #94a3b8;
      font-size: 14px;
      margin: 0;
    }
    .content {
      padding: 40px;
    }
    .section {
      margin-bottom: 32px;
    }
    .section h2 {
      color: #1f2937;
      font-size: 17px;
      font-weight: 700;
      margin: 0 0 16px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }
    .section-content {
      color: #374151;
      font-size: 15px;
      line-height: 1.8;
      margin: 0;
    }
    .section-content p {
      margin: 0 0 12px 0;
    }
    .section-content p:last-child {
      margin-bottom: 0;
    }
    .highlight {
      background: #fef3c7;
      padding: 2px 6px;
      border-radius: 3px;
    }
    .milestone {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .blocked {
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      background: #f9fafb;
      padding: 24px 40px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      color: #6b7280;
      font-size: 13px;
      margin: 0;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      body { padding: 10px; }
      .header, .content, .footer { padding: 24px; }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>Daily Intelligence Update</h1>
      <p class="date">${today}</p>
    </div>
    <div class="content">
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
    <div class="footer">
      <p>Powered by AI Intelligence · <a href="https://rian.io">Rian.io</a></p>
    </div>
  </div>
</body>
</html>`;

    return html;
  }

  /**
   * Create a section with paragraph format
   */
  private createSection(
    number: string,
    title: string,
    items: string[],
    type: 'default' | 'milestone' | 'blocked' | 'focus' = 'default'
  ): string {
    const sectionClass = type === 'milestone' || type === 'blocked' ? type : '';
    const wrappedContent = sectionClass
      ? `<div class="${sectionClass}">
        <h2>${number}. ${title}</h2>
        <div class="section-content">
          ${items.map((item) => `<p>• ${item}</p>`).join('')}
        </div>
      </div>`
      : `<div class="section">
        <h2>${number}. ${title}</h2>
        <div class="section-content">
          ${items.map((item) => `<p>• ${item}</p>`).join('')}
        </div>
      </div>`;

    return wrappedContent;
  }
}
