import React from 'react';

const Shimmer = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

export const TableSkeleton = ({ rows = 5, cols = 6 }) => (
  <div className="card p-0 overflow-hidden">
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}><Shimmer className="h-4 w-20" /></th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {Array.from({ length: cols }).map((_, colIdx) => (
                <td key={colIdx}>
                  <Shimmer className={`h-4 ${colIdx === 0 ? 'w-32' : 'w-20'}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const CardSkeleton = () => (
  <div className="card animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <Shimmer className="h-6 w-32" />
      <Shimmer className="h-8 w-24 rounded-lg" />
    </div>
    <div className="space-y-3">
      <Shimmer className="h-4 w-full" />
      <Shimmer className="h-4 w-3/4" />
      <Shimmer className="h-4 w-1/2" />
    </div>
  </div>
);

export const StatCardSkeleton = () => (
  <div className="stat-card animate-pulse">
    <div className="flex items-center justify-between">
      <Shimmer className="w-12 h-12 rounded-lg" />
      <Shimmer className="w-12 h-5 rounded" />
    </div>
    <div className="mt-4">
      <Shimmer className="h-8 w-16 mb-2" />
      <Shimmer className="h-4 w-24" />
    </div>
  </div>
);

export const FilterSkeleton = () => (
  <div className="card animate-pulse">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Shimmer className="h-10 rounded-lg" />
      <Shimmer className="h-10 rounded-lg" />
      <Shimmer className="h-10 rounded-lg" />
      <Shimmer className="h-4 w-32 self-center" />
    </div>
  </div>
);

export const DetailSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="flex items-center gap-4">
      <Shimmer className="w-16 h-16 rounded-full" />
      <div className="space-y-2">
        <Shimmer className="h-6 w-48" />
        <Shimmer className="h-4 w-32" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div><Shimmer className="h-4 w-20 mb-1" /><Shimmer className="h-5 w-36" /></div>
      <div><Shimmer className="h-4 w-20 mb-1" /><Shimmer className="h-5 w-36" /></div>
      <div><Shimmer className="h-4 w-20 mb-1" /><Shimmer className="h-5 w-36" /></div>
      <div><Shimmer className="h-4 w-20 mb-1" /><Shimmer className="h-5 w-36" /></div>
    </div>
  </div>
);

const LoadingSkeleton = { TableSkeleton, CardSkeleton, StatCardSkeleton, FilterSkeleton, DetailSkeleton };
export default LoadingSkeleton;
