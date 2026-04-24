import React, { useState, useEffect } from 'react';
import { invoiceService, customerService } from '../services/api';
import { useConfig } from '../context/ConfigContext';
import { FiPlus, FiSearch, FiEdit2, FiDollarSign, FiX, FiSend, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import SortableHeader from '../components/SortableHeader';
import BulkActionBar from '../components/BulkActionBar';
import RowDetailPanel, { DetailField } from '../components/RowDetailPanel';
import { TableSkeleton } from '../components/LoadingSkeleton';

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

  const [sort, setSort] = useState({ field: null, order: null });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [detailInvoice, setDetailInvoice] = useState(null);

  useEffect(() => { loadInvoices(); loadCustomers(); }, [page, statusFilter, sort]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20, status: statusFilter || undefined };
      if (sort.field) { params.sortBy = sort.field; params.sortOrder = sort.order; }
      const response = await invoiceService.getAll(params);
      setInvoices(response.data.invoices); setPagination(response.data.pagination); setSelectedIds(new Set());
    } catch (error) { toast.error('Failed to load invoices'); }
    finally { setLoading(false); }
  };

  const loadCustomers = async () => { try { const response = await customerService.getAll({ limit: 100 }); setCustomers(response.data.customers || []); } catch (error) {} };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData, tax: parseFloat(formData.tax) || 0, dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined, lineItems: formData.lineItems.map(item => ({ ...item, quantity: parseFloat(item.quantity) || 1, unitPrice: parseFloat(item.unitPrice) || 0 })) };
      await invoiceService.create(submitData); toast.success('Invoice created'); setModalOpen(false); loadInvoices();
    } catch (error) { toast.error('Failed to create invoice'); }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try { await invoiceService.recordPayment(selectedInvoice.id, paymentData); toast.success('Payment recorded'); setPaymentModalOpen(false); loadInvoices(); }
    catch (error) { toast.error('Failed to record payment'); }
  };

  const handleSend = async (invoice) => { try { await invoiceService.send(invoice.id); toast.success('Invoice sent'); loadInvoices(); } catch (error) { toast.error('Failed to send'); } };
  const openPaymentModal = (invoice) => { setSelectedInvoice(invoice); setPaymentData({ amount: invoice.total - invoice.amountPaid, paymentMethod: 'CREDIT_CARD', notes: '' }); setPaymentModalOpen(true); };

  const handleDelete = (invoice) => {
    setConfirmDialog({
      isOpen: true, title: 'Delete Invoice', message: `Delete invoice ${invoice.invoiceNumber}? This cannot be undone.`,
      onConfirm: async () => { try { await invoiceService.delete(invoice.id); toast.success('Invoice deleted'); setDetailInvoice(null); loadInvoices(); } catch (error) { toast.error('Failed'); } }
    });
  };

  const addLineItem = () => setFormData({ ...formData, lineItems: [...formData.lineItems, { description: '', quantity: 1, unitPrice: 0 }] });
  const updateLineItem = (index, field, value) => { const items = [...formData.lineItems]; items[index][field] = value; setFormData({ ...formData, lineItems: items }); };
  const removeLineItem = (index) => setFormData({ ...formData, lineItems: formData.lineItems.filter((_, i) => i !== index) });

  const toggleSelect = (id) => { const next = new Set(selectedIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedIds(next); };
  const toggleSelectAll = () => { selectedIds.size === invoices.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(invoices.map(i => i.id))); };

  const handleBulkDelete = () => {
    setConfirmDialog({
      isOpen: true, title: 'Delete Selected Invoices', message: `Delete ${selectedIds.size} invoice(s)?`,
      onConfirm: async () => { try { await invoiceService.bulkDelete([...selectedIds]); toast.success(`${selectedIds.size} invoices deleted`); setSelectedIds(new Set()); loadInvoices(); } catch (error) { toast.error('Failed'); } }
    });
  };

  const handleBulkUpdate = async (data) => {
    try { await invoiceService.bulkUpdate([...selectedIds], data); toast.success(`${selectedIds.size} invoices updated`); setSelectedIds(new Set()); loadInvoices(); }
    catch (error) { toast.error('Failed'); }
  };

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

      <BulkActionBar selectedCount={selectedIds.size} onBulkDelete={handleBulkDelete} onBulkUpdate={handleBulkUpdate} onClearSelection={() => setSelectedIds(new Set())} statusOptions={invoiceStatuses} />

      {loading ? <TableSkeleton rows={8} cols={8} /> : (
        <div className="card p-0 overflow-hidden">
          <div className="table-container"><table className="table"><thead><tr>
            <th className="w-10"><input type="checkbox" checked={selectedIds.size === invoices.length && invoices.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300" /></th>
            <SortableHeader label="Invoice #" field="invoiceNumber" currentSort={sort} onSort={setSort} />
            <th>Customer</th>
            <SortableHeader label="Date" field="issueDate" currentSort={sort} onSort={setSort} />
            <SortableHeader label="Amount" field="total" currentSort={sort} onSort={setSort} />
            <th>Paid</th>
            <SortableHeader label="Status" field="status" currentSort={sort} onSort={setSort} />
            <th>Actions</th>
          </tr></thead>
            <tbody className="divide-y divide-gray-200">{invoices.map((invoice) => (
              <tr key={invoice.id} className={`cursor-pointer ${selectedIds.has(invoice.id) ? 'bg-primary-50' : ''}`} onClick={() => setDetailInvoice(invoice)}>
                <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(invoice.id)} onChange={() => toggleSelect(invoice.id)} className="rounded border-gray-300" /></td>
                <td className="font-medium">{invoice.invoiceNumber}</td>
                <td>{invoice.customer?.firstName} {invoice.customer?.lastName}</td>
                <td>{new Date(invoice.issueDate).toLocaleDateString()}</td>
                <td>${invoice.total?.toLocaleString()}</td>
                <td>${invoice.amountPaid?.toLocaleString()}</td>
                <td><span className={`badge ${invoice.status === 'PAID' ? 'badge-green' : invoice.status === 'OVERDUE' ? 'badge-red' : 'badge-yellow'}`}>{getLabel('invoiceStatuses', invoice.status)}</span></td>
                <td onClick={(e) => e.stopPropagation()}><div className="flex gap-2">
                  {invoice.status !== 'PAID' && <button onClick={() => openPaymentModal(invoice)} className="p-2 hover:bg-gray-100 rounded-lg" title="Record Payment"><FiDollarSign className="w-4 h-4" /></button>}
                  {invoice.status === 'PENDING' && <button onClick={() => handleSend(invoice)} className="p-2 hover:bg-gray-100 rounded-lg" title="Send"><FiSend className="w-4 h-4" /></button>}
                  <button onClick={() => handleDelete(invoice)} className="p-2 hover:bg-red-100 text-red-600 rounded-lg"><FiTrash2 className="w-4 h-4" /></button>
                </div></td>
              </tr>
            ))}</tbody></table></div>
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(page - 1)} disabled={page === 1} className="btn btn-secondary">Previous</button>
          <span className="text-sm text-gray-500">Page {page} of {pagination.pages}</span>
          <button onClick={() => setPage(page + 1)} disabled={page === pagination.pages} className="btn btn-secondary">Next</button>
        </div>
      )}

      {/* Create Invoice Modal */}
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

      {/* Payment Modal */}
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

      <ConfirmDialog isOpen={confirmDialog.isOpen} onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} onConfirm={confirmDialog.onConfirm} title={confirmDialog.title} message={confirmDialog.message} confirmText="Confirm" variant="danger" />

      <RowDetailPanel isOpen={!!detailInvoice} onClose={() => setDetailInvoice(null)} title={detailInvoice?.invoiceNumber || ''} onDelete={() => handleDelete(detailInvoice)}>
        {detailInvoice && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Invoice #" value={detailInvoice.invoiceNumber} />
              <DetailField label="Customer" value={`${detailInvoice.customer?.firstName} ${detailInvoice.customer?.lastName}`} />
              <DetailField label="Issue Date" value={new Date(detailInvoice.issueDate).toLocaleDateString()} />
              <DetailField label="Due Date" value={new Date(detailInvoice.dueDate).toLocaleDateString()} />
              <DetailField label="Subtotal" value={`$${detailInvoice.subtotal?.toLocaleString()}`} />
              <DetailField label="Tax" value={`$${detailInvoice.tax?.toLocaleString()}`} />
              <DetailField label="Total" value={`$${detailInvoice.total?.toLocaleString()}`} />
              <DetailField label="Amount Paid" value={`$${detailInvoice.amountPaid?.toLocaleString()}`} />
              <DetailField label="Status" value={getLabel('invoiceStatuses', detailInvoice.status)} />
            </div>
            {detailInvoice.lineItems?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Line Items</h4>
                <div className="space-y-2">
                  {detailInvoice.lineItems.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                      <span>{item.description}</span>
                      <span>${item.total?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </RowDetailPanel>
    </div>
  );
};

export default Invoices;
