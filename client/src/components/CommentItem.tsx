import { AsanaComment } from '../types';
import { formatRelativeDate } from '../utils/formatDate';

interface Props {
  comment: AsanaComment;
}

const CommentItem = ({ comment }: Props) => {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-700">
          {comment.created_by?.name || 'Unknown'}
        </span>
        <span className="text-xs text-gray-400">
          {formatRelativeDate(comment.created_at)}
        </span>
      </div>
      <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
        {comment.text}
      </p>
    </div>
  );
};

export default CommentItem;
