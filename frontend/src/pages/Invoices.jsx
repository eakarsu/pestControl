import React, { useState, useEffect } from 'react';
import { invoiceService, customerService } from '../services/api';
import { useConfig } from '../context/ConfigContext';
import { FiPlus, FiSearch, FiEdit2, FiDollarSign, FiX, FiSend } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Invoices = () => {
  const { getOptions, getLabel } = useConfig();
  const invoiceStatuses = getOptions('invoiceStatuses');
  const paymentMethods = getOptions('paymentMethods');
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [formData, setFormData] = useState({ customerId: '', dueDate: '', tax: 0, notes: '', lineItems: [{ description: '', quantity: 1, unitPrice: 0 }] });
  const [paymentData, setPaymentData] = useState({ amount: 0, paymentMethod: 'CREDIT_CARD', notes: '' });

  useEffect(() => { loadInvoices(); loadCustomers(); }, [page, statusFilter]);

  const loadInvoices = async () => {
    try { setLoading(true); const response = await invoiceService.getAll({ page, limit: 20, status: statusFilter || undefined }); setInvoices(response.data.invoices); setPagination(response.data.pagination); }
    catch (error) { toast.error('Failed to load invoices'); } finally { setLoading(false); }
  };

  const loadCustomers = async () => { try { const response = await customerService.getAll({ limit: 100 }); setCustomers(response.data.customers || []); } catch (error) {} };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        tax: parseFloat(formData.tax) || 0,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        lineItems: formData.lineItems.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice) || 0
        }))
      };
      await invoiceService.create(submitData);
      toast.success('Invoice created');
      setModalOpen(false);
      loadInvoices();
    } catch (error) { toast.error('Failed to create invoice'); }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try { await invoiceService.recordPayment(selectedInvoice.id, paymentData); toast.success('Payment recorded'); setPaymentModalOpen(false); loadInvoices(); }
    catch (error) { toast.error('Failed to record payment'); }
  };

  const handleSend = async (invoice) => {
    try { await invoiceService.send(invoice.id); toast.success('Invoice sent'); loadInvoices(); } catch (error) { toast.error('Failed to send'); }
  };

  const openPaymentModal = (invoice) => { setSelectedInvoice(invoice); setPaymentData({ amount: invoice.total - invoice.amountPaid, paymentMethod: 'CREDIT_CARD', notes: '' }); setPaymentModalOpen(true); };

  const addLineItem = () => setFormData({ ...formData, lineItems: [...formData.lineItems, { description: '', quantity: 1, unitPrice: 0 }] });
  const updateLineItem = (index, field, value) => { const items = [...formData.lineItems]; items[index][field] = value; setFormData({ ...formData, lineItems: items }); };
  const removeLineItem = (index) => setFormData({ ...formData, lineItems: formData.lineItems.filter((_, i) => i !== index) });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <button onClick={() => { setFormData({ customerId: '', dueDate: '', tax: 0, notes: '', lineItems: [{ description: '', quantity: 1, unitPrice: 0 }] }); setModalOpen(true); }} className="btn btn-primary flex items-center gap-2"><FiPlus className="w-5 h-5" /> New Invoice</button>
      </div>

      <div className="card"><select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="select w-48">
        <option value="">All Statuses</option>
        {invoiceStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select></div>

      <div className="card p-0 overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full spinner" /></div> : (
          <div className="table-container"><table className="table"><thead><tr><th>Invoice #</th><th>Customer</th><th>Date</th><th>Amount</th><th>Paid</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody className="divide-y divide-gray-200">{invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td className="font-medium">{invoice.invoiceNumber}</td>
                <td>{invoice.customer?.firstName} {invoice.customer?.lastName}</td>
                <td>{new Date(invoice.issueDate).toLocaleDateString()}</td>
                <td>${invoice.total?.toLocaleString()}</td>
                <td>${invoice.amountPaid?.toLocaleString()}</td>
                <td><span className={`badge ${invoice.status === 'PAID' ? 'badge-green' : invoice.status === 'OVERDUE' ? 'badge-red' : 'badge-yellow'}`}>{getLabel('invoiceStatuses', invoice.status)}</span></td>
                <td><div className="flex gap-2">
                  {invoice.status !== 'PAID' && <button onClick={() => openPaymentModal(invoice)} className="p-2 hover:bg-gray-100 rounded-lg" title="Record Payment"><FiDollarSign className="w-4 h-4" /></button>}
                  {invoice.status === 'PENDING' && <button onClick={() => handleSend(invoice)} className="p-2 hover:bg-gray-100 rounded-lg" title="Send"><FiSend className="w-4 h-4" /></button>}
                </div></td>
              </tr>
            ))}</tbody></table></div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b"><h2 className="text-xl font-semibold">New Invoice</h2><button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX className="w-5 h-5" /></button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Customer *</label><select value={formData.customerId} onChange={(e) => setFormData({ ...formData, customerId: e.target.value })} className="select" required><option value="">Select Customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}</select></div>
                <div><label className="label">Due Date *</label><input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} className="input" required /></div>
              </div>
              <div><label className="label">Line Items</label>{formData.lineItems.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                  <input type="text" placeholder="Description" value={item.description} onChange={(e) => updateLineItem(i, 'description', e.target.value)} className="input col-span-6" />
                  <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateLineItem(i, 'quantity', e.target.value)} className="input col-span-2" />
                  <input type="number" step="0.01" placeholder="Price" value={item.unitPrice} onChange={(e) => updateLineItem(i, 'unitPrice', e.target.value)} className="input col-span-3" />
                  <button type="button" onClick={() => removeLineItem(i)} className="btn btn-secondary col-span-1"><FiX /></button>
                </div>
              ))}<button type="button" onClick={addLineItem} className="btn btn-secondary btn-sm">Add Line Item</button></div>
              <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button><button type="submit" className="btn btn-primary">Create Invoice</button></div>
            </form>
          </div>
        </div>
      )}

      {paymentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b"><h2 className="text-xl font-semibold">Record Payment</h2><button onClick={() => setPaymentModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX className="w-5 h-5" /></button></div>
            <form onSubmit={handlePayment} className="p-6 space-y-4">
              <div><label className="label">Amount *</label><input type="number" step="0.01" value={paymentData.amount} onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) })} className="input" required /></div>
              <div><label className="label">Payment Method</label><select value={paymentData.paymentMethod} onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })} className="select">{paymentMethods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
              <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setPaymentModalOpen(false)} className="btn btn-secondary">Cancel</button><button type="submit" className="btn btn-primary">Record Payment</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
