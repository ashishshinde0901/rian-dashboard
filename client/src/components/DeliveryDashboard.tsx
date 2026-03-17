import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Header from './Header';
import DeliveryTable from './DeliveryTable';
import LoadingSpinner from './LoadingSpinner';

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
  subtasks?: Array<{
    gid: string;
    name: string;
    completed: boolean;
    due_on: string | null;
  }>;
}

interface DeliveryDashboardResponse {
  tasks: DeliveryTask[];
  customField: any;
}

const DeliveryDashboard = () => {
  const { user } = useAuth();
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [selectedField, setSelectedField] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<string>('');

  const [tasks, setTasks] = useState<DeliveryDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

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
        // Auto-select "Function" field and "Delivery" option if available
        const functionField = data.customFields.find((f: any) => f.name === 'Function');
        if (functionField) {
          setSelectedField(functionField.gid);
          const deliveryOption = functionField.enum_options.find((o: any) =>
            o.name.toLowerCase() === 'delivery'
          );
          if (deliveryOption) {
            setSelectedOption(deliveryOption.gid);
          }
        }
      })
      .catch(console.error);
  }, [selectedWorkspace]);

  // Fetch delivery tasks
  const fetchTasks = async () => {
    if (!selectedWorkspace || !selectedField || !selectedOption) return;

    setLoading(true);
    setError(null);

    try {
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

      const data: DeliveryDashboardResponse = await res.json();
      setTasks(data);
      setLastFetched(new Date().toISOString());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedWorkspace, selectedField, selectedOption]);

  // Get options for selected field
  const selectedFieldOptions = customFields.find(f => f.gid === selectedField)?.enum_options || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onRefresh={fetchTasks} lastFetched={lastFetched} />

      <main className="w-[90%] mx-auto px-4 py-6">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Delivery Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track committed delivery dates and margins (Management Only)
          </p>
        </div>

        {/* Filter Controls */}
        <div className="mb-6 bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Filter Tasks</h2>
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
        </div>

        {/* Stats */}
        {tasks && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Deliveries" value={tasks.tasks.length} />
            <StatCard label="Completed" value={tasks.tasks.filter((t) => t.completed).length} />
            <StatCard label="In Progress" value={tasks.tasks.filter((t) => !t.completed).length} />
            <StatCard label="Overdue" value={
              tasks.tasks.filter((t) => {
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
        {tasks && <DeliveryTable tasks={tasks.tasks} onUpdate={fetchTasks} />}
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

export default DeliveryDashboard;
