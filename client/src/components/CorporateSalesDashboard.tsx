import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import DashboardNav from './DashboardNav';
import Header from './Header';
import TaskTable from './TaskTable';
import LoadingSpinner from './LoadingSpinner';
import { DashboardResponse } from '../types';

const CorporateSalesDashboard = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Fetch workspaces and find "Corporate"
      const workspacesRes = await fetch(`${import.meta.env.VITE_API_URL}/api/workspaces`, {
        credentials: 'include'
      });
      if (!workspacesRes.ok) throw new Error('Failed to fetch workspaces');

      const workspacesData = await workspacesRes.json();
      const corporateWorkspace = workspacesData.workspaces.find(
        (ws: any) => ws.name === 'Corporate'
      );

      if (!corporateWorkspace) {
        throw new Error('Corporate workspace not found');
      }

      // Step 2: Fetch custom fields for the workspace
      const customFieldsRes = await fetch(
        `${import.meta.env.VITE_API_URL}/api/custom-fields/${corporateWorkspace.gid}`,
        { credentials: 'include' }
      );
      if (!customFieldsRes.ok) throw new Error('Failed to fetch custom fields');

      const customFieldsData = await customFieldsRes.json();
      const functionField = customFieldsData.customFields.find(
        (field: any) => field.name === 'Function'
      );

      if (!functionField) {
        throw new Error('Function custom field not found');
      }

      // Step 3: Find "Sales Initiative" option
      const salesOption = functionField.enum_options.find(
        (option: any) => option.name === 'Sales Initiative'
      );

      if (!salesOption) {
        throw new Error('Sales Initiative option not found');
      }

      // Step 4: Fetch tasks with the resolved GIDs
      const tasksRes = await fetch(
        `${import.meta.env.VITE_API_URL}/api/tasks/${corporateWorkspace.gid}/filter?customFieldGid=${functionField.gid}&optionGid=${salesOption.gid}`,
        { credentials: 'include' }
      );

      if (!tasksRes.ok) {
        if (tasksRes.status === 401) {
          window.location.href = '/login';
          return;
        }
        const err = await tasksRes.json();
        throw new Error(err.error || 'Failed to fetch tasks');
      }

      const data: DashboardResponse = await tasksRes.json();
      setTasks(data);
      setLastFetched(data.last_fetched);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onRefresh={fetchTasks} lastFetched={lastFetched} />
      <DashboardNav />

      <main className="w-[90%] mx-auto px-4 py-6">
        {/* Stats Cards */}
        {tasks && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Tasks" value={tasks.total_tasks} />
            <StatCard label="Completed" value={tasks.tasks.filter((t) => t.completed).length} />
            <StatCard label="In Progress" value={tasks.tasks.filter((t) => !t.completed).length} />
            <StatCard label="With Updates Today" value={
              tasks.tasks.filter((t) => {
                const updated = new Date(t.updated_date);
                const today = new Date();
                return updated.toDateString() === today.toDateString();
              }).length
            } />
          </div>
        )}

        {loading && <LoadingSpinner />}
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
        )}

        {tasks && <TaskTable tasks={tasks.tasks} />}
      </main>
    </div>
  );
};

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
    <p className="text-sm text-gray-500">{label}</p>
    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
  </div>
);

export default CorporateSalesDashboard;
