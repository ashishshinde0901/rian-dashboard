# Deployment Instructions for Rian Dashboard

This guide will help you deploy the Rian Dashboard to Vercel.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. Asana OAuth credentials (Client ID and Client Secret)
3. Git repository with your code

## Deployment Steps

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from project root**
   ```bash
   cd "/Users/manishshinde/Asana dashboard"
   vercel
   ```

4. **Follow the prompts:**
   - Set up and deploy? `Y`
   - Which scope? Select your account
   - Link to existing project? `N` (for first deployment)
   - Project name: `rian-dashboard` (or your preferred name)
   - In which directory is your code located? `./`
   - Want to override settings? `N`

### Option 2: Deploy via Vercel Dashboard

1. **Push code to GitHub**
   ```bash
   cd "/Users/manishshinde/Asana dashboard"
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   # Create a new repository on GitHub, then:
   git remote add origin https://github.com/YOUR_USERNAME/rian-dashboard.git
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Vercel will auto-detect the settings

## Environment Variables

After deployment, configure these environment variables in Vercel Dashboard:

### For the Full-Stack App:

Go to Project Settings → Environment Variables and add:

```
NODE_ENV=production
SESSION_SECRET=<generate-a-random-secret-key>
ASANA_CLIENT_ID=<your-asana-client-id>
ASANA_CLIENT_SECRET=<your-asana-client-secret>
ASANA_REDIRECT_URI=https://your-deployment-url.vercel.app/api/auth/asana/callback
FRONTEND_URL=https://your-deployment-url.vercel.app
VITE_API_URL=https://your-deployment-url.vercel.app
```

### Important Notes:

1. **Update Asana OAuth Settings**:
   - Go to https://app.asana.com/0/developer-console
   - Add your Vercel deployment URL as an authorized redirect URI:
     `https://your-deployment-url.vercel.app/api/auth/asana/callback`

2. **Session Secret**:
   Generate a secure random string:
   ```bash
   openssl rand -base64 32
   ```

3. **Deployment URL**:
   - Replace `your-deployment-url.vercel.app` with your actual Vercel deployment URL
   - After first deployment, update all environment variables with the actual URL
   - Redeploy after updating environment variables

## Deploy Only Frontend (Current Setup)

The current `vercel.json` is configured to deploy only the client (frontend):

1. **Deploy**:
   ```bash
   vercel --prod
   ```

2. **Backend**:
   You'll need to deploy the backend separately. Options:
   - **Railway**: https://railway.app
   - **Render**: https://render.com
   - **Heroku**: https://heroku.com
   - **DigitalOcean App Platform**: https://www.digitalocean.com/products/app-platform

## Full-Stack Deployment (Alternative)

For a complete full-stack deployment on Vercel, you need to:

1. Convert the Express server to Vercel serverless functions
2. Use Vercel's built-in session storage or external session store (Redis)

This requires more setup. Let me know if you want instructions for this approach.

## Post-Deployment

1. **Test the deployment**:
   - Visit your deployed URL
   - Click "Login with Asana"
   - Verify OAuth flow works
   - Test task filtering

2. **Monitor**:
   - Check Vercel deployment logs for any errors
   - Monitor function invocations in Vercel dashboard

## Troubleshooting

- **OAuth errors**: Verify redirect URI matches exactly in Asana dev console
- **Session errors**: Ensure SESSION_SECRET is set and secure cookies are enabled
- **CORS errors**: Verify FRONTEND_URL environment variable is correct
- **Build errors**: Check build logs in Vercel dashboard

## Need Help?

Check the Vercel documentation: https://vercel.com/docs
