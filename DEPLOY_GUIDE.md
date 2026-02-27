# 🚀 Complete Deployment Guide - Rian Dashboard

Follow these steps exactly to deploy your dashboard.

---

## 📋 Prerequisites

Before starting, make sure you have:
- ✅ GitHub account (create at https://github.com)
- ✅ Railway account (create at https://railway.app - sign up with GitHub)
- ✅ Vercel account (create at https://vercel.com - sign up with GitHub)
- ✅ Asana Developer Account with OAuth app created

---

## STEP 1: Push Code to GitHub

### 1.1 Create a New Repository on GitHub

1. Go to https://github.com/new
2. Repository name: `rian-dashboard`
3. Description: `Rian Dashboard - Asana Task Management`
4. **Keep it Private** (recommended)
5. **DO NOT** initialize with README (we already have one)
6. Click **"Create repository"**

### 1.2 Push Your Code

Copy the commands GitHub shows you, but I'll provide them here:

```bash
cd "/Users/manishshinde/Asana dashboard"
git remote add origin https://github.com/YOUR_USERNAME/rian-dashboard.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

---

## STEP 2: Deploy Backend to Railway

### 2.1 Create Railway Project

1. Go to https://railway.app/new
2. Click **"Deploy from GitHub repo"**
3. Click **"Configure GitHub App"** if asked
4. Select your `rian-dashboard` repository
5. Click **"Deploy Now"**

### 2.2 Configure Railway to Use Server Directory

Railway will detect the project. Now configure it:

1. Click on your deployment
2. Go to **Settings** tab
3. Under **"Build"** section:
   - **Root Directory**: Enter `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Click **"Save Changes"**

### 2.3 Add Environment Variables to Railway

1. In Railway, click **"Variables"** tab
2. Add these variables one by one (click **"+ New Variable"** for each):

```
NODE_ENV=production
PORT=3001
```

**Don't add the other variables yet - we'll add them after we get the URLs!**

### 2.4 Get Your Railway Backend URL

1. Go to **"Settings"** tab in Railway
2. Scroll to **"Networking"**
3. Click **"Generate Domain"**
4. Copy the URL (it will look like: `https://your-app-name.up.railway.app`)

**✍️ WRITE THIS DOWN - You'll need it!**
Railway Backend URL: `___________________________________`

---

## STEP 3: Deploy Frontend to Vercel

### 3.1 Deploy to Vercel

1. Go to https://vercel.com/new
2. Click **"Import"** next to your `rian-dashboard` repository
3. Vercel will detect Vite. Configure it:
   - **Framework Preset**: Vite
   - **Root Directory**: Click **"Edit"** and enter `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Before clicking Deploy**, click **"Environment Variables"** dropdown

### 3.2 Add Environment Variable to Vercel

Add this ONE environment variable:

```
VITE_API_URL=[YOUR_RAILWAY_URL]
```

Replace `[YOUR_RAILWAY_URL]` with the Railway URL you wrote down (e.g., `https://your-app-name.up.railway.app`)

**Important**: NO trailing slash!

5. Click **"Deploy"**

### 3.3 Get Your Vercel Frontend URL

Wait for deployment to finish (2-3 minutes), then:

1. You'll see a congratulations screen
2. Copy your deployment URL (looks like: `https://rian-dashboard.vercel.app`)

**✍️ WRITE THIS DOWN - You'll need it!**
Vercel Frontend URL: `___________________________________`

---

## STEP 4: Complete Railway Environment Variables

Now that you have both URLs, go back to Railway:

1. Go to your Railway project
2. Click **"Variables"** tab
3. Add these additional variables:

```
SESSION_SECRET=[GENERATE_RANDOM_STRING]
ASANA_CLIENT_ID=[YOUR_ASANA_CLIENT_ID]
ASANA_CLIENT_SECRET=[YOUR_ASANA_CLIENT_SECRET]
ASANA_REDIRECT_URI=[YOUR_RAILWAY_URL]/auth/asana/callback
FRONTEND_URL=[YOUR_VERCEL_URL]
```

### How to fill them:

- `SESSION_SECRET`: Generate a random string at https://randomkeygen.com (use "CodeIgniter Encryption Keys")
- `ASANA_CLIENT_ID`: From your Asana developer console
- `ASANA_CLIENT_SECRET`: From your Asana developer console
- `ASANA_REDIRECT_URI`: Your Railway URL + `/auth/asana/callback`
  Example: `https://rian-dashboard-production.up.railway.app/auth/asana/callback`
- `FRONTEND_URL`: Your Vercel URL (e.g., `https://rian-dashboard.vercel.app`)

**Important**: NO trailing slashes in URLs!

---

## STEP 5: Update Asana OAuth Settings

This is CRITICAL for OAuth to work:

1. Go to https://app.asana.com/0/developer-console
2. Click on your app
3. Scroll to **"OAuth"** section
4. Under **"Redirect URLs"**, click **"Add redirect URL"**
5. Add your Railway callback URL:
   ```
   [YOUR_RAILWAY_URL]/auth/asana/callback
   ```
   Example: `https://rian-dashboard-production.up.railway.app/auth/asana/callback`
6. Click **"Save changes"**

---

## STEP 6: Redeploy (Important!)

After adding environment variables, you need to redeploy:

### Railway:
1. Go to your Railway deployment
2. Click **"Deployments"** tab
3. Click the three dots **"..."** on the latest deployment
4. Click **"Redeploy"**
5. Wait for it to finish (1-2 minutes)

### Vercel:
Vercel automatically redeploys when you change environment variables, but if needed:
1. Go to your Vercel project
2. Click **"Deployments"** tab
3. Click **"Redeploy"** on the latest deployment

---

## STEP 7: Test Your Deployment! 🎉

1. Open your Vercel URL: `[YOUR_VERCEL_URL]`
2. Click **"Login with Asana"**
3. Authorize the app
4. You should be redirected back and see your dashboard!
5. Test filtering tasks

---

## 🐛 Troubleshooting

### "OAuth redirect URI mismatch" error
- ✅ Check that your Railway callback URL in Asana matches EXACTLY
- ✅ No trailing slashes
- ✅ Uses https:// (not http://)

### "Failed to fetch" or CORS errors
- ✅ Check `FRONTEND_URL` in Railway matches your Vercel URL exactly
- ✅ Check `VITE_API_URL` in Vercel matches your Railway URL exactly
- ✅ Redeploy both after fixing

### Backend not responding
- ✅ Check Railway logs: Click "Deployments" → Click latest → View logs
- ✅ Make sure all environment variables are set
- ✅ Make sure PORT=3001 is set

### Session/Login issues
- ✅ Check `SESSION_SECRET` is set in Railway
- ✅ Clear browser cookies and try again
- ✅ Make sure you're using the Vercel URL (not localhost)

---

## 📝 Quick Reference

After deployment, save these URLs:

- **Frontend**: https://rian-dashboard.vercel.app
- **Backend**: https://your-app.up.railway.app
- **Asana Redirect**: https://your-app.up.railway.app/auth/asana/callback

---

## 🔄 Future Updates

When you make code changes:

1. Commit and push to GitHub:
   ```bash
   cd "/Users/manishshinde/Asana dashboard"
   git add .
   git commit -m "Your update description"
   git push
   ```

2. Railway and Vercel will auto-deploy! ✨

---

Need help? Check the logs in Railway and Vercel dashboards!
