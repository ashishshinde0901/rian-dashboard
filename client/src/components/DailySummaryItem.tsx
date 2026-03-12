import { useState } from 'react';
import { DailyCommentSummary } from '../utils/commentSummaries';
import CommentItem from './CommentItem';

interface Props {
  dailySummary: DailyCommentSummary;
}

const DailySummaryItem = ({ dailySummary }: Props) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Summary Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-2.5 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">
              {dailySummary.displayDate}
            </span>
            <span className="text-xs text-gray-500">
              ({dailySummary.comments.length} comment{dailySummary.comments.length !== 1 ? 's' : ''})
            </span>
          </div>
          {dailySummary.comments.length > 1 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              {expanded ? '▲ Hide details' : '▼ Show details'}
            </button>
          )}
        </div>
      </div>

      {/* Summary Text */}
      <div className="px-4 py-3 bg-white">
        <p className="text-sm text-gray-700 leading-relaxed">
          {dailySummary.summary}
        </p>
      </div>

      {/* Expanded Individual Comments */}
      {expanded && dailySummary.comments.length > 1 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Individual Comments:
          </div>
          {dailySummary.comments.map((comment) => (
            <CommentItem key={comment.gid} comment={comment} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DailySummaryItem;
