import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { serviceOrderService, technicianService, serviceService, propertyService } from '../services/api';
import { useConfig } from '../context/ConfigContext';
import { FiPlus, FiSearch, FiEye, FiEdit2, FiTrash2, FiClock, FiCheckCircle, FiX, FiCalendar } from 'react-icons/fi';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import SortableHeader from '../components/SortableHeader';
import BulkActionBar from '../components/BulkActionBar';
import RowDetailPanel, { DetailField } from '../components/RowDetailPanel';
import { TableSkeleton } from '../components/LoadingSkeleton';

const ServiceOrderModal = ({ isOpen, onClose, order, onSave, priorities }) => {
  const [formData, setFormData] = useState({
    propertyId: '',
    serviceTypeId: '',
    technicianId: '',
    scheduledDate: '',
    scheduledTimeStart: '',
    scheduledTimeEnd: '',
    priority: 'NORMAL',
    customerNotes: ''
  });
  const [properties, setProperties] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFormData();
  }, []);

  useEffect(() => {
    if (order) {
      setFormData({
        propertyId: order.propertyId || '',
        serviceTypeId: order.serviceTypeId || '',
        technicianId: order.technicianId || '',
        scheduledDate: order.scheduledDate?.split('T')[0] || '',
        scheduledTimeStart: order.scheduledTimeStart || '',
        scheduledTimeEnd: order.scheduledTimeEnd || '',
        priority: order.priority || 'NORMAL',
        customerNotes: order.customerNotes || ''
      });
    } else {
      setFormData({
        propertyId: '',
        serviceTypeId: '',
        technicianId: '',
        scheduledDate: '',
        scheduledTimeStart: '',
        scheduledTimeEnd: '',
        priority: 'NORMAL',
        customerNotes: ''
      });
    }
  }, [order, isOpen]);

  const loadFormData = async () => {
    try {
      const [propRes, serviceRes, techRes] = await Promise.all([
        propertyService.getAll({ limit: 100 }),
        serviceService.getTypes(),
        technicianService.getAll()
      ]);
      setProperties(propRes.data.properties || []);
      setServiceTypes(serviceRes.data || []);
      setTechnicians(techRes.data || []);
    } catch (error) {
      toast.error('Failed to load form data');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const submitData = {
        ...formData,
        scheduledDate: formData.scheduledDate ? new Date(formData.scheduledDate).toISOString() : undefined,
        technicianId: formData.technicianId || undefined
      };
      if (order) {
        await serviceOrderService.update(order.id, submitData);
        toast.success('Service order updated');
      } else {
        await serviceOrderService.create(submitData);
        toast.success('Service order created');
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">{order ? 'Edit Service Order' : 'New Service Order'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Property *</label>
            <select
              value={formData.propertyId}
              onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
              className="select"
              required
            >
              <option value="">Select Property</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.customer?.firstName} {p.customer?.lastName} - {p.addressLine1}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Service Type *</label>
            <select
              value={formData.serviceTypeId}
              onChange={(e) => setFormData({ ...formData, serviceTypeId: e.target.value })}
              className="select"
              required
            >
              <option value="">Select Service Type</option>
              {serviceTypes.map((s) => (
                <option key={s.id} value={s.id}>{s.name} - ${s.basePrice}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Technician</label>
            <select
              value={formData.technicianId}
              onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
              className="select"
            >
              <option value="">Unassigned</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.user?.firstName} {t.user?.lastName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Date *</label>
              <input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Start Time</label>
              <input
                type="time"
                value={formData.scheduledTimeStart}
                onChange={(e) => setFormData({ ...formData, scheduledTimeStart: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">End Time</label>
              <input
                type="time"
                value={formData.scheduledTimeEnd}
                onChange={(e) => setFormData({ ...formData, scheduledTimeEnd: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="select"
            >
              {priorities.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Customer Notes</label>
            <textarea
              value={formData.customerNotes}
              onChange={(e) => setFormData({ ...formData, customerNotes: e.target.value })}
              className="input"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Saving...' : (order ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ServiceOrders = () => {
  const { getOptions, getLabel } = useConfig();
  const serviceOrderStatuses = getOptions('serviceOrderStatuses');
  const priorities = getOptions('priorities');

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Sort state
  const [sort, setSort] = useState({ field: null, order: null });

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Row detail panel
  const [detailOrder, setDetailOrder] = useState(null);

  useEffect(() => {
    loadOrders();
  }, [page, statusFilter, dateFilter, sort]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 20,
        status: statusFilter || undefined,
        date: dateFilter || undefined
      };
      if (sort.field) { params.sortBy = sort.field; params.sortOrder = sort.order; }
      const response = await serviceOrderService.getAll(params);
      setOrders(response.data.serviceOrders);
      setPagination(response.data.pagination);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error('Failed to load service orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const classes = {
      PENDING: 'badge-gray',
      CONFIRMED: 'badge-blue',
      EN_ROUTE: 'badge-yellow',
      IN_PROGRESS: 'badge-yellow',
      COMPLETED: 'badge-green',
      CANCELLED: 'badge-red',
      RESCHEDULED: 'badge-gray'
    };
    return classes[status] || 'badge-gray';
  };

  const getPriorityBadge = (priority) => {
    const classes = {
      LOW: 'badge-gray',
      NORMAL: 'badge-blue',
      HIGH: 'badge-yellow',
      URGENT: 'badge-red'
    };
    return classes[priority] || 'badge-gray';
  };

  const handleDelete = (order) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Service Order',
      message: `Are you sure you want to delete service order "${order.orderNumber}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await serviceOrderService.delete(order.id);
          toast.success('Service order deleted successfully');
          setDetailOrder(null);
          loadOrders();
        } catch (error) {
          toast.error('Failed to delete service order');
        }
      }
    });
  };

  const handleEdit = (order) => {
    setSelectedOrder(order);
    setModalOpen(true);
    setDetailOrder(null);
  };

  const handleAdd = () => {
    setSelectedOrder(null);
    setModalOpen(true);
  };

  // Bulk operations
  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map(o => o.id)));
    }
  };

  const handleBulkDelete = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Selected Service Orders',
      message: `Are you sure you want to delete ${selectedIds.size} service order(s)? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await serviceOrderService.bulkDelete([...selectedIds]);
          toast.success(`${selectedIds.size} service orders deleted`);
          setSelectedIds(new Set());
          loadOrders();
        } catch (error) {
          toast.error('Failed to delete service orders');
        }
      }
    });
  };

  const handleBulkUpdate = async (data) => {
    try {
      await serviceOrderService.bulkUpdate([...selectedIds], data);
      toast.success(`${selectedIds.size} service orders updated`);
      setSelectedIds(new Set());
      loadOrders();
    } catch (error) {
      toast.error('Failed to update service orders');
    }
  };

  const handleRowClick = (order) => {
    setDetailOrder(order);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Service Orders</h1>
        <button onClick={handleAdd} className="btn btn-primary flex items-center gap-2">
          <FiPlus className="w-5 h-5" />
          New Service Order
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="select"
          >
            <option value="">All Statuses</option>
            {serviceOrderStatuses.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
            className="input"
          />
          <div className="text-sm text-gray-500 flex items-center">
            {pagination && `Showing ${orders.length} of ${pagination.total}`}
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onBulkDelete={handleBulkDelete}
        onBulkUpdate={handleBulkUpdate}
        onClearSelection={() => setSelectedIds(new Set())}
        statusOptions={serviceOrderStatuses}
      />

      {/* Table */}
      {loading ? <TableSkeleton rows={8} cols={8} /> : orders.length === 0 ? (
        <div className="card"><div className="text-center py-12"><p className="text-gray-500">No service orders found</p></div></div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-10">
                    <input type="checkbox" checked={selectedIds.size === orders.length && orders.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300" />
                  </th>
                  <SortableHeader label="Order #" field="orderNumber" currentSort={sort} onSort={setSort} />
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Technician</th>
                  <SortableHeader label="Scheduled" field="scheduledDate" currentSort={sort} onSort={setSort} />
                  <SortableHeader label="Status" field="status" currentSort={sort} onSort={setSort} />
                  <SortableHeader label="Priority" field="priority" currentSort={sort} onSort={setSort} />
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className={`cursor-pointer ${selectedIds.has(order.id) ? 'bg-primary-50' : ''}`} onClick={() => handleRowClick(order)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(order.id)} onChange={() => toggleSelect(order.id)} className="rounded border-gray-300" />
                    </td>
                    <td className="font-medium">{order.orderNumber}</td>
                    <td>
                      <div>
                        <p>{order.property?.customer?.firstName} {order.property?.customer?.lastName}</p>
                        <p className="text-sm text-gray-500 truncate max-w-xs">
                          {order.property?.addressLine1}
                        </p>
                      </div>
                    </td>
                    <td>{order.serviceType?.name}</td>
                    <td>
                      {order.technician ? (
                        `${order.technician.user?.firstName} ${order.technician.user?.lastName}`
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <div>
                        <p>{new Date(order.scheduledDate).toLocaleDateString()}</p>
                        {order.scheduledTimeStart && (
                          <p className="text-sm text-gray-500">{order.scheduledTimeStart}</p>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(order.status)}`}>
                        {getLabel('serviceOrderStatuses', order.status)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getPriorityBadge(order.priority)}`}>
                        {getLabel('priorities', order.priority)}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/service-orders/${order.id}`}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="View"
                        >
                          <FiEye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleEdit(order)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Edit"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(order)}
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
        </div>
      )}

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
          <span className="text-sm text-gray-500">Page {page} of {pagination.pages}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === pagination.pages}
            className="btn btn-secondary"
          >
            Next
          </button>
        </div>
      )}

      {/* Service Order Modal */}
      <ServiceOrderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        order={selectedOrder}
        onSave={loadOrders}
        priorities={priorities}
      />

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
        isOpen={!!detailOrder}
        onClose={() => setDetailOrder(null)}
        title={detailOrder ? `Service Order ${detailOrder.orderNumber}` : ''}
        onEdit={() => handleEdit(detailOrder)}
        onDelete={() => handleDelete(detailOrder)}
      >
        {detailOrder && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Order Number" value={detailOrder.orderNumber} />
              <DetailField label="Status" value={getLabel('serviceOrderStatuses', detailOrder.status)} />
              <DetailField label="Priority" value={getLabel('priorities', detailOrder.priority)} />
              <DetailField label="Scheduled Date" value={detailOrder.scheduledDate ? new Date(detailOrder.scheduledDate).toLocaleDateString() : ''} />
              <DetailField label="Start Time" value={detailOrder.scheduledTimeStart} />
              <DetailField label="End Time" value={detailOrder.scheduledTimeEnd} />
              <DetailField label="Customer" value={detailOrder.property?.customer ? `${detailOrder.property.customer.firstName} ${detailOrder.property.customer.lastName}` : ''} />
              <DetailField label="Property" value={detailOrder.property?.addressLine1} />
            </div>
            <DetailField label="Service Type" value={detailOrder.serviceType?.name} />
            <DetailField label="Technician" value={detailOrder.technician ? `${detailOrder.technician.user?.firstName} ${detailOrder.technician.user?.lastName}` : 'Unassigned'} />
            <DetailField label="Customer Notes" value={detailOrder.customerNotes} />
            <DetailField label="Technician Notes" value={detailOrder.technicianNotes} />
            <DetailField label="Created" value={new Date(detailOrder.createdAt).toLocaleDateString()} />
          </div>
        )}
      </RowDetailPanel>
    </div>
  );
};

export default ServiceOrders;
