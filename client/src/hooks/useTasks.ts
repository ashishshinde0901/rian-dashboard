import { useState, useEffect, useCallback } from 'react';
import { DashboardResponse } from '../types';

const POLL_INTERVAL = 5 * 60 * 1000; // Refresh every 5 minutes

export function useTasks(workspaceGid: string) {
  const [tasks, setTasks] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!workspaceGid) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/sales-tasks/${workspaceGid}`,
        { credentials: 'include' }
      );

      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch tasks');
      }

      const data: DashboardResponse = await res.json();
      setTasks(data);
      setLastFetched(data.last_fetched);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [workspaceGid]);

  // Initial fetch + polling
  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  return { tasks, loading, error, lastFetched, refresh: fetchTasks };
}
