import { useState, useRef, useEffect } from 'react';
import TaskRow from './TaskRow';
import { SalesTask } from '../types';

interface Props {
  tasks: SalesTask[];
}

const TaskTable = ({ tasks }: Props) => {
  const [sortField, setSortField] = useState<'updated_date' | 'name'>('updated_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Column widths (percentages)
  const [colWidths, setColWidths] = useState({
    task: 20,
    updated: 10,
    status: 10,
    description: 15,
    comments: 45,
  });

  const tableRef = useRef<HTMLTableElement>(null);
  const resizingCol = useRef<string | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingCol.current || !tableRef.current) return;

      const tableWidth = tableRef.current.offsetWidth;
      const deltaX = e.clientX - startX.current;
      const deltaPercent = (deltaX / tableWidth) * 100;
      const newWidth = Math.max(5, Math.min(80, startWidth.current + deltaPercent));

      setColWidths((prev) => ({
        ...prev,
        [resizingCol.current!]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      resizingCol.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleMouseDown = (col: string, e: React.MouseEvent) => {
    resizingCol.current = col;
    startX.current = e.clientX;
    startWidth.current = colWidths[col as keyof typeof colWidths];
    e.preventDefault();
  };

  const filtered = tasks
    .filter((t) => {
      if (filter === 'active') return !t.completed;
      if (filter === 'completed') return t.completed;
      return true;
    })
    .filter((t) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.user.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.comments.some((c) => c.text.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'updated_date') {
        cmp = new Date(a.updated_date).getTime() - new Date(b.updated_date).getTime();
      } else if (sortField === 'name') {
        cmp = a.name.localeCompare(b.name);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const SortIcon = ({ field }: { field: typeof sortField }) => (
    <span className="ml-1 text-gray-400">
      {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex gap-2">
          {(['all', 'active', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-lg capitalize ${
                filter === f
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search tasks, users, comments..."
          className="border rounded-lg px-3 py-1.5 text-sm w-64"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <table ref={tableRef} className="w-full">
        <thead>
          <tr className="bg-gray-50 text-left text-sm text-gray-600">
            <th
              className="px-4 py-3 cursor-pointer hover:text-gray-900 relative"
              style={{ width: `${colWidths.task}%` }}
              onClick={() => handleSort('name')}
            >
              Task <SortIcon field="name" />
              <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-300 transition-colors"
                onMouseDown={(e) => handleMouseDown('task', e)}
              />
            </th>
            <th
              className="px-4 py-3 cursor-pointer hover:text-gray-900 relative"
              style={{ width: `${colWidths.updated}%` }}
              onClick={() => handleSort('updated_date')}
            >
              Updated <SortIcon field="updated_date" />
              <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-300 transition-colors"
                onMouseDown={(e) => handleMouseDown('updated', e)}
              />
            </th>
            <th
              className="px-4 py-3 relative"
              style={{ width: `${colWidths.status}%` }}
            >
              Task Status
              <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-300 transition-colors"
                onMouseDown={(e) => handleMouseDown('status', e)}
              />
            </th>
            <th
              className="px-4 py-3 relative"
              style={{ width: `${colWidths.description}%` }}
            >
              Description
              <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-300 transition-colors"
                onMouseDown={(e) => handleMouseDown('description', e)}
              />
            </th>
            <th
              className="px-4 py-3 relative"
              style={{ width: `${colWidths.comments}%` }}
            >
              Comments
            </th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((task) => (
            <TaskRow key={task.gid} task={task} />
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center py-12 text-gray-400">
                No tasks found matching your criteria.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TaskTable;
