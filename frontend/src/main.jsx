import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ConfigProvider } from './context/ConfigContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ConfigProvider>
          <App />
          <Toaster position="top-right" />
        </ConfigProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
