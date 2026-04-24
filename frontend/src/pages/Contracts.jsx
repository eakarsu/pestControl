import React, { useState, useEffect } from 'react';
import { contractService, customerService } from '../services/api';
import { useConfig } from '../context/ConfigContext';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiX, FiFileText } from 'react-icons/fi';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import SortableHeader from '../components/SortableHeader';
import BulkActionBar from '../components/BulkActionBar';
import RowDetailPanel, { DetailField } from '../components/RowDetailPanel';
import { TableSkeleton } from '../components/LoadingSkeleton';

const Contracts = () => {
  const { getOptions, getLabel } = useConfig();
  const contractTypes = getOptions('contractTypes');
  const contractStatuses = getOptions('contractStatuses');
  const billingFrequencies = getOptions('billingFrequencies');
  const [contracts, setContracts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [formData, setFormData] = useState({
    customerId: '', name: '', contractType: 'RECURRING', startDate: '', endDate: '',
    billingFrequency: 'MONTHLY', contractValue: '', terms: '', autoRenew: false
  });

  // Sort state
  const [sort, setSort] = useState({ field: null, order: null });

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Row detail panel
  const [detailContract, setDetailContract] = useState(null);

  useEffect(() => { loadContracts(); loadCustomers(); }, [page, statusFilter, sort]);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const params = {
        page, limit: 20,
        status: statusFilter || undefined
      };
      if (sort.field) { params.sortBy = sort.field; params.sortOrder = sort.order; }
      const response = await contractService.getAll(params);
      setContracts(response.data.contracts);
      setPagination(response.data.pagination);
      setSelectedIds(new Set());
    } catch (error) { toast.error('Failed to load contracts'); }
    finally { setLoading(false); }
  };

  const loadCustomers = async () => {
    try { const response = await customerService.getAll({ limit: 100 }); setCustomers(response.data.customers || []); } catch (error) {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        contractValue: parseFloat(formData.contractValue) || 0,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined
      };
      if (selectedContract) { await contractService.update(selectedContract.id, submitData); toast.success('Contract updated'); }
      else { await contractService.create(submitData); toast.success('Contract created'); }
      setModalOpen(false); loadContracts();
    } catch (error) { toast.error('Failed to save contract'); }
  };

  const handleDelete = (contract) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Contract',
      message: `Are you sure you want to delete "${contract.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await contractService.delete(contract.id);
          toast.success('Contract deleted successfully');
          setDetailContract(null);
          loadContracts();
        } catch (error) {
          toast.error('Failed to delete contract');
        }
      }
    });
  };

  const handleEdit = (contract) => {
    setSelectedContract(contract);
    setFormData({
      customerId: contract.customerId, name: contract.name, contractType: contract.contractType,
      startDate: contract.startDate?.split('T')[0] || '', endDate: contract.endDate?.split('T')[0] || '',
      billingFrequency: contract.billingFrequency, contractValue: contract.contractValue, terms: contract.terms || '', autoRenew: contract.autoRenew
    });
    setModalOpen(true);
    setDetailContract(null);
  };

  const handleAdd = () => {
    setSelectedContract(null);
    setFormData({ customerId: '', name: '', contractType: 'RECURRING', startDate: '', endDate: '', billingFrequency: 'MONTHLY', contractValue: '', terms: '', autoRenew: false });
    setModalOpen(true);
  };

  // Bulk operations
  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === contracts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contracts.map(c => c.id)));
    }
  };

  const handleBulkDelete = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Selected Contracts',
      message: `Are you sure you want to delete ${selectedIds.size} contract(s)? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await contractService.bulkDelete([...selectedIds]);
          toast.success(`${selectedIds.size} contracts deleted`);
          setSelectedIds(new Set());
          loadContracts();
        } catch (error) {
          toast.error('Failed to delete contracts');
        }
      }
    });
  };

  const handleBulkUpdate = async (data) => {
    try {
      await contractService.bulkUpdate([...selectedIds], data);
      toast.success(`${selectedIds.size} contracts updated`);
      setSelectedIds(new Set());
      loadContracts();
    } catch (error) {
      toast.error('Failed to update contracts');
    }
  };

  const handleRowClick = (contract) => {
    setDetailContract(contract);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
        <button onClick={handleAdd} className="btn btn-primary flex items-center gap-2"><FiPlus className="w-5 h-5" /> New Contract</button>
      </div>

      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="select">
            <option value="">All Statuses</option>
            {contractStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <div className="text-sm text-gray-500 flex items-center">
            {pagination && `Showing ${contracts.length} of ${pagination.total} contracts`}
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onBulkDelete={handleBulkDelete}
        onBulkUpdate={handleBulkUpdate}
        onClearSelection={() => setSelectedIds(new Set())}
        statusOptions={contractStatuses}
      />

      {/* Table */}
      {loading ? <TableSkeleton rows={8} cols={7} /> : contracts.length === 0 ? (
        <div className="card"><div className="text-center py-12"><p className="text-gray-500">No contracts found</p></div></div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-10">
                    <input type="checkbox" checked={selectedIds.size === contracts.length && contracts.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300" />
                  </th>
                  <SortableHeader label="Contract" field="contractNumber" currentSort={sort} onSort={setSort} />
                  <SortableHeader label="Name" field="name" currentSort={sort} onSort={setSort} />
                  <th>Customer</th>
                  <SortableHeader label="Type" field="contractType" currentSort={sort} onSort={setSort} />
                  <SortableHeader label="Value" field="contractValue" currentSort={sort} onSort={setSort} />
                  <SortableHeader label="Status" field="status" currentSort={sort} onSort={setSort} />
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {contracts.map((contract) => (
                  <tr key={contract.id} className={`cursor-pointer ${selectedIds.has(contract.id) ? 'bg-primary-50' : ''}`} onClick={() => handleRowClick(contract)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(contract.id)} onChange={() => toggleSelect(contract.id)} className="rounded border-gray-300" />
                    </td>
                    <td>
                      <p className="text-sm text-gray-500">{contract.contractNumber}</p>
                    </td>
                    <td>
                      <p className="font-medium">{contract.name}</p>
                    </td>
                    <td>{contract.customer?.firstName} {contract.customer?.lastName}</td>
                    <td><span className="badge badge-gray">{getLabel('contractTypes', contract.contractType)}</span></td>
                    <td>${contract.contractValue?.toLocaleString()}</td>
                    <td><span className={`badge ${contract.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>{getLabel('contractStatuses', contract.status)}</span></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(contract)} className="p-2 hover:bg-gray-100 rounded-lg" title="Edit"><FiEdit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(contract)} className="p-2 hover:bg-red-100 text-red-600 rounded-lg" title="Delete"><FiTrash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(page - 1)} disabled={page === 1} className="btn btn-secondary">Previous</button>
          <span className="text-sm text-gray-500">Page {page} of {pagination.pages}</span>
          <button onClick={() => setPage(page + 1)} disabled={page === pagination.pages} className="btn btn-secondary">Next</button>
        </div>
      )}

      {/* Contract Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">{selectedContract ? 'Edit Contract' : 'New Contract'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="label">Customer *</label><select value={formData.customerId} onChange={(e) => setFormData({ ...formData, customerId: e.target.value })} className="select" required>
                <option value="">Select Customer</option>{customers.map((c) => (<option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>))}
              </select></div>
              <div><label className="label">Contract Name *</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Type</label><select value={formData.contractType} onChange={(e) => setFormData({ ...formData, contractType: e.target.value })} className="select">
                  {contractTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select></div>
                <div><label className="label">Billing Frequency</label><select value={formData.billingFrequency} onChange={(e) => setFormData({ ...formData, billingFrequency: e.target.value })} className="select">
                  {billingFrequencies.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Start Date *</label><input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="input" required /></div>
                <div><label className="label">End Date</label><input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="input" /></div>
              </div>
              <div><label className="label">Contract Value *</label><input type="number" step="0.01" value={formData.contractValue} onChange={(e) => setFormData({ ...formData, contractValue: e.target.value })} className="input" required /></div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{selectedContract ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Delete"
        variant="danger"
      />

      {/* Row Detail Panel */}
      <RowDetailPanel
        isOpen={!!detailContract}
        onClose={() => setDetailContract(null)}
        title={detailContract ? detailContract.name : ''}
        onEdit={() => handleEdit(detailContract)}
        onDelete={() => handleDelete(detailContract)}
      >
        {detailContract && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Contract Number" value={detailContract.contractNumber} />
              <DetailField label="Name" value={detailContract.name} />
              <DetailField label="Customer" value={detailContract.customer ? `${detailContract.customer.firstName} ${detailContract.customer.lastName}` : ''} />
              <DetailField label="Type" value={getLabel('contractTypes', detailContract.contractType)} />
              <DetailField label="Value" value={`$${detailContract.contractValue?.toLocaleString()}`} />
              <DetailField label="Status" value={getLabel('contractStatuses', detailContract.status)} />
              <DetailField label="Billing Frequency" value={getLabel('billingFrequencies', detailContract.billingFrequency)} />
              <DetailField label="Auto Renew" value={detailContract.autoRenew ? 'Yes' : 'No'} />
            </div>
            <DetailField label="Start Date" value={detailContract.startDate ? new Date(detailContract.startDate).toLocaleDateString() : ''} />
            <DetailField label="End Date" value={detailContract.endDate ? new Date(detailContract.endDate).toLocaleDateString() : ''} />
            <DetailField label="Terms" value={detailContract.terms} />
            <DetailField label="Created" value={new Date(detailContract.createdAt).toLocaleDateString()} />
          </div>
        )}
      </RowDetailPanel>
    </div>
  );
};

export default Contracts;
