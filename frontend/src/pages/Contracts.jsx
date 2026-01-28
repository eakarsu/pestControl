import React, { useState, useEffect } from 'react';
import { contractService, customerService } from '../services/api';
import { useConfig } from '../context/ConfigContext';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiX, FiFileText } from 'react-icons/fi';
import toast from 'react-hot-toast';

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

  useEffect(() => { loadContracts(); loadCustomers(); }, [page, statusFilter]);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const response = await contractService.getAll({ page, limit: 20, status: statusFilter || undefined });
      setContracts(response.data.contracts);
      setPagination(response.data.pagination);
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

  const handleEdit = (contract) => {
    setSelectedContract(contract);
    setFormData({
      customerId: contract.customerId, name: contract.name, contractType: contract.contractType,
      startDate: contract.startDate?.split('T')[0] || '', endDate: contract.endDate?.split('T')[0] || '',
      billingFrequency: contract.billingFrequency, contractValue: contract.contractValue, terms: contract.terms || '', autoRenew: contract.autoRenew
    });
    setModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedContract(null);
    setFormData({ customerId: '', name: '', contractType: 'RECURRING', startDate: '', endDate: '', billingFrequency: 'MONTHLY', contractValue: '', terms: '', autoRenew: false });
    setModalOpen(true);
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
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full spinner" /></div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Contract</th><th>Customer</th><th>Type</th><th>Value</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody className="divide-y divide-gray-200">
                {contracts.map((contract) => (
                  <tr key={contract.id}>
                    <td><div><p className="font-medium">{contract.name}</p><p className="text-sm text-gray-500">{contract.contractNumber}</p></div></td>
                    <td>{contract.customer?.firstName} {contract.customer?.lastName}</td>
                    <td><span className="badge badge-gray">{getLabel('contractTypes', contract.contractType)}</span></td>
                    <td>${contract.contractValue?.toLocaleString()}</td>
                    <td><span className={`badge ${contract.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>{getLabel('contractStatuses', contract.status)}</span></td>
                    <td><button onClick={() => handleEdit(contract)} className="p-2 hover:bg-gray-100 rounded-lg"><FiEdit2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
    </div>
  );
};

export default Contracts;
