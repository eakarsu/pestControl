import React, { useState, useEffect } from 'react';
import { reportService } from '../services/api';
import { FiDownload, FiCalendar, FiTrendingUp, FiDollarSign, FiUsers, FiMapPin, FiPackage } from 'react-icons/fi';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

const Reports = () => {
  const [activeReport, setActiveReport] = useState('revenue');
  const [dateRange, setDateRange] = useState({ start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] });
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  useEffect(() => { loadReport(); }, [activeReport, dateRange]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const response = await reportService.generate({ type: activeReport, startDate: dateRange.start, endDate: dateRange.end });
      setReportData(response.data);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleExport = async (format) => {
    try {
      toast.success(`Exporting ${activeReport} report as ${format.toUpperCase()}...`);
      // In production, this would trigger a file download
    } catch (error) { toast.error('Export failed'); }
  };

  const reports = [
    { id: 'revenue', label: 'Revenue', icon: FiDollarSign },
    { id: 'services', label: 'Services', icon: FiCalendar },
    { id: 'technicians', label: 'Technician Performance', icon: FiUsers },
    { id: 'customers', label: 'Customer Analytics', icon: FiUsers },
    { id: 'products', label: 'Product Usage', icon: FiPackage },
    { id: 'territories', label: 'Territory Analysis', icon: FiMapPin }
  ];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <div className="flex gap-2">
          <button onClick={() => handleExport('pdf')} className="btn btn-secondary flex items-center gap-2"><FiDownload className="w-4 h-4" /> PDF</button>
          <button onClick={() => handleExport('csv')} className="btn btn-secondary flex items-center gap-2"><FiDownload className="w-4 h-4" /> CSV</button>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex gap-2">
            {reports.map((report) => (
              <button key={report.id} onClick={() => setActiveReport(report.id)} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${activeReport === report.id ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                <report.icon className="w-4 h-4" />{report.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 ml-auto">
            <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="input" />
            <span className="self-center text-gray-500">to</span>
            <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="input" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center h-96"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full spinner" /></div>
      ) : reportData ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeReport === 'revenue' && (
            <>
              <div className="card lg:col-span-2">
                <h3 className="font-semibold mb-4">Revenue Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData.timeline || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip formatter={(value) => `$${value.toLocaleString()}`} /><Legend /><Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} /><Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} /></LineChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <h3 className="font-semibold mb-4">Revenue by Service Type</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart><Pie data={reportData.byServiceType || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>{(reportData.byServiceType || []).map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={(value) => `$${value.toLocaleString()}`} /><Legend /></PieChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <h3 className="font-semibold mb-4">Key Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg"><p className="text-sm text-green-600">Total Revenue</p><p className="text-2xl font-bold text-green-700">${reportData.totalRevenue?.toLocaleString() || 0}</p></div>
                  <div className="p-4 bg-blue-50 rounded-lg"><p className="text-sm text-blue-600">Avg per Service</p><p className="text-2xl font-bold text-blue-700">${reportData.avgPerService?.toLocaleString() || 0}</p></div>
                  <div className="p-4 bg-purple-50 rounded-lg"><p className="text-sm text-purple-600">Total Services</p><p className="text-2xl font-bold text-purple-700">{reportData.totalServices || 0}</p></div>
                  <div className="p-4 bg-yellow-50 rounded-lg"><p className="text-sm text-yellow-600">Growth Rate</p><p className="text-2xl font-bold text-yellow-700">{reportData.growthRate || 0}%</p></div>
                </div>
              </div>
            </>
          )}

          {activeReport === 'services' && (
            <>
              <div className="card lg:col-span-2">
                <h3 className="font-semibold mb-4">Services Completed</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.timeline || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Legend /><Bar dataKey="completed" fill="#10B981" name="Completed" /><Bar dataKey="cancelled" fill="#EF4444" name="Cancelled" /></BarChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <h3 className="font-semibold mb-4">By Service Type</h3>
                <div className="space-y-3">{(reportData.byType || []).map((item, i) => (
                  <div key={i} className="flex items-center justify-between"><span>{item.name}</span><span className="font-semibold">{item.count}</span></div>
                ))}</div>
              </div>
              <div className="card">
                <h3 className="font-semibold mb-4">Completion Rate</h3>
                <div className="text-center py-8"><p className="text-5xl font-bold text-primary-600">{reportData.completionRate || 0}%</p><p className="text-gray-500 mt-2">of scheduled services completed</p></div>
              </div>
            </>
          )}

          {activeReport === 'technicians' && (
            <>
              <div className="card lg:col-span-2">
                <h3 className="font-semibold mb-4">Technician Performance</h3>
                <div className="table-container">
                  <table className="table"><thead><tr><th>Technician</th><th>Jobs Completed</th><th>Avg Duration</th><th>Customer Rating</th><th>Revenue Generated</th></tr></thead>
                    <tbody className="divide-y divide-gray-200">{(reportData.technicians || []).map((tech, i) => (
                      <tr key={i}><td className="font-medium">{tech.name}</td><td>{tech.jobsCompleted}</td><td>{tech.avgDuration} min</td><td>{tech.rating}/5</td><td>${tech.revenue?.toLocaleString()}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeReport === 'customers' && (
            <>
              <div className="card">
                <h3 className="font-semibold mb-4">Customer Growth</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={reportData.growth || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Line type="monotone" dataKey="customers" stroke="#3B82F6" strokeWidth={2} /></LineChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <h3 className="font-semibold mb-4">Customer Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span>Total Customers</span><span className="font-bold">{reportData.totalCustomers || 0}</span></div>
                  <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span>New This Period</span><span className="font-bold text-green-600">+{reportData.newCustomers || 0}</span></div>
                  <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span>Retention Rate</span><span className="font-bold">{reportData.retentionRate || 0}%</span></div>
                  <div className="flex justify-between p-3 bg-gray-50 rounded-lg"><span>Avg Lifetime Value</span><span className="font-bold">${reportData.avgLifetimeValue || 0}</span></div>
                </div>
              </div>
            </>
          )}

          {activeReport === 'products' && (
            <>
              <div className="card">
                <h3 className="font-semibold mb-4">Top Products Used</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={reportData.topProducts || []} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={100} /><Tooltip /><Bar dataKey="usage" fill="#3B82F6" /></BarChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <h3 className="font-semibold mb-4">Product Costs</h3>
                <div className="space-y-3">{(reportData.costBreakdown || []).map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg"><span>{item.category}</span><span className="font-semibold">${item.cost?.toLocaleString()}</span></div>
                ))}</div>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-right"><p className="text-sm text-gray-600">Total Product Cost</p><p className="text-2xl font-bold">${reportData.totalProductCost?.toLocaleString() || 0}</p></div>
              </div>
            </>
          )}

          {activeReport === 'territories' && (
            <>
              <div className="card lg:col-span-2">
                <h3 className="font-semibold mb-4">Territory Performance</h3>
                <div className="table-container">
                  <table className="table"><thead><tr><th>Territory</th><th>Customers</th><th>Services</th><th>Revenue</th><th>Avg Response Time</th></tr></thead>
                    <tbody className="divide-y divide-gray-200">{(reportData.territories || []).map((territory, i) => (
                      <tr key={i}><td className="font-medium">{territory.name}</td><td>{territory.customers}</td><td>{territory.services}</td><td>${territory.revenue?.toLocaleString()}</td><td>{territory.avgResponseTime} hrs</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="card text-center py-12"><p className="text-gray-500">Select a report type and date range to generate</p></div>
      )}
    </div>
  );
};

export default Reports;
