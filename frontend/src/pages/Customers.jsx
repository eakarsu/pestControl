import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { customerService } from '../services/api';
import { useConfig } from '../context/ConfigContext';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiEye, FiX, FiPhone, FiMail } from 'react-icons/fi';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import SortableHeader from '../components/SortableHeader';
import BulkActionBar from '../components/BulkActionBar';
import RowDetailPanel, { DetailField } from '../components/RowDetailPanel';
import { TableSkeleton, FilterSkeleton } from '../components/LoadingSkeleton';

const CustomerModal = ({ isOpen, onClose, customer, onSave, customerTypes, customerStatuses }) => {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', alternatePhone: '',
    companyName: '', customerType: 'RESIDENTIAL', status: 'ACTIVE', notes: '', referralSource: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        firstName: customer.firstName || '', lastName: customer.lastName || '',
        email: customer.email || '', phone: customer.phone || '',
        alternatePhone: customer.alternatePhone || '', companyName: customer.companyName || '',
        customerType: customer.customerType || 'RESIDENTIAL', status: customer.status || 'ACTIVE',
        notes: customer.notes || '', referralSource: customer.referralSource || ''
      });
    } else {
      setFormData({
        firstName: '', lastName: '', email: '', phone: '', alternatePhone: '',
        companyName: '', customerType: 'RESIDENTIAL', status: 'ACTIVE', notes: '', referralSource: ''
      });
    }
  }, [customer, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (customer) {
        await customerService.update(customer.id, formData);
        toast.success('Customer updated successfully');
      } else {
        await customerService.create(formData);
        toast.success('Customer created successfully');
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">{customer ? 'Edit Customer' : 'New Customer'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><FiX className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="label">First Name *</label><input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="input" required /></div>
            <div><label className="label">Last Name *</label><input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="input" required /></div>
          </div>
          <div><label className="label">Company Name</label><input type="text" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} className="input" /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="label">Email *</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input" required /></div>
            <div><label className="label">Phone *</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input" required /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="label">Alternate Phone</label><input type="tel" value={formData.alternatePhone} onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })} className="input" /></div>
            <div><label className="label">Referral Source</label><input type="text" value={formData.referralSource} onChange={(e) => setFormData({ ...formData, referralSource: e.target.value })} className="input" placeholder="How did they hear about us?" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="label">Customer Type</label><select value={formData.customerType} onChange={(e) => setFormData({ ...formData, customerType: e.target.value })} className="select">{customerTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
            <div><label className="label">Status</label><select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="select">{customerStatuses.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}</select></div>
          </div>
          <div><label className="label">Notes</label><textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input" rows={3} /></div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Saving...' : (customer ? 'Update' : 'Create')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Customers = () => {
  const { getOptions, getLabel } = useConfig();
  const customerTypes = getOptions('customerTypes');
  const customerStatuses = getOptions('customerStatuses');

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Sort state
  const [sort, setSort] = useState({ field: null, order: null });

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Row detail panel
  const [detailCustomer, setDetailCustomer] = useState(null);

  useEffect(() => { loadCustomers(); }, [page, search, statusFilter, typeFilter, sort]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const params = {
        page, limit: 20,
        search: search || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined
      };
      if (sort.field) { params.sortBy = sort.field; params.sortOrder = sort.order; }
      const response = await customerService.getAll(params);
      setCustomers(response.data.customers);
      setPagination(response.data.pagination);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (customer) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Customer',
      message: `Are you sure you want to delete ${customer.firstName} ${customer.lastName}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await customerService.delete(customer.id);
          toast.success('Customer deleted successfully');
          setDetailCustomer(null);
          loadCustomers();
        } catch (error) {
          toast.error('Failed to delete customer');
        }
      }
    });
  };

  const handleEdit = (customer) => {
    setSelectedCustomer(customer);
    setModalOpen(true);
    setDetailCustomer(null);
  };

  const handleAdd = () => { setSelectedCustomer(null); setModalOpen(true); };

  // Bulk operations
  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === customers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(customers.map(c => c.id)));
    }
  };

  const handleBulkDelete = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Selected Customers',
      message: `Are you sure you want to delete ${selectedIds.size} customer(s)? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await customerService.bulkDelete([...selectedIds]);
          toast.success(`${selectedIds.size} customers deleted`);
          setSelectedIds(new Set());
          loadCustomers();
        } catch (error) {
          toast.error('Failed to delete customers');
        }
      }
    });
  };

  const handleBulkUpdate = async (data) => {
    try {
      await customerService.bulkUpdate([...selectedIds], data);
      toast.success(`${selectedIds.size} customers updated`);
      setSelectedIds(new Set());
      loadCustomers();
    } catch (error) {
      toast.error('Failed to update customers');
    }
  };

  const handleRowClick = (customer) => {
    setDetailCustomer(customer);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <button onClick={handleAdd} className="btn btn-primary flex items-center gap-2">
          <FiPlus className="w-5 h-5" /> Add Customer
        </button>
      </div>

      {/* Filters */}
      {loading && customers.length === 0 ? <FilterSkeleton /> : (
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search customers..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input pl-10" />
            </div>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="select">
              <option value="">All Statuses</option>
              {customerStatuses.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="select">
              <option value="">All Types</option>
              {customerTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
            <div className="text-sm text-gray-500 flex items-center">
              {pagination && `Showing ${customers.length} of ${pagination.total} customers`}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onBulkDelete={handleBulkDelete}
        onBulkUpdate={handleBulkUpdate}
        onClearSelection={() => setSelectedIds(new Set())}
        statusOptions={customerStatuses}
      />

      {/* Table */}
      {loading ? <TableSkeleton rows={8} cols={7} /> : customers.length === 0 ? (
        <div className="card"><div className="text-center py-12"><p className="text-gray-500">No customers found</p></div></div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-10">
                    <input type="checkbox" checked={selectedIds.size === customers.length && customers.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300" />
                  </th>
                  <SortableHeader label="Customer" field="firstName" currentSort={sort} onSort={setSort} />
                  <th>Contact</th>
                  <SortableHeader label="Type" field="customerType" currentSort={sort} onSort={setSort} />
                  <th>Properties</th>
                  <SortableHeader label="Status" field="status" currentSort={sort} onSort={setSort} />
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr key={customer.id} className={`cursor-pointer ${selectedIds.has(customer.id) ? 'bg-primary-50' : ''}`} onClick={() => handleRowClick(customer)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(customer.id)} onChange={() => toggleSelect(customer.id)} className="rounded border-gray-300" />
                    </td>
                    <td>
                      <div>
                        <p className="font-medium text-gray-900">{customer.firstName} {customer.lastName}</p>
                        {customer.companyName && <p className="text-sm text-gray-500">{customer.companyName}</p>}
                      </div>
                    </td>
                    <td>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm"><FiMail className="w-4 h-4 text-gray-400" /><span>{customer.email}</span></div>
                        <div className="flex items-center gap-2 text-sm"><FiPhone className="w-4 h-4 text-gray-400" /><span>{customer.phone}</span></div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${customer.customerType === 'COMMERCIAL' ? 'badge-blue' : customer.customerType === 'INDUSTRIAL' ? 'badge-yellow' : 'badge-gray'}`}>
                        {getLabel('customerTypes', customer.customerType)}
                      </span>
                    </td>
                    <td>{customer.properties?.length || 0}</td>
                    <td>
                      <span className={`badge ${customer.status === 'ACTIVE' ? 'badge-green' : customer.status === 'SUSPENDED' ? 'badge-red' : 'badge-gray'}`}>
                        {getLabel('customerStatuses', customer.status)}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Link to={`/customers/${customer.id}`} className="p-2 hover:bg-gray-100 rounded-lg" title="View"><FiEye className="w-4 h-4" /></Link>
                        <button onClick={() => handleEdit(customer)} className="p-2 hover:bg-gray-100 rounded-lg" title="Edit"><FiEdit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(customer)} className="p-2 hover:bg-red-100 text-red-600 rounded-lg" title="Delete"><FiTrash2 className="w-4 h-4" /></button>
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

      {/* Customer Modal */}
      <CustomerModal isOpen={modalOpen} onClose={() => setModalOpen(false)} customer={selectedCustomer} onSave={loadCustomers} customerTypes={customerTypes} customerStatuses={customerStatuses} />

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
        isOpen={!!detailCustomer}
        onClose={() => setDetailCustomer(null)}
        title={detailCustomer ? `${detailCustomer.firstName} ${detailCustomer.lastName}` : ''}
        onEdit={() => handleEdit(detailCustomer)}
        onDelete={() => handleDelete(detailCustomer)}
      >
        {detailCustomer && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="First Name" value={detailCustomer.firstName} />
              <DetailField label="Last Name" value={detailCustomer.lastName} />
              <DetailField label="Email" value={detailCustomer.email} />
              <DetailField label="Phone" value={detailCustomer.phone} />
              <DetailField label="Alt. Phone" value={detailCustomer.alternatePhone} />
              <DetailField label="Company" value={detailCustomer.companyName} />
              <DetailField label="Type" value={getLabel('customerTypes', detailCustomer.customerType)} />
              <DetailField label="Status" value={getLabel('customerStatuses', detailCustomer.status)} />
            </div>
            <DetailField label="Properties" value={`${detailCustomer.properties?.length || 0} properties`} />
            <DetailField label="Referral Source" value={detailCustomer.referralSource} />
            <DetailField label="Notes" value={detailCustomer.notes} />
            <DetailField label="Created" value={new Date(detailCustomer.createdAt).toLocaleDateString()} />
          </div>
        )}
      </RowDetailPanel>
    </div>
  );
};

export default Customers;
