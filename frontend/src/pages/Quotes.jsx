import React, { useState, useEffect } from 'react';
import { quoteService, leadService, customerService, serviceTypeService } from '../services/api';
import { useConfig } from '../context/ConfigContext';
import { FiPlus, FiSearch, FiEdit2, FiX, FiSend, FiCheck, FiFileText, FiDollarSign } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Quotes = () => {
  const { getOptions, getLabel } = useConfig();
  const quoteStatuses = getOptions('quoteStatuses');
  const [quotes, setQuotes] = useState([]);
  const [leads, setLeads] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [formData, setFormData] = useState({ leadId: '', customerId: '', validUntil: '', items: [{ serviceTypeId: '', description: '', quantity: 1, unitPrice: 0 }], discount: 0, notes: '' });

  useEffect(() => { loadQuotes(); loadLeads(); loadCustomers(); loadServiceTypes(); }, [search, statusFilter]);

  const loadQuotes = async () => { try { setLoading(true); const response = await quoteService.getAll({ search: search || undefined, status: statusFilter || undefined }); setQuotes(response.data.quotes || []); } catch (error) { toast.error('Failed to load quotes'); } finally { setLoading(false); } };
  const loadLeads = async () => { try { const response = await leadService.getAll({ limit: 100 }); setLeads(response.data.leads || []); } catch (error) {} };
  const loadCustomers = async () => { try { const response = await customerService.getAll({ limit: 100 }); setCustomers(response.data.customers || []); } catch (error) {} };
  const loadServiceTypes = async () => { try { const response = await serviceTypeService.getAll(); setServiceTypes(response.data || []); } catch (error) {} };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      leadId: formData.leadId || undefined,
      customerId: formData.customerId || undefined,
      validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : undefined,
      items: formData.items.filter(i => i.serviceTypeId && i.unitPrice > 0).map(item => ({
        ...item,
        quantity: parseFloat(item.quantity) || 1,
        unitPrice: parseFloat(item.unitPrice) || 0
      })),
      discount: parseFloat(formData.discount) || 0
    };
    try {
      if (selectedQuote) { await quoteService.update(selectedQuote.id, data); toast.success('Quote updated'); }
      else { await quoteService.create(data); toast.success('Quote created'); }
      setModalOpen(false); loadQuotes();
    } catch (error) { toast.error(error.response?.data?.error || 'Failed to save quote'); }
  };

  const handleSend = async (quote) => { try { await quoteService.send(quote.id); toast.success('Quote sent!'); loadQuotes(); } catch (error) { toast.error('Failed to send'); } };
  const handleAccept = async (quote) => { try { await quoteService.accept(quote.id); toast.success('Quote accepted!'); loadQuotes(); } catch (error) { toast.error('Failed to accept'); } };

  const handleEdit = (quote) => {
    setSelectedQuote(quote);
    setFormData({ leadId: quote.leadId || '', customerId: quote.customerId || '', validUntil: quote.validUntil?.split('T')[0] || '', items: quote.lineItems?.length ? quote.lineItems.map(i => ({ serviceTypeId: i.serviceType, description: i.description, quantity: i.quantity, unitPrice: i.unitPrice })) : [{ serviceTypeId: '', description: '', quantity: 1, unitPrice: 0 }], discount: quote.discount || 0, notes: quote.notes || '' });
    setModalOpen(true);
  };

  const handleAdd = () => { setSelectedQuote(null); const validDate = new Date(); validDate.setDate(validDate.getDate() + 30); setFormData({ leadId: '', customerId: '', validUntil: validDate.toISOString().split('T')[0], items: [{ serviceTypeId: '', description: '', quantity: 1, unitPrice: 0 }], discount: 0, notes: '' }); setModalOpen(true); };

  const addItem = () => setFormData({ ...formData, items: [...formData.items, { serviceTypeId: '', description: '', quantity: 1, unitPrice: 0 }] });
  const removeItem = (index) => setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  const updateItem = (index, field, value) => { const items = [...formData.items]; items[index][field] = value; setFormData({ ...formData, items }); };

  const calculateTotal = () => { const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0); return subtotal - (formData.discount || 0); };

  const getStatusBadge = (status) => { const colors = { DRAFT: 'badge-gray', SENT: 'badge-blue', VIEWED: 'badge-yellow', ACCEPTED: 'badge-green', REJECTED: 'badge-red', EXPIRED: 'badge-gray' }; return colors[status] || 'badge-gray'; };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
        <button onClick={handleAdd} className="btn btn-primary flex items-center gap-2"><FiPlus className="w-5 h-5" /> New Quote</button>
      </div>

      <div className="card"><div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search quotes..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" /></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select"><option value="">All Statuses</option>{quoteStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
      </div></div>

      <div className="card p-0 overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full spinner" /></div> : (
          <div className="table-container"><table className="table"><thead><tr><th>Quote #</th><th>Customer/Lead</th><th>Total</th><th>Valid Until</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody className="divide-y divide-gray-200">{quotes.map((quote) => (
              <tr key={quote.id}>
                <td className="font-mono">{quote.quoteNumber}</td>
                <td>{quote.customer ? `${quote.customer.firstName} ${quote.customer.lastName}` : quote.lead ? `${quote.lead.firstName} ${quote.lead.lastName}` : '-'}</td>
                <td className="font-semibold">${quote.total?.toLocaleString()}</td>
                <td>{quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : '-'}</td>
                <td><span className={`badge ${getStatusBadge(quote.status)}`}>{getLabel('quoteStatuses', quote.status)}</span></td>
                <td><div className="flex gap-2">
                  <button onClick={() => handleEdit(quote)} className="p-2 hover:bg-gray-100 rounded-lg"><FiEdit2 className="w-4 h-4" /></button>
                  {quote.status === 'DRAFT' && <button onClick={() => handleSend(quote)} className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg" title="Send Quote"><FiSend className="w-4 h-4" /></button>}
                  {(quote.status === 'SENT' || quote.status === 'VIEWED') && <button onClick={() => handleAccept(quote)} className="p-2 hover:bg-green-100 text-green-600 rounded-lg" title="Mark Accepted"><FiCheck className="w-4 h-4" /></button>}
                </div></td>
              </tr>
            ))}</tbody></table></div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b"><h2 className="text-xl font-semibold">{selectedQuote ? 'Edit Quote' : 'New Quote'}</h2><button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX className="w-5 h-5" /></button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Lead</label><select value={formData.leadId} onChange={(e) => setFormData({ ...formData, leadId: e.target.value, customerId: '' })} className="select"><option value="">Select Lead</option>{leads.map((l) => <option key={l.id} value={l.id}>{l.firstName} {l.lastName}</option>)}</select></div>
                <div><label className="label">Or Customer</label><select value={formData.customerId} onChange={(e) => setFormData({ ...formData, customerId: e.target.value, leadId: '' })} className="select"><option value="">Select Customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}</select></div>
              </div>
              <div><label className="label">Valid Until</label><input type="date" value={formData.validUntil} onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })} className="input" /></div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Line Items</h3><button type="button" onClick={addItem} className="btn btn-secondary btn-sm">Add Item</button></div>
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-4"><select value={item.serviceTypeId} onChange={(e) => updateItem(index, 'serviceTypeId', e.target.value)} className="select text-sm"><option value="">Service Type</option>{serviceTypes.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}</select></div>
                    <div className="col-span-3"><input type="text" placeholder="Description" value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} className="input text-sm" /></div>
                    <div className="col-span-2"><input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)} className="input text-sm" /></div>
                    <div className="col-span-2"><input type="number" step="0.01" placeholder="Price" value={item.unitPrice} onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)} className="input text-sm" /></div>
                    <div className="col-span-1"><button type="button" onClick={() => removeItem(index)} className="p-2 hover:bg-red-100 text-red-600 rounded"><FiX className="w-4 h-4" /></button></div>
                  </div>
                ))}
                <div className="flex justify-end gap-4 mt-4 pt-4 border-t">
                  <div><label className="label text-sm">Discount</label><input type="number" step="0.01" value={formData.discount} onChange={(e) => setFormData({ ...formData, discount: e.target.value })} className="input w-32" /></div>
                  <div className="text-right"><p className="text-sm text-gray-500">Total</p><p className="text-2xl font-bold">${calculateTotal().toFixed(2)}</p></div>
                </div>
              </div>

              <div><label className="label">Notes</label><textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input" rows={2} /></div>
              <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button><button type="submit" className="btn btn-primary">{selectedQuote ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quotes;
