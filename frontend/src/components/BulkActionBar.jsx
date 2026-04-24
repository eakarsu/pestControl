import React, { useState } from 'react';
import { FiTrash2, FiEdit2, FiX } from 'react-icons/fi';

const BulkActionBar = ({ selectedCount, onBulkDelete, onBulkUpdate, onClearSelection, statusOptions = [] }) => {
  const [showStatusSelect, setShowStatusSelect] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');

  if (selectedCount === 0) return null;

  return (
    <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 flex items-center gap-4 flex-wrap">
      <span className="text-sm font-medium text-primary-800">
        {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
      </span>

      <div className="flex items-center gap-2 flex-wrap">
        {onBulkDelete && (
          <button onClick={onBulkDelete} className="btn btn-danger text-sm py-1.5 flex items-center gap-1.5">
            <FiTrash2 className="w-4 h-4" /> Delete Selected
          </button>
        )}

        {onBulkUpdate && statusOptions.length > 0 && (
          <>
            {!showStatusSelect ? (
              <button onClick={() => setShowStatusSelect(true)} className="btn btn-primary text-sm py-1.5 flex items-center gap-1.5">
                <FiEdit2 className="w-4 h-4" /> Update Status
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="select text-sm py-1.5"
                >
                  <option value="">Select status...</option>
                  {statusOptions.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => { if (selectedStatus) { onBulkUpdate({ status: selectedStatus }); setShowStatusSelect(false); setSelectedStatus(''); } }}
                  disabled={!selectedStatus}
                  className="btn btn-primary text-sm py-1.5"
                >
                  Apply
                </button>
                <button onClick={() => { setShowStatusSelect(false); setSelectedStatus(''); }} className="btn btn-secondary text-sm py-1.5">
                  Cancel
                </button>
              </div>
            )}
          </>
        )}

        <button onClick={onClearSelection} className="p-1.5 hover:bg-primary-100 rounded text-primary-700" title="Clear selection">
          <FiX className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default BulkActionBar;
