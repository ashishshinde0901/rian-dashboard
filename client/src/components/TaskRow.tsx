import { useMemo } from 'react';
import CommentsCell from './CommentsCell';
import { SalesTask } from '../types';
import { formatRelativeDate } from '../utils/formatDate';
import { getStatusColors } from '../utils/statusColors';
import { generateExecutiveSummary } from '../utils/executiveSummary';

interface Props {
  task: SalesTask;
}

const TaskRow = ({ task }: Props) => {
  const statusColors = getStatusColors(task.task_status);

  // Generate executive summary to get status color for row background
  const executiveSummary = useMemo(
    () => generateExecutiveSummary(task.comments, task.name, task.task_status),
    [task.comments, task.name, task.task_status]
  );

  // Map status color to row background with stronger colors
  const rowBgColors = {
    green: 'bg-green-100',
    yellow: 'bg-yellow-100',
    red: 'bg-red-100',
    blue: 'bg-blue-100',
    gray: 'bg-white',
  };

  const rowBg = rowBgColors[executiveSummary.statusColor];

  return (
    <tr className={`border-b border-gray-200 transition-colors align-top ${rowBg}`}>
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
        {task.task_status ? (
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
            {task.task_status}
          </span>
        ) : (
          <span className="text-gray-400 italic text-sm">No status</span>
        )}
      </td>

      <td className="px-4 py-3">
        {task.deal_value ? (
          <span className="text-sm text-gray-700 font-medium">${task.deal_value}</span>
        ) : (
          <span className="text-gray-400 italic text-sm">-</span>
        )}
      </td>

      <td className="px-4 py-3">
        {task.expected_start_date ? (
          <span className="text-sm text-gray-700">{new Date(task.expected_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        ) : (
          <span className="text-gray-400 italic text-sm">-</span>
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
