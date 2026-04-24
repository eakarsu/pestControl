import React, { useState, useEffect } from 'react';
import { complianceService, technicianService, productService } from '../services/api';
import { useConfig } from '../context/ConfigContext';
import { FiPlus, FiEdit2, FiX, FiAlertTriangle, FiCheckCircle, FiClock, FiFileText, FiDownload, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import RowDetailPanel, { DetailField } from '../components/RowDetailPanel';
import { TableSkeleton, CardSkeleton } from '../components/LoadingSkeleton';

const Compliance = () => {
  const { getOptions, getLabel } = useConfig();
  const licenseTypes = getOptions('licenseTypes');
  const licenseStatuses = getOptions('licenseStatuses');
  const [activeTab, setActiveTab] = useState('licenses');
  const [licenses, setLicenses] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [safetyDocs, setSafetyDocs] = useState([]);
  const [usageReports, setUsageReports] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState({});

  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [detailItem, setDetailItem] = useState(null);
  const [detailType, setDetailType] = useState('');

  useEffect(() => { loadData(); }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [techRes, prodRes] = await Promise.all([technicianService.getAll(), productService.getAll()]);
      setTechnicians(techRes.data || []);
      setProducts(prodRes.data?.products || []);

      if (activeTab === 'licenses') { const res = await complianceService.getLicenses(); setLicenses(res.data || []); }
      else if (activeTab === 'certifications') { const res = await complianceService.getCertifications(); setCertifications(res.data || []); }
      else if (activeTab === 'sds') { const res = await complianceService.getSafetyDataSheets(); setSafetyDocs(res.data || []); }
      else if (activeTab === 'usage') { const res = await complianceService.getUsageReports(); setUsageReports(res.data || []); }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleAddLicense = () => { setModalType('license'); setFormData({ technicianId: '', licenseType: '', licenseNumber: '', state: '', issueDate: '', expiryDate: '' }); setModalOpen(true); };
  const handleAddCertification = () => { setModalType('certification'); setFormData({ technicianId: '', name: '', issuingBody: '', certificationNumber: '', issueDate: '', expiryDate: '' }); setModalOpen(true); };
  const handleAddSDS = () => { setModalType('sds'); setFormData({ productId: '', documentUrl: '', version: '', effectiveDate: '' }); setModalOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData, issueDate: formData.issueDate ? new Date(formData.issueDate).toISOString() : undefined, expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : undefined, effectiveDate: formData.effectiveDate ? new Date(formData.effectiveDate).toISOString() : undefined };
      if (modalType === 'license') { await complianceService.createLicense(submitData); toast.success('License added'); }
      else if (modalType === 'certification') { await complianceService.createCertification(submitData); toast.success('Certification added'); }
      else if (modalType === 'sds') { await complianceService.createSafetyDataSheet(submitData); toast.success('SDS added'); }
      setModalOpen(false); loadData();
    } catch (error) { toast.error('Failed to save'); }
  };

  const handleGenerateReport = async () => {
    try { await complianceService.generateUsageReport({ startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0] }); toast.success('Report generated!'); loadData(); }
    catch (error) { toast.error('Failed to generate report'); }
  };

  const handleDeleteLicense = (license) => {
    setConfirmDialog({
      isOpen: true, title: 'Delete License', message: `Delete license ${license.licenseNumber}? This cannot be undone.`,
      onConfirm: async () => { try { await complianceService.deleteLicense(license.id); toast.success('License deleted'); setDetailItem(null); loadData(); } catch (error) { toast.error('Failed'); } }
    });
  };

  const openDetail = (item, type) => { setDetailItem(item); setDetailType(type); };

  const getExpiryStatus = (date) => {
    if (!date) return { color: 'text-gray-500', icon: null, text: 'No expiry' };
    const expiry = new Date(date);
    const now = new Date();
    const daysUntil = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) return { color: 'text-red-600', icon: FiAlertTriangle, text: 'Expired' };
    if (daysUntil < 30) return { color: 'text-yellow-600', icon: FiClock, text: `${daysUntil} days` };
    return { color: 'text-green-600', icon: FiCheckCircle, text: 'Valid' };
  };

  const tabs = [
    { id: 'licenses', label: 'Licenses' },
    { id: 'certifications', label: 'Certifications' },
    { id: 'sds', label: 'Safety Data Sheets' },
    { id: 'usage', label: 'Usage Reports' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Compliance Management</h1>
        <div className="flex gap-2">
          {activeTab === 'licenses' && <button onClick={handleAddLicense} className="btn btn-primary flex items-center gap-2"><FiPlus className="w-5 h-5" /> Add License</button>}
          {activeTab === 'certifications' && <button onClick={handleAddCertification} className="btn btn-primary flex items-center gap-2"><FiPlus className="w-5 h-5" /> Add Certification</button>}
          {activeTab === 'sds' && <button onClick={handleAddSDS} className="btn btn-primary flex items-center gap-2"><FiPlus className="w-5 h-5" /> Add SDS</button>}
          {activeTab === 'usage' && <button onClick={handleGenerateReport} className="btn btn-primary flex items-center gap-2"><FiFileText className="w-5 h-5" /> Generate Report</button>}
        </div>
      </div>

      <div className="card p-0">
        <div className="border-b"><div className="flex">{tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-6 py-4 text-sm font-medium border-b-2 -mb-px ${activeTab === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{tab.label}</button>
        ))}</div></div>

        <div className="p-6">
          {loading ? <TableSkeleton rows={5} cols={4} /> : (
            <>
              {activeTab === 'licenses' && (
                <div className="space-y-4">{licenses.length === 0 ? <p className="text-gray-500 text-center py-8">No licenses found</p> : licenses.map((license) => {
                  const status = getExpiryStatus(license.expiryDate);
                  return (
                    <div key={license.id} className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50" onClick={() => openDetail(license, 'license')}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center"><span className="text-primary-700 font-bold">{license.technician?.user?.firstName?.[0]}{license.technician?.user?.lastName?.[0]}</span></div>
                        <div><p className="font-medium">{license.technician?.user?.firstName} {license.technician?.user?.lastName}</p><p className="text-sm text-gray-500">{license.licenseType} - {license.licenseNumber}</p><p className="text-sm text-gray-500">{license.state}</p></div>
                      </div>
                      <div className="text-right">
                        <div className={`flex items-center gap-2 ${status.color}`}>{status.icon && <status.icon className="w-4 h-4" />}<span>{status.text}</span></div>
                        <p className="text-sm text-gray-500">Expires: {license.expiryDate ? new Date(license.expiryDate).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                  );
                })}</div>
              )}

              {activeTab === 'certifications' && (
                <div className="space-y-4">{certifications.length === 0 ? <p className="text-gray-500 text-center py-8">No certifications found</p> : certifications.map((cert) => {
                  const status = getExpiryStatus(cert.expiryDate);
                  return (
                    <div key={cert.id} className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50" onClick={() => openDetail(cert, 'certification')}>
                      <div><p className="font-medium">{cert.name}</p><p className="text-sm text-gray-500">{cert.issuingBody} - {cert.certificationNumber}</p><p className="text-sm text-gray-500">{cert.technician?.user?.firstName} {cert.technician?.user?.lastName}</p></div>
                      <div className="text-right"><div className={`flex items-center gap-2 ${status.color}`}>{status.icon && <status.icon className="w-4 h-4" />}<span>{status.text}</span></div></div>
                    </div>
                  );
                })}</div>
              )}

              {activeTab === 'sds' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{safetyDocs.length === 0 ? <p className="text-gray-500 text-center py-8 col-span-full">No safety data sheets found</p> : safetyDocs.map((sds) => (
                  <div key={sds.id} className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50" onClick={() => openDetail(sds, 'sds')}>
                    <div className="flex items-start justify-between"><div><p className="font-medium">{sds.product?.name}</p><p className="text-sm text-gray-500">Version: {sds.version}</p></div><button className="p-2 hover:bg-gray-100 rounded-lg" onClick={(e) => e.stopPropagation()}><FiDownload className="w-4 h-4" /></button></div>
                    <p className="text-sm text-gray-500 mt-2">Effective: {new Date(sds.effectiveDate).toLocaleDateString()}</p>
                  </div>
                ))}</div>
              )}

              {activeTab === 'usage' && (
                <div className="space-y-4">{usageReports.length === 0 ? <p className="text-gray-500 text-center py-8">No usage reports found</p> : usageReports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50" onClick={() => openDetail(report, 'usage')}>
                    <div><p className="font-medium">Usage Report</p><p className="text-sm text-gray-500">{new Date(report.startDate).toLocaleDateString()} - {new Date(report.endDate).toLocaleDateString()}</p></div>
                    <div className="flex items-center gap-4"><span className={`badge ${report.status === 'SUBMITTED' ? 'badge-green' : 'badge-gray'}`}>{report.status}</span><button className="btn btn-secondary btn-sm" onClick={(e) => e.stopPropagation()}>View</button></div>
                  </div>
                ))}</div>
              )}
            </>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b"><h2 className="text-xl font-semibold">{modalType === 'license' ? 'Add License' : modalType === 'certification' ? 'Add Certification' : 'Add Safety Data Sheet'}</h2><button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX className="w-5 h-5" /></button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {modalType === 'license' && (<>
                <div><label className="label">Technician *</label><select value={formData.technicianId} onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })} className="select" required><option value="">Select Technician</option>{technicians.map((t) => <option key={t.id} value={t.id}>{t.user?.firstName} {t.user?.lastName}</option>)}</select></div>
                <div><label className="label">License Type *</label><select value={formData.licenseType} onChange={(e) => setFormData({ ...formData, licenseType: e.target.value })} className="select" required><option value="">Select Type</option><option value="PESTICIDE_APPLICATOR">Pesticide Applicator</option><option value="RESTRICTED_USE">Restricted Use</option><option value="COMMERCIAL">Commercial Applicator</option><option value="OPERATOR">Operator License</option><option value="BUSINESS">Business License</option></select></div>
                <div><label className="label">License Number *</label><input type="text" value={formData.licenseNumber} onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })} className="input" required /></div>
                <div><label className="label">State *</label><input type="text" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className="input" required /></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="label">Issue Date</label><input type="date" value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} className="input" /></div><div><label className="label">Expiry Date</label><input type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} className="input" /></div></div>
              </>)}
              {modalType === 'certification' && (<>
                <div><label className="label">Technician *</label><select value={formData.technicianId} onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })} className="select" required><option value="">Select Technician</option>{technicians.map((t) => <option key={t.id} value={t.id}>{t.user?.firstName} {t.user?.lastName}</option>)}</select></div>
                <div><label className="label">Certification Name *</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input" required /></div>
                <div><label className="label">Issuing Body *</label><input type="text" value={formData.issuingBody} onChange={(e) => setFormData({ ...formData, issuingBody: e.target.value })} className="input" required /></div>
                <div><label className="label">Certification Number</label><input type="text" value={formData.certificationNumber} onChange={(e) => setFormData({ ...formData, certificationNumber: e.target.value })} className="input" /></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="label">Issue Date</label><input type="date" value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} className="input" /></div><div><label className="label">Expiry Date</label><input type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} className="input" /></div></div>
              </>)}
              {modalType === 'sds' && (<>
                <div><label className="label">Product *</label><select value={formData.productId} onChange={(e) => setFormData({ ...formData, productId: e.target.value })} className="select" required><option value="">Select Product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                <div><label className="label">Document URL *</label><input type="url" value={formData.documentUrl} onChange={(e) => setFormData({ ...formData, documentUrl: e.target.value })} className="input" required /></div>
                <div><label className="label">Version *</label><input type="text" value={formData.version} onChange={(e) => setFormData({ ...formData, version: e.target.value })} className="input" required /></div>
                <div><label className="label">Effective Date *</label><input type="date" value={formData.effectiveDate} onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })} className="input" required /></div>
              </>)}
              <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancel</button><button type="submit" className="btn btn-primary">Add</button></div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={confirmDialog.isOpen} onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} onConfirm={confirmDialog.onConfirm} title={confirmDialog.title} message={confirmDialog.message} confirmText="Delete" variant="danger" />

      <RowDetailPanel isOpen={!!detailItem} onClose={() => { setDetailItem(null); setDetailType(''); }} title={detailType === 'license' ? `License: ${detailItem?.licenseNumber}` : detailType === 'certification' ? detailItem?.name : detailType === 'sds' ? detailItem?.product?.name : 'Usage Report'} onDelete={detailType === 'license' ? () => handleDeleteLicense(detailItem) : undefined}>
        {detailItem && detailType === 'license' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Technician" value={`${detailItem.technician?.user?.firstName} ${detailItem.technician?.user?.lastName}`} />
              <DetailField label="License Type" value={detailItem.licenseType} />
              <DetailField label="License Number" value={detailItem.licenseNumber} />
              <DetailField label="State" value={detailItem.state} />
              <DetailField label="Issue Date" value={detailItem.issueDate ? new Date(detailItem.issueDate).toLocaleDateString() : '-'} />
              <DetailField label="Expiry Date" value={detailItem.expiryDate ? new Date(detailItem.expiryDate).toLocaleDateString() : '-'} />
              <DetailField label="Status" value={getExpiryStatus(detailItem.expiryDate).text} />
            </div>
          </div>
        )}
        {detailItem && detailType === 'certification' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Name" value={detailItem.name} />
              <DetailField label="Technician" value={`${detailItem.technician?.user?.firstName} ${detailItem.technician?.user?.lastName}`} />
              <DetailField label="Issuing Body" value={detailItem.issuingBody} />
              <DetailField label="Certification #" value={detailItem.certificationNumber} />
              <DetailField label="Issue Date" value={detailItem.issueDate ? new Date(detailItem.issueDate).toLocaleDateString() : '-'} />
              <DetailField label="Expiry Date" value={detailItem.expiryDate ? new Date(detailItem.expiryDate).toLocaleDateString() : '-'} />
              <DetailField label="Status" value={getExpiryStatus(detailItem.expiryDate).text} />
            </div>
          </div>
        )}
        {detailItem && detailType === 'sds' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Product" value={detailItem.product?.name} />
              <DetailField label="Version" value={detailItem.version} />
              <DetailField label="Effective Date" value={new Date(detailItem.effectiveDate).toLocaleDateString()} />
              <DetailField label="Document URL" value={detailItem.documentUrl} />
            </div>
          </div>
        )}
        {detailItem && detailType === 'usage' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Start Date" value={new Date(detailItem.startDate).toLocaleDateString()} />
              <DetailField label="End Date" value={new Date(detailItem.endDate).toLocaleDateString()} />
              <DetailField label="Status" value={detailItem.status} />
              <DetailField label="Created" value={detailItem.createdAt ? new Date(detailItem.createdAt).toLocaleDateString() : '-'} />
            </div>
          </div>
        )}
      </RowDetailPanel>
    </div>
  );
};

export default Compliance;
