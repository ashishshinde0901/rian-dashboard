import cron from 'node-cron';
import { AsanaService } from './asana.js';
import { EmailService } from './emailService.js';
import { DeliveryMetricsService } from './deliveryMetrics.js';
import { DeliveryTask } from './geminiService.js';

export class SchedulerService {
  /**
   * Start the daily email scheduler
   * Runs every day at 6:00 PM IST (12:30 PM UTC)
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

    // Optional delivery tracking configuration
    const deliveryFieldGid = process.env.DELIVERY_CUSTOM_FIELD_GID;
    const deliveryOptionGid = process.env.DELIVERY_OPTION_GID;

    if (!workspaceGid || !customFieldGid || !optionGid || !accessToken) {
      console.log(
        '⚠️  Daily email scheduler: Missing required environment variables:',
        'DAILY_EMAIL_WORKSPACE_GID, DAILY_EMAIL_CUSTOM_FIELD_GID, DAILY_EMAIL_OPTION_GID, ASANA_ACCESS_TOKEN'
      );
      return;
    }

    // Schedule for 6:00 PM IST (12:30 PM UTC) every day
    // Cron format: minute hour day month weekday
    const cronSchedule = '30 12 * * *'; // 12:30 PM UTC = 6:00 PM IST

    console.log(`📧 Daily email scheduler started - will run at 6:00 PM IST every day`);
    if (deliveryFieldGid && deliveryOptionGid) {
      console.log(`📦 Delivery intelligence enabled - will include delivery analysis in emails`);
    }

    cron.schedule(cronSchedule, async () => {
      try {
        console.log(`\n🔄 Running scheduled daily email update...`);

        const asana = new AsanaService(accessToken);

        // Fetch sales tasks
        const salesDashboard = await asana.getTasksByFilter(
          workspaceGid,
          customFieldGid,
          optionGid
        );
        console.log(`✓ Fetched ${salesDashboard.tasks.length} sales tasks`);

        // Fetch delivery tasks if configured
        let deliveryTasks: DeliveryTask[] | undefined = undefined;
        if (deliveryFieldGid && deliveryOptionGid) {
          try {
            const deliveryDashboard = await asana.getTasksByFilter(
              workspaceGid,
              deliveryFieldGid,
              deliveryOptionGid
            );

            // Get delivery metrics for all tasks
            const taskGids = deliveryDashboard.tasks.map((task) => task.gid);
            const metricsMap = await DeliveryMetricsService.getMetricsForTasks(taskGids);

            // Merge Asana data with private metrics
            deliveryTasks = deliveryDashboard.tasks.map((task) => {
              const metric = metricsMap.get(task.gid);
              return {
                gid: task.gid,
                name: task.name,
                task_status: task.task_status || null,
                due_on: null, // Asana tasks don't have due_on in this response, would need separate API call
                completed: task.completed,
                committed_delivery_date: metric?.committed_delivery_date || null,
                planned_margin: metric?.planned_margin || null,
                actual_margin: metric?.actual_margin || null,
                comments: task.comments,
                subtasks: undefined, // Would need separate API call to fetch subtasks
              };
            });

            console.log(`✓ Fetched ${deliveryTasks.length} delivery tasks`);
          } catch (error) {
            console.error('⚠️  Error fetching delivery tasks:', error);
            // Continue without delivery tasks
          }
        }

        // Send email
        const emailService = new EmailService();
        await emailService.sendDailyUpdate(salesDashboard.tasks, deliveryTasks);

        console.log(`✅ Scheduled daily email sent successfully (${salesDashboard.tasks.length} sales tasks${deliveryTasks ? `, ${deliveryTasks.length} delivery tasks` : ''} analyzed)\n`);
      } catch (error) {
        console.error('❌ Error in scheduled daily email:', error);
      }
    });
  }
}
