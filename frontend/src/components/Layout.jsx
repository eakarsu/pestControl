import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiHome, FiUsers, FiMapPin, FiFileText, FiDollarSign,
  FiCalendar, FiTruck, FiPackage, FiUserCheck, FiMap,
  FiTarget, FiClipboard, FiCheckSquare, FiShield,
  FiCpu, FiBarChart2, FiSettings, FiLogOut, FiMenu, FiX, FiBell
} from 'react-icons/fi';

const navItems = [
  { path: '/', label: 'Dashboard', icon: FiHome },
  { path: '/customers', label: 'Customers', icon: FiUsers },
  { path: '/properties', label: 'Properties', icon: FiMapPin },
  { path: '/contracts', label: 'Contracts', icon: FiFileText },
  { path: '/invoices', label: 'Invoices', icon: FiDollarSign },
  { path: '/service-orders', label: 'Service Orders', icon: FiCalendar },
  { path: '/products', label: 'Products', icon: FiPackage },
  { path: '/technicians', label: 'Technicians', icon: FiUserCheck },
  { path: '/schedule', label: 'Schedule', icon: FiCalendar },
  { path: '/routes', label: 'Routes', icon: FiMap },
  { divider: true },
  { path: '/leads', label: 'Leads', icon: FiTarget },
  { path: '/quotes', label: 'Quotes', icon: FiClipboard },
  { path: '/inspections', label: 'Inspections', icon: FiCheckSquare },
  { divider: true },
  { path: '/compliance', label: 'Compliance', icon: FiShield },
  { path: '/ai-tools', label: 'AI Tools', icon: FiCpu },
  { path: '/ai-advisors', label: 'AI Advisors', icon: FiCpu },
  { path: '/reports', label: 'Reports', icon: FiBarChart2 },
  { path: '/settings', label: 'Settings', icon: FiSettings },
];

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transform transition-all duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${sidebarOpen ? 'w-64' : 'w-20'}`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
            {sidebarOpen && (
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">P</span>
                </div>
                <span className="font-bold text-gray-900">PestControl</span>
              </Link>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 hidden lg:block"
            >
              <FiMenu className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navItems.map((item, index) =>
              item.divider ? (
                <div key={index} className="my-4 border-t border-gray-200" />
              ) : (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar-link ${
                    location.pathname === item.path ? 'active' : ''
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              )
            )}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-200">
            {sidebarOpen ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-700 font-medium">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                  title="Logout"
                >
                  <FiLogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogout}
                className="w-full p-2 rounded-lg hover:bg-gray-100 text-gray-500 flex justify-center"
                title="Logout"
              >
                <FiLogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
          >
            <FiMenu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-lg hover:bg-gray-100">
              <FiBell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
