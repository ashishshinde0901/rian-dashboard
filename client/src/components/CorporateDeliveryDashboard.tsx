import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import DashboardNav from './DashboardNav';
import Header from './Header';
import DeliveryTable from './DeliveryTable';
import LoadingSpinner from './LoadingSpinner';

const CorporateDeliveryDashboard = () => {
  const { user } = useAuth();
  const [deliveryTasks, setDeliveryTasks] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/corporate-delivery`, {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        const err = await response.json();
        throw new Error(err.error || 'Failed to fetch delivery tasks');
      }

      const data = await response.json();
      setDeliveryTasks(data);
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

        {deliveryTasks && <DeliveryTable tasks={deliveryTasks.tasks} onUpdate={fetchTasks} user={user} />}
      </main>
    </div>
  );
};

export default CorporateDeliveryDashboard;
