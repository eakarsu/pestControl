import React, { useState, useEffect } from 'react';
import { inspectionService, propertyService, technicianService, pestService } from '../services/api';
import { useConfig } from '../context/ConfigContext';
import { FiPlus, FiSearch, FiEdit2, FiX, FiCamera, FiClipboard, FiCheck, FiFileText } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Inspections = () => {
  const { getOptions, getLabel } = useConfig();
  const inspectionStatuses = getOptions('inspectionStatuses');
  const inspectionTypes = getOptions('inspectionTypes');
  const [inspections, setInspections] = useState([]);
  const [properties, setProperties] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [pestTypes, setPestTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [formData, setFormData] = useState({ propertyId: '', inspectorId: '', scheduledDate: '', type: 'INITIAL', findings: '', pestsFound: [], recommendations: '', photos: [] });

  useEffect(() => { loadInspections(); loadProperties(); loadTechnicians(); loadPestTypes(); }, [statusFilter]);

  const loadInspections = async () => { try { setLoading(true); const response = await inspectionService.getAll({ status: statusFilter || undefined }); setInspections(response.data.inspections || []); } catch (error) { toast.error('Failed to load inspections'); } finally { setLoading(false); } };
  const loadProperties = async () => { try { const response = await propertyService.getAll({ limit: 100 }); setProperties(response.data.properties || []); } catch (error) {} };
  const loadTechnicians = async () => { try { const response = await technicianService.getAll(); setTechnicians(response.data || []); } catch (error) {} };
  const loadPestTypes = async () => { try { const response = await pestService.getTypes(); setPestTypes(response.data || []); } catch (error) {} };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        scheduledDate: formData.scheduledDate ? new Date(formData.scheduledDate).toISOString() : undefined
      };
      if (selectedInspection) { await inspectionService.update(selectedInspection.id, submitData); toast.success('Inspection updated'); }
      else { await inspectionService.create(submitData); toast.success('Inspection scheduled'); }
      setModalOpen(false); loadInspections();
    } catch (error) { toast.error(error.response?.data?.error || 'Failed to save'); }
  };

  const handleComplete = async (inspection) => {
    try { await inspectionService.complete(inspection.id, { findings: 'Inspection completed', recommendations: 'See detailed report' }); toast.success('Inspection completed'); loadInspections(); }
    catch (error) { toast.error('Failed to complete'); }
  };

  const handleGenerateReport = async (inspection) => {
    try { const response = await inspectionService.generateReport(inspection.id); toast.success('Report generated!'); window.open(response.data.reportUrl, '_blank'); }
    catch (error) { toast.error('Failed to generate report'); }
  };

  const handleEdit = (inspection) => {
    setSelectedInspection(inspection);
    setFormData({ propertyId: inspection.propertyId, inspectorId: inspection.inspectorId, scheduledDate: inspection.scheduledDate?.split('T')[0] || '', type: inspection.type, findings: inspection.findings || '', pestsFound: inspection.pestsFound || [], recommendations: inspection.recommendations || '', photos: inspection.photos || [] });
    setModalOpen(true);
  };

  const handleAdd = () => { setSelectedInspection(null); setFormData({ propertyId: '', inspectorId: '', scheduledDate: new Date().toISOString().split('T')[0], type: 'INITIAL', findings: '', pestsFound: [], recommendations: '', photos: [] }); setModalOpen(true); };

  const togglePest = (pestId) => {
    const pestsFound = formData.pestsFound.includes(pestId) ? formData.pestsFound.filter(p => p !== pestId) : [...formData.pestsFound, pestId];
    setFormData({ ...formData, pestsFound });
  };

  const getStatusBadge = (status) => { const colors = { SCHEDULED: 'badge-blue', IN_PROGRESS: 'badge-yellow', COMPLETED: 'badge-green', CANCELLED: 'badge-gray' }; return colors[status] || 'badge-gray'; };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Inspections</h1>
        <button onClick={handleAdd} className="btn btn-primary flex items-center gap-2"><FiPlus className="w-5 h-5" /> Schedule Inspection</button>
      </div>

      <div className="card">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select w-48"><option value="">All Statuses</option>{inspectionStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full spinner" /></div> : (
          <div className="table-container"><table className="table"><thead><tr><th>Property</th><th>Inspector</th><th>Date</th><th>Type</th><th>Status</th><th>Pests Found</th><th>Actions</th></tr></thead>
            <tbody className="divide-y divide-gray-200">{inspections.map((inspection) => (
              <tr key={inspection.id}>
                <td><div><p className="font-medium">{inspection.property?.address}</p><p className="text-sm text-gray-500">{inspection.property?.customer?.lastName}</p></div></td>
                <td>{inspection.inspector?.user?.firstName} {inspection.inspector?.user?.lastName}</td>
                <td>{new Date(inspection.scheduledDate).toLocaleDateString()}</td>
                <td><span className="badge badge-gray">{getLabel('inspectionTypes', inspection.type)}</span></td>
                <td><span className={`badge ${getStatusBadge(inspection.status)}`}>{getLabel('inspectionStatuses', inspection.status)}</span></td>
                <td>{inspection.pestsFound?.length || 0} types</td>
                <td><div className="flex gap-2">
                  <button onClick={() => handleEdit(inspection)} className="p-2 hover:bg-gray-100 rounded-lg"><FiEdit2 className="w-4 h-4" /></button>
                  {inspection.status === 'SCHEDULED' && <button onClick={() => handleComplete(inspection)} className="p-2 hover:bg-green-100 text-green-600 rounded-lg" title="Complete"><FiCheck className="w-4 h-4" /></button>}
                  {inspection.status === 'COMPLETED' && <button onClick={() => handleGenerateReport(inspection)} className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg" title="Generate Report"><FiFileText className="w-4 h-4" /></button>}
                </div></td>
              </tr>
            ))}</tbody></table></div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b"><h2 className="text-xl font-semibold">{selectedInspection ? 'Edit Inspection' : 'Schedule Inspection'}</h2><button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX className="w-5 h-5" /></button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="label">Property *</label><select value={formData.propertyId} onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })} className="select" required><option value="">Select Property</option>{properties.map((p) => <option key={p.id} value={p.id}>{p.address} - {p.customer?.lastName}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Inspector *</label><select value={formData.inspectorId} onChange={(e) => setFormData({ ...formData, inspectorId: e.target.value })} className="select" required><option value="">Select Inspector</option>{technicians.map((t) => <option key={t.id} value={t.id}>{t.user?.firstName} {t.user?.lastName}</option>)}</select></div>
                <div><label className="label">Date *</label><input type="date" value={formData.scheduledDate} onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })} className="input" required /></div>
              </div>
              <div><label className="label">Type</label><select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="select">{inspectionTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>

              <div><label className="label">Pests Found</label>
                <div className="flex flex-wrap gap-2">{pestTypes.map((pest) => (
                  <button key={pest.id} type="button" onClick={() => togglePest(pest.id)} className={`px-3 py-1 rounded-full text-sm border ${formData.pestsFound.includes(pest.id) ? 'bg-primary-100 border-primary-500 text-primary-700' : 'border-gray-300'}`}>{pest.name}</button>
                ))}</div>
              </div>

              <div><label className="label">Findings</label><textarea value={formData.findings} onChange={(e) => setFormData({ ...formData, findings: e.target.value })} className="input" rows={3} placeholder="Describe inspection findings..." /></div>
              <div><label className="label">Recommendations</label><textarea value={formData.recommendations} onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })} className="input" rows={3} placeholder="Treatment recommendations..." /></div>

              <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button><button type="submit" className="btn btn-primary">{selectedInspection ? 'Update' : 'Schedule'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inspections;
