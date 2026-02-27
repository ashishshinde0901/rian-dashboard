import { useState } from 'react';
import CommentItem from './CommentItem';
import { AsanaComment } from '../types';

interface Props {
  comments: AsanaComment[];
  totalComments: number;
  taskUrl?: string;
}

const VISIBLE_COUNT = 1;

const CommentsCell = ({ comments, totalComments, taskUrl }: Props) => {
  const [expanded, setExpanded] = useState(false);

  const visibleComments = expanded ? comments : comments.slice(0, VISIBLE_COUNT);
  const hiddenCount = totalComments - VISIBLE_COUNT;
  const hasMore = hiddenCount > 0;

  const handleAddComment = () => {
    if (taskUrl) {
      window.open(taskUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (comments.length === 0) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400 italic">No comments yet</span>
        <button
          onClick={handleAddComment}
          className="ml-2 w-6 h-6 flex items-center justify-center rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors"
          title="Add comment in Asana"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="6" y1="1" x2="6" y2="11" />
            <line x1="1" y1="6" x2="11" y2="6" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
          Updates ({totalComments})
        </span>
        <button
          onClick={handleAddComment}
          className="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors"
          title="Add comment in Asana"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="6" y1="1" x2="6" y2="11" />
            <line x1="1" y1="6" x2="11" y2="6" />
          </svg>
        </button>
      </div>

      <div className="space-y-2">
        {visibleComments.map((comment) => (
          <CommentItem key={comment.gid} comment={comment} />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 w-full text-center py-2 px-3 rounded-lg text-sm font-medium transition-colors
                     bg-gray-50 hover:bg-gray-100 text-indigo-600 hover:text-indigo-700
                     border border-gray-200 hover:border-gray-300"
        >
          {expanded
            ? '▲ Collapse comments'
            : `▼ Show ${hiddenCount} more comment${hiddenCount > 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  );
};

export default CommentsCell;
