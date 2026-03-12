# Daily Sales Email Automation Setup

This system automatically sends a daily intelligence update email to management with the latest updates from your Sales Initiative tasks.

## Required Environment Variables

Add these to your `.env` file in the `server` directory:

```env
# Email Configuration (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
RECIPIENT_EMAILS=founder@company.com,management@company.com

# Daily Email Scheduler Configuration
ENABLE_DAILY_EMAIL=true
ASANA_ACCESS_TOKEN=your-personal-access-token-here
DAILY_EMAIL_WORKSPACE_GID=your-workspace-gid
DAILY_EMAIL_CUSTOM_FIELD_GID=your-custom-field-gid
DAILY_EMAIL_OPTION_GID=your-sales-initiative-option-gid
```

## Email Setup Options

### Option 1: Gmail (Recommended for testing)

1. Go to your Google Account settings
2. Navigate to Security → 2-Step Verification
3. Scroll down to "App passwords"
4. Generate a new app password for "Mail"
5. Use this password in `EMAIL_PASSWORD`

### Option 2: SendGrid

```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
```

### Option 3: AWS SES

```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USER=your-ses-smtp-username
EMAIL_PASSWORD=your-ses-smtp-password
```

## Finding Your Asana IDs

### Get Workspace GID:
1. Log into dashboard at http://localhost:5173
2. Open browser console
3. The workspace dropdown will show GIDs

### Get Custom Field and Option GIDs:
1. Use the API endpoint: `GET /api/custom-fields/:workspaceGid`
2. Find "Function" field and "Sales Initiative" option
3. Copy the GIDs

### Get Asana Personal Access Token:
1. Go to https://app.asana.com/0/my-apps
2. Click "Create new token"
3. Give it a name like "Daily Email Automation"
4. Copy the token to `ASANA_ACCESS_TOKEN`

## Schedule Configuration

The email is scheduled to send **every day at 9:00 AM IST**.

To change the schedule, edit `server/src/services/scheduler.ts`:
```typescript
// Change this line (cron format: minute hour day month weekday)
const cronSchedule = '30 3 * * *'; // 3:30 AM UTC = 9:00 AM IST
```

Examples:
- `30 3 * * *` - 9:00 AM IST (3:30 AM UTC)
- `0 9 * * *` - 2:30 PM IST (9:00 AM UTC)
- `0 0 * * *` - 5:30 AM IST (12:00 AM UTC)

## Manual Testing

### Test Email Sending (without waiting for schedule):

```bash
curl -X POST http://localhost:3001/api/email/send-daily-update \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceGid": "YOUR_WORKSPACE_GID",
    "customFieldGid": "YOUR_CUSTOM_FIELD_GID",
    "optionGid": "YOUR_OPTION_GID"
  }'
```

### Preview Email (view HTML without sending):

Open in browser:
```
http://localhost:3001/api/email/preview-daily-update?workspaceGid=XXX&customFieldGid=XXX&optionGid=XXX
```

## Email Content Structure

The automated email includes:

1. **Changes Since Yesterday** - Updates posted in last 24 hours
2. **Key Execution Progress Today** - All recent activity
3. **Deliveries Sent – Awaiting Feedback** - Tasks waiting for client response
4. **Active Production Work** - In-progress items
5. **Major Delivery or Production Milestones** - Completed work
6. **Blocked or Slow Moving Items** - Critical issues (highlighted in red)
7. **Other Operational Updates** - General updates
8. **Focus for the Next Few Days** - Auto-generated priorities

## How It Works

1. **Fetches** all tasks from "Sales Initiative" (Function field)
2. **Filters** comments starting with "Update:"
3. **Analyzes** task status and comment keywords
4. **Categorizes** into 8 sections based on content
5. **Generates** professional HTML email
6. **Sends** to all recipients in RECIPIENT_EMAILS

## Troubleshooting

### Email not sending?
- Check `ENABLE_DAILY_EMAIL=true` is set
- Verify all environment variables are present
- Check server logs for error messages
- Test with manual API call first

### Wrong tasks being included?
- Verify `DAILY_EMAIL_CUSTOM_FIELD_GID` and `DAILY_EMAIL_OPTION_GID`
- Check that tasks have correct "Function" field value

### Email looks wrong?
- Use preview endpoint to debug HTML
- Check that comments start with "Update:"
- Verify task statuses are set correctly

## Disabling Automation

Set `ENABLE_DAILY_EMAIL=false` to disable scheduled emails while keeping manual triggers available.
