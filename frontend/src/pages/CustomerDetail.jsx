import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { customerService, propertyService } from '../services/api';
import { FiArrowLeft, FiEdit2, FiPhone, FiMail, FiMapPin, FiPlus, FiFileText, FiDollarSign, FiCalendar } from 'react-icons/fi';
import toast from 'react-hot-toast';

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('properties');

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const loadCustomer = async () => {
    try {
      const response = await customerService.getById(id);
      setCustomer(response.data);
    } catch (error) {
      toast.error('Failed to load customer');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full spinner" />
      </div>
    );
  }

  if (!customer) return null;

  const tabs = [
    { id: 'properties', label: 'Properties', count: customer.properties?.length },
    { id: 'contracts', label: 'Contracts', count: customer.contracts?.length },
    { id: 'invoices', label: 'Invoices', count: customer.invoices?.length },
    { id: 'history', label: 'Service History' },
    { id: 'communications', label: 'Communications', count: customer.communications?.length }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/customers" className="p-2 hover:bg-gray-100 rounded-lg">
          <FiArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {customer.firstName} {customer.lastName}
          </h1>
          {customer.companyName && (
            <p className="text-gray-500">{customer.companyName}</p>
          )}
        </div>
        <span className={`badge ${customer.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>
          {customer.status}
        </span>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <FiMail className="w-5 h-5 text-gray-400" />
              <span>{customer.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <FiPhone className="w-5 h-5 text-gray-400" />
              <span>{customer.phone}</span>
            </div>
            {customer.alternatePhone && (
              <div className="flex items-center gap-3">
                <FiPhone className="w-5 h-5 text-gray-400" />
                <span>{customer.alternatePhone} (Alt)</span>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Account Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Customer Type</span>
              <span className="font-medium">{customer.customerType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Properties</span>
              <span className="font-medium">{customer.properties?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Active Contracts</span>
              <span className="font-medium">
                {customer.contracts?.filter(c => c.status === 'ACTIVE').length || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Billing Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Invoiced</span>
              <span className="font-medium">
                ${customer.invoices?.reduce((sum, inv) => sum + inv.total, 0).toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Outstanding</span>
              <span className="font-medium text-red-600">
                ${customer.invoices?.reduce((sum, inv) => sum + (inv.total - inv.amountPaid), 0).toLocaleString() || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="card">
        {activeTab === 'properties' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Properties</h3>
              <button className="btn btn-primary btn-sm flex items-center gap-2">
                <FiPlus className="w-4 h-4" />
                Add Property
              </button>
            </div>
            {customer.properties?.length > 0 ? (
              <div className="space-y-4">
                {customer.properties.map((property) => (
                  <div key={property.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{property.name}</h4>
                        <p className="text-sm text-gray-500">
                          {property.addressLine1}, {property.city}, {property.state} {property.zipCode}
                        </p>
                        <span className="badge badge-gray mt-2">{property.propertyType}</span>
                      </div>
                      <Link to={`/properties/${property.id}`} className="btn btn-secondary btn-sm">
                        View
                      </Link>
                    </div>
                    {property.pestIssues?.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-gray-500">
                          Active Issues: {property.pestIssues.filter(i => i.status === 'ACTIVE').length}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No properties found</p>
            )}
          </div>
        )}

        {activeTab === 'contracts' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Contracts</h3>
              <button className="btn btn-primary btn-sm flex items-center gap-2">
                <FiPlus className="w-4 h-4" />
                New Contract
              </button>
            </div>
            {customer.contracts?.length > 0 ? (
              <div className="space-y-4">
                {customer.contracts.map((contract) => (
                  <div key={contract.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{contract.name}</h4>
                        <p className="text-sm text-gray-500">{contract.contractNumber}</p>
                      </div>
                      <span className={`badge ${contract.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>
                        {contract.status}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      ${contract.contractValue.toLocaleString()} / {contract.billingFrequency}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No contracts found</p>
            )}
          </div>
        )}

        {activeTab === 'invoices' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Invoices</h3>
              <button className="btn btn-primary btn-sm flex items-center gap-2">
                <FiPlus className="w-4 h-4" />
                New Invoice
              </button>
            </div>
            {customer.invoices?.length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Paid</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {customer.invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="font-medium">{invoice.invoiceNumber}</td>
                        <td>{new Date(invoice.issueDate).toLocaleDateString()}</td>
                        <td>${invoice.total.toLocaleString()}</td>
                        <td>${invoice.amountPaid.toLocaleString()}</td>
                        <td>
                          <span className={`badge ${
                            invoice.status === 'PAID' ? 'badge-green' :
                            invoice.status === 'OVERDUE' ? 'badge-red' :
                            'badge-yellow'
                          }`}>
                            {invoice.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No invoices found</p>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <h3 className="font-semibold mb-4">Service History</h3>
            <p className="text-gray-500 text-center py-8">Service history will be displayed here</p>
          </div>
        )}

        {activeTab === 'communications' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Communications</h3>
              <button className="btn btn-primary btn-sm flex items-center gap-2">
                <FiPlus className="w-4 h-4" />
                Log Communication
              </button>
            </div>
            {customer.communications?.length > 0 ? (
              <div className="space-y-4">
                {customer.communications.map((comm) => (
                  <div key={comm.id} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="badge badge-gray">{comm.type}</span>
                      <span className="text-sm text-gray-500">{comm.direction}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(comm.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {comm.subject && <p className="font-medium">{comm.subject}</p>}
                    <p className="text-sm text-gray-600">{comm.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No communications logged</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDetail;
