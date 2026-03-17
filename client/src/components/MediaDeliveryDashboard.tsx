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
      // Step 1: Fetch workspaces and find "Media Squad"
      const workspacesRes = await fetch(`${import.meta.env.VITE_API_URL}/api/workspaces`, {
        credentials: 'include'
      });
      if (!workspacesRes.ok) throw new Error('Failed to fetch workspaces');

      const workspacesData = await workspacesRes.json();
      const mediaWorkspace = workspacesData.workspaces.find(
        (ws: any) => ws.name === 'Media Squad'
      );

      if (!mediaWorkspace) {
        throw new Error('Media Squad workspace not found');
      }

      // Step 2: Fetch custom fields for the workspace
      const customFieldsRes = await fetch(
        `${import.meta.env.VITE_API_URL}/api/custom-fields/${mediaWorkspace.gid}`,
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

      // Step 3: Find "Delivery" option
      const deliveryOption = functionField.enum_options.find(
        (option: any) => option.name === 'Delivery'
      );

      if (!deliveryOption) {
        throw new Error('Delivery option not found');
      }

      // Step 4: Fetch delivery tasks with the resolved GIDs
      const tasksRes = await fetch(
        `${import.meta.env.VITE_API_URL}/api/delivery/dashboard?workspaceGid=${mediaWorkspace.gid}&customFieldGid=${functionField.gid}&optionGid=${deliveryOption.gid}`,
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

      const data = await tasksRes.json();
      setDeliveryTasks(data);
      setLastFetched(new Date().toISOString());
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
        {deliveryTasks && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Deliveries" value={deliveryTasks.tasks.length} />
            <StatCard label="Completed" value={deliveryTasks.tasks.filter((t: any) => t.completed).length} />
            <StatCard label="In Progress" value={deliveryTasks.tasks.filter((t: any) => !t.completed).length} />
            <StatCard label="Overdue" value={
              deliveryTasks.tasks.filter((t: any) => {
                if (t.completed || !t.due_on) return false;
                return new Date(t.due_on) < new Date();
              }).length
            } />
          </div>
        )}

        {loading && <LoadingSpinner />}
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
        )}

        {deliveryTasks && <DeliveryTable tasks={deliveryTasks.tasks} onUpdate={fetchTasks} />}
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

export default MediaDeliveryDashboard;
