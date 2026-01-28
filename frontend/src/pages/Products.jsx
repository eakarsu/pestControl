import React, { useState, useEffect } from 'react';
import { productService } from '../services/api';
import { useConfig } from '../context/ConfigContext';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiX, FiAlertTriangle } from 'react-icons/fi';
import toast from 'react-hot-toast';

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

  useEffect(() => { loadProducts(); }, [search, categoryFilter]);

  const loadProducts = async () => {
    try { setLoading(true); const response = await productService.getAll({ search: search || undefined, category: categoryFilter || undefined }); setProducts(response.data.products || []); }
    catch (error) { toast.error('Failed to load products'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        unitCost: parseFloat(formData.unitCost) || 0,
        inStock: parseFloat(formData.inStock) || 0,
        reorderLevel: parseFloat(formData.reorderLevel) || 10
      };
      if (selectedProduct) { await productService.update(selectedProduct.id, submitData); toast.success('Product updated'); }
      else { await productService.create(submitData); toast.success('Product created'); }
      setModalOpen(false); loadProducts();
    } catch (error) { toast.error(error.response?.data?.error || 'Failed to save'); }
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setFormData({ name: product.name, sku: product.sku, barcode: product.barcode || '', category: product.category, manufacturer: product.manufacturer || '', activeIngredient: product.activeIngredient || '', epaNumber: product.epaNumber || '', unitOfMeasure: product.unitOfMeasure, unitCost: product.unitCost, inStock: product.inStock, reorderLevel: product.reorderLevel, isRestricted: product.isRestricted });
    setModalOpen(true);
  };

  const handleAdd = () => { setSelectedProduct(null); setFormData({ name: '', sku: '', barcode: '', category: 'INSECTICIDE', manufacturer: '', activeIngredient: '', epaNumber: '', unitOfMeasure: 'oz', unitCost: 0, inStock: 0, reorderLevel: 10, isRestricted: false }); setModalOpen(true); };

  const handleDelete = async (product) => { if (!confirm('Delete this product?')) return; try { await productService.delete(product.id); toast.success('Deleted'); loadProducts(); } catch (error) { toast.error('Failed'); } };

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

      <div className="card p-0 overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full spinner" /></div> : (
          <div className="table-container"><table className="table"><thead><tr><th>Product</th><th>Category</th><th>SKU</th><th>In Stock</th><th>Unit Cost</th><th>Actions</th></tr></thead>
            <tbody className="divide-y divide-gray-200">{products.map((product) => (
              <tr key={product.id}>
                <td><div><p className="font-medium">{product.name}</p>{product.isRestricted && <span className="badge badge-red text-xs">Restricted</span>}</div></td>
                <td>{getLabel('productCategories', product.category)}</td>
                <td className="font-mono text-sm">{product.sku}</td>
                <td><div className="flex items-center gap-2">{product.inStock} {product.unitOfMeasure}{product.inStock <= product.reorderLevel && <FiAlertTriangle className="w-4 h-4 text-yellow-500" />}</div></td>
                <td>${product.unitCost?.toFixed(2)}</td>
                <td><div className="flex gap-2"><button onClick={() => handleEdit(product)} className="p-2 hover:bg-gray-100 rounded-lg"><FiEdit2 className="w-4 h-4" /></button><button onClick={() => handleDelete(product)} className="p-2 hover:bg-red-100 text-red-600 rounded-lg"><FiTrash2 className="w-4 h-4" /></button></div></td>
              </tr>
            ))}</tbody></table></div>
        )}
      </div>

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
    </div>
  );
};

export default Products;
