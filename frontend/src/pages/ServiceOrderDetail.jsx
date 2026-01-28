import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { serviceOrderService, productService, aiService } from '../services/api';
import { FiArrowLeft, FiClock, FiCheckCircle, FiCamera, FiPlus, FiPackage } from 'react-icons/fi';
import toast from 'react-hot-toast';

const ServiceOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productForm, setProductForm] = useState({ productId: '', quantity: '', unit: 'oz', areasTreated: '' });

  useEffect(() => {
    loadOrder();
    loadProducts();
  }, [id]);

  const loadOrder = async () => {
    try {
      const response = await serviceOrderService.getById(id);
      setOrder(response.data);
    } catch (error) {
      toast.error('Failed to load service order');
      navigate('/service-orders');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await productService.getAll({ limit: 100 });
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Failed to load products');
    }
  };

  const handleClockIn = async () => {
    try {
      await serviceOrderService.clockIn(id);
      toast.success('Clocked in');
      loadOrder();
    } catch (error) {
      toast.error('Failed to clock in');
    }
  };

  const handleClockOut = async () => {
    try {
      await serviceOrderService.clockOut(id);
      toast.success('Clocked out');
      loadOrder();
    } catch (error) {
      toast.error('Failed to clock out');
    }
  };

  const handleComplete = async () => {
    try {
      await serviceOrderService.complete(id, {
        technicianNotes: 'Service completed successfully'
      });
      toast.success('Service order completed');
      loadOrder();
    } catch (error) {
      toast.error('Failed to complete order');
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      await serviceOrderService.addProduct(id, {
        ...productForm,
        quantity: parseFloat(productForm.quantity),
        areasTreated: productForm.areasTreated.split(',').map(a => a.trim())
      });
      toast.success('Product added');
      setShowProductModal(false);
      setProductForm({ productId: '', quantity: '', unit: 'oz', areasTreated: '' });
      loadOrder();
    } catch (error) {
      toast.error('Failed to add product');
    }
  };

  const handleAutoReport = async () => {
    try {
      const response = await aiService.autoCompleteReport({ serviceOrderId: id });
      toast.success('Report generated');
      console.log('AI Report:', response.data);
    } catch (error) {
      toast.error('Failed to generate report');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full spinner" />
      </div>
    );
  }

  if (!order) return null;

  const getStatusBadge = (status) => {
    const classes = {
      PENDING: 'badge-gray',
      CONFIRMED: 'badge-blue',
      EN_ROUTE: 'badge-yellow',
      IN_PROGRESS: 'badge-yellow',
      COMPLETED: 'badge-green',
      CANCELLED: 'badge-red'
    };
    return classes[status] || 'badge-gray';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/service-orders" className="p-2 hover:bg-gray-100 rounded-lg">
          <FiArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {order.orderNumber}
          </h1>
          <p className="text-gray-500">{order.serviceType?.name}</p>
        </div>
        <span className={`badge ${getStatusBadge(order.status)}`}>
          {order.status}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="card">
        <div className="flex flex-wrap gap-3">
          {order.status === 'CONFIRMED' && (
            <button onClick={handleClockIn} className="btn btn-primary flex items-center gap-2">
              <FiClock className="w-4 h-4" />
              Clock In
            </button>
          )}
          {order.status === 'IN_PROGRESS' && (
            <>
              <button onClick={handleClockOut} className="btn btn-secondary flex items-center gap-2">
                <FiClock className="w-4 h-4" />
                Clock Out
              </button>
              <button onClick={handleComplete} className="btn btn-success flex items-center gap-2">
                <FiCheckCircle className="w-4 h-4" />
                Complete
              </button>
            </>
          )}
          <button onClick={() => setShowProductModal(true)} className="btn btn-secondary flex items-center gap-2">
            <FiPackage className="w-4 h-4" />
            Add Product
          </button>
          <button onClick={handleAutoReport} className="btn btn-secondary flex items-center gap-2">
            AI Generate Report
          </button>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Customer & Property</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-medium">
                {order.property?.customer?.firstName} {order.property?.customer?.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Address</p>
              <p className="font-medium">
                {order.property?.addressLine1}, {order.property?.city}, {order.property?.state} {order.property?.zipCode}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Property Type</p>
              <p className="font-medium">{order.property?.propertyType}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Schedule & Assignment</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Scheduled Date</p>
              <p className="font-medium">{new Date(order.scheduledDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Time Window</p>
              <p className="font-medium">{order.scheduledTimeStart} - {order.scheduledTimeEnd}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Technician</p>
              <p className="font-medium">
                {order.technician ? `${order.technician.user?.firstName} ${order.technician.user?.lastName}` : 'Unassigned'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Priority</p>
              <span className={`badge ${order.priority === 'URGENT' ? 'badge-red' : order.priority === 'HIGH' ? 'badge-yellow' : 'badge-gray'}`}>
                {order.priority}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Time Tracking */}
      {(order.timeIn || order.timeOut) && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Time Tracking</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Time In</p>
              <p className="font-medium">{order.timeIn ? new Date(order.timeIn).toLocaleTimeString() : '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Time Out</p>
              <p className="font-medium">{order.timeOut ? new Date(order.timeOut).toLocaleTimeString() : '-'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Products Used */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Products Used</h3>
        {order.productUsages?.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Areas Treated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {order.productUsages.map((usage) => (
                  <tr key={usage.id}>
                    <td className="font-medium">{usage.product?.name}</td>
                    <td>{usage.quantity} {usage.unit}</td>
                    <td>{usage.areasTreated?.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No products recorded</p>
        )}
      </div>

      {/* Notes */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Notes</h3>
        <div className="space-y-4">
          {order.customerNotes && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Customer Notes</p>
              <p className="bg-gray-50 p-3 rounded-lg">{order.customerNotes}</p>
            </div>
          )}
          {order.technicianNotes && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Technician Notes</p>
              <p className="bg-gray-50 p-3 rounded-lg">{order.technicianNotes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Add Product Usage</h2>
            </div>
            <form onSubmit={handleAddProduct} className="p-6 space-y-4">
              <div>
                <label className="label">Product</label>
                <select
                  value={productForm.productId}
                  onChange={(e) => setProductForm({ ...productForm, productId: e.target.value })}
                  className="select"
                  required
                >
                  <option value="">Select Product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.quantity}
                    onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Unit</label>
                  <select
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    className="select"
                  >
                    <option value="oz">oz</option>
                    <option value="ml">ml</option>
                    <option value="gal">gal</option>
                    <option value="lb">lb</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Areas Treated (comma-separated)</label>
                <input
                  type="text"
                  value={productForm.areasTreated}
                  onChange={(e) => setProductForm({ ...productForm, areasTreated: e.target.value })}
                  className="input"
                  placeholder="Kitchen, Bathroom, Exterior"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowProductModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Add Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrderDetail;
