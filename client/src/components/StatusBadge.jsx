import React from 'react';

export const StatusBadge = ({ status }) => {
  const isActive = status === 'ACTIVE';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${
        isActive
          ? 'bg-green-50 text-green-700 border-green-200'
          : 'bg-gray-100 text-gray-600 border-gray-300'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
      {status}
    </span>
  );
};

export default StatusBadge;
