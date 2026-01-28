import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { customerService } from '../services/api';
import { useConfig } from '../context/ConfigContext';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiEye, FiX, FiPhone, FiMail } from 'react-icons/fi';
import toast from 'react-hot-toast';

const CustomerModal = ({ isOpen, onClose, customer, onSave, customerTypes, customerStatuses }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    alternatePhone: '',
    companyName: '',
    customerType: 'RESIDENTIAL',
    status: 'ACTIVE',
    notes: '',
    referralSource: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        firstName: customer.firstName || '',
        lastName: customer.lastName || '',
        email: customer.email || '',
        phone: customer.phone || '',
        alternatePhone: customer.alternatePhone || '',
        companyName: customer.companyName || '',
        customerType: customer.customerType || 'RESIDENTIAL',
        status: customer.status || 'ACTIVE',
        notes: customer.notes || '',
        referralSource: customer.referralSource || ''
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        alternatePhone: '',
        companyName: '',
        customerType: 'RESIDENTIAL',
        status: 'ACTIVE',
        notes: '',
        referralSource: ''
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
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Company Name</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="input"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Phone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Alternate Phone</label>
              <input
                type="tel"
                value={formData.alternatePhone}
                onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Referral Source</label>
              <input
                type="text"
                value={formData.referralSource}
                onChange={(e) => setFormData({ ...formData, referralSource: e.target.value })}
                className="input"
                placeholder="How did they hear about us?"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Customer Type</label>
              <select
                value={formData.customerType}
                onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                className="select"
              >
                {customerTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="select"
              >
                {customerStatuses.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Saving...' : (customer ? 'Update' : 'Create')}
            </button>
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

  useEffect(() => {
    loadCustomers();
  }, [page, search, statusFilter, typeFilter]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await customerService.getAll({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined
      });
      setCustomers(response.data.customers);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (customer) => {
    if (!confirm(`Are you sure you want to delete ${customer.firstName} ${customer.lastName}?`)) {
      return;
    }

    try {
      await customerService.delete(customer.id);
      toast.success('Customer deleted successfully');
      loadCustomers();
    } catch (error) {
      toast.error('Failed to delete customer');
    }
  };

  const handleEdit = (customer) => {
    setSelectedCustomer(customer);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedCustomer(null);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <button onClick={handleAdd} className="btn btn-primary flex items-center gap-2">
          <FiPlus className="w-5 h-5" />
          Add Customer
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="select"
          >
            <option value="">All Statuses</option>
            {customerStatuses.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="select"
          >
            <option value="">All Types</option>
            {customerTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <div className="text-sm text-gray-500 flex items-center">
            {pagination && `Showing ${customers.length} of ${pagination.total} customers`}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full spinner" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No customers found</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Type</th>
                  <th>Properties</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div>
                        <p className="font-medium text-gray-900">
                          {customer.firstName} {customer.lastName}
                        </p>
                        {customer.companyName && (
                          <p className="text-sm text-gray-500">{customer.companyName}</p>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <FiMail className="w-4 h-4 text-gray-400" />
                          <span>{customer.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <FiPhone className="w-4 h-4 text-gray-400" />
                          <span>{customer.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        customer.customerType === 'COMMERCIAL' ? 'badge-blue' :
                        customer.customerType === 'INDUSTRIAL' ? 'badge-yellow' :
                        'badge-gray'
                      }`}>
                        {getLabel('customerTypes', customer.customerType)}
                      </span>
                    </td>
                    <td>{customer.properties?.length || 0}</td>
                    <td>
                      <span className={`badge ${
                        customer.status === 'ACTIVE' ? 'badge-green' :
                        customer.status === 'SUSPENDED' ? 'badge-red' :
                        'badge-gray'
                      }`}>
                        {getLabel('customerStatuses', customer.status)}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/customers/${customer.id}`}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="View"
                        >
                          <FiEye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleEdit(customer)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Edit"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer)}
                          className="p-2 hover:bg-red-100 text-red-600 rounded-lg"
                          title="Delete"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="btn btn-secondary"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === pagination.pages}
            className="btn btn-secondary"
          >
            Next
          </button>
        </div>
      )}

      <CustomerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        customer={selectedCustomer}
        onSave={loadCustomers}
        customerTypes={customerTypes}
        customerStatuses={customerStatuses}
      />
    </div>
  );
};

export default Customers;
