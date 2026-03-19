import { useState, useRef, useEffect } from 'react';
import TaskRow from './TaskRow';
import { SalesTask } from '../types';

interface Props {
  tasks: SalesTask[];
}

const TaskTable = ({ tasks }: Props) => {
  const [sortField, setSortField] = useState<'updated_date' | 'name' | 'deal_value' | 'expected_start_date' | 'closing_probability'>('updated_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Column widths (percentages)
  const [colWidths, setColWidths] = useState({
    task: 18,
    status: 10,
    dealValue: 10,
    startDate: 10,
    closingProb: 12,
    description: 13,
    comments: 27,
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
    e.stopPropagation(); // Prevent triggering sort when dragging resize handle
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
      } else if (sortField === 'deal_value') {
        const aVal = parseFloat(a.deal_value || '0');
        const bVal = parseFloat(b.deal_value || '0');
        cmp = aVal - bVal;
      } else if (sortField === 'expected_start_date') {
        const aDate = a.expected_start_date || '';
        const bDate = b.expected_start_date || '';
        cmp = aDate.localeCompare(bDate);
      } else if (sortField === 'closing_probability') {
        const aProb = (a.closing_probability || []).join(', ');
        const bProb = (b.closing_probability || []).join(', ');
        cmp = aProb.localeCompare(bProb);
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 gap-3 sm:gap-0 border-b border-gray-100">
        <div className="flex gap-1.5 sm:gap-2 w-full sm:w-auto">
          {(['all', 'active', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg capitalize flex-1 sm:flex-initial ${
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
          placeholder="Search tasks..."
          className="border rounded-lg px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm w-full sm:w-64"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table ref={tableRef} className="w-full min-w-[800px]">
          <thead>
            <tr className="bg-gray-50 text-left text-xs sm:text-sm text-gray-600">
            <th
              className="px-4 py-3 cursor-pointer hover:text-gray-900 relative"
              style={{ width: `${colWidths.task}%` }}
              onClick={() => handleSort('name')}
            >
              Task <SortIcon field="name" />
              <div
                className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-400 bg-indigo-200 transition-colors"
                onMouseDown={(e) => handleMouseDown('task', e)}
              />
            </th>
            <th
              className="px-4 py-3 relative"
              style={{ width: `${colWidths.status}%` }}
            >
              Task Status
              <div
                className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-400 bg-indigo-200 transition-colors"
                onMouseDown={(e) => handleMouseDown('status', e)}
              />
            </th>
            <th
              className="px-4 py-3 cursor-pointer hover:text-gray-900 relative"
              style={{ width: `${colWidths.dealValue}%` }}
              onClick={() => handleSort('deal_value')}
            >
              Deal Value <SortIcon field="deal_value" />
              <div
                className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-400 bg-indigo-200 transition-colors"
                onMouseDown={(e) => handleMouseDown('dealValue', e)}
              />
            </th>
            <th
              className="px-4 py-3 cursor-pointer hover:text-gray-900 relative"
              style={{ width: `${colWidths.startDate}%` }}
              onClick={() => handleSort('expected_start_date')}
            >
              Expected Start Date <SortIcon field="expected_start_date" />
              <div
                className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-400 bg-indigo-200 transition-colors"
                onMouseDown={(e) => handleMouseDown('startDate', e)}
              />
            </th>
            <th
              className="px-4 py-3 cursor-pointer hover:text-gray-900 relative"
              style={{ width: `${colWidths.closingProb}%` }}
              onClick={() => handleSort('closing_probability')}
            >
              Closing Probability <SortIcon field="closing_probability" />
              <div
                className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-400 bg-indigo-200 transition-colors"
                onMouseDown={(e) => handleMouseDown('closingProb', e)}
              />
            </th>
            <th
              className="px-4 py-3 relative"
              style={{ width: `${colWidths.description}%` }}
            >
              Description
              <div
                className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-400 bg-indigo-200 transition-colors"
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
              <td colSpan={7} className="text-center py-12 text-gray-400">
                No tasks found matching your criteria.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    </div>
  );
};

export default TaskTable;
