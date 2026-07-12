import React from 'react';

export const LoadingSkeleton = ({ count = 3 }) => {
  return (
    <div className="space-y-4 w-full animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="flex space-x-4 items-center py-1">
          <div className="rounded-full bg-gray-200 h-8 w-8 shrink-0"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-1">
              <div className="h-2.5 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;
