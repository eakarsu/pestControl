// === Batch 11 Gaps & Frontend Mounts ===
import GapChemicalSafetyCheckerPage from './pages/gap/GapChemicalSafetyCheckerPage'
import GapCustomerChurnPredictorPage from './pages/gap/GapCustomerChurnPredictorPage'
import GapEquipmentMaintenancePage from './pages/gap/GapEquipmentMaintenancePage'
import GapInvoicePaymentPredictionPage from './pages/gap/GapInvoicePaymentPredictionPage'
import GapPaymentProcessorPage from './pages/gap/GapPaymentProcessorPage'
import GapMobileTechnicianPage from './pages/gap/GapMobileTechnicianPage'
import GapSmsEmailDispatchPage from './pages/gap/GapSmsEmailDispatchPage'
import GapIotSensorPage from './pages/gap/GapIotSensorPage'
import GapCustomerPortalPage from './pages/gap/GapCustomerPortalPage'
import GapSubscriptionBillingPage from './pages/gap/GapSubscriptionBillingPage'
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
import AIAdvisors from './pages/AIAdvisors';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import TechnicianApp from './pages/TechnicianApp';
import CustomViewsPage from './pages/CustomViewsPage';

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
                  <Route path="/ai-advisors" element={<AIAdvisors />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/custom-views" element={<CustomViewsPage />} />
                </Routes>
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        }
      />
          {/* === Batch 11 Gaps & Frontend Mounts === */}
        <Route path="/gap/chemical-safety-checker" element={<GapChemicalSafetyCheckerPage />} />
        <Route path="/gap/customer-churn-predictor" element={<GapCustomerChurnPredictorPage />} />
        <Route path="/gap/equipment-maintenance" element={<GapEquipmentMaintenancePage />} />
        <Route path="/gap/invoice-payment-prediction" element={<GapInvoicePaymentPredictionPage />} />
        <Route path="/gap/payment-processor" element={<GapPaymentProcessorPage />} />
        <Route path="/gap/mobile-technician" element={<GapMobileTechnicianPage />} />
        <Route path="/gap/sms-email-dispatch" element={<GapSmsEmailDispatchPage />} />
        <Route path="/gap/iot-sensor" element={<GapIotSensorPage />} />
        <Route path="/gap/customer-portal" element={<GapCustomerPortalPage />} />
        <Route path="/gap/subscription-billing" element={<GapSubscriptionBillingPage />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
