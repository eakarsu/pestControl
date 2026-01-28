import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { serviceOrderService, technicianService, productService } from '../services/api';
import { FiHome, FiCalendar, FiMap, FiUser, FiLogOut, FiClock, FiCheckCircle, FiPhone, FiNavigation, FiCamera, FiPackage } from 'react-icons/fi';
import toast from 'react-hot-toast';

// Technician Route View
const TechnicianRoute = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [technician, setTechnician] = useState(null);

  useEffect(() => {
    loadTechnicianAndOrders();
  }, []);

  const loadTechnicianAndOrders = async () => {
    try {
      const techRes = await technicianService.getAll();
      const tech = techRes.data.find(t => t.user.email === user.email);
      setTechnician(tech);

      if (tech) {
        const ordersRes = await serviceOrderService.getTodayForTechnician(tech.id);
        setOrders(ordersRes.data);
      }
    } catch (error) {
      toast.error('Failed to load route');
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async (orderId) => {
    try {
      await serviceOrderService.clockIn(orderId);
      toast.success('Clocked in');
      loadTechnicianAndOrders();
    } catch (error) {
      toast.error('Failed to clock in');
    }
  };

  const handleComplete = async (orderId) => {
    try {
      await serviceOrderService.complete(orderId, {});
      toast.success('Job completed');
      loadTechnicianAndOrders();
    } catch (error) {
      toast.error('Failed to complete');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full spinner" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Today's Route</h2>
      <p className="text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <FiCalendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No jobs scheduled for today</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order, index) => (
            <div key={order.id} className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  order.status === 'COMPLETED' ? 'bg-green-100 text-green-600' :
                  order.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {order.status === 'COMPLETED' ? <FiCheckCircle /> : index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">
                    {order.property?.customer?.firstName} {order.property?.customer?.lastName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {order.property?.addressLine1}, {order.property?.city}
                  </p>
                  <p className="text-sm text-primary-600 font-medium mt-1">
                    {order.serviceType?.name}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                    <FiClock className="w-4 h-4" />
                    <span>{order.scheduledTimeStart} - {order.scheduledTimeEnd}</span>
                  </div>
                </div>
                <span className={`badge ${
                  order.status === 'COMPLETED' ? 'badge-green' :
                  order.status === 'IN_PROGRESS' ? 'badge-blue' :
                  'badge-gray'
                }`}>
                  {order.status}
                </span>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t">
                <a
                  href={`tel:${order.property?.customer?.phone}`}
                  className="btn btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                  <FiPhone className="w-4 h-4" />
                  Call
                </a>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(order.property?.addressLine1 + ', ' + order.property?.city)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                  <FiNavigation className="w-4 h-4" />
                  Navigate
                </a>
                {order.status === 'CONFIRMED' && (
                  <button
                    onClick={() => handleClockIn(order.id)}
                    className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <FiClock className="w-4 h-4" />
                    Start
                  </button>
                )}
                {order.status === 'IN_PROGRESS' && (
                  <Link
                    to={`/technician/job/${order.id}`}
                    className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <FiCheckCircle className="w-4 h-4" />
                    Continue
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Technician Job Detail
const TechnicianJobDetail = () => {
  const { id } = require('react-router-dom').useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [productForm, setProductForm] = useState({ productId: '', quantity: '', unit: 'oz', areasTreated: '' });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [orderRes, productRes] = await Promise.all([
        serviceOrderService.getById(id),
        productService.getAll({ limit: 100 })
      ]);
      setOrder(orderRes.data);
      setProducts(productRes.data.products || []);
    } catch (error) {
      toast.error('Failed to load job');
    } finally {
      setLoading(false);
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
      loadData();
    } catch (error) {
      toast.error('Failed to add product');
    }
  };

  const handleComplete = async () => {
    try {
      await serviceOrderService.complete(id, { technicianNotes: notes });
      toast.success('Job completed');
      navigate('/technician');
    } catch (error) {
      toast.error('Failed to complete job');
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

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4">
        <Link to="/technician" className="p-2 hover:bg-gray-100 rounded-lg">
          <FiHome className="w-5 h-5" />
        </Link>
        <h2 className="text-xl font-bold">Job Details</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-4">
        <h3 className="font-semibold text-lg">
          {order.property?.customer?.firstName} {order.property?.customer?.lastName}
        </h3>
        <p className="text-gray-500">{order.property?.addressLine1}</p>
        <p className="text-primary-600 font-medium mt-2">{order.serviceType?.name}</p>
      </div>

      {/* Products Used */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Products Used</h3>
          <button
            onClick={() => setShowProductModal(true)}
            className="btn btn-secondary btn-sm flex items-center gap-1"
          >
            <FiPlus className="w-4 h-4" />
            Add
          </button>
        </div>
        {order.productUsages?.length > 0 ? (
          <div className="space-y-2">
            {order.productUsages.map((usage) => (
              <div key={usage.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                <span>{usage.product?.name}</span>
                <span className="text-gray-500">{usage.quantity} {usage.unit}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No products added</p>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <h3 className="font-semibold mb-4">Service Notes</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input"
          rows={4}
          placeholder="Enter notes about the service..."
        />
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={handleComplete}
          className="btn btn-success w-full py-3 flex items-center justify-center gap-2"
        >
          <FiCheckCircle className="w-5 h-5" />
          Complete Job
        </button>
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="bg-white rounded-t-xl w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Add Product</h3>
            <form onSubmit={handleAddProduct} className="space-y-4">
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
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Areas Treated</label>
                <input
                  type="text"
                  value={productForm.areasTreated}
                  onChange={(e) => setProductForm({ ...productForm, areasTreated: e.target.value })}
                  className="input"
                  placeholder="Kitchen, Bathroom"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowProductModal(false)} className="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Technician Profile
const TechnicianProfile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-bold">Profile</h2>

      <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
        <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-primary-700 font-bold text-2xl">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </span>
        </div>
        <h3 className="text-lg font-semibold">{user?.firstName} {user?.lastName}</h3>
        <p className="text-gray-500">{user?.email}</p>
        <span className="badge badge-green mt-2">{user?.role}</span>
      </div>

      <button
        onClick={handleLogout}
        className="btn btn-secondary w-full flex items-center justify-center gap-2"
      >
        <FiLogOut className="w-5 h-5" />
        Sign Out
      </button>
    </div>
  );
};

// Main Technician App
const TechnicianApp = () => {
  const location = useLocation();

  const tabs = [
    { path: '/technician', label: 'Route', icon: FiMap },
    { path: '/technician/profile', label: 'Profile', icon: FiUser }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-primary-600 text-white p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <span className="font-bold">PC</span>
          </div>
          <span className="font-semibold">PestControl Mobile</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pb-20">
        <Routes>
          <Route path="/" element={<TechnicianRoute />} />
          <Route path="/job/:id" element={<TechnicianJobDetail />} />
          <Route path="/profile" element={<TechnicianProfile />} />
        </Routes>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="flex">
          {tabs.map((tab) => (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex-1 py-4 flex flex-col items-center gap-1 ${
                location.pathname === tab.path ? 'text-primary-600' : 'text-gray-500'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-xs">{tab.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default TechnicianApp;
