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
      // Using SMTP (nodemailer)
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
      console.log('📧 Email service using SMTP');
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
      await this.resend.emails.send({
        from: fromEmail,
        to: recipientEmails,
        subject: subject,
        html: emailContent,
      });
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
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    let html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #4F46E5; color: white; padding: 20px; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 5px 0 0 0; font-size: 14px; }
    .section { padding: 20px; border-bottom: 1px solid #eee; }
    .section h2 { color: #4F46E5; font-size: 18px; margin-top: 0; }
    .section ul { margin: 10px 0; padding-left: 20px; }
    .section li { margin-bottom: 8px; }
    .blocked { background: #FEE2E2; padding: 15px; border-left: 4px solid #DC2626; }
    .milestone { background: #DBEAFE; padding: 15px; border-left: 4px solid #2563EB; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Media Squad – Daily Execution Intelligence Update</h1>
    <p>${today}</p>
  </div>
`;

    if (sections.changesSinceYesterday.length > 0) {
      html += this.createSection('1. Changes Since Yesterday', sections.changesSinceYesterday);
    }

    if (sections.keyProgress.length > 0) {
      html += this.createSection('2. Key Execution Progress Today', sections.keyProgress);
    }

    if (sections.deliveriesAwaitingFeedback.length > 0) {
      html += this.createSection(
        '3. Deliveries Sent – Awaiting Feedback',
        sections.deliveriesAwaitingFeedback
      );
    }

    if (sections.activeProduction.length > 0) {
      html += this.createSection('4. Active Production Work', sections.activeProduction);
    }

    if (sections.majorMilestones.length > 0) {
      html += `<div class="section milestone">
        <h2>5. Major Delivery or Production Milestones</h2>
        <ul>${sections.majorMilestones.map((item) => `<li>${item}</li>`).join('')}</ul>
      </div>`;
    }

    if (sections.blockedItems.length > 0) {
      html += `<div class="section blocked">
        <h2>6. Blocked or Slow Moving Items</h2>
        <ul>${sections.blockedItems.map((item) => `<li>${item}</li>`).join('')}</ul>
      </div>`;
    }

    if (sections.operationalUpdates.length > 0) {
      html += this.createSection('7. Other Operational Updates', sections.operationalUpdates);
    }

    if (sections.upcomingFocus.length > 0) {
      html += this.createSection('8. Focus for the Next Few Days', sections.upcomingFocus);
    }

    html += `
</body>
</html>`;

    return html;
  }

  /**
   * Create a section in the email
   */
  private createSection(title: string, items: string[]): string {
    return `
  <div class="section">
    <h2>${title}</h2>
    <ul>
      ${items.map((item) => `<li>${item}</li>`).join('')}
    </ul>
  </div>`;
  }
}
