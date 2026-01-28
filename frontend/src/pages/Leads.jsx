import React, { useState, useEffect } from 'react';
import { leadService } from '../services/api';
import { useConfig } from '../context/ConfigContext';
import { FiPlus, FiSearch, FiEdit2, FiX, FiPhone, FiMail, FiCheck, FiUserPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Leads = () => {
  const { getOptions, getLabel } = useConfig();
  const leadSources = getOptions('leadSources');
  const leadStatuses = getOptions('leadStatuses');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '', companyName: '', source: 'WEBSITE', status: 'NEW', pestConcerns: '', notes: '', estimatedValue: '' });

  useEffect(() => { loadLeads(); }, [page, search, statusFilter]);

  const loadLeads = async () => {
    try { setLoading(true); const response = await leadService.getAll({ page, limit: 20, search: search || undefined, status: statusFilter || undefined }); setLeads(response.data.leads); setPagination(response.data.pagination); }
    catch (error) { toast.error('Failed to load leads'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...formData, pestConcerns: formData.pestConcerns.split(',').map(s => s.trim()).filter(Boolean), estimatedValue: formData.estimatedValue ? parseFloat(formData.estimatedValue) : undefined };
    try {
      if (selectedLead) { await leadService.update(selectedLead.id, data); toast.success('Lead updated'); }
      else { await leadService.create(data); toast.success('Lead created'); }
      setModalOpen(false); loadLeads();
    } catch (error) { toast.error('Failed to save lead'); }
  };

  const handleConvert = async (lead) => {
    if (!confirm(`Convert ${lead.firstName} ${lead.lastName} to customer?`)) return;
    try { await leadService.convert(lead.id); toast.success('Lead converted to customer!'); loadLeads(); } catch (error) { toast.error('Failed to convert'); }
  };

  const handleEdit = (lead) => {
    setSelectedLead(lead);
    setFormData({ firstName: lead.firstName, lastName: lead.lastName, email: lead.email || '', phone: lead.phone, companyName: lead.companyName || '', source: lead.source, status: lead.status, pestConcerns: lead.pestConcerns?.join(', ') || '', notes: lead.notes || '', estimatedValue: lead.estimatedValue || '' });
    setModalOpen(true);
  };

  const handleAdd = () => { setSelectedLead(null); setFormData({ firstName: '', lastName: '', email: '', phone: '', companyName: '', source: 'WEBSITE', status: 'NEW', pestConcerns: '', notes: '', estimatedValue: '' }); setModalOpen(true); };

  const getStatusBadge = (status) => {
    const colors = { NEW: 'badge-blue', CONTACTED: 'badge-yellow', QUALIFIED: 'badge-green', QUOTED: 'badge-yellow', WON: 'badge-green', LOST: 'badge-red' };
    return colors[status] || 'badge-gray';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <button onClick={handleAdd} className="btn btn-primary flex items-center gap-2"><FiPlus className="w-5 h-5" /> New Lead</button>
      </div>

      <div className="card"><div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search leads..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input pl-10" /></div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="select"><option value="">All Statuses</option>{leadStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
      </div></div>

      <div className="card p-0 overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full spinner" /></div> : (
          <div className="table-container"><table className="table"><thead><tr><th>Lead</th><th>Contact</th><th>Source</th><th>Value</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody className="divide-y divide-gray-200">{leads.map((lead) => (
              <tr key={lead.id}>
                <td><div><p className="font-medium">{lead.firstName} {lead.lastName}</p>{lead.companyName && <p className="text-sm text-gray-500">{lead.companyName}</p>}</div></td>
                <td><div className="space-y-1"><div className="flex items-center gap-2 text-sm"><FiPhone className="w-3 h-3" />{lead.phone}</div>{lead.email && <div className="flex items-center gap-2 text-sm"><FiMail className="w-3 h-3" />{lead.email}</div>}</div></td>
                <td><span className="badge badge-gray">{getLabel('leadSources', lead.source)}</span></td>
                <td>{lead.estimatedValue ? `$${lead.estimatedValue.toLocaleString()}` : '-'}</td>
                <td><span className={`badge ${getStatusBadge(lead.status)}`}>{getLabel('leadStatuses', lead.status)}</span></td>
                <td><div className="flex gap-2">
                  <button onClick={() => handleEdit(lead)} className="p-2 hover:bg-gray-100 rounded-lg"><FiEdit2 className="w-4 h-4" /></button>
                  {lead.status !== 'WON' && lead.status !== 'LOST' && <button onClick={() => handleConvert(lead)} className="p-2 hover:bg-green-100 text-green-600 rounded-lg" title="Convert to Customer"><FiUserPlus className="w-4 h-4" /></button>}
                </div></td>
              </tr>
            ))}</tbody></table></div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b"><h2 className="text-xl font-semibold">{selectedLead ? 'Edit Lead' : 'New Lead'}</h2><button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX className="w-5 h-5" /></button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4"><div><label className="label">First Name *</label><input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="input" required /></div><div><label className="label">Last Name *</label><input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="input" required /></div></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="label">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input" /></div><div><label className="label">Phone *</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input" required /></div></div>
              <div><label className="label">Company</label><input type="text" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} className="input" /></div>
              <div className="grid grid-cols-3 gap-4"><div><label className="label">Source</label><select value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} className="select">{leadSources.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div><div><label className="label">Status</label><select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="select">{leadStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div><div><label className="label">Est. Value</label><input type="number" value={formData.estimatedValue} onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })} className="input" placeholder="$" /></div></div>
              <div><label className="label">Pest Concerns (comma-separated)</label><input type="text" value={formData.pestConcerns} onChange={(e) => setFormData({ ...formData, pestConcerns: e.target.value })} className="input" placeholder="Ants, Cockroaches, Rodents" /></div>
              <div><label className="label">Notes</label><textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input" rows={3} /></div>
              <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button><button type="submit" className="btn btn-primary">{selectedLead ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;
