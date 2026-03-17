import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import DeliveryDashboard from './components/DeliveryDashboard';
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
          element={authenticated ? <Navigate to="/" /> : <LoginPage />}
        />
        <Route
          path="/"
          element={authenticated ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/delivery"
          element={authenticated ? <DeliveryDashboard /> : <Navigate to="/login" />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
