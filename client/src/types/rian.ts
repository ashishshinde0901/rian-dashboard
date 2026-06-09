// Type definitions for the Rian Ops Dashboard (Media.Rian project)

export type FlagColor = 'red' | 'amber' | 'green';

export type InitiativeType =
  | 'International BD'
  | 'India BD'
  | 'Media Sales & Delivery'
  | 'Technology & Product';

export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

export interface Comment {
  gid: string;
  author: string;
  text: string;
  ago: string;
  created_at: string;
  source: 'asana' | 'dashboard';
  sync?: 'syncing' | 'posted' | 'failed';
}

export interface Initiative {
  id: string;
  gid: string;
  type: InitiativeType;
  name: string;
  desc: string;
  client: string;
  deliveryStatus: string;
  region: string;
  priority: Priority;
  overall: FlagColor; // Flag field from Asana
  owner: string;
  due: string; // Committed Delivery Date
  valueL: number | null; // Expected Value (₹L)
  conv: string; // Conversion time estimation
  asanaGid: string;
  permalink_url?: string;
  comments: Comment[];
}

export interface TabConfig {
  key: InitiativeType;
  short: string;
  blurb: string;
}

export interface DashboardData {
  initiatives: Initiative[];
  tabs: TabConfig[];
  totalTasks: number;
  lastFetched: string;
}

export interface FLAG_CONFIG {
  color: string;
  bg: string;
  label: string;
  word: string;
}

export interface DELIVERY_STATUS_CONFIG {
  flag: FlagColor;
  color: string;
  bg: string;
}
