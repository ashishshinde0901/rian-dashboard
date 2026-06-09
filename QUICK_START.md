# Rian Ops Dashboard - Quick Start Guide

## ✅ What's Already Done

### Server (100% Complete)
- ✅ **API Routes** - `/api/media-rian/initiatives`, `/initiatives/:id`, `/chat`
- ✅ **OpenRouter Integration** - AI chat with fallback to pattern matching
- ✅ **Real Data** - Connected to Media.Rian project (GID: 1215471459454088)

### Client Foundation (100% Complete)
- ✅ **Design System** - Complete CSS in `client/src/index.css`
- ✅ **Types** - All TypeScript interfaces in `client/src/types/rian.ts`
- ✅ **Utilities** - Helper functions in `client/src/utils/rian.ts`
- ✅ **Icons** - Icon component in `client/src/components/rian/ui/Icons.tsx`

## 🚀 How to Complete the Implementation

### Step 1: Copy Design Components

The fastest way to complete this is to **adapt the design prototype** from:
```
/Users/manishshinde/Downloads/asana-dashboard-media/project/
```

These files have ALL the component logic you need:
- `app.jsx` → `RianDashboard.tsx`
- `table.jsx` → `Table.tsx`
- `drawer.jsx` → `Drawer.tsx`
- `chat.jsx` → `ChatPanel.tsx`
- `ui.jsx` → UI components

### Step 2: Component Conversion Pattern

**From Design Prototype (React.createElement):**
```javascript
// Design file
React.createElement("div", { className: "nav" },
  React.createElement("div", { className: "brand" }, "RIAN Ops")
)
```

**To TypeScript/JSX:**
```typescript
// Your file
function NavBar() {
  return (
    <div className="nav">
      <div className="brand">RIAN <em>Ops</em></div>
    </div>
  );
}
```

### Step 3: Connect to Real API

**Replace mock data with API calls:**

```typescript
// Design uses window.RIAN.DATA
const DATA = window.RIAN.DATA;

// Your code fetches real data
const [data, setData] = useState<Initiative[]>([]);

useEffect(() => {
  fetch('/api/media-rian/initiatives', { credentials: 'include' })
    .then(r => r.json())
    .then(d => setData(d.initiatives));
}, []);
```

## 📁 Components to Create

Create these files based on the design prototypes:

```
client/src/components/rian/
├── RianDashboard.tsx       (from app.jsx)
├── NavBar.tsx             (from ui.jsx + app.jsx)
├── Table.tsx              (from table.jsx)
├── Drawer.tsx             (from drawer.jsx)
├── ChatPanel.tsx          (from chat.jsx)
└── ui/
    ├── Icons.tsx          (✅ Done)
    ├── Avatar.tsx         (from ui.jsx)
    └── StatusBadge.tsx    (from ui.jsx)
```

## 🎯 Minimal Working Version

If you want to start simple:

### 1. Create Basic RianDashboard

```typescript
// client/src/components/rian/RianDashboard.tsx
import { useState, useEffect } from 'react';
import { Initiative } from '../../types/rian';

export default function RianDashboard() {
  const [data, setData] = useState<Initiative[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/media-rian/initiatives', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setData(d.initiatives || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="app"><div style={{ padding: 40 }}>Loading...</div></div>;

  return (
    <div className="app">
      <div className="nav">
        <div className="brand">
          <div className="brand-mark">
            <i></i><i></i><i></i>
          </div>
          <div className="brand-name">RIAN <em>Ops</em></div>
        </div>
      </div>

      <div className="content">
        <div className="content-inner">
          <div className="page-head">
            <h1 className="page-title">Initiative <em>tracker</em></h1>
          </div>

          <div style={{ background: 'var(--surface)', padding: 20, borderRadius: 'var(--r-lg)' }}>
            <h2>Media.Rian Initiatives ({data.length})</h2>
            {data.map(initiative => (
              <div key={initiative.id} style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>
                <strong>{initiative.name}</strong> - {initiative.type}
                <br />
                <small>Status: {initiative.overall} | Owner: {initiative.owner}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 2. Update App.tsx

```typescript
// client/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './components/LoginPage';
import RianDashboard from './components/rian/RianDashboard';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const { authenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={authenticated ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/" element={authenticated ? <RianDashboard /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

### 3. Test It Works

```bash
# Start backend
cd server && npm run dev

# Start frontend (in another terminal)
cd client && npm run dev

# Open http://localhost:5173
# Login with Asana
# Should see your Media.Rian initiatives!
```

## 🎨 Then Add Design

Once the basic version works with real data, copy component logic from the design files to add:
- Beautiful table with columns
- Drawer that slides in
- Tab navigation
- AI chat
- All the styling is already in index.css!

## 🌐 Environment Variables

### Production - Railway (Backend)

```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-app.vercel.app
SESSION_SECRET=<generate-random-secret>
ASANA_CLIENT_ID=<from-asana-developer-console>
ASANA_CLIENT_SECRET=<from-asana-developer-console>
ASANA_REDIRECT_URI=https://your-api.railway.app/auth/asana/callback
ASANA_ACCESS_TOKEN=<your-asana-personal-access-token>
OPENROUTER_API_KEY=<your-openrouter-key>
MEDIA_RIAN_PROJECT_GID=1215471459454088
WORKSPACE_GID=1200057218350324
```

### Production - Vercel (Frontend)

```env
VITE_API_URL=https://your-api.railway.app
```

## 📝 Deploy to Production

```bash
# Commit everything
git add .
git commit -m "Add Rian Ops Dashboard with Media.Rian integration"
git push origin main

# Railway and Vercel will auto-deploy
# Just add the environment variables in their dashboards
```

## 💡 Pro Tips

1. **Start minimal** - Get data showing first, then add features
2. **Use the CSS** - All classes are ready, just use them
3. **Copy the design** - The prototype has all the logic you need
4. **Test locally first** - Make sure it works before deploying
5. **Add features incrementally** - Table → Drawer → Chat

## 🔗 Reference Files

- Design prototype: `/Users/manishshinde/Downloads/asana-dashboard-media/project/`
- Full guide: `TRANSFORMATION_GUIDE.md`
- Implementation status: `IMPLEMENTATION_STATUS.md`
- This file: `QUICK_START.md`

## ❓ Need Help?

If you get stuck on any component, refer to the corresponding file in the design prototype. The logic is all there, just needs to be converted from `React.createElement` to JSX and connected to your API!

Good luck! 🚀
