import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { evidenceService } from '../services/api';

const emptyDraft = {
  kind: 'SERVICE_REPORT', title: '', jurisdiction: '', effectiveDate: new Date().toISOString().slice(0, 10), privileged: false,
  contentHash: '', mimeType: 'application/pdf', byteSize: '', storageProvider: '', storageObjectKey: '', storageVersion: '', sourceSystem: '', sourceReference: '',
};

export default function EvidenceWorkspace() {
  const [orderId, setOrderId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!orderId) return;
    setBusy(true);
    try { setDocuments((await evidenceService.list(orderId)).data); } catch (error) { toast.error(error.response?.data?.message || 'Could not load evidence'); }
    finally { setBusy(false); }
  }

  async function create(event) {
    event.preventDefault();
    try {
      await evidenceService.create(orderId, {
        kind: draft.kind, title: draft.title, jurisdiction: draft.jurisdiction, effectiveDate: draft.effectiveDate,
        privileged: draft.privileged, provenance: { capturedBy: 'operator-workspace' },
        version: {
          contentHash: draft.contentHash, mimeType: draft.mimeType, byteSize: Number(draft.byteSize),
          storageProvider: draft.storageProvider, storageObjectKey: draft.storageObjectKey, storageVersion: draft.storageVersion,
          sourceSystem: draft.sourceSystem, sourceReference: draft.sourceReference,
        },
      });
      setDraft(emptyDraft); toast.success('Evidence submitted for independent review'); await load();
    } catch (error) { toast.error(error.response?.data?.message || 'Evidence could not be created'); }
  }

  async function review(document, decision) {
    const reason = window.prompt(`Reason for ${decision.toLowerCase()}`);
    if (!reason) return;
    try {
      await evidenceService.review(document.id, {
        version: document.currentVersion, decision, reason, jurisdictionValidated: true, effectiveDateValidated: true,
        productRegistrationChecked: document.kind === 'TREATMENT_PLAN', safetyDataChecked: document.kind === 'TREATMENT_PLAN',
      });
      await load();
    } catch (error) { toast.error(error.response?.data?.message || 'Review failed'); }
  }

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold">Service evidence workspace</h1><p className="text-gray-600">Provenance, versions, privileged access, human review, OCR, signing, filing, retention, and audit are enforced by the API.</p></div>
    <div className="card p-4 flex gap-3"><input className="input flex-1" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Service order UUID" /><button className="btn btn-primary" disabled={busy || !orderId} onClick={load}>Load evidence</button><button className="btn btn-secondary" disabled={!orderId} onClick={async () => { const result = await evidenceService.verifyAudit(orderId); toast[result.data.valid ? 'success' : 'error'](result.data.valid ? 'Audit chain verified' : 'Audit chain invalid'); }}>Verify audit</button></div>
    <form className="card p-5 grid grid-cols-2 gap-3" onSubmit={create}>
      <h2 className="col-span-2 font-semibold text-lg">Register immutable evidence metadata</h2>
      <select className="select" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}>{['SERVICE_REPORT', 'INSPECTION_REPORT', 'SAFETY_DATA_SHEET', 'LICENSE', 'CONTRACT'].map((value) => <option key={value}>{value}</option>)}</select>
      <input className="input" required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" />
      <input className="input" required value={draft.jurisdiction} onChange={(e) => setDraft({ ...draft, jurisdiction: e.target.value.toUpperCase() })} placeholder="Jurisdiction, e.g. NY" />
      <input className="input" type="date" required value={draft.effectiveDate} onChange={(e) => setDraft({ ...draft, effectiveDate: e.target.value })} />
      <input className="input col-span-2" required value={draft.contentHash} onChange={(e) => setDraft({ ...draft, contentHash: e.target.value })} placeholder="SHA-256 content hash" />
      {['storageProvider', 'storageObjectKey', 'storageVersion', 'sourceSystem', 'sourceReference'].map((field) => <input key={field} className="input" required value={draft[field]} onChange={(e) => setDraft({ ...draft, [field]: e.target.value })} placeholder={field} />)}
      <input className="input" required type="number" min="1" value={draft.byteSize} onChange={(e) => setDraft({ ...draft, byteSize: e.target.value })} placeholder="Bytes" />
      <label className="flex items-center gap-2"><input type="checkbox" checked={draft.privileged} onChange={(e) => setDraft({ ...draft, privileged: e.target.checked })} /> Privileged evidence</label>
      <button className="btn btn-primary col-span-2" disabled={!orderId}>Submit for review</button>
    </form>
    <div className="space-y-3">{documents.map((document) => <div key={document.id} className="card p-5">
      <div className="flex justify-between"><div><h3 className="font-semibold">{document.title}</h3><p className="text-sm text-gray-600">{document.kind} · v{document.currentVersion} · {document.status} · {document.jurisdiction}{document.privileged ? ' · PRIVILEGED' : ''}</p></div><div className="flex flex-wrap gap-2"><button className="btn btn-secondary" onClick={() => review(document, 'APPROVED')}>Approve</button><button className="btn btn-secondary" onClick={() => review(document, 'REJECTED')}>Reject</button><button className="btn btn-secondary" onClick={async () => { await evidenceService.queueOcr(document.id, document.currentVersion); toast.success('OCR queued'); await load(); }}>OCR</button><button className="btn btn-secondary" onClick={async () => { await evidenceService.queueFiling(document.id, document.currentVersion); toast.success('Filing queued'); }}>File</button></div></div>
      <p className="mt-2 text-xs text-gray-500 break-all">Current hash: {document.versions?.[0]?.contentHash}</p>
    </div>)}</div>
    <div className="flex gap-3"><button className="btn btn-secondary" disabled={!orderId} onClick={async () => { await evidenceService.requestExport(orderId); toast.success('Evidence export queued'); }}>Export evidence package</button><button className="btn btn-secondary" disabled={!orderId} onClick={async () => { const reason = window.prompt('Legal hold reason'); const reference = window.prompt('Authoritative hold reference'); if (reason && reference) { await evidenceService.placeHold(orderId, { reason, reference }); toast.success('Legal hold placed'); } }}>Place order-wide legal hold</button></div>
  </div>;
}
