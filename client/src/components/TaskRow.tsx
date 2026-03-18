import CommentsCell from './CommentsCell';
import { SalesTask } from '../types';
import { getStatusColors } from '../utils/statusColors';

interface Props {
  task: SalesTask;
}

const TaskRow = ({ task }: Props) => {
  const statusColors = getStatusColors(task.task_status);

  // Determine row background color based on Task Status field
  const getRowBackgroundColor = (taskStatus?: string): string => {
    if (!taskStatus) return 'bg-white';

    const statusLower = taskStatus.toLowerCase();

    // Blocked / Issues - Red
    if (
      statusLower.includes('blocked') ||
      statusLower.includes('issue') ||
      statusLower.includes('problem') ||
      statusLower.includes('stuck') ||
      statusLower.includes('critical')
    ) {
      return 'bg-red-100';
    }

    // In Progress / Delivery / Active - Green
    if (
      statusLower.includes('in progress') ||
      statusLower.includes('delivery') ||
      statusLower.includes('active') ||
      statusLower.includes('working') ||
      statusLower.includes('ongoing') ||
      statusLower.includes('started')
    ) {
      return 'bg-green-100';
    }

    // Completed / Done - Blue
    if (
      statusLower.includes('completed') ||
      statusLower.includes('done') ||
      statusLower.includes('finished') ||
      statusLower.includes('closed')
    ) {
      return 'bg-blue-100';
    }

    // Pending / Waiting / On Hold - Yellow
    if (
      statusLower.includes('pending') ||
      statusLower.includes('waiting') ||
      statusLower.includes('on hold') ||
      statusLower.includes('paused') ||
      statusLower.includes('deferred')
    ) {
      return 'bg-yellow-100';
    }

    // Default - White
    return 'bg-white';
  };

  const rowBg = getRowBackgroundColor(task.task_status);

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
          <span className="text-sm text-gray-700 font-medium">₹{task.deal_value}</span>
        ) : (
          <span className="text-gray-400 italic text-sm">-</span>
        )}
      </td>

      <td className="px-4 py-3">
        {task.expected_start_date ? (
          <span className="text-sm text-gray-700">{task.expected_start_date}</span>
        ) : (
          <span className="text-gray-400 italic text-sm">-</span>
        )}
      </td>

      <td className="px-4 py-3">
        {task.closing_probability && task.closing_probability.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {task.closing_probability.map((prob, idx) => (
              <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                {prob}
              </span>
            ))}
          </div>
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
