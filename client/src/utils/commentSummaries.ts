import { AsanaComment } from '../types';

export interface DailyCommentSummary {
  date: string; // YYYY-MM-DD format
  displayDate: string; // Human-readable format
  comments: AsanaComment[];
  summary: string;
}

/**
 * Groups comments by date and creates a summary for each day
 */
export const groupCommentsByDate = (comments: AsanaComment[]): DailyCommentSummary[] => {
  // Group comments by date
  const commentsByDate = new Map<string, AsanaComment[]>();

  comments.forEach((comment) => {
    const date = new Date(comment.created_at);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

    if (!commentsByDate.has(dateKey)) {
      commentsByDate.set(dateKey, []);
    }
    commentsByDate.get(dateKey)!.push(comment);
  });

  // Create summaries for each date
  const summaries: DailyCommentSummary[] = [];

  commentsByDate.forEach((dayComments, dateKey) => {
    const displayDate = formatDisplayDate(dateKey);
    const summary = generateDailySummary(dayComments);

    summaries.push({
      date: dateKey,
      displayDate,
      comments: dayComments,
      summary,
    });
  });

  // Sort by date descending (most recent first)
  summaries.sort((a, b) => b.date.localeCompare(a.date));

  return summaries;
};

/**
 * Formats a date string (YYYY-MM-DD) into a human-readable format
 */
const formatDisplayDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Reset time parts for comparison
  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  if (date.getTime() === today.getTime()) {
    return 'Today';
  } else if (date.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    // Format as "Jan 15, 2024"
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
};

/**
 * Generates a summary of all comments for a specific day
 */
const generateDailySummary = (comments: AsanaComment[]): string => {
  if (comments.length === 0) {
    return 'No updates';
  }

  // Get unique contributors
  const contributors = new Set<string>();
  comments.forEach((comment) => {
    if (comment.created_by?.name) {
      contributors.add(comment.created_by.name);
    }
  });

  // Combine all comment texts
  const allText = comments.map((c) => c.text).join(' ');

  // Generate summary based on number of comments
  if (comments.length === 1) {
    const comment = comments[0];
    const author = comment.created_by?.name || 'Unknown';

    // If comment is short enough, use it directly
    if (comment.text.length <= 150) {
      return `${author}: ${comment.text}`;
    }

    // Otherwise, truncate
    return `${author}: ${comment.text.substring(0, 147)}...`;
  }

  // Multiple comments - create a concise summary
  const contributorList = Array.from(contributors).join(', ');
  const commentCount = comments.length;

  // Try to extract key information from comments
  const summary = extractKeySummary(allText, contributorList, commentCount);

  return summary;
};

/**
 * Extracts key information from multiple comments to create a summary
 */
const extractKeySummary = (
  allText: string,
  contributors: string,
  commentCount: number
): string => {
  const text = allText.toLowerCase();

  // Keywords that indicate specific types of updates
  const statusKeywords = {
    completed: ['completed', 'done', 'finished', 'shipped', 'deployed'],
    blocked: ['blocked', 'blocker', 'stuck', 'issue', 'problem'],
    progress: ['working on', 'in progress', 'started', 'continuing'],
    review: ['review', 'feedback', 'comments', 'suggestions'],
    meeting: ['meeting', 'discussion', 'call', 'sync'],
    planning: ['planning', 'plan', 'will', 'going to', 'next steps'],
  };

  // Check which categories apply
  const matchedCategories: string[] = [];

  Object.entries(statusKeywords).forEach(([category, keywords]) => {
    if (keywords.some((keyword) => text.includes(keyword))) {
      matchedCategories.push(category);
    }
  });

  // Build summary based on matched categories
  if (matchedCategories.length > 0) {
    const categoryText = matchedCategories
      .map((cat) => {
        switch (cat) {
          case 'completed':
            return 'work completed';
          case 'blocked':
            return 'blockers discussed';
          case 'progress':
            return 'progress updates';
          case 'review':
            return 'review feedback';
          case 'meeting':
            return 'meeting notes';
          case 'planning':
            return 'planning discussion';
          default:
            return 'updates';
        }
      })
      .join(', ');

    return `${commentCount} update${commentCount > 1 ? 's' : ''} from ${contributors}: ${categoryText}`;
  }

  // Default summary
  return `${commentCount} update${commentCount > 1 ? 's' : ''} from ${contributors}`;
};
