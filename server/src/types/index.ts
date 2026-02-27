export interface AsanaUser {
  gid: string;
  name: string;
  email?: string;
}

export interface AsanaComment {
  gid: string;
  text: string;
  created_by: {
    gid: string;
    name: string;
  };
  created_at: string; // ISO date string
  type: 'comment' | 'system';
}

export interface SalesTask {
  gid: string;
  name: string;
  updated_date: string;          // ISO date — task's modified_at
  user: string;                  // assignee name
  user_avatar?: string;          // assignee photo URL (optional)
  description: string;           // task notes/description
  completed: boolean;
  comments: AsanaComment[];      // ALL comments, sorted newest first
  total_comments: number;        // total count
  permalink_url?: string;        // direct link to task in Asana
  task_status?: string;          // Task Status custom field value
}

export interface DashboardResponse {
  tasks: SalesTask[];
  total_tasks: number;
  last_fetched: string;          // ISO date of when data was pulled
  workspace_name: string;
}

// Session data structure
declare module 'express-session' {
  interface SessionData {
    asana?: {
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
      user: AsanaUser;
    };
    oauthState?: string;
  }
}
