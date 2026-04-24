import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Properties from './pages/Properties';
import Contracts from './pages/Contracts';
import Invoices from './pages/Invoices';
import ServiceOrders from './pages/ServiceOrders';
import ServiceOrderDetail from './pages/ServiceOrderDetail';
import Products from './pages/Products';
import Technicians from './pages/Technicians';
import Schedule from './pages/Schedule';
import RoutesPage from './pages/Routes';
import Leads from './pages/Leads';
import Quotes from './pages/Quotes';
import Inspections from './pages/Inspections';
import Compliance from './pages/Compliance';
import AITools from './pages/AITools';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import TechnicianApp from './pages/TechnicianApp';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  const { user } = useAuth();

  return (
    <ErrorBoundary>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Technician Mobile App */}
      <Route
        path="/technician/*"
        element={
          <ProtectedRoute>
            <TechnicianApp />
          </ProtectedRoute>
        }
      />

      {/* Main App */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/customers/:id" element={<CustomerDetail />} />
                  <Route path="/properties" element={<Properties />} />
                  <Route path="/contracts" element={<Contracts />} />
                  <Route path="/invoices" element={<Invoices />} />
                  <Route path="/service-orders" element={<ServiceOrders />} />
                  <Route path="/service-orders/:id" element={<ServiceOrderDetail />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/technicians" element={<Technicians />} />
                  <Route path="/schedule" element={<Schedule />} />
                  <Route path="/routes" element={<RoutesPage />} />
                  <Route path="/leads" element={<Leads />} />
                  <Route path="/quotes" element={<Quotes />} />
                  <Route path="/inspections" element={<Inspections />} />
                  <Route path="/compliance" element={<Compliance />} />
                  <Route path="/ai-tools" element={<AITools />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
    </ErrorBoundary>
  );
}

export default App;
