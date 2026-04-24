import React from 'react';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger' }) => {
  if (!isOpen) return null;

  const variants = {
    danger: { icon: 'bg-red-100 text-red-600', button: 'btn btn-danger' },
    warning: { icon: 'bg-yellow-100 text-yellow-600', button: 'bg-yellow-600 text-white hover:bg-yellow-700 btn' },
    info: { icon: 'bg-blue-100 text-blue-600', button: 'btn btn-primary' }
  };

  const v = variants[variant] || variants.danger;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${v.icon}`}>
              <FiAlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="mt-2 text-sm text-gray-600">{message}</p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <FiX className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="btn btn-secondary">{cancelText}</button>
          <button onClick={() => { onConfirm(); onClose(); }} className={v.button}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
