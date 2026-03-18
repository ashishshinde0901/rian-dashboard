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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/corporate-sales`, {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        const err = await response.json();
        throw new Error(err.error || 'Failed to fetch tasks');
      }

      const data: DashboardResponse = await response.json();
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

      <main className="w-full lg:w-[90%] mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {loading && <LoadingSpinner />}
        {error && (
          <div className="bg-red-50 text-red-700 p-3 sm:p-4 rounded-lg text-sm sm:text-base">{error}</div>
        )}

        {tasks && <TaskTable tasks={tasks.tasks} />}
      </main>
    </div>
  );
};

export default CorporateSalesDashboard;
