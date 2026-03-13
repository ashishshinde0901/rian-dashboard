import express from 'express';
import { AsanaService } from '../services/asana.js';
import { EmailService } from '../services/emailService.js';

const router = express.Router();

/**
 * POST /api/email/send-daily-update
 * Manually trigger daily update email
 */
router.post('/send-daily-update', async (req, res) => {
  try {
    const accessToken = req.session.asana?.accessToken;
    if (!accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { workspaceGid, customFieldGid, optionGid } = req.body;

    if (!workspaceGid || !customFieldGid || !optionGid) {
      return res.status(400).json({
        error: 'Missing required parameters: workspaceGid, customFieldGid, optionGid',
      });
    }

    // Fetch Sales Initiative tasks
    const asana = new AsanaService(accessToken);
    const dashboard = await asana.getTasksByFilter(workspaceGid, customFieldGid, optionGid);

    // Send daily update email
    const emailService = new EmailService();
    await emailService.sendDailyUpdate(dashboard.tasks);

    res.json({
      success: true,
      message: `Daily update email sent with ${dashboard.tasks.length} tasks analyzed`,
      taskCount: dashboard.tasks.length,
    });
  } catch (error: any) {
    console.error('Error sending daily update email:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/email/preview-daily-update
 * Preview the daily update email without sending
 */
router.get('/preview-daily-update', async (req, res) => {
  try {
    const accessToken = req.session.asana?.accessToken;
    if (!accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { workspaceGid, customFieldGid, optionGid } = req.query;

    if (!workspaceGid || !customFieldGid || !optionGid) {
      return res.status(400).json({
        error: 'Missing required parameters: workspaceGid, customFieldGid, optionGid',
      });
    }

    // Fetch Sales Initiative tasks
    const asana = new AsanaService(accessToken);
    const dashboard = await asana.getTasksByFilter(
      workspaceGid as string,
      customFieldGid as string,
      optionGid as string
    );

    // Generate email preview (without sending)
    const emailService = new EmailService();
    const preview = await emailService.generatePreview(dashboard.tasks);

    res.send(preview);
  } catch (error: any) {
    console.error('Error generating email preview:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/email/test-send
 * Test endpoint - sends email using environment variables (no auth required)
 * Only works if all env vars are configured
 */
router.post('/test-send', async (req, res) => {
  try {
    const accessToken = process.env.ASANA_ACCESS_TOKEN;
    const workspaceGid = process.env.DAILY_EMAIL_WORKSPACE_GID;
    const customFieldGid = process.env.DAILY_EMAIL_CUSTOM_FIELD_GID;
    const optionGid = process.env.DAILY_EMAIL_OPTION_GID;

    if (!accessToken || !workspaceGid || !customFieldGid || !optionGid) {
      return res.status(500).json({
        error: 'Email automation not configured. Missing environment variables.',
      });
    }

    // Fetch Sales Initiative tasks
    const asana = new AsanaService(accessToken);
    const dashboard = await asana.getTasksByFilter(workspaceGid, customFieldGid, optionGid);

    // Send daily update email
    const emailService = new EmailService();
    await emailService.sendDailyUpdate(dashboard.tasks);

    res.json({
      success: true,
      message: `Test email sent successfully with ${dashboard.tasks.length} tasks analyzed`,
      taskCount: dashboard.tasks.length,
      recipient: process.env.RECIPIENT_EMAILS,
    });
  } catch (error: any) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
