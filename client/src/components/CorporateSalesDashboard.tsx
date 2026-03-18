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
      // Step 1: Fetch workspaces (get first workspace)
      const workspacesRes = await fetch(`${import.meta.env.VITE_API_URL}/api/workspaces`, {
        credentials: 'include'
      });
      if (!workspacesRes.ok) throw new Error('Failed to fetch workspaces');

      const workspacesData = await workspacesRes.json();
      const workspace = workspacesData.workspaces[0]; // Get first workspace

      if (!workspace) {
        throw new Error('No workspace found');
      }

      // Step 2: Fetch projects and find "Corporate" project
      const projectsRes = await fetch(
        `${import.meta.env.VITE_API_URL}/api/projects/${workspace.gid}`,
        { credentials: 'include' }
      );
      if (!projectsRes.ok) throw new Error('Failed to fetch projects');

      const projectsData = await projectsRes.json();
      const corporateProject = projectsData.projects.find(
        (proj: any) => proj.name === 'Corporate Revenue Squad'
      );

      if (!corporateProject) {
        const availableProjects = projectsData.projects.map((p: any) => p.name).join(', ');
        throw new Error(`Corporate Revenue Squad project not found. Available projects: ${availableProjects}`);
      }

      // Step 3: Fetch custom fields for the workspace
      const customFieldsRes = await fetch(
        `${import.meta.env.VITE_API_URL}/api/custom-fields/${workspace.gid}`,
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

      // Step 4: Find "Sales Initiative" option
      const salesOption = functionField.enum_options.find(
        (option: any) => option.name === 'Sales Initiative'
      );

      if (!salesOption) {
        throw new Error('Sales Initiative option not found');
      }

      // Step 5: Fetch tasks from project filtered by Function=Sales Initiative
      const tasksRes = await fetch(
        `${import.meta.env.VITE_API_URL}/api/tasks/project/${corporateProject.gid}/filter?customFieldGid=${functionField.gid}&optionGid=${salesOption.gid}`,
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
