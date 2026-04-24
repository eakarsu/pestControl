import React, { useState, useEffect } from 'react';
import { propertyService, customerService } from '../services/api';
import { useConfig } from '../context/ConfigContext';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiX, FiMapPin } from 'react-icons/fi';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import SortableHeader from '../components/SortableHeader';
import BulkActionBar from '../components/BulkActionBar';
import RowDetailPanel, { DetailField } from '../components/RowDetailPanel';
import { TableSkeleton } from '../components/LoadingSkeleton';

const Properties = () => {
  const { getOptions } = useConfig();
  const propertyTypes = getOptions('propertyTypes');
  const [properties, setProperties] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [formData, setFormData] = useState({
    customerId: '', name: '', addressLine1: '', addressLine2: '', city: '', state: '', zipCode: '',
    propertyType: 'SINGLE_FAMILY', squareFootage: '', accessNotes: '', gateCode: '', hasPets: false, petDetails: ''
  });

  const [sort, setSort] = useState({ field: null, order: null });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [detailProperty, setDetailProperty] = useState(null);

  useEffect(() => { loadProperties(); loadCustomers(); }, [page, search, typeFilter, sort]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20, search: search || undefined, type: typeFilter || undefined };
      if (sort.field) { params.sortBy = sort.field; params.sortOrder = sort.order; }
      const response = await propertyService.getAll(params);
      setProperties(response.data.properties); setPagination(response.data.pagination); setSelectedIds(new Set());
    } catch (error) { toast.error('Failed to load properties'); }
    finally { setLoading(false); }
  };

  const loadCustomers = async () => { try { const response = await customerService.getAll({ limit: 100 }); setCustomers(response.data.customers || []); } catch (error) {} };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData, squareFootage: formData.squareFootage ? parseInt(formData.squareFootage) : undefined, yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt) : undefined };
      if (selectedProperty) { await propertyService.update(selectedProperty.id, submitData); toast.success('Property updated'); }
      else { await propertyService.create(submitData); toast.success('Property created'); }
      setModalOpen(false); loadProperties();
    } catch (error) { toast.error('Failed to save property'); }
  };

  const handleEdit = (property) => {
    setSelectedProperty(property);
    setFormData({ customerId: property.customerId, name: property.name, addressLine1: property.addressLine1, addressLine2: property.addressLine2 || '', city: property.city, state: property.state, zipCode: property.zipCode, propertyType: property.propertyType, squareFootage: property.squareFootage || '', accessNotes: property.accessNotes || '', gateCode: property.gateCode || '', hasPets: property.hasPets, petDetails: property.petDetails || '' });
    setModalOpen(true); setDetailProperty(null);
  };

  const handleAdd = () => { setSelectedProperty(null); setFormData({ customerId: '', name: '', addressLine1: '', addressLine2: '', city: '', state: '', zipCode: '', propertyType: 'SINGLE_FAMILY', squareFootage: '', accessNotes: '', gateCode: '', hasPets: false, petDetails: '' }); setModalOpen(true); };

  const handleDelete = (property) => {
    setConfirmDialog({
      isOpen: true, title: 'Delete Property', message: `Delete "${property.name}"? This cannot be undone.`,
      onConfirm: async () => { try { await propertyService.delete(property.id); toast.success('Property deleted'); setDetailProperty(null); loadProperties(); } catch (error) { toast.error('Failed to delete'); } }
    });
  };

  const toggleSelect = (id) => { const next = new Set(selectedIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedIds(next); };
  const toggleSelectAll = () => { selectedIds.size === properties.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(properties.map(p => p.id))); };

  const handleBulkDelete = () => {
    setConfirmDialog({
      isOpen: true, title: 'Delete Selected Properties', message: `Delete ${selectedIds.size} property(ies)? This cannot be undone.`,
      onConfirm: async () => { try { await propertyService.bulkDelete([...selectedIds]); toast.success(`${selectedIds.size} properties deleted`); setSelectedIds(new Set()); loadProperties(); } catch (error) { toast.error('Failed'); } }
    });
  };

  const handleBulkUpdate = async (data) => {
    try { await propertyService.bulkUpdate([...selectedIds], data); toast.success(`${selectedIds.size} properties updated`); setSelectedIds(new Set()); loadProperties(); }
    catch (error) { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
        <button onClick={handleAdd} className="btn btn-primary flex items-center gap-2"><FiPlus className="w-5 h-5" /> Add Property</button>
      </div>

      <div className="card"><div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search properties..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input pl-10" /></div>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="select">
          <option value="">All Types</option>
          <option value="SINGLE_FAMILY">Single Family</option><option value="COMMERCIAL">Commercial</option><option value="APARTMENT">Apartment</option>
        </select>
      </div></div>

      <BulkActionBar selectedCount={selectedIds.size} onBulkDelete={handleBulkDelete} onBulkUpdate={handleBulkUpdate} onClearSelection={() => setSelectedIds(new Set())} statusOptions={propertyTypes || []} />

      {loading ? <TableSkeleton rows={8} cols={6} /> : (
        <div className="card p-0 overflow-hidden">
          <div className="table-container"><table className="table"><thead><tr>
            <th className="w-10"><input type="checkbox" checked={selectedIds.size === properties.length && properties.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300" /></th>
            <SortableHeader label="Property" field="name" currentSort={sort} onSort={setSort} />
            <th>Customer</th>
            <SortableHeader label="City" field="city" currentSort={sort} onSort={setSort} />
            <SortableHeader label="Type" field="propertyType" currentSort={sort} onSort={setSort} />
            <th>Issues</th>
            <th>Actions</th>
          </tr></thead>
            <tbody className="divide-y divide-gray-200">{properties.map((property) => (
              <tr key={property.id} className={`cursor-pointer ${selectedIds.has(property.id) ? 'bg-primary-50' : ''}`} onClick={() => setDetailProperty(property)}>
                <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(property.id)} onChange={() => toggleSelect(property.id)} className="rounded border-gray-300" /></td>
                <td><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"><FiMapPin className="w-5 h-5 text-gray-400" /></div><div><p className="font-medium">{property.name}</p><p className="text-sm text-gray-500">{property.addressLine1}</p></div></div></td>
                <td>{property.customer?.firstName} {property.customer?.lastName}</td>
                <td>{property.city}</td>
                <td><span className="badge badge-gray">{property.propertyType}</span></td>
                <td>{property._count?.pestIssues || 0}</td>
                <td onClick={(e) => e.stopPropagation()}><div className="flex gap-2">
                  <button onClick={() => handleEdit(property)} className="p-2 hover:bg-gray-100 rounded-lg"><FiEdit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(property)} className="p-2 hover:bg-red-100 text-red-600 rounded-lg"><FiTrash2 className="w-4 h-4" /></button>
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

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b"><h2 className="text-xl font-semibold">{selectedProperty ? 'Edit Property' : 'New Property'}</h2><button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX className="w-5 h-5" /></button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="label">Customer *</label><select value={formData.customerId} onChange={(e) => setFormData({ ...formData, customerId: e.target.value })} className="select" required><option value="">Select Customer</option>{customers.map((c) => (<option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>))}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Property Name *</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input" required /></div>
                <div><label className="label">Type</label><select value={formData.propertyType} onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })} className="select"><option value="SINGLE_FAMILY">Single Family</option><option value="COMMERCIAL">Commercial</option><option value="APARTMENT">Apartment</option></select></div>
              </div>
              <div><label className="label">Address *</label><input type="text" value={formData.addressLine1} onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })} className="input" required /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="label">City *</label><input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="input" required /></div>
                <div><label className="label">State *</label><input type="text" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className="input" required /></div>
                <div><label className="label">ZIP *</label><input type="text" value={formData.zipCode} onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })} className="input" required /></div>
              </div>
              <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button><button type="submit" className="btn btn-primary">{selectedProperty ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={confirmDialog.isOpen} onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} onConfirm={confirmDialog.onConfirm} title={confirmDialog.title} message={confirmDialog.message} confirmText="Delete" variant="danger" />

      <RowDetailPanel isOpen={!!detailProperty} onClose={() => setDetailProperty(null)} title={detailProperty?.name || ''} onEdit={() => handleEdit(detailProperty)} onDelete={() => handleDelete(detailProperty)}>
        {detailProperty && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Name" value={detailProperty.name} />
              <DetailField label="Customer" value={`${detailProperty.customer?.firstName} ${detailProperty.customer?.lastName}`} />
              <DetailField label="Address" value={detailProperty.addressLine1} />
              <DetailField label="City" value={detailProperty.city} />
              <DetailField label="State" value={detailProperty.state} />
              <DetailField label="ZIP Code" value={detailProperty.zipCode} />
              <DetailField label="Type" value={detailProperty.propertyType} />
              <DetailField label="Square Footage" value={detailProperty.squareFootage} />
              <DetailField label="Has Pets" value={detailProperty.hasPets ? 'Yes' : 'No'} />
              <DetailField label="Pet Details" value={detailProperty.petDetails} />
              <DetailField label="Pest Issues" value={detailProperty._count?.pestIssues || 0} />
              <DetailField label="Access Notes" value={detailProperty.accessNotes} />
            </div>
          </div>
        )}
      </RowDetailPanel>
    </div>
  );
};

export default Properties;
