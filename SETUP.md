# Quick Setup Guide

## Step-by-Step Setup

### 1. Get Asana OAuth Credentials

1. Visit [https://app.asana.com/0/developer-console](https://app.asana.com/0/developer-console)
2. Click **"Create new app"**
3. Configure:
   - **App name**: Sales Initiative Dashboard
   - **Redirect URL**: `http://localhost:3001/auth/asana/callback`
4. Copy your **Client ID** and **Client Secret**

### 2. Configure Environment

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your credentials:
# - Replace ASANA_CLIENT_ID with your Client ID
# - Replace ASANA_CLIENT_SECRET with your Client Secret
# - Generate a random SESSION_SECRET (32+ characters)
```

### 3. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
cd ..
```

### 4. Prepare Asana Workspace

In your Asana workspace:
1. Create a **tag** called "Sales Initiative"
2. Tag some tasks with this tag
3. Make sure tasks have some comments for testing

### 5. Run the Application

Open **two terminal windows**:

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

Wait for: `🚀 Server running on http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

Wait for: `Local: http://localhost:5173`

### 6. Access the Dashboard

1. Open browser: `http://localhost:5173`
2. Click **"Login with Asana"**
3. Authorize the app
4. You'll be redirected to the dashboard!

## Verification Checklist

- [ ] Asana OAuth app created
- [ ] `.env` file configured with credentials
- [ ] Server dependencies installed (`server/node_modules` exists)
- [ ] Client dependencies installed (`client/node_modules` exists)
- [ ] "Sales Initiative" tag created in Asana
- [ ] Some tasks tagged with "Sales Initiative"
- [ ] Backend running on port 3001
- [ ] Frontend running on port 5173
- [ ] Successfully logged in and viewing tasks

## Common Issues

**"Cannot find module"**
→ Run `npm install` in both server and client directories

**Port already in use**
→ Kill the process: `lsof -ti:3001 | xargs kill -9` (or 5173)

**OAuth error / redirect failed**
→ Check that redirect URI in Asana console matches `.env`

**No tasks showing**
→ Ensure tasks are tagged with "Sales Initiative" in Asana

## Next Steps

Once running:
- Click on task names to open them in Asana
- Try expanding comments by clicking "Show more comments"
- Use the search box to filter tasks
- Click column headers to sort
- Test the filter buttons (All, Active, Completed)
- Click Refresh to manually update data

## Need Help?

Check the main [README.md](./README.md) for detailed documentation.
