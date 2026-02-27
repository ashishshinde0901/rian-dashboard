# Asana Sales Initiative Dashboard

A full-stack web application that connects to Asana via OAuth, fetches tasks tagged under "Sales Initiative", and displays them in a real-time dashboard with expandable comments.

## Features

- **OAuth Authentication**: Secure "Login with Asana" flow
- **Real-time Dashboard**: Auto-refreshes every 5 minutes
- **Task Management**: View all tasks tagged with "Sales Initiative"
- **Expandable Comments**: Shows 3 most recent comments by default, expandable to show all
- **Advanced Filtering**: Search, sort, and filter tasks by status
- **Multi-workspace Support**: Switch between different Asana workspaces
- **Responsive UI**: Built with Tailwind CSS for a modern, clean interface

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Auth | Asana OAuth 2.0 |
| Session | express-session |

## Prerequisites

Before you begin, you'll need:

1. **Node.js 18+** and npm installed
2. **Asana Account** with access to a workspace
3. **Asana OAuth App** credentials (see setup below)

## Asana App Setup

1. Go to [Asana Developer Console](https://app.asana.com/0/developer-console)
2. Click "Create new app"
3. Fill in the details:
   - **App Name**: Sales Initiative Dashboard
   - **Redirect URI**: `http://localhost:3001/auth/asana/callback`
   - **Scopes**: `default` (read access)
4. Save your **Client ID** and **Client Secret**

## Installation

### 1. Clone and Setup Environment

```bash
# Navigate to project directory
cd "Asana dashboard"

# Copy environment template
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` with your Asana credentials:

```env
# Server
PORT=3001
NODE_ENV=development
SESSION_SECRET=your-random-secret-at-least-32-chars
FRONTEND_URL=http://localhost:5173

# Asana OAuth (from Asana Developer Console)
ASANA_CLIENT_ID=your_asana_client_id_here
ASANA_CLIENT_SECRET=your_asana_client_secret_here
ASANA_REDIRECT_URI=http://localhost:3001/auth/asana/callback
```

### 3. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

## Running the Application

You need to run both the backend and frontend servers.

### Terminal 1 - Backend Server

```bash
cd server
npm run dev
```

The backend will start on `http://localhost:3001`

### Terminal 2 - Frontend Client

```bash
cd client
npm run dev
```

The frontend will start on `http://localhost:5173`

## Usage

1. **Open your browser** to `http://localhost:5173`
2. **Click "Login with Asana"** to authenticate
3. **Authorize the app** on Asana's OAuth page
4. **Select a workspace** (if you have multiple)
5. **View your tasks** tagged with "Sales Initiative"

## Asana Workspace Setup

Before using the dashboard, ensure your Asana workspace is configured:

### Option 1: Using Tags (Recommended)

1. In Asana, create a tag called **"Sales Initiative"** (exact name)
2. Tag any tasks you want to appear on the dashboard with this tag

### Option 2: Using Custom Fields

1. Create a custom field (dropdown type) in your project
2. Add an option called **"Sales Initiative"**
3. Assign this value to tasks you want to track

The dashboard will automatically detect either method.

## Key Features Explained

### Expandable Comments

- **Default View**: Shows the 3 most recent comments
- **Expand**: Click "Show X more comments" to view all comments
- **Collapse**: Click "▲ Collapse comments" to return to default view
- Comments are sorted by newest first

### Task Filtering

- **All**: Shows all tasks (completed and active)
- **Active**: Shows only incomplete tasks
- **Completed**: Shows only completed tasks

### Search

- Search across task names, assignees, descriptions, and comments
- Real-time filtering as you type

### Sorting

Click on column headers to sort by:
- **Task Name**: Alphabetical order
- **Updated Date**: Most recently updated first
- **User**: Alphabetical by assignee name

### Auto-Refresh

- Dashboard automatically refreshes every **5 minutes**
- Click the **Refresh** button in the header to manually refresh

## Project Structure

```
asana-sales-dashboard/
├── server/                      # Backend Express server
│   ├── src/
│   │   ├── routes/             # API routes (auth, tasks)
│   │   ├── services/           # Asana API service
│   │   ├── middleware/         # Auth middleware
│   │   ├── types/              # TypeScript types
│   │   ├── config.ts           # Environment config
│   │   └── index.ts            # Server entry point
│   ├── package.json
│   └── tsconfig.json
├── client/                      # React frontend
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom hooks
│   │   ├── types/              # TypeScript types
│   │   ├── utils/              # Utility functions
│   │   ├── App.tsx             # Root component
│   │   └── main.tsx            # Entry point
│   ├── package.json
│   └── vite.config.ts
├── .env.example                 # Environment template
└── README.md
```

## API Endpoints

### Authentication

- `GET /auth/asana` - Initiates OAuth flow
- `GET /auth/asana/callback` - OAuth callback handler
- `GET /auth/me` - Get current user info
- `POST /auth/logout` - Logout user
- `POST /auth/refresh` - Refresh access token

### Tasks

- `GET /api/workspaces` - Get all workspaces
- `GET /api/sales-tasks/:workspaceGid` - Get all sales initiative tasks
- `GET /api/tasks/:taskGid/comments` - Get comments for a specific task

## Troubleshooting

### "Could not find Sales Initiative tag or custom field"

**Solution**: Create a tag named "Sales Initiative" in your Asana workspace (case-insensitive)

### OAuth redirect error

**Solution**: Ensure your redirect URI in `.env` matches exactly what's configured in the Asana Developer Console

### Session issues / Can't stay logged in

**Solution**:
1. Clear browser cookies
2. Ensure `SESSION_SECRET` is set in `.env`
3. Check that cookies are enabled in your browser

### Port already in use

**Solution**:
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Tasks not showing up

**Solution**:
1. Verify tasks are tagged with "Sales Initiative" in Asana
2. Check that you selected the correct workspace
3. Click the Refresh button
4. Check browser console for errors

## Development

### Building for Production

```bash
# Build server
cd server
npm run build

# Build client
cd ../client
npm run build
```

### Running Production Build

```bash
# Start server
cd server
npm start

# Serve client build (requires a static server)
cd ../client
npm run preview
```

## Rate Limiting

- Asana API allows **1,500 requests/minute**
- Comments are fetched with a concurrency limit of 5
- Dashboard auto-refreshes every 5 minutes
- For large workspaces (100+ tasks), consider implementing server-side caching

## Security Notes

- Never commit your `.env` file
- Keep your `ASANA_CLIENT_SECRET` secure
- Use a strong `SESSION_SECRET` (32+ characters)
- In production, set `NODE_ENV=production` and use HTTPS
- Session cookies are `httpOnly` and `secure` in production

## License

MIT

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review the [Asana API Documentation](https://developers.asana.com/docs)
3. Open an issue in this repository

## Acknowledgments

Built with the Asana API and following OAuth 2.0 best practices.
