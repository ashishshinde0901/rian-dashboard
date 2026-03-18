import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import DashboardNav from './DashboardNav';
import Header from './Header';
import DeliveryTable from './DeliveryTable';
import LoadingSpinner from './LoadingSpinner';

const MediaDeliveryDashboard = () => {
  const { user } = useAuth();
  const [deliveryTasks, setDeliveryTasks] = useState<any>(null);
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

      // Step 2: Fetch projects and find "Media Squad" project
      const projectsRes = await fetch(
        `${import.meta.env.VITE_API_URL}/api/projects/${workspace.gid}`,
        { credentials: 'include' }
      );
      if (!projectsRes.ok) throw new Error('Failed to fetch projects');

      const projectsData = await projectsRes.json();
      const mediaProject = projectsData.projects.find(
        (proj: any) => proj.name === 'Media Squad'
      );

      if (!mediaProject) {
        const availableProjects = projectsData.projects.map((p: any) => p.name).join(', ');
        throw new Error(`Media Squad project not found. Available projects: ${availableProjects}`);
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

      // Step 4: Find "Delivery" option
      const deliveryOption = functionField.enum_options.find(
        (option: any) => option.name === 'Delivery'
      );

      if (!deliveryOption) {
        throw new Error('Delivery option not found');
      }

      // Step 5: Fetch tasks from project filtered by Function=Delivery (using regular endpoint for now)
      const tasksRes = await fetch(
        `${import.meta.env.VITE_API_URL}/api/tasks/project/${mediaProject.gid}/filter?customFieldGid=${functionField.gid}&optionGid=${deliveryOption.gid}`,
        { credentials: 'include' }
      );

      if (!tasksRes.ok) {
        if (tasksRes.status === 401) {
          window.location.href = '/login';
          return;
        }
        const err = await tasksRes.json();
        throw new Error(err.error || 'Failed to fetch delivery tasks');
      }

      const tasksData = await tasksRes.json();

      // Step 6: Fetch delivery metrics from database for all tasks
      const taskGids = (tasksData.tasks || []).map((t: any) => t.gid);
      const metricsMap = new Map();

      // Fetch metrics for each task
      for (const gid of taskGids) {
        try {
          const metricRes = await fetch(
            `${import.meta.env.VITE_API_URL}/api/delivery/metrics/${gid}`,
            { credentials: 'include' }
          );
          if (metricRes.ok) {
            const metric = await metricRes.json();
            metricsMap.set(gid, metric);
          }
        } catch (err) {
          // Metric doesn't exist for this task, that's okay
          console.log(`No metric found for task ${gid}`);
        }
      }

      // Transform to delivery format merging Asana data with database metrics
      const enrichedTasks = (tasksData.tasks || []).map((task: any) => {
        const metric = metricsMap.get(task.gid);
        return {
          ...task,
          committed_delivery_date: metric?.committed_delivery_date || null,
          planned_margin: metric?.planned_margin || null,
          actual_margin: metric?.actual_margin || null,
          updateComments: (task.comments || [])
            .filter((c: any) => c.text?.trim().toLowerCase().startsWith('update:'))
            .map((c: any) => ({
              text: c.text.replace(/^update:\s*/i, '').trim(),
              created_at: c.created_at,
              author: c.created_by?.name || 'Unknown',
            })),
        };
      });

      const data = {
        tasks: enrichedTasks
      };

      setDeliveryTasks(data);
      setLastFetched(tasksData.last_fetched);
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

        {deliveryTasks && <DeliveryTable tasks={deliveryTasks.tasks} onUpdate={fetchTasks} userEmail={user?.email} />}
      </main>
    </div>
  );
};

export default MediaDeliveryDashboard;
