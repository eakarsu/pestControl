import React from 'react';
import { FiX, FiEdit2, FiTrash2 } from 'react-icons/fi';

const RowDetailPanel = ({ isOpen, onClose, title, children, onEdit, onDelete }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-50">
      <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-xl animate-slide-in">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button onClick={onEdit} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg" title="Edit">
                <FiEdit2 className="w-5 h-5" />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} className="p-2 hover:bg-red-50 text-red-600 rounded-lg" title="Delete">
                <FiTrash2 className="w-5 h-5" />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export const DetailField = ({ label, value }) => (
  <div className="py-2">
    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900">{value || '-'}</dd>
  </div>
);

export default RowDetailPanel;
