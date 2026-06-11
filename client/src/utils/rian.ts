import { FlagColor, InitiativeType } from '../types/rian';

// Avatar color palette (warm tones)
const AV_COLORS = [
  '#B06A3F', '#A8527E', '#5C8A47', '#C98A1E', '#6B6FB0',
  '#4F8FA8', '#BD4A2B', '#7A8A3F', '#A8627A', '#3F8A7C',
];

// Deterministic avatar color from name
export function avColor(name: string): string {
  if (!name) return AV_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % 997;
  }
  return AV_COLORS[hash % AV_COLORS.length];
}

// Get initials from name
export function initials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

// Get first name
export function firstName(name: string): string {
  return (name || '').split(/\s+/)[0];
}

// Format date (e.g., "15 Jun")
export function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// Format value in Lakhs
export function fmtValueL(value: number | null): string {
  if (value == null) return '—';
  return '₹' + value.toLocaleString('en-IN') + ' L';
}

// Days until date
export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (isNaN(date.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - now.getTime()) / 86400000);
}

// Flag configuration
export const FLAG: Record<FlagColor, { color: string; bg: string; label: string; word: string }> = {
  red: { color: 'var(--red)', bg: 'var(--red-bg)', label: 'Blocked', word: 'Red' },
  amber: { color: 'var(--amber)', bg: 'var(--amber-bg)', label: 'At Risk', word: 'Yellow' },
  green: { color: 'var(--green)', bg: 'var(--green-bg)', label: 'On Track', word: 'Green' },
};

export const FLAG_ORDER: FlagColor[] = ['red', 'amber', 'green'];

// Delivery status configuration
export const DELIVERY_STATUS: Record<string, { flag: FlagColor; color: string; bg: string }> = {
  'On Time': { flag: 'green', color: 'var(--green)', bg: 'var(--green-bg)' },
  'Slightly Delayed': { flag: 'amber', color: 'var(--amber)', bg: 'var(--amber-bg)' },
  'Delayed': { flag: 'red', color: 'var(--red)', bg: 'var(--red-bg)' },
  'Not Started': { flag: 'amber', color: 'var(--ink-3)', bg: 'var(--bg-2)' },
};

// Priority labels
export const PRIORITY_LABEL: Record<string, string> = {
  P0: 'P0 – Critical',
  P1: 'P1 – High',
  P2: 'P2 – Medium',
  P3: 'P3 – Low',
};

// Tab configuration
export const TABS: Array<{
  key: InitiativeType;
  short: string;
  blurb: string;
}> = [
  { key: 'International BD', short: 'International BD', blurb: 'Cross-border studio & platform deals' },
  { key: 'India BD', short: 'India BD', blurb: 'Domestic OTT & broadcast pipeline' },
  { key: 'Media Sales & Delivery', short: 'Media Sales', blurb: 'Reel delivery, licensing & QC' },
  { key: 'Technology & Product', short: 'Tech & Product', blurb: 'Dubbing engine, tooling & infra' },
];

// Column metadata for table
export interface ColumnMeta {
  label: string;
  w: string;
  center?: boolean;
}

export const COL_META: Record<string, ColumnMeta> = {
  init: { label: 'Initiative', w: 'minmax(0,1fr)' },
  conversion: { label: 'Conversion', w: 'minmax(60px,0.5fr)' },
  delivery: { label: 'Delivery', w: 'minmax(60px,0.5fr)' },
  region: { label: 'Region', w: 'minmax(50px,0.35fr)' },
  client: { label: 'Client', w: 'minmax(60px,0.4fr)' },
  assignee: { label: 'Assignee', w: '40px', center: true },
  committed: { label: 'Committed', w: 'minmax(55px,0.45fr)' },
  deadline: { label: 'Deadline', w: 'minmax(55px,0.45fr)' },
  prio: { label: 'Prio', w: '38px', center: true },
  aiSummary: { label: 'Summary', w: 'minmax(0,1.2fr)' },
  commentsList: { label: 'Comments', w: 'minmax(0,2.4fr)' },
};

// Get column layout for tab type
export function layoutFor(type: InitiativeType): string[] {
  if (type === 'Technology & Product') return ['init', 'assignee', 'deadline', 'prio', 'aiSummary', 'commentsList'];
  if (type === 'Media Sales & Delivery') return ['init', 'committed', 'delivery', 'client', 'assignee', 'prio', 'aiSummary', 'commentsList'];
  if (type === 'India BD') return ['init', 'conversion', 'client', 'assignee', 'prio', 'aiSummary', 'commentsList'];
  return ['init', 'conversion', 'region', 'client', 'assignee', 'prio', 'aiSummary', 'commentsList']; // International BD
}

// Generate grid template from layout
export function gridTemplateFor(layout: string[]): string {
  const columns = layout.map(k => COL_META[k].w);
  // Add 4px for flagbar, then all columns
  return `4px ${columns.join(' ')}`;
}
