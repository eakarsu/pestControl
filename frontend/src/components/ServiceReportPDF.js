import React, { useEffect, useState } from 'react';
import api from '../services/api';

const ServiceReportPDF = () => {
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/customers?limit=50').then(res => {
      const data = res.data;
      const list = Array.isArray(data) ? data : (data.customers || data.data || []);
      setCustomers(list);
    }).catch(() => setCustomers([]));
    api.get('/service-orders?limit=50').then(res => {
      const data = res.data;
      const list = Array.isArray(data) ? data : (data.serviceOrders || data.orders || data.data || []);
      setOrders(list);
    }).catch(() => setOrders([]));
  }, []);

  const generatePDF = async () => {
    setLoading(true);
    setMessage('');
    try {
      const params = new URLSearchParams();
      if (customerId) params.append('customerId', customerId);
      if (orderId) params.append('orderId', orderId);
      const token = localStorage.getItem('token');
      const resp = await fetch(`/api/custom-views/service-report-pdf?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `service-report-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage('PDF downloaded successfully');
    } catch (err) {
      setMessage('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-900">Service Report PDF</h3>
      <p className="text-sm text-gray-500 mb-3">Generate a customer service report with technician, chemicals (EPA reg #), and recommendations.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
          <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
            <option value="">(latest visit auto-pick)</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}{c.companyName ? ` - ${c.companyName}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Specific Visit (Service Order)</label>
          <select value={orderId} onChange={e => setOrderId(e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
            <option value="">(use most recent)</option>
            {orders.map(o => (
              <option key={o.id} value={o.id}>
                {o.orderNumber} - {new Date(o.scheduledDate).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button
        onClick={generatePDF}
        disabled={loading}
        className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
      >
        {loading ? 'Generating...' : 'Generate PDF Report'}
      </button>
      {message && <div className="mt-2 text-sm text-gray-700">{message}</div>}
    </div>
  );
};

export default ServiceReportPDF;
