import React from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import LoadingSkeleton from './LoadingSkeleton';

export const DataTable = ({
  columns = [],
  data = [],
  isLoading = false,
  sortBy = '',
  sortOrder = 'desc',
  onSort = () => {},
  page = 1,
  totalPages = 1,
  onPageChange = () => {},
  totalCount = 0,
  limit = 20,
}) => {
  const handleSort = (key, sortable) => {
    if (!sortable) return;
    const nextOrder = sortBy === key && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(key, nextOrder);
  };

  const startRecord = (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, totalCount);

  return (
    <div className="bg-white rounded-xl border border-odoo-border shadow-sm overflow-hidden flex flex-col">
      {/* Table Container */}
      <div className="overflow-x-auto relative max-h-[500px]">
        <table className="min-w-full divide-y divide-odoo-border text-left text-sm">
          {/* Sticky Header */}
          <thead className="bg-odoo-bg text-odoo-textSecondary font-bold text-xs uppercase tracking-wider sticky top-0 z-10 border-b border-odoo-border">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key, col.sortable)}
                  className={`px-6 py-4 select-none ${
                    col.sortable ? 'cursor-pointer hover:bg-primary-light hover:text-primary' : ''
                  } transition-colors ${col.className || ''}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.label}</span>
                    {col.sortable && sortBy === col.key && (
                      sortOrder === 'asc' ? (
                        <ChevronUp className="w-3.5 h-3.5 text-primary shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-primary shrink-0" />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-odoo-border bg-white text-odoo-textPrimary">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8">
                  <LoadingSkeleton count={4} />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-odoo-textSecondary">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <span className="text-3xl">📭</span>
                    <p className="font-medium text-sm">No records found matching current criteria.</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={item.id || item.uuid || index}
                  className="hover:bg-odoo-bg/50 transition-colors group"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-6 py-3.5 whitespace-nowrap ${col.className || ''}`}>
                      {col.render ? col.render(item, index) : item[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="px-6 py-4 bg-white border-t border-odoo-border flex items-center justify-between text-xs text-odoo-textSecondary">
          <div>
            Showing <span className="font-semibold text-odoo-textPrimary">{startRecord}</span> to{' '}
            <span className="font-semibold text-odoo-textPrimary">{endRecord}</span> of{' '}
            <span className="font-semibold text-odoo-textPrimary">{totalCount}</span> entries
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="p-1.5 rounded-md border border-odoo-border hover:bg-odoo-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const currPage = idx + 1;
              return (
                <button
                  key={currPage}
                  onClick={() => onPageChange(currPage)}
                  className={`w-7 h-7 font-semibold rounded-md border text-center transition-all-custom ${
                    page === currPage
                      ? 'bg-primary border-primary text-white'
                      : 'border-odoo-border hover:bg-odoo-bg text-odoo-textPrimary'
                  }`}
                >
                  {currPage}
                </button>
              );
            })}

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="p-1.5 rounded-md border border-odoo-border hover:bg-odoo-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
