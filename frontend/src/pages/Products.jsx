import React, { useState, useEffect } from 'react';
import { productService } from '../services/api';
import { useConfig } from '../context/ConfigContext';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiX, FiAlertTriangle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import SortableHeader from '../components/SortableHeader';
import BulkActionBar from '../components/BulkActionBar';
import RowDetailPanel, { DetailField } from '../components/RowDetailPanel';
import { TableSkeleton } from '../components/LoadingSkeleton';

const Products = () => {
  const { getOptions, getLabel } = useConfig();
  const productCategories = getOptions('productCategories');
  const unitsOfMeasure = getOptions('unitsOfMeasure');

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({ name: '', sku: '', barcode: '', category: 'INSECTICIDE', manufacturer: '', activeIngredient: '', epaNumber: '', unitOfMeasure: 'oz', unitCost: 0, inStock: 0, reorderLevel: 10, isRestricted: false });

  // Sort, bulk, confirm, detail states
  const [sort, setSort] = useState({ field: null, order: null });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [detailProduct, setDetailProduct] = useState(null);

  useEffect(() => { loadProducts(); }, [search, categoryFilter, sort]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params = { search: search || undefined, category: categoryFilter || undefined };
      if (sort.field) { params.sortBy = sort.field; params.sortOrder = sort.order; }
      const response = await productService.getAll(params);
      setProducts(response.data.products || []);
      setSelectedIds(new Set());
    } catch (error) { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData, unitCost: parseFloat(formData.unitCost) || 0, inStock: parseFloat(formData.inStock) || 0, reorderLevel: parseFloat(formData.reorderLevel) || 10 };
      if (selectedProduct) { await productService.update(selectedProduct.id, submitData); toast.success('Product updated'); }
      else { await productService.create(submitData); toast.success('Product created'); }
      setModalOpen(false); loadProducts();
    } catch (error) { toast.error(error.response?.data?.error || 'Failed to save'); }
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setFormData({ name: product.name, sku: product.sku, barcode: product.barcode || '', category: product.category, manufacturer: product.manufacturer || '', activeIngredient: product.activeIngredient || '', epaNumber: product.epaNumber || '', unitOfMeasure: product.unitOfMeasure, unitCost: product.unitCost, inStock: product.inStock, reorderLevel: product.reorderLevel, isRestricted: product.isRestricted });
    setModalOpen(true);
    setDetailProduct(null);
  };

  const handleAdd = () => { setSelectedProduct(null); setFormData({ name: '', sku: '', barcode: '', category: 'INSECTICIDE', manufacturer: '', activeIngredient: '', epaNumber: '', unitOfMeasure: 'oz', unitCost: 0, inStock: 0, reorderLevel: 10, isRestricted: false }); setModalOpen(true); };

  const handleDelete = (product) => {
    setConfirmDialog({
      isOpen: true, title: 'Delete Product',
      message: `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      onConfirm: async () => { try { await productService.delete(product.id); toast.success('Deleted'); setDetailProduct(null); loadProducts(); } catch (error) { toast.error('Failed'); } }
    });
  };

  const toggleSelect = (id) => { const next = new Set(selectedIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedIds(next); };
  const toggleSelectAll = () => { selectedIds.size === products.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(products.map(p => p.id))); };

  const handleBulkDelete = () => {
    setConfirmDialog({
      isOpen: true, title: 'Delete Selected Products',
      message: `Delete ${selectedIds.size} product(s)? This cannot be undone.`,
      onConfirm: async () => { try { await productService.bulkDelete([...selectedIds]); toast.success(`${selectedIds.size} products deleted`); setSelectedIds(new Set()); loadProducts(); } catch (error) { toast.error('Failed'); } }
    });
  };

  const handleBulkUpdate = async (data) => {
    try { await productService.bulkUpdate([...selectedIds], data); toast.success(`${selectedIds.size} products updated`); setSelectedIds(new Set()); loadProducts(); }
    catch (error) { toast.error('Failed to update products'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <button onClick={handleAdd} className="btn btn-primary flex items-center gap-2"><FiPlus className="w-5 h-5" /> Add Product</button>
      </div>

      <div className="card"><div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" /></div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="select"><option value="">All Categories</option>{productCategories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}</select>
      </div></div>

      <BulkActionBar selectedCount={selectedIds.size} onBulkDelete={handleBulkDelete} onBulkUpdate={handleBulkUpdate} onClearSelection={() => setSelectedIds(new Set())} statusOptions={productCategories} />

      {loading ? <TableSkeleton rows={8} cols={7} /> : (
        <div className="card p-0 overflow-hidden">
          <div className="table-container"><table className="table"><thead><tr>
            <th className="w-10"><input type="checkbox" checked={selectedIds.size === products.length && products.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300" /></th>
            <SortableHeader label="Product" field="name" currentSort={sort} onSort={setSort} />
            <SortableHeader label="Category" field="category" currentSort={sort} onSort={setSort} />
            <th>SKU</th>
            <SortableHeader label="In Stock" field="inStock" currentSort={sort} onSort={setSort} />
            <SortableHeader label="Unit Cost" field="unitCost" currentSort={sort} onSort={setSort} />
            <th>Actions</th>
          </tr></thead>
            <tbody className="divide-y divide-gray-200">{products.map((product) => (
              <tr key={product.id} className={`cursor-pointer ${selectedIds.has(product.id) ? 'bg-primary-50' : ''}`} onClick={() => setDetailProduct(product)}>
                <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(product.id)} onChange={() => toggleSelect(product.id)} className="rounded border-gray-300" /></td>
                <td><div><p className="font-medium">{product.name}</p>{product.isRestricted && <span className="badge badge-red text-xs">Restricted</span>}</div></td>
                <td>{getLabel('productCategories', product.category)}</td>
                <td className="font-mono text-sm">{product.sku}</td>
                <td><div className="flex items-center gap-2">{product.inStock} {product.unitOfMeasure}{product.inStock <= product.reorderLevel && <FiAlertTriangle className="w-4 h-4 text-yellow-500" />}</div></td>
                <td>${product.unitCost?.toFixed(2)}</td>
                <td onClick={(e) => e.stopPropagation()}><div className="flex gap-2"><button onClick={() => handleEdit(product)} className="p-2 hover:bg-gray-100 rounded-lg"><FiEdit2 className="w-4 h-4" /></button><button onClick={() => handleDelete(product)} className="p-2 hover:bg-red-100 text-red-600 rounded-lg"><FiTrash2 className="w-4 h-4" /></button></div></td>
              </tr>
            ))}</tbody></table></div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b"><h2 className="text-xl font-semibold">{selectedProduct ? 'Edit Product' : 'New Product'}</h2><button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX className="w-5 h-5" /></button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4"><div><label className="label">Name *</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input" required /></div><div><label className="label">SKU *</label><input type="text" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="input" required /></div></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="label">Category</label><select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="select">{productCategories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}</select></div><div><label className="label">Manufacturer</label><input type="text" value={formData.manufacturer} onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })} className="input" /></div></div>
              <div className="grid grid-cols-3 gap-4"><div><label className="label">Unit Cost</label><input type="number" step="0.01" value={formData.unitCost} onChange={(e) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) })} className="input" /></div><div><label className="label">In Stock</label><input type="number" value={formData.inStock} onChange={(e) => setFormData({ ...formData, inStock: parseFloat(e.target.value) })} className="input" /></div><div><label className="label">Unit</label><select value={formData.unitOfMeasure} onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })} className="select">{unitsOfMeasure.map(unit => <option key={unit.value} value={unit.value}>{unit.label}</option>)}</select></div></div>
              <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button><button type="submit" className="btn btn-primary">{selectedProduct ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={confirmDialog.isOpen} onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} onConfirm={confirmDialog.onConfirm} title={confirmDialog.title} message={confirmDialog.message} confirmText="Delete" variant="danger" />

      <RowDetailPanel isOpen={!!detailProduct} onClose={() => setDetailProduct(null)} title={detailProduct?.name || ''} onEdit={() => handleEdit(detailProduct)} onDelete={() => handleDelete(detailProduct)}>
        {detailProduct && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Name" value={detailProduct.name} />
              <DetailField label="SKU" value={detailProduct.sku} />
              <DetailField label="Barcode" value={detailProduct.barcode} />
              <DetailField label="Category" value={getLabel('productCategories', detailProduct.category)} />
              <DetailField label="Manufacturer" value={detailProduct.manufacturer} />
              <DetailField label="Active Ingredient" value={detailProduct.activeIngredient} />
              <DetailField label="EPA Number" value={detailProduct.epaNumber} />
              <DetailField label="Unit Cost" value={`$${detailProduct.unitCost?.toFixed(2)}`} />
              <DetailField label="In Stock" value={`${detailProduct.inStock} ${detailProduct.unitOfMeasure}`} />
              <DetailField label="Reorder Level" value={detailProduct.reorderLevel} />
              <DetailField label="Restricted" value={detailProduct.isRestricted ? 'Yes' : 'No'} />
              <DetailField label="Concentration" value={detailProduct.concentration} />
            </div>
          </div>
        )}
      </RowDetailPanel>
    </div>
  );
};

export default Products;
