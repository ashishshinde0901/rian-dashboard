import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Header from './Header';
import TaskTable from './TaskTable';
import DeliveryTable from './DeliveryTable';
import LoadingSpinner from './LoadingSpinner';
import { DashboardResponse } from '../types';

const Dashboard = () => {
  const { user } = useAuth();
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [selectedField, setSelectedField] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [useRoleView, setUseRoleView] = useState<boolean>(false); // Toggle for admins/heads

  const [tasks, setTasks] = useState<DashboardResponse | null>(null);
  const [deliveryTasks, setDeliveryTasks] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [isDeliveryView, setIsDeliveryView] = useState(false);

  // Check if user has a privileged role
  const isPrivilegedUser = user?.role && user.role !== 'user';
  const roleLabel = user?.role === 'super_admin' ? 'All Tasks' :
                    user?.role === 'sales_head' ? 'Sales Tasks' :
                    user?.role === 'delivery_head' ? 'Delivery Tasks' :
                    user?.role === 'tech_head' ? 'Tech Tasks' :
                    user?.role === 'product_head' ? 'Product Tasks' : 'My Tasks';

  // Fetch workspaces
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/workspaces`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        setWorkspaces(data.workspaces);
        if (data.workspaces.length === 1) {
          setSelectedWorkspace(data.workspaces[0].gid);
        }
      });
  }, []);

  // Fetch custom fields when workspace changes
  useEffect(() => {
    if (!selectedWorkspace) return;

    fetch(`${import.meta.env.VITE_API_URL}/api/custom-fields/${selectedWorkspace}`, {
      credentials: 'include'
    })
      .then((r) => r.json())
      .then((data) => {
        setCustomFields(data.customFields);
        // Auto-select "Function" field if available
        const functionField = data.customFields.find((f: any) => f.name === 'Function');
        if (functionField) {
          setSelectedField(functionField.gid);
          if (functionField.enum_options.length > 0) {
            setSelectedOption(functionField.enum_options[0].gid);
          }
        } else if (data.customFields.length > 0) {
          // Fallback to first field
          setSelectedField(data.customFields[0].gid);
          if (data.customFields[0].enum_options.length > 0) {
            setSelectedOption(data.customFields[0].enum_options[0].gid);
          }
        }
      })
      .catch(console.error);
  }, [selectedWorkspace]);

  // Detect if "Delivery" option is selected
  useEffect(() => {
    if (!selectedField || !selectedOption) {
      setIsDeliveryView(false);
      return;
    }

    const selectedFieldData = customFields.find(f => f.gid === selectedField);
    const selectedOptionData = selectedFieldData?.enum_options.find((o: any) => o.gid === selectedOption);

    setIsDeliveryView(selectedOptionData?.name?.toLowerCase() === 'delivery');
  }, [selectedField, selectedOption, customFields]);

  // Fetch tasks when workspace and filter change
  const fetchTasks = async () => {
    // If using role view, fetch role-based tasks
    if (useRoleView && isPrivilegedUser && selectedWorkspace) {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/tasks/${selectedWorkspace}/role-based`,
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
      return;
    }

    // Regular filter-based fetch
    if (!selectedWorkspace || !selectedField || !selectedOption) return;

    setLoading(true);
    setError(null);

    try {
      // Check if this is delivery view
      if (isDeliveryView) {
        // Fetch delivery tasks
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/delivery/dashboard?workspaceGid=${selectedWorkspace}&customFieldGid=${selectedField}&optionGid=${selectedOption}`,
          { credentials: 'include' }
        );

        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = '/login';
            return;
          }
          const err = await res.json();
          throw new Error(err.error || 'Failed to fetch delivery tasks');
        }

        const data = await res.json();
        setDeliveryTasks(data);
        setTasks(null); // Clear regular tasks
        setLastFetched(new Date().toISOString());
      } else {
        // Fetch regular tasks
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/tasks/${selectedWorkspace}/filter?customFieldGid=${selectedField}&optionGid=${selectedOption}`,
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
        setDeliveryTasks(null); // Clear delivery tasks
        setLastFetched(data.last_fetched);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedWorkspace, selectedField, selectedOption, useRoleView, isDeliveryView]);

  // Get options for selected field
  const selectedFieldOptions = customFields.find(f => f.gid === selectedField)?.enum_options || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onRefresh={fetchTasks} lastFetched={lastFetched} />

      <main className="w-[90%] mx-auto px-4 py-6">
        {/* Filter Controls */}
        <div className="mb-6 bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Filter Tasks</h2>

            {/* Role View Toggle for Privileged Users */}
            {isPrivilegedUser && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">Custom Filter</span>
                <button
                  onClick={() => setUseRoleView(!useRoleView)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    useRoleView ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useRoleView ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-xs font-medium text-indigo-600">{roleLabel}</span>
              </div>
            )}
          </div>
          {/* Show filter controls only when NOT using role view */}
          {!useRoleView && (
            <div className="grid grid-cols-3 gap-4">
              {/* Workspace Selector */}
              {workspaces.length > 0 && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Workspace</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={selectedWorkspace}
                    onChange={(e) => setSelectedWorkspace(e.target.value)}
                  >
                    <option value="">Select Workspace</option>
                    {workspaces.map((ws: any) => (
                      <option key={ws.gid} value={ws.gid}>
                        {ws.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Custom Field Selector */}
              {selectedWorkspace && customFields.length > 0 && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Custom Field</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={selectedField}
                    onChange={(e) => {
                      setSelectedField(e.target.value);
                      // Reset option when field changes
                      const newField = customFields.find(f => f.gid === e.target.value);
                      if (newField && newField.enum_options.length > 0) {
                        setSelectedOption(newField.enum_options[0].gid);
                      }
                    }}
                  >
                    {customFields.map((field: any) => (
                      <option key={field.gid} value={field.gid}>
                        {field.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Custom Field Option Selector */}
              {selectedField && selectedFieldOptions.length > 0 && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Filter Value</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={selectedOption}
                    onChange={(e) => setSelectedOption(e.target.value)}
                  >
                    {selectedFieldOptions.map((option: any) => (
                      <option key={option.gid} value={option.gid}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Show workspace selector for role view */}
          {useRoleView && isPrivilegedUser && (
            <div className="grid grid-cols-3 gap-4">
              {workspaces.length > 0 && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Workspace</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={selectedWorkspace}
                    onChange={(e) => setSelectedWorkspace(e.target.value)}
                  >
                    <option value="">Select Workspace</option>
                    {workspaces.map((ws: any) => (
                      <option key={ws.gid} value={ws.gid}>
                        {ws.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats for regular tasks */}
        {tasks && !isDeliveryView && (
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

        {/* Stats for delivery tasks */}
        {deliveryTasks && isDeliveryView && (
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

        {/* Regular tasks table */}
        {tasks && !isDeliveryView && <TaskTable tasks={tasks.tasks} />}

        {/* Delivery tasks table */}
        {deliveryTasks && isDeliveryView && <DeliveryTable tasks={deliveryTasks.tasks} onUpdate={fetchTasks} />}
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

export default Dashboard;
