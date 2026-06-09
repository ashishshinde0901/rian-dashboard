# Environment Variables - Rian Ops Dashboard

## Railway (Backend Server)

Add these environment variables in your Railway project settings:

### Required Variables

```env
# Server Configuration
NODE_ENV=production
PORT=3001

# Frontend URL (your Vercel deployment)
FRONTEND_URL=https://your-app-name.vercel.app

# Session Security
SESSION_SECRET=<generate-a-long-random-string-here>

# Asana OAuth (from https://app.asana.com/0/developer-console)
ASANA_CLIENT_ID=<your-asana-client-id>
ASANA_CLIENT_SECRET=<your-asana-client-secret>
ASANA_REDIRECT_URI=https://your-backend.railway.app/auth/asana/callback

# Asana Personal Access Token (for scheduled tasks)
ASANA_ACCESS_TOKEN=<your-asana-personal-access-token>

# Media.Rian Project Configuration
MEDIA_RIAN_PROJECT_GID=1215471459454088
WORKSPACE_GID=1200057218350324

# OpenRouter API (for AI chat)
OPENROUTER_API_KEY=<your-openrouter-api-key>

# Email Configuration (Resend)
RESEND_API_KEY=re_QQzzyeNU_BwZRcM7WhFPJv1kKEeX87AbD
EMAIL_USER=ashish.shinde@rian.io
RECIPIENT_EMAILS=foundersoffice@rian.io

# Daily Email Settings
ENABLE_DAILY_EMAIL=true
DAILY_EMAIL_WORKSPACE_GID=1200057218350324
DAILY_EMAIL_CUSTOM_FIELD_GID=1213226456746418
DAILY_EMAIL_OPTION_GID=1213465836909113

# Gemini AI (for email summaries)
GEMINI_API_KEY=AIzaSyBQjG7_4i__KWNg1doBWTD-7tIWZAA6pfQ

# Role Configuration (comma-separated emails)
SUPER_ADMIN_EMAILS=your-email@example.com
SALES_HEAD_EMAILS=sales-head@example.com
DELIVERY_HEAD_EMAILS=delivery-head@example.com
TECH_HEAD_EMAILS=tech-head@example.com
PRODUCT_HEAD_EMAILS=product-head@example.com
```

## Vercel (Frontend Client)

Add these environment variables in your Vercel project settings:

```env
# Backend API URL (your Railway deployment)
VITE_API_URL=https://your-backend.railway.app
```

## How to Get API Keys

### 1. Asana OAuth Credentials

1. Go to https://app.asana.com/0/developer-console
2. Click "Create new app"
3. Fill in app details:
   - Name: "Rian Ops Dashboard"
   - Redirect URL: `https://your-backend.railway.app/auth/asana/callback`
4. Copy the **Client ID** and **Client Secret**
5. Add them to Railway environment variables

### 2. OpenRouter API Key (for AI Chat)

1. Go to https://openrouter.ai/
2. Sign up / Log in
3. Go to "Keys" section
4. Create a new API key
5. Add to Railway as `OPENROUTER_API_KEY`

**Note**: OpenRouter has free tier models. The dashboard will work without this key (using pattern matching fallback), but AI chat will be more intelligent with it.

### 3. Session Secret

Generate a random string for session security:

```bash
# On Mac/Linux
openssl rand -base64 32

# Or use any random string generator
# Example: 8Kj3nQ9sL2mP4xR7tY1vZ5wC6eF0hA2bN8dG3jM5kS9lT4pX
```

### 4. Gemini API Key (Optional - for email summaries)

1. Go to https://makersuite.google.com/app/apikey
2. Create a new API key
3. Add to Railway as `GEMINI_API_KEY`

## Update Frontend URL After Deployment

### Step 1: Deploy Backend to Railway

1. Push code to GitHub
2. Railway auto-deploys
3. Note the Railway URL (e.g., `https://your-backend.railway.app`)

### Step 2: Update Railway Environment Variables

1. Go to Railway project → Variables
2. Update `ASANA_REDIRECT_URI` with your Railway URL:
   ```
   https://your-backend.railway.app/auth/asana/callback
   ```

### Step 3: Update Asana Developer Console

1. Go back to https://app.asana.com/0/developer-console
2. Edit your app
3. Update Redirect URL to match:
   ```
   https://your-backend.railway.app/auth/asana/callback
   ```

### Step 4: Deploy Frontend to Vercel

1. Connect GitHub repo to Vercel
2. Add environment variable:
   ```
   VITE_API_URL=https://your-backend.railway.app
   ```
3. Deploy
4. Note the Vercel URL (e.g., `https://your-app.vercel.app`)

### Step 5: Update Backend with Frontend URL

1. Go back to Railway → Variables
2. Update `FRONTEND_URL`:
   ```
   https://your-app.vercel.app
   ```
3. Redeploy

## Verification Checklist

After setting all environment variables:

- [ ] Railway backend is running
- [ ] Vercel frontend is running
- [ ] Can access login page
- [ ] OAuth redirect works (login with Asana)
- [ ] Can see Media.Rian initiatives
- [ ] Tab navigation works
- [ ] Filter and search work
- [ ] (Optional) AI chat works if OpenRouter key is set

## Troubleshooting

### "Failed to fetch initiatives"
- Check `VITE_API_URL` in Vercel
- Check CORS settings in backend (`FRONTEND_URL`)

### "OAuth redirect failed"
- Check `ASANA_REDIRECT_URI` matches Railway URL
- Check Asana Developer Console redirect URL matches
- Ensure URLs use `https://` not `http://`

### "Session expired immediately"
- Check `SESSION_SECRET` is set
- Check cookies are allowed in browser
- Check `FRONTEND_URL` is correct

### "No data showing"
- Check `MEDIA_RIAN_PROJECT_GID` is correct (1215471459454088)
- Check `ASANA_ACCESS_TOKEN` has access to the project
- Check Railway logs for errors

## Security Notes

- Never commit `.env` files to Git
- Use different secrets for production vs development
- Rotate `SESSION_SECRET` periodically
- Keep API keys confidential
- Use environment-specific values (don't use production keys in development)

## Quick Copy-Paste Template

Save this as `.env` in your project root for local development:

```env
# Local Development Environment Variables
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=dev-secret-key-change-in-production

ASANA_CLIENT_ID=your-dev-client-id
ASANA_CLIENT_SECRET=your-dev-client-secret
ASANA_REDIRECT_URI=http://localhost:3001/auth/asana/callback

ASANA_ACCESS_TOKEN=<your-asana-personal-access-token>
MEDIA_RIAN_PROJECT_GID=1215471459454088
WORKSPACE_GID=1200057218350324

# Optional
OPENROUTER_API_KEY=your-openrouter-key
GEMINI_API_KEY=your-gemini-key
```

**Important**: Don't commit this file! It's already in `.gitignore`.
