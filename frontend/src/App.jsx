import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import { useAuth } from './context/AuthContext';
import EvidenceWorkspace from './pages/EvidenceWorkspace';
import Login from './pages/Login';

function Protected({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/evidence" element={<Protected><Layout><EvidenceWorkspace /></Layout></Protected>} />
        <Route path="*" element={<Navigate to="/evidence" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
