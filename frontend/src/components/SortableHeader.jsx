import React from 'react';
import { FiChevronUp, FiChevronDown } from 'react-icons/fi';

const SortableHeader = ({ label, field, currentSort, onSort }) => {
  const isActive = currentSort.field === field;
  const direction = isActive ? currentSort.order : null;

  const handleClick = () => {
    if (!isActive) {
      onSort({ field, order: 'asc' });
    } else if (direction === 'asc') {
      onSort({ field, order: 'desc' });
    } else {
      onSort({ field: null, order: null });
    }
  };

  return (
    <th
      className="cursor-pointer select-none hover:bg-gray-100 transition-colors"
      onClick={handleClick}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <span className="inline-flex flex-col -space-y-2">
          {!isActive ? (
            <>
              <FiChevronUp className="w-3 h-3 text-gray-400" />
              <FiChevronDown className="w-3 h-3 text-gray-400" />
            </>
          ) : direction === 'asc' ? (
            <FiChevronUp className="w-3.5 h-3.5 text-primary-600" />
          ) : (
            <FiChevronDown className="w-3.5 h-3.5 text-primary-600" />
          )}
        </span>
      </div>
    </th>
  );
};

export default SortableHeader;
