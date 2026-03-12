import { AsanaComment } from '../types';

export interface TimelineEvent {
  date: string;
  displayDate: string;
  summary: string;
}

export interface ExecutiveSummary {
  overallStatus: string;
  statusColor: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
  keyHighlights: string[];
  timeline: TimelineEvent[];
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
  if (comments.length === 0) {
    return {
      overallStatus: 'No updates available',
      statusColor: 'gray',
      keyHighlights: [],
      timeline: [],
      lastUpdated: 'Never',
    };
  }

  // Sort comments by date (newest first)
  const sortedComments = [...comments].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Determine overall status
  const { status, color } = determineOverallStatus(sortedComments, taskStatus);

  // Extract key highlights
  const highlights = extractKeyHighlights(sortedComments, taskName);

  // Create timeline of important events
  const timeline = createTimeline(sortedComments);

  // Get last updated date
  const lastUpdated = formatDisplayDate(sortedComments[0].created_at);

  return {
    overallStatus: status,
    statusColor: color,
    keyHighlights: highlights,
    timeline,
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
 * Extracts 2-3 key highlights from comments
 */
const extractKeyHighlights = (comments: AsanaComment[], taskName: string): string[] => {
  const highlights: string[] = [];

  // Combine recent comments
  const recentComments = comments.slice(0, 10);
  const allText = recentComments.map((c) => c.text).join(' ').toLowerCase();

  // Check for completion milestones
  const completionMatch = allText.match(
    /(completed|finished|delivered|shipped|deployed)\s+([^.!?]{10,60})/i
  );
  if (completionMatch) {
    highlights.push(`✓ ${completionMatch[0].trim()}`);
  }

  // Check for blockers
  const blockerMatch = allText.match(/(blocked|blocker|issue|problem):\s*([^.!?]{10,80})/i);
  if (blockerMatch) {
    highlights.push(`⚠ ${blockerMatch[2].trim()}`);
  }

  // Check for next steps
  const nextStepsMatch = allText.match(/(next steps?|planning to|will):\s*([^.!?]{10,80})/i);
  if (nextStepsMatch) {
    highlights.push(`→ ${nextStepsMatch[2].trim()}`);
  }

  // If no specific highlights found, use most recent significant comment
  if (highlights.length === 0 && comments.length > 0) {
    const recentComment = comments[0].text;
    if (recentComment.length > 20) {
      const truncated = recentComment.length > 100
        ? recentComment.substring(0, 97) + '...'
        : recentComment;
      highlights.push(truncated);
    }
  }

  return highlights.slice(0, 3);
};

/**
 * Creates a timeline of important events grouped by date
 */
const createTimeline = (comments: AsanaComment[]): TimelineEvent[] => {
  // Group comments by date
  const commentsByDate = new Map<string, AsanaComment[]>();

  comments.forEach((comment) => {
    const dateKey = new Date(comment.created_at).toISOString().split('T')[0];
    if (!commentsByDate.has(dateKey)) {
      commentsByDate.set(dateKey, []);
    }
    commentsByDate.get(dateKey)!.push(comment);
  });

  // Create timeline events (max 5 most recent days)
  const timeline: TimelineEvent[] = [];
  const sortedDates = Array.from(commentsByDate.keys()).sort().reverse();

  sortedDates.slice(0, 5).forEach((dateKey) => {
    const dayComments = commentsByDate.get(dateKey)!;
    const summary = generateDaySnapshot(dayComments);

    timeline.push({
      date: dateKey,
      displayDate: formatDisplayDate(dateKey),
      summary,
    });
  });

  return timeline;
};

/**
 * Generates a single-line snapshot for a specific day
 */
const generateDaySnapshot = (comments: AsanaComment[]): string => {
  if (comments.length === 0) return 'No activity';

  const contributors = Array.from(
    new Set(comments.map((c) => c.created_by?.name).filter(Boolean))
  );
  const allText = comments.map((c) => c.text).join(' ').toLowerCase();

  // Detect key activities
  const activities: string[] = [];

  if (allText.includes('completed') || allText.includes('done')) {
    activities.push('milestone completed');
  }
  if (allText.includes('blocked') || allText.includes('issue')) {
    activities.push('blocker identified');
  }
  if (allText.includes('meeting') || allText.includes('discussed')) {
    activities.push('team sync');
  }
  if (allText.includes('deployed') || allText.includes('shipped')) {
    activities.push('deployment');
  }
  if (allText.includes('review') || allText.includes('feedback')) {
    activities.push('review session');
  }
  if (allText.includes('started') || allText.includes('began')) {
    activities.push('work initiated');
  }

  // Build snapshot
  if (activities.length > 0) {
    const activityText = activities.slice(0, 2).join(', ');
    return `${contributors.join(', ')}: ${activityText}`;
  }

  // Fallback: extract first meaningful sentence
  const firstComment = comments[0].text;
  const firstSentence = firstComment.split(/[.!?]/)[0].trim();

  if (firstSentence.length > 0 && firstSentence.length <= 80) {
    return `${contributors[0]}: ${firstSentence}`;
  }

  return `${contributors.join(', ')}: ${comments.length} update${comments.length > 1 ? 's' : ''}`;
};

/**
 * Formats a date string into a human-readable format
 */
const formatDisplayDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Reset time parts for comparison
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return 'Today';
  } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return 'Yesterday';
  } else {
    // Format as "Mar 7"
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
};
