import { AsanaComment } from '../types';

export interface UpdateItem {
  date: string;
  displayDate: string;
  text: string;
}

export interface ExecutiveSummary {
  overallStatus: string;
  statusColor: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
  updates: UpdateItem[];
  lastUpdated: string;
}

/**
 * Generates an executive summary from task comments
 * Designed for CEO-level dashboard viewing
 */
export const generateExecutiveSummary = (
  comments: AsanaComment[],
  taskName: string,
  taskStatus?: string
): ExecutiveSummary => {
  // Filter comments that start with "Update:" (case-insensitive)
  const updateComments = comments.filter((comment) =>
    comment.text.trim().toLowerCase().startsWith('update:')
  );

  if (updateComments.length === 0) {
    return {
      overallStatus: 'No updates available',
      statusColor: 'gray',
      updates: [],
      lastUpdated: 'Never',
    };
  }

  // Sort comments by date (newest first)
  const sortedComments = [...updateComments].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Determine overall status
  const { status, color } = determineOverallStatus(sortedComments, taskStatus);

  // Extract updates with dates
  const updates = extractUpdates(sortedComments);

  // Get last updated date
  const lastUpdated = formatDisplayDate(sortedComments[0].created_at);

  return {
    overallStatus: status,
    statusColor: color,
    updates,
    lastUpdated,
  };
};

/**
 * Determines the overall project status based on comments
 */
const determineOverallStatus = (
  comments: AsanaComment[],
  taskStatus?: string
): { status: string; color: 'green' | 'yellow' | 'red' | 'blue' | 'gray' } => {
  const recentComments = comments.slice(0, 5).map((c) => c.text.toLowerCase()).join(' ');

  // Check for blockers/issues
  if (
    recentComments.includes('blocked') ||
    recentComments.includes('blocker') ||
    recentComments.includes('critical issue') ||
    recentComments.includes('urgent') ||
    recentComments.includes('problem')
  ) {
    return { status: 'Blocked - Requires Attention', color: 'red' };
  }

  // Check for completion
  if (
    recentComments.includes('completed') ||
    recentComments.includes('done') ||
    recentComments.includes('delivered') ||
    recentComments.includes('shipped') ||
    taskStatus?.toLowerCase().includes('completed')
  ) {
    return { status: 'Completed', color: 'blue' };
  }

  // Check for delays/risks
  if (
    recentComments.includes('delayed') ||
    recentComments.includes('behind') ||
    recentComments.includes('risk') ||
    recentComments.includes('concern') ||
    recentComments.includes('waiting')
  ) {
    return { status: 'At Risk - Needs Review', color: 'yellow' };
  }

  // Check for active progress
  if (
    recentComments.includes('in progress') ||
    recentComments.includes('working on') ||
    recentComments.includes('started') ||
    recentComments.includes('progressing') ||
    taskStatus?.toLowerCase().includes('in progress') ||
    taskStatus?.toLowerCase().includes('delivery')
  ) {
    return { status: 'On Track', color: 'green' };
  }

  // Default
  return { status: 'Status Unknown', color: 'gray' };
};

/**
 * Extracts updates from comments and removes "Update:" prefix
 */
const extractUpdates = (comments: AsanaComment[]): UpdateItem[] => {
  return comments.map((comment) => {
    // Remove "Update:" prefix (case-insensitive)
    const text = comment.text.replace(/^update:\s*/i, '').trim();

    return {
      date: new Date(comment.created_at).toISOString().split('T')[0],
      displayDate: formatDisplayDate(comment.created_at),
      text,
    };
  });
};

/**
 * Formats a date string into actual date format
 */
const formatDisplayDate = (dateStr: string): string => {
  const date = new Date(dateStr);

  // Format as "Mar 7, 2024"
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
