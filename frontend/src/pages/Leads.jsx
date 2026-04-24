import React, { useState, useEffect } from 'react';
import { leadService } from '../services/api';
import { useConfig } from '../context/ConfigContext';
import { FiPlus, FiSearch, FiEdit2, FiX, FiPhone, FiMail, FiUserPlus, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import SortableHeader from '../components/SortableHeader';
import BulkActionBar from '../components/BulkActionBar';
import RowDetailPanel, { DetailField } from '../components/RowDetailPanel';
import { TableSkeleton } from '../components/LoadingSkeleton';

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

  const [sort, setSort] = useState({ field: null, order: null });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [detailLead, setDetailLead] = useState(null);

  useEffect(() => { loadLeads(); }, [page, search, statusFilter, sort]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20, search: search || undefined, status: statusFilter || undefined };
      if (sort.field) { params.sortBy = sort.field; params.sortOrder = sort.order; }
      const response = await leadService.getAll(params);
      setLeads(response.data.leads); setPagination(response.data.pagination); setSelectedIds(new Set());
    } catch (error) { toast.error('Failed to load leads'); }
    finally { setLoading(false); }
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

  const handleConvert = (lead) => {
    setConfirmDialog({
      isOpen: true, title: 'Convert to Customer', message: `Convert ${lead.firstName} ${lead.lastName} to customer?`, variant: 'info',
      onConfirm: async () => { try { await leadService.convert(lead.id); toast.success('Lead converted!'); setDetailLead(null); loadLeads(); } catch (error) { toast.error('Failed'); } }
    });
  };

  const handleDelete = (lead) => {
    setConfirmDialog({
      isOpen: true, title: 'Delete Lead', message: `Delete ${lead.firstName} ${lead.lastName}? This cannot be undone.`,
      onConfirm: async () => { try { await leadService.delete(lead.id); toast.success('Lead deleted'); setDetailLead(null); loadLeads(); } catch (error) { toast.error('Failed'); } }
    });
  };

  const handleEdit = (lead) => {
    setSelectedLead(lead);
    setFormData({ firstName: lead.firstName, lastName: lead.lastName, email: lead.email || '', phone: lead.phone, companyName: lead.companyName || '', source: lead.source, status: lead.status, pestConcerns: lead.pestConcerns?.join(', ') || '', notes: lead.notes || '', estimatedValue: lead.estimatedValue || '' });
    setModalOpen(true); setDetailLead(null);
  };

  const handleAdd = () => { setSelectedLead(null); setFormData({ firstName: '', lastName: '', email: '', phone: '', companyName: '', source: 'WEBSITE', status: 'NEW', pestConcerns: '', notes: '', estimatedValue: '' }); setModalOpen(true); };

  const toggleSelect = (id) => { const next = new Set(selectedIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedIds(next); };
  const toggleSelectAll = () => { selectedIds.size === leads.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(leads.map(l => l.id))); };

  const handleBulkDelete = () => {
    setConfirmDialog({
      isOpen: true, title: 'Delete Selected Leads', message: `Delete ${selectedIds.size} lead(s)? This cannot be undone.`,
      onConfirm: async () => { try { await leadService.bulkDelete([...selectedIds]); toast.success(`${selectedIds.size} leads deleted`); setSelectedIds(new Set()); loadLeads(); } catch (error) { toast.error('Failed'); } }
    });
  };

  const handleBulkUpdate = async (data) => {
    try { await leadService.bulkUpdate([...selectedIds], data); toast.success(`${selectedIds.size} leads updated`); setSelectedIds(new Set()); loadLeads(); }
    catch (error) { toast.error('Failed'); }
  };

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

      <BulkActionBar selectedCount={selectedIds.size} onBulkDelete={handleBulkDelete} onBulkUpdate={handleBulkUpdate} onClearSelection={() => setSelectedIds(new Set())} statusOptions={leadStatuses} />

      {loading ? <TableSkeleton rows={8} cols={7} /> : (
        <div className="card p-0 overflow-hidden">
          <div className="table-container"><table className="table"><thead><tr>
            <th className="w-10"><input type="checkbox" checked={selectedIds.size === leads.length && leads.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300" /></th>
            <SortableHeader label="Lead" field="firstName" currentSort={sort} onSort={setSort} />
            <th>Contact</th>
            <SortableHeader label="Source" field="source" currentSort={sort} onSort={setSort} />
            <SortableHeader label="Value" field="estimatedValue" currentSort={sort} onSort={setSort} />
            <SortableHeader label="Status" field="status" currentSort={sort} onSort={setSort} />
            <th>Actions</th>
          </tr></thead>
            <tbody className="divide-y divide-gray-200">{leads.map((lead) => (
              <tr key={lead.id} className={`cursor-pointer ${selectedIds.has(lead.id) ? 'bg-primary-50' : ''}`} onClick={() => setDetailLead(lead)}>
                <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(lead.id)} onChange={() => toggleSelect(lead.id)} className="rounded border-gray-300" /></td>
                <td><div><p className="font-medium">{lead.firstName} {lead.lastName}</p>{lead.companyName && <p className="text-sm text-gray-500">{lead.companyName}</p>}</div></td>
                <td><div className="space-y-1"><div className="flex items-center gap-2 text-sm"><FiPhone className="w-3 h-3" />{lead.phone}</div>{lead.email && <div className="flex items-center gap-2 text-sm"><FiMail className="w-3 h-3" />{lead.email}</div>}</div></td>
                <td><span className="badge badge-gray">{getLabel('leadSources', lead.source)}</span></td>
                <td>{lead.estimatedValue ? `$${lead.estimatedValue.toLocaleString()}` : '-'}</td>
                <td><span className={`badge ${getStatusBadge(lead.status)}`}>{getLabel('leadStatuses', lead.status)}</span></td>
                <td onClick={(e) => e.stopPropagation()}><div className="flex gap-2">
                  <button onClick={() => handleEdit(lead)} className="p-2 hover:bg-gray-100 rounded-lg"><FiEdit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(lead)} className="p-2 hover:bg-red-100 text-red-600 rounded-lg"><FiTrash2 className="w-4 h-4" /></button>
                  {lead.status !== 'WON' && lead.status !== 'LOST' && <button onClick={() => handleConvert(lead)} className="p-2 hover:bg-green-100 text-green-600 rounded-lg" title="Convert"><FiUserPlus className="w-4 h-4" /></button>}
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

      <ConfirmDialog isOpen={confirmDialog.isOpen} onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} onConfirm={confirmDialog.onConfirm} title={confirmDialog.title} message={confirmDialog.message} confirmText="Confirm" variant="danger" />

      <RowDetailPanel isOpen={!!detailLead} onClose={() => setDetailLead(null)} title={detailLead ? `${detailLead.firstName} ${detailLead.lastName}` : ''} onEdit={() => handleEdit(detailLead)} onDelete={() => handleDelete(detailLead)}>
        {detailLead && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Name" value={`${detailLead.firstName} ${detailLead.lastName}`} />
              <DetailField label="Company" value={detailLead.companyName} />
              <DetailField label="Email" value={detailLead.email} />
              <DetailField label="Phone" value={detailLead.phone} />
              <DetailField label="Source" value={getLabel('leadSources', detailLead.source)} />
              <DetailField label="Status" value={getLabel('leadStatuses', detailLead.status)} />
              <DetailField label="Estimated Value" value={detailLead.estimatedValue ? `$${detailLead.estimatedValue.toLocaleString()}` : '-'} />
              <DetailField label="Created" value={new Date(detailLead.createdAt).toLocaleDateString()} />
            </div>
            <DetailField label="Pest Concerns" value={detailLead.pestConcerns?.join(', ')} />
            <DetailField label="Notes" value={detailLead.notes} />
          </div>
        )}
      </RowDetailPanel>
    </div>
  );
};

export default Leads;
