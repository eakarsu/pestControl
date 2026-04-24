import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardService } from '../services/api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FiUsers, FiHome, FiDollarSign, FiCalendar, FiAlertTriangle, FiCheckCircle, FiClock, FiTrendingUp } from 'react-icons/fi';
import { StatCardSkeleton } from '../components/LoadingSkeleton';
import toast from 'react-hot-toast';

const StatCard = ({ icon: Icon, label, value, change, color, onClick }) => (
  <div className="stat-card cursor-pointer hover:shadow-md hover:border-primary-200 transition-all" onClick={onClick}>
    <div className="flex items-center justify-between">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {change !== undefined && (
        <span className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? '+' : ''}{change}%
        </span>
      )}
    </div>
    <div className="mt-4">
      <p className="stat-value">{value}</p>
      <p className="stat-label">{label}</p>
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [scheduleToday, setScheduleToday] = useState(null);
  const [activity, setActivity] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [revenueChart, setRevenueChart] = useState([]);
  const [serviceChart, setServiceChart] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [statsRes, scheduleRes, activityRes, alertsRes, revenueRes, serviceRes] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getScheduleToday(),
        dashboardService.getActivity({ limit: 10 }),
        dashboardService.getAlerts(),
        dashboardService.getRevenueChart({ months: 6 }),
        dashboardService.getServiceChart({ days: 7 })
      ]);

      setStats(statsRes.data);
      setScheduleToday(scheduleRes.data);
      setActivity(activityRes.data);
      setAlerts(alertsRes.data);
      setRevenueChart(revenueRes.data);
      setServiceChart(serviceRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 bg-gray-200 animate-pulse rounded" />
          <div className="h-5 w-48 bg-gray-200 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <StatCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={FiUsers}
          label="Active Customers"
          value={stats?.customers?.active || 0}
          color="bg-blue-500"
          onClick={() => navigate('/customers')}
        />
        <StatCard
          icon={FiCalendar}
          label="Today's Jobs"
          value={stats?.serviceOrders?.scheduledToday || 0}
          color="bg-green-500"
          onClick={() => navigate('/service-orders')}
        />
        <StatCard
          icon={FiDollarSign}
          label="Revenue This Month"
          value={`$${(stats?.revenue?.thisMonth || 0).toLocaleString()}`}
          change={stats?.revenue?.changePercent}
          color="bg-purple-500"
          onClick={() => navigate('/invoices')}
        />
        <StatCard
          icon={FiAlertTriangle}
          label="Overdue Invoices"
          value={stats?.invoices?.overdue || 0}
          color="bg-red-500"
          onClick={() => navigate('/invoices')}
        />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Alerts</h2>
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  alert.type === 'error' ? 'bg-red-50 text-red-800' :
                  alert.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                  'bg-blue-50 text-blue-800'
                }`}
              >
                <FiAlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1">{alert.message}</span>
                <span className="badge badge-gray">{alert.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Service Chart */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Orders (7 Days)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="scheduled" fill="#94a3b8" name="Scheduled" />
                <Bar dataKey="completed" fill="#16a34a" name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Today's Schedule and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Today's Schedule</h2>
            <Link to="/schedule" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View All
            </Link>
          </div>

          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full" />
              <span className="text-sm text-gray-600">Pending: {scheduleToday?.byStatus?.pending || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full" />
              <span className="text-sm text-gray-600">In Progress: {scheduleToday?.byStatus?.inProgress || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full" />
              <span className="text-sm text-gray-600">Completed: {scheduleToday?.byStatus?.completed || 0}</span>
            </div>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {scheduleToday?.orders?.slice(0, 5).map((order) => (
              <Link
                key={order.id}
                to={`/service-orders/${order.id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  order.status === 'COMPLETED' ? 'bg-green-100' :
                  order.status === 'IN_PROGRESS' ? 'bg-blue-100' :
                  'bg-gray-100'
                }`}>
                  {order.status === 'COMPLETED' ? (
                    <FiCheckCircle className="w-5 h-5 text-green-600" />
                  ) : order.status === 'IN_PROGRESS' ? (
                    <FiClock className="w-5 h-5 text-blue-600" />
                  ) : (
                    <FiCalendar className="w-5 h-5 text-gray-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {order.property?.customer?.firstName} {order.property?.customer?.lastName}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {order.scheduledTimeStart} - {order.serviceType?.name}
                  </p>
                </div>
                <span className={`badge ${
                  order.status === 'COMPLETED' ? 'badge-green' :
                  order.status === 'IN_PROGRESS' ? 'badge-blue' :
                  'badge-gray'
                }`}>
                  {order.status}
                </span>
              </Link>
            ))}

            {(!scheduleToday?.orders || scheduleToday.orders.length === 0) && (
              <p className="text-center text-gray-500 py-8">No jobs scheduled for today</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {activity.map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  item.type === 'service_completed' ? 'bg-green-100' :
                  item.type === 'new_lead' ? 'bg-blue-100' :
                  item.type === 'payment_received' ? 'bg-purple-100' :
                  'bg-gray-100'
                }`}>
                  {item.type === 'service_completed' ? (
                    <FiCheckCircle className="w-4 h-4 text-green-600" />
                  ) : item.type === 'new_lead' ? (
                    <FiUsers className="w-4 h-4 text-blue-600" />
                  ) : item.type === 'payment_received' ? (
                    <FiDollarSign className="w-4 h-4 text-purple-600" />
                  ) : (
                    <FiClock className="w-4 h-4 text-gray-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{item.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(item.date).toLocaleString()}
                  </p>
                </div>
                {item.amount && (
                  <span className="text-sm font-medium text-green-600">
                    +${item.amount.toLocaleString()}
                  </span>
                )}
              </div>
            ))}

            {activity.length === 0 && (
              <p className="text-center text-gray-500 py-8">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center cursor-pointer hover:shadow-md hover:border-primary-200 transition-all" onClick={() => navigate('/properties')}>
          <p className="text-3xl font-bold text-gray-900">{stats?.properties || 0}</p>
          <p className="text-sm text-gray-500">Total Properties</p>
        </div>
        <div className="card text-center cursor-pointer hover:shadow-md hover:border-primary-200 transition-all" onClick={() => navigate('/contracts')}>
          <p className="text-3xl font-bold text-gray-900">{stats?.contracts?.active || 0}</p>
          <p className="text-sm text-gray-500">Active Contracts</p>
        </div>
        <div className="card text-center cursor-pointer hover:shadow-md hover:border-primary-200 transition-all" onClick={() => navigate('/leads')}>
          <p className="text-3xl font-bold text-gray-900">{stats?.leads?.pending || 0}</p>
          <p className="text-sm text-gray-500">Pending Leads</p>
        </div>
        <div className="card text-center cursor-pointer hover:shadow-md hover:border-primary-200 transition-all" onClick={() => navigate('/service-orders')}>
          <p className="text-3xl font-bold text-gray-900">{stats?.serviceOrders?.completedToday || 0}</p>
          <p className="text-sm text-gray-500">Completed Today</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
