import React, { useState, useEffect } from 'react';
import { technicianService, territoryService } from '../services/api';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiUser, FiMapPin, FiPhone } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Technicians = () => {
  const [technicians, setTechnicians] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTech, setSelectedTech] = useState(null);
  const [formData, setFormData] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '', employeeId: '', licenseNumber: '', licenseState: '', licenseExpiry: '', territoryId: '', specializations: [] });

  useEffect(() => { loadTechnicians(); loadTerritories(); }, []);

  const loadTechnicians = async () => { try { setLoading(true); const response = await technicianService.getAll(); setTechnicians(response.data || []); } catch (error) { toast.error('Failed to load'); } finally { setLoading(false); } };
  const loadTerritories = async () => { try { const response = await territoryService.getAll(); setTerritories(response.data || []); } catch (error) {} };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        licenseExpiry: formData.licenseExpiry ? new Date(formData.licenseExpiry).toISOString() : undefined,
        territoryId: formData.territoryId || undefined
      };
      if (selectedTech) { await technicianService.update(selectedTech.id, submitData); toast.success('Technician updated'); }
      else { await technicianService.create(submitData); toast.success('Technician created'); }
      setModalOpen(false); loadTechnicians();
    } catch (error) { toast.error(error.response?.data?.error || 'Failed to save'); }
  };

  const handleEdit = (tech) => {
    setSelectedTech(tech);
    setFormData({ firstName: tech.user?.firstName || '', lastName: tech.user?.lastName || '', phone: tech.user?.phone || '', employeeId: tech.employeeId, licenseNumber: tech.licenseNumber || '', licenseState: tech.licenseState || '', licenseExpiry: tech.licenseExpiry?.split('T')[0] || '', territoryId: tech.territoryId || '', specializations: tech.specializations || [] });
    setModalOpen(true);
  };

  const handleAdd = () => { setSelectedTech(null); setFormData({ email: '', password: '', firstName: '', lastName: '', phone: '', employeeId: '', licenseNumber: '', licenseState: '', licenseExpiry: '', territoryId: '', specializations: [] }); setModalOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Technicians</h1>
        <button onClick={handleAdd} className="btn btn-primary flex items-center gap-2"><FiPlus className="w-5 h-5" /> Add Technician</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? <div className="col-span-full flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full spinner" /></div> :
          technicians.map((tech) => (
            <div key={tech.id} className="card">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center"><span className="text-primary-700 font-bold text-lg">{tech.user?.firstName?.[0]}{tech.user?.lastName?.[0]}</span></div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{tech.user?.firstName} {tech.user?.lastName}</h3>
                  <p className="text-sm text-gray-500">{tech.employeeId}</p>
                  <div className="flex items-center gap-2 mt-2"><span className={`badge ${tech.isAvailable ? 'badge-green' : 'badge-gray'}`}>{tech.isAvailable ? 'Available' : 'Unavailable'}</span></div>
                </div>
                <button onClick={() => handleEdit(tech)} className="p-2 hover:bg-gray-100 rounded-lg"><FiEdit2 className="w-4 h-4" /></button>
              </div>
              <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600"><FiPhone className="w-4 h-4" />{tech.user?.phone || 'No phone'}</div>
                <div className="flex items-center gap-2 text-gray-600"><FiMapPin className="w-4 h-4" />{tech.territory?.name || 'No territory'}</div>
                {tech.licenseNumber && <div className="text-gray-600">License: {tech.licenseNumber}</div>}
              </div>
              <div className="mt-4"><p className="text-sm text-gray-500">Jobs this month: {tech._count?.serviceOrders || 0}</p></div>
            </div>
          ))
        }
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b"><h2 className="text-xl font-semibold">{selectedTech ? 'Edit Technician' : 'New Technician'}</h2><button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX className="w-5 h-5" /></button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!selectedTech && <><div className="grid grid-cols-2 gap-4"><div><label className="label">Email *</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input" required /></div><div><label className="label">Password *</label><input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="input" required /></div></div></>}
              <div className="grid grid-cols-2 gap-4"><div><label className="label">First Name *</label><input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="input" required /></div><div><label className="label">Last Name *</label><input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="input" required /></div></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="label">Phone</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input" /></div><div><label className="label">Employee ID *</label><input type="text" value={formData.employeeId} onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })} className="input" required={!selectedTech} disabled={!!selectedTech} /></div></div>
              <div className="grid grid-cols-3 gap-4"><div><label className="label">License #</label><input type="text" value={formData.licenseNumber} onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })} className="input" /></div><div><label className="label">State</label><input type="text" value={formData.licenseState} onChange={(e) => setFormData({ ...formData, licenseState: e.target.value })} className="input" /></div><div><label className="label">Expiry</label><input type="date" value={formData.licenseExpiry} onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })} className="input" /></div></div>
              <div><label className="label">Territory</label><select value={formData.territoryId} onChange={(e) => setFormData({ ...formData, territoryId: e.target.value })} className="select"><option value="">No Territory</option>{territories.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button><button type="submit" className="btn btn-primary">{selectedTech ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Technicians;
