import React, { useEffect, useState } from 'react';
import api from '../services/api';

const ChemicalInventoryTracker = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    productId: '',
    quantity: '',
    areasTreated: '',
    notes: '',
    technicianName: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/custom-views/chemical-inventory')
      .then(res => { setData(res.data); setLoading(false); })
      .catch(err => { setError(err.response?.data?.error || err.message); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setAlert('');
    try {
      const payload = {
        ...form,
        quantity: parseFloat(form.quantity),
        areasTreated: form.areasTreated.split(',').map(s => s.trim()).filter(Boolean),
      };
      const res = await api.post('/custom-views/chemical-inventory', payload);
      if (res.data.alert) setAlert(res.data.alert);
      else setAlert('Application recorded.');
      setForm({ productId: '', quantity: '', areasTreated: '', notes: '', technicianName: '' });
      load();
    } catch (err) {
      setAlert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-900">Chemical Inventory Tracker</h3>
      <p className="text-sm text-gray-500 mb-3">Record chemical applications. Alerts when stock falls at/below reorder level.</p>

      {loading && <div className="text-gray-500 py-3">Loading inventory...</div>}
      {error && <div className="text-red-600 py-3">Error: {error}</div>}

      {!loading && data && (
        <>
          {data.lowStockAlerts && data.lowStockAlerts.length > 0 && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded">
              <div className="font-semibold text-red-800 text-sm mb-1">Low Stock Alerts ({data.lowStockAlerts.length})</div>
              <ul className="text-sm text-red-700 list-disc list-inside">
                {data.lowStockAlerts.slice(0, 5).map(i => (
                  <li key={i.id}>{i.name} - {i.inStock} {i.unitOfMeasure} (reorder at {i.reorderLevel})</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 p-3 border rounded bg-gray-50">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chemical / Product</label>
              <select
                required
                value={form.productId}
                onChange={e => setForm({ ...form, productId: e.target.value })}
                className="w-full border rounded px-2 py-1 text-sm"
              >
                <option value="">Select product</option>
                {data.inventory.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.inStock} {p.unitOfMeasure} in stock){p.low ? ' - LOW' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Applied</label>
              <input
                required
                type="number"
                step="0.01"
                value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Areas Treated (comma sep)</label>
              <input
                value={form.areasTreated}
                onChange={e => setForm({ ...form, areasTreated: e.target.value })}
                placeholder="kitchen, basement"
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Technician</label>
              <input
                value={form.technicianName}
                onChange={e => setForm({ ...form, technicianName: e.target.value })}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
            <div className="md:col-span-2 flex items-center justify-between">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
              >
                {submitting ? 'Recording...' : 'Record Application'}
              </button>
              {alert && <div className="text-sm text-gray-700">{alert}</div>}
            </div>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <h4 className="font-semibold text-gray-900 text-sm mb-2">Inventory ({data.total})</h4>
              <div className="border rounded max-h-72 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">EPA #</th>
                      <th className="text-right p-2">In Stock</th>
                      <th className="text-right p-2">Reorder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.inventory.map(i => (
                      <tr key={i.id} className={i.low ? 'bg-red-50' : ''}>
                        <td className="p-2">{i.name}</td>
                        <td className="p-2">{i.epaNumber || '-'}</td>
                        <td className="p-2 text-right">{i.inStock} {i.unitOfMeasure}</td>
                        <td className="p-2 text-right">{i.reorderLevel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm mb-2">Recent Applications ({data.applicationLog.length})</h4>
              <div className="border rounded max-h-72 overflow-auto">
                {data.applicationLog.length === 0 && <div className="p-3 text-sm text-gray-500">No applications recorded yet.</div>}
                {data.applicationLog.map(a => (
                  <div key={a.id} className="p-2 border-b text-xs">
                    <div className="font-medium">{a.productName} - {a.quantity} {a.unit}</div>
                    <div className="text-gray-500">{new Date(a.appliedAt).toLocaleString()} - {a.technicianName}</div>
                    {a.areasTreated.length > 0 && <div>Areas: {a.areasTreated.join(', ')}</div>}
                    <div className={a.lowStock ? 'text-red-600' : 'text-gray-600'}>Remaining: {a.remaining}{a.lowStock ? ' (LOW)' : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChemicalInventoryTracker;
