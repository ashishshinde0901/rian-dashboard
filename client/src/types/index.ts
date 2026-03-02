export interface AsanaUser {
  gid: string;
  name: string;
  email?: string;
  role?: 'super_admin' | 'sales_head' | 'delivery_head' | 'tech_head' | 'product_head' | 'user';
}

export interface AsanaComment {
  gid: string;
  text: string;
  created_by: {
    gid: string;
    name: string;
  };
  created_at: string;
  type: 'comment' | 'system';
}

export interface SalesTask {
  gid: string;
  name: string;
  updated_date: string;
  user: string;
  user_avatar?: string;
  description: string;
  completed: boolean;
  comments: AsanaComment[];
  total_comments: number;
  permalink_url?: string;
  task_status?: string;
}

export interface DashboardResponse {
  tasks: SalesTask[];
  total_tasks: number;
  last_fetched: string;
  workspace_name: string;
}
