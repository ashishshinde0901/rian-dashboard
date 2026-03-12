import CommentsCell from './CommentsCell';
import { SalesTask } from '../types';
import { formatRelativeDate } from '../utils/formatDate';
import { getStatusColors } from '../utils/statusColors';

interface Props {
  task: SalesTask;
}

const TaskRow = ({ task }: Props) => {
  const statusColors = getStatusColors(task.task_status);

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors align-top">
      <td className="px-4 py-3">
        <div className="flex items-start gap-2">
          <span className={`mt-0.5 text-lg ${task.completed ? 'text-green-500' : 'text-gray-300'}`}>
            {task.completed ? '✅' : '⬜'}
          </span>
          <div>
            <a
              href={task.permalink_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-gray-900 hover:text-indigo-600 transition-colors text-sm"
            >
              {task.name}
            </a>
          </div>
        </div>
      </td>

      <td className="px-4 py-3">
        <span className="text-sm text-gray-600">{formatRelativeDate(task.updated_date)}</span>
      </td>

      <td className="px-4 py-3">
        {task.task_status ? (
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
            {task.task_status}
          </span>
        ) : (
          <span className="text-gray-400 italic text-sm">No status</span>
        )}
      </td>

      <td className="px-4 py-3">
        {task.description ? (
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line line-clamp-3">
            {task.description}
          </p>
        ) : (
          <span className="text-sm text-gray-400 italic">No description</span>
        )}
      </td>

      <td className="px-4 py-3">
        <CommentsCell
          comments={task.comments}
          totalComments={task.total_comments}
          taskUrl={task.permalink_url}
          taskName={task.name}
          taskStatus={task.task_status}
        />
      </td>
    </tr>
  );
};

export default TaskRow;
