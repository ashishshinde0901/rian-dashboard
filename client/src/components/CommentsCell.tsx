import { useMemo } from 'react';
import ExecutiveSummaryCard from './ExecutiveSummaryCard';
import { AsanaComment } from '../types';
import { generateExecutiveSummary } from '../utils/executiveSummary';

interface Props {
  comments: AsanaComment[];
  totalComments: number;
  taskUrl?: string;
  taskName?: string;
  taskStatus?: string;
}

const CommentsCell = ({ comments, totalComments, taskUrl, taskName = '', taskStatus }: Props) => {
  // Generate executive summary
  const executiveSummary = useMemo(
    () => generateExecutiveSummary(comments, taskName, taskStatus),
    [comments, taskName, taskStatus]
  );

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

  return <ExecutiveSummaryCard summary={executiveSummary} />;
};

export default CommentsCell;
