import cron from 'node-cron';
import { AsanaService } from './asana.js';
import { EmailService } from './emailService.js';

export class SchedulerService {
  /**
   * Start the daily email scheduler
   * Runs every day at 9:00 AM IST (3:30 AM UTC)
   */
  static startDailyEmailScheduler() {
    // Check if scheduling is enabled
    if (process.env.ENABLE_DAILY_EMAIL !== 'true') {
      console.log('⏸️  Daily email scheduler is disabled. Set ENABLE_DAILY_EMAIL=true to enable.');
      return;
    }

    const workspaceGid = process.env.DAILY_EMAIL_WORKSPACE_GID;
    const customFieldGid = process.env.DAILY_EMAIL_CUSTOM_FIELD_GID;
    const optionGid = process.env.DAILY_EMAIL_OPTION_GID;
    const accessToken = process.env.ASANA_ACCESS_TOKEN;

    if (!workspaceGid || !customFieldGid || !optionGid || !accessToken) {
      console.log(
        '⚠️  Daily email scheduler: Missing required environment variables:',
        'DAILY_EMAIL_WORKSPACE_GID, DAILY_EMAIL_CUSTOM_FIELD_GID, DAILY_EMAIL_OPTION_GID, ASANA_ACCESS_TOKEN'
      );
      return;
    }

    // Schedule for 9:00 AM IST (3:30 AM UTC) every day
    // Cron format: minute hour day month weekday
    const cronSchedule = '30 3 * * *'; // 3:30 AM UTC = 9:00 AM IST

    console.log(`📧 Daily email scheduler started - will run at 9:00 AM IST every day`);

    cron.schedule(cronSchedule, async () => {
      try {
        console.log(`\n🔄 Running scheduled daily email update...`);

        // Fetch tasks
        const asana = new AsanaService(accessToken);
        const dashboard = await asana.getTasksByFilter(
          workspaceGid,
          customFieldGid,
          optionGid
        );

        // Send email
        const emailService = new EmailService();
        await emailService.sendDailyUpdate(dashboard.tasks);

        console.log(`✅ Scheduled daily email sent successfully (${dashboard.tasks.length} tasks analyzed)\n`);
      } catch (error) {
        console.error('❌ Error in scheduled daily email:', error);
      }
    });
  }
}
