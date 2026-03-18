import { useState } from 'react';

interface DeliveryTask {
  gid: string;
  name: string;
  task_status: string | null;
  due_on: string | null;
  completed: boolean;
  committed_delivery_date: string | null;
  planned_margin: number | null;
  actual_margin: number | null;
  updateComments: Array<{
    text: string;
    created_at: string;
    author: string;
  }>;
}

interface DeliveryTableProps {
  tasks: DeliveryTask[];
  onUpdate: () => void;
  userEmail?: string; // For admin check
}

const DeliveryTable = ({ tasks, onUpdate, userEmail }: DeliveryTableProps) => {
  const [editingCell, setEditingCell] = useState<{ taskGid: string; field: string } | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<Set<string>>(new Set());

  // Check if user is admin (has access to edit database fields)
  // Using super admin emails: nikhil.naik@rian.io, ashish.shinde@rian.io, anand@rian.io, pmo@rian.io
  const ADMIN_EMAILS = [
    'nikhil.naik@rian.io',
    'ashish.shinde@rian.io',
    'anand@rian.io',
    'pmo@rian.io'
  ];
  const isAdmin = userEmail ? ADMIN_EMAILS.includes(userEmail.toLowerCase().trim()) : false;

  const saveMetric = async (taskGid: string, projectName: string, field: string, value: any) => {
    if (!isAdmin) {
      alert('Only admins can edit this field');
      return;
    }

    setSaving(prev => new Set(prev).add(taskGid));

    try {
      const task = tasks.find(t => t.gid === taskGid);
      const payload = {
        asana_task_gid: taskGid,
        project_name: projectName,
        committed_delivery_date: task?.committed_delivery_date,
        planned_margin: task?.planned_margin,
        actual_margin: task?.actual_margin,
        [field]: value || null,
      };

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/delivery/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to save');
      }

      onUpdate();
    } catch (error: any) {
      console.error('Error saving metric:', error);
      alert(`Failed to save: ${error.message}`);
    } finally {
      setSaving(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskGid);
        return newSet;
      });
      setEditingCell(null);
    }
  };

  const toggleComments = (taskGid: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskGid)) {
        newSet.delete(taskGid);
      } else {
        newSet.add(taskGid);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Project Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Due Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Committed Date {isAdmin && <span className="text-blue-600">*</span>}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Margin {isAdmin && <span className="text-blue-600">*</span>}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Comments (Update:)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tasks.map((task) => (
              <tr key={task.gid} className="hover:bg-gray-50">
                {/* Project Name */}
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {task.name}
                </td>

                {/* Due Date (from Asana, read-only) */}
                <td className="px-4 py-3 text-sm text-gray-600">
                  {formatDate(task.due_on)}
                </td>

                {/* Committed Delivery Date - Editable (Admin only) */}
                <td className="px-4 py-3 text-sm">
                  {editingCell?.taskGid === task.gid && editingCell?.field === 'committed_delivery_date' ? (
                    <input
                      type="date"
                      defaultValue={task.committed_delivery_date || ''}
                      autoFocus
                      className="border border-indigo-500 rounded px-2 py-1 text-sm w-full"
                      onBlur={(e) => saveMetric(task.gid, task.name, 'committed_delivery_date', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          saveMetric(task.gid, task.name, 'committed_delivery_date', e.currentTarget.value);
                        }
                        if (e.key === 'Escape') setEditingCell(null);
                      }}
                    />
                  ) : (
                    <div
                      onClick={() => isAdmin && setEditingCell({ taskGid: task.gid, field: 'committed_delivery_date' })}
                      className={`px-2 py-1 rounded ${isAdmin ? 'cursor-pointer hover:bg-gray-100' : 'cursor-not-allowed'}`}
                    >
                      {formatDate(task.committed_delivery_date)}
                      {saving.has(task.gid) && <span className="ml-2 text-xs text-gray-400">Saving...</span>}
                    </div>
                  )}
                </td>

                {/* Task Status */}
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    task.completed
                      ? 'bg-green-100 text-green-800'
                      : task.task_status?.toLowerCase().includes('progress')
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {task.completed ? 'Completed' : task.task_status || 'No Status'}
                  </span>
                </td>

                {/* Margin - Editable (Admin only) */}
                <td className="px-4 py-3 text-sm">
                  {editingCell?.taskGid === task.gid && editingCell?.field === 'planned_margin' ? (
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={task.planned_margin || ''}
                      autoFocus
                      className="border border-indigo-500 rounded px-2 py-1 text-sm w-24"
                      onBlur={(e) => saveMetric(task.gid, task.name, 'planned_margin', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          saveMetric(task.gid, task.name, 'planned_margin', e.currentTarget.value);
                        }
                        if (e.key === 'Escape') setEditingCell(null);
                      }}
                    />
                  ) : (
                    <div
                      onClick={() => isAdmin && setEditingCell({ taskGid: task.gid, field: 'planned_margin' })}
                      className={`px-2 py-1 rounded ${isAdmin ? 'cursor-pointer hover:bg-gray-100' : 'cursor-not-allowed'}`}
                    >
                      {task.planned_margin ? `${task.planned_margin}%` : '-'}
                    </div>
                  )}
                </td>

                {/* Comments */}
                <td className="px-4 py-3 text-sm">
                  {task.updateComments.length > 0 ? (
                    <div>
                      <button
                        onClick={() => toggleComments(task.gid)}
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                      >
                        {expandedComments.has(task.gid) ? 'Hide' : 'Show'} ({task.updateComments.length})
                      </button>
                      {expandedComments.has(task.gid) && (
                        <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                          {task.updateComments.slice(0, 3).map((comment, idx) => (
                            <div key={idx} className="text-xs bg-gray-50 p-2 rounded border border-gray-200">
                              <p className="text-gray-700">{comment.text}</p>
                              <p className="text-gray-400 mt-1">
                                {comment.author} · {formatDate(comment.created_at)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">No updates</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tasks.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No delivery tasks found
        </div>
      )}
      {isAdmin && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 text-xs text-blue-700">
          <span className="text-blue-600">*</span> Admin access: You can edit these fields
        </div>
      )}
    </div>
  );
};

export default DeliveryTable;
