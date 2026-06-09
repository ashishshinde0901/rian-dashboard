# Rian Ops Dashboard - Complete Transformation Guide

## Overview
This document outlines the complete transformation from your current multi-dashboard Asana interface to a unified Rian Ops Dashboard based on the design specification.

## What We Discovered

### Media.Rian Project Details
- **Project GID**: `1215471459454088`
- **Workspace GID**: `1200057218350324`

### Field Mapping (Asana → Design)
Your Asana project already has perfectly matching custom fields:

| Design Field | Asana Field | Field Name | Type |
|--------------|-------------|------------|------|
| Initiative Type (tabs) | Initiative Type | Custom field with options | enum |
| Flag (health) | Flag | Red/Amber/Green | enum |
| Delivery Status | Delivery Status | Delayed/On Time/etc | enum |
| Priority | Priority | P0/P1/P2/P3 | enum |
| Region | Region | India/Korea/MENA/etc | text |
| Client | Client | Client name | text |
| Expected Value | Expected Value (₹L) | Deal value in Lakhs | number |
| Conversion Time | Conversion time estimation | 3/6/12 Months | text |
| Committed Date | Commited Delivery Date | Delivery date | date |
| Description | Short Description | Task description | text |

## Architecture Changes

### Before (Current)
```
App.tsx
├── MediaSalesDashboard
├── MediaDeliveryDashboard
├── CorporateSalesDashboard
└── CorporateDeliveryDashboard
```

### After (New)
```
App.tsx
└── RianDashboard (unified)
    ├── NavBar (with tabs)
    ├── Table (dynamic columns per tab)
    ├── Drawer (slides in from right)
    └── ChatPanel (AI insights)
```

## Implementation Steps

### Phase 1: Server-Side (API Routes)

#### 1. Create New Route `/api/media-rian`
```typescript
// server/src/routes/mediaRian.ts
import { Router } from 'express';
import { AsanaService } from '../services/asana.js';

const router = Router();
const MEDIA_RIAN_PROJECT_GID = '1215471459454088';

router.get('/initiatives', async (req, res) => {
  try {
    const accessToken = req.session.asanaAccessToken;
    const asana = new AsanaService(accessToken);

    // Fetch all tasks from Media.Rian project
    const tasks = await asana.getProjectTasks(MEDIA_RIAN_PROJECT_GID);

    // Transform to Initiative format
    const initiatives = tasks.map(transformTaskToInitiative);

    res.json({ initiatives, lastFetched: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function transformTaskToInitiative(task) {
  // Extract custom fields
  const getCustomField = (name) => {
    const field = task.custom_fields?.find(f =>
      f.name?.toLowerCase() === name.toLowerCase()
    );
    return field?.enum_value?.name || field?.text_value || field?.number_value || null;
  };

  return {
    id: task.gid,
    gid: task.gid,
    name: task.name,
    desc: getCustomField('Short Description') || task.notes || '',
    type: getCustomField('Initiative Type') || 'India BD',
    overall: mapFlagToColor(getCustomField('Flag')),
    deliveryStatus: getCustomField('Delivery Status') || '',
    priority: mapPriority(getCustomField('Priority')),
    region: getCustomField('Region') || '',
    client: getCustomField('Client') || '',
    valueL: getCustomField('Expected Value (₹L)'),
    conv: getCustomField('Conversion time estimation') || '',
    due: getCustomField('Commited Delivery Date') || '',
    owner: task.assignee?.name || 'Unassigned',
    permalink_url: task.permalink_url,
    comments: [] // Fetch separately
  };
}

function mapFlagToColor(flag) {
  if (!flag) return 'amber';
  const lower = flag.toLowerCase();
  if (lower.includes('red') || lower.includes('block')) return 'red';
  if (lower.includes('green') || lower.includes('track')) return 'green';
  return 'amber';
}

function mapPriority(priority) {
  if (!priority) return 'P2';
  if (priority.includes('Critical') || priority.includes('P0')) return 'P0';
  if (priority.includes('High') || priority.includes('P1')) return 'P1';
  if (priority.includes('Medium') || priority.includes('P2')) return 'P2';
  return 'P3';
}
```

#### 2. Add Route to Server
```typescript
// server/src/index.ts
import mediaRianRoutes from './routes/mediaRian.js';
app.use('/api/media-rian', requireAuth, mediaRianRoutes);
```

### Phase 2: Client-Side Components

