import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './components/LoginPage';
import MediaSalesDashboard from './components/MediaSalesDashboard';
import MediaDeliveryDashboard from './components/MediaDeliveryDashboard';
import CorporateSalesDashboard from './components/CorporateSalesDashboard';
import CorporateDeliveryDashboard from './components/CorporateDeliveryDashboard';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const { authenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={authenticated ? <Navigate to="/media-sales" /> : <LoginPage />}
        />
        <Route
          path="/"
          element={<Navigate to="/media-sales" />}
        />
        <Route
          path="/media-sales"
          element={authenticated ? <MediaSalesDashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/media-delivery"
          element={authenticated ? <MediaDeliveryDashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/corporate-sales"
          element={authenticated ? <CorporateSalesDashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/corporate-delivery"
          element={authenticated ? <CorporateDeliveryDashboard /> : <Navigate to="/login" />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