#### Component Structure
```
client/src/components/rian/
├── RianDashboard.tsx      # Main container
├── NavBar.tsx             # Top navigation with tabs
├── Table/
│   ├── Table.tsx          # Main table component
│   ├── TableHeader.tsx    # Column headers
│   ├── TableRow.tsx       # Individual row
│   └── TableToolbar.tsx   # Filters and search
├── Drawer/
│   ├── Drawer.tsx         # Side panel container
│   ├── Overview.tsx       # Overview tab
│   ├── Activity.tsx       # Comments/activity tab
│   └── AISummary.tsx      # AI-generated summary
├── Chat/
│   ├── ChatPanel.tsx      # AI chat interface
│   └── ChatBubble.tsx     # Message bubbles
└── ui/
    ├── Icon.tsx           # SVG icons
    ├── Avatar.tsx         # User avatars
    └── StatusBadge.tsx    # Status indicators
```

### Phase 3: Key Implementation Details

#### Tab Configuration
```typescript
const TABS: TabConfig[] = [
  {
    key: "International BD",
    short: "International BD",
    blurb: "Cross-border studio & platform deals"
  },
  {
    key: "India BD",
    short: "India BD",
    blurb: "Domestic OTT & broadcast pipeline"
  },
  {
    key: "Media Sales & Delivery",
    short: "Media Sales",
    blurb: "Reel delivery, licensing & QC"
  },
  {
    key: "Technology & Product",
    short: "Tech & Product",
    blurb: "Dubbing engine, tooling & infra"
  }
];
```

#### Dynamic Table Columns
```typescript
// Different columns per tab type
function getColumnsForTab(type: InitiativeType) {
  const baseColumns = ['init', 'assignee', 'prio', 'comments'];

  switch (type) {
    case 'Technology & Product':
      return ['init', 'assignee', 'deadline', 'prio', 'comments'];
    case 'Media Sales & Delivery':
      return ['init', 'committed', 'delivery', 'client', 'assignee', 'prio', 'comments'];
    case 'India BD':
      return ['init', 'conversion', 'client', 'assignee', 'prio', 'comments'];
    case 'International BD':
      return ['init', 'conversion', 'region', 'client', 'assignee', 'prio', 'comments'];
  }
}
```

#### State Management
```typescript
// RianDashboard.tsx
const [data, setData] = useState<Initiative[]>([]);
const [tab, setTab] = useState<InitiativeType>(TABS[0].key);
const [selectedId, setSelectedId] = useState<string | null>(null);
const [drawerTab, setDrawerTab] = useState<'overview' | 'activity'>('overview');
const [chatOpen, setChatOpen] = useState(false);
const [statFilter, setStatFilter] = useState<'all' | FlagColor>('all');
const [query, setQuery] = useState('');
```

## Design System

### Colors
- **Background**: `#F3F0E9` (warm cream)
- **Surface**: `#FFFFFF` (white cards)
- **Rust (brand)**: `#BD4A2B`
- **Red (blocked)**: `#C23B2C`
- **Amber (at-risk)**: `#C98A1E`
- **Green (on-track)**: `#5C8A47`

### Typography
- **Serif**: "Newsreader" (for titles, italics)
- **Sans**: "Hanken Grotesk" (body text)
- **Mono**: "IBM Plex Mono" (labels, data)

### Key Styles
- Warm color palette throughout
- Rounded corners (6px-18px)
- Soft shadows
- Smooth animations
- Custom scrollbars

## Next Steps

1. **Create server API route** for Media.Rian (`/api/media-rian/initiatives`)
2. **Build utility functions** for data transformation
3. **Create RianDashboard** component structure
4. **Implement NavBar** with tabs and navigation
5. **Build Table** with dynamic columns
6. **Create Drawer** with overview/activity tabs
7. **Add ChatPanel** for AI insights
8. **Update App.tsx** routing
9. **Test end-to-end** functionality

## File Checklist

### Created
- ✅ `client/src/index.css` - Complete design system
- ✅ `client/src/types/rian.ts` - Type definitions
- ✅ `TRANSFORMATION_GUIDE.md` - This guide

### To Create
- ⏳ `server/src/routes/mediaRian.ts` - API routes
- ⏳ `client/src/components/rian/RianDashboard.tsx` - Main component
- ⏳ `client/src/components/rian/NavBar.tsx` - Navigation
- ⏳ `client/src/components/rian/Table.tsx` - Table component
- ⏳ `client/src/components/rian/Drawer.tsx` - Detail drawer
- ⏳ `client/src/components/rian/ChatPanel.tsx` - AI chat
- ⏳ `client/src/utils/rian.ts` - Helper functions

### To Update
- ⏳ `client/src/App.tsx` - Update routing
- ⏳ `server/src/index.ts` - Add new routes

## Notes

- All custom fields from your Asana project map perfectly to the design
- The design uses mock data, but your real Asana data will work great
- Flag colors (Red/Amber/Green) map directly to health status
- Initiative Types become your dashboard tabs
- Comments from Asana feed into the Activity tab
- AI insights are mock responses (can be enhanced with real AI later)

## Reference

- Design source: `/Users/manishshinde/Downloads/asana-dashboard-media/project/`
- Media.Rian project GID: `1215471459454088`
- Workspace GID: `1200057218350324`
