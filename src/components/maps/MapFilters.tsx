import React from 'react';
import { Search, Filter, X, RotateCcw, Building2, AlertTriangle, Layers, Tag } from 'lucide-react';
import { MapFilterState, PortalMapMode } from './mapTypes';

interface MapFiltersProps {
  filterState: MapFilterState;
  onFilterChange: (updates: Partial<MapFilterState>) => void;
  onClearFilters: () => void;
  availableCategories: string[];
  totalIncidents: number;
  filteredCount: number;
  mode?: PortalMapMode;
  availableDepartments?: Array<{ id: string; name: string; code: string }>;
  className?: string;
}

export const MapFilters: React.FC<MapFiltersProps> = ({
  filterState,
  onFilterChange,
  onClearFilters,
  availableCategories,
  totalIncidents,
  filteredCount,
  mode = 'department',
  availableDepartments = [],
  className = ''
}) => {
  const hasActiveFilters =
    Boolean(filterState.searchQuery.trim()) ||
    filterState.issueType !== 'ALL' ||
    filterState.priority !== 'ALL' ||
    filterState.status !== 'ALL' ||
    (Boolean(filterState.departmentId) && filterState.departmentId !== 'ALL');

  const formatCategoryLabel = (cat: string) => {
    if (cat === 'ALL') return 'All Issue Types';
    return cat
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className={`bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-3.5 sm:p-4 shadow-2xs space-y-3 ${className}`}>
      {/* Top Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-lg">
          <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filterState.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            placeholder="Search incident ID, category, ward, address..."
            className="w-full pl-9 pr-8 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#111111] transition-colors"
          />
          {filterState.searchQuery && (
            <button
              onClick={() => onFilterChange({ searchQuery: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#111111] p-0.5"
              aria-label="Clear search query"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Issue Type Filter */}
          <div className="relative flex items-center">
            <select
              value={filterState.issueType}
              onChange={(e) => onFilterChange({ issueType: e.target.value })}
              className="pl-3 pr-8 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111] cursor-pointer appearance-none"
              aria-label="Filter by issue type"
            >
              <option value="ALL">All Issues ({availableCategories.length})</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {formatCategoryLabel(cat)}
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 pointer-events-none text-[#71717A] text-[10px]">▼</div>
          </div>

          {/* Priority Filter */}
          <div className="relative flex items-center">
            <select
              value={filterState.priority}
              onChange={(e) => onFilterChange({ priority: e.target.value })}
              className="pl-3 pr-8 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111] cursor-pointer appearance-none"
              aria-label="Filter by priority"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical (P1)</option>
              <option value="HIGH">High (P2)</option>
              <option value="MEDIUM">Medium (P3)</option>
              <option value="LOW">Low (P4)</option>
            </select>
            <div className="absolute right-2.5 pointer-events-none text-[#71717A] text-[10px]">▼</div>
          </div>

          {/* Status Filter */}
          <div className="relative flex items-center">
            <select
              value={filterState.status}
              onChange={(e) => onFilterChange({ status: e.target.value })}
              className="pl-3 pr-8 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111] cursor-pointer appearance-none"
              aria-label="Filter by status"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active (In Progress / Open)</option>
              <option value="REPORTED">Reported / Triaged</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLUTION_SUBMITTED">Resolution Submitted</option>
              <option value="VERIFIED">Verified / Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
            <div className="absolute right-2.5 pointer-events-none text-[#71717A] text-[10px]">▼</div>
          </div>

          {/* Department Filter for Admin Mode */}
          {mode === 'admin' && availableDepartments.length > 0 && (
            <div className="relative flex items-center">
              <select
                value={filterState.departmentId || 'ALL'}
                onChange={(e) => onFilterChange({ departmentId: e.target.value })}
                className="pl-3 pr-8 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111] cursor-pointer appearance-none"
                aria-label="Filter by department"
              >
                <option value="ALL">All Departments</option>
                {availableDepartments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
              <div className="absolute right-2.5 pointer-events-none text-[#71717A] text-[10px]">▼</div>
            </div>
          )}

          {/* Clear All Button */}
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="px-2.5 py-2 bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#18181B] text-xs font-semibold rounded-md transition-colors flex items-center space-x-1.5"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Chips & Match Count */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#F4F4F5] text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[#71717A] text-[11px] font-medium mr-1">Active Filters:</span>
          {!hasActiveFilters && (
            <span className="text-[#A1A1AA] text-[11px] italic">Showing all incidents</span>
          )}

          {filterState.searchQuery && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#F4F4F5] border border-[#E4E4E7] rounded-full text-[11px] font-medium text-[#18181B]">
              <span>Search: "{filterState.searchQuery}"</span>
              <button
                onClick={() => onFilterChange({ searchQuery: '' })}
                className="text-[#71717A] hover:text-[#18181B]"
                aria-label="Remove search filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filterState.issueType !== 'ALL' && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#F4F4F5] border border-[#E4E4E7] rounded-full text-[11px] font-medium text-[#18181B]">
              <span>Type: {formatCategoryLabel(filterState.issueType)}</span>
              <button
                onClick={() => onFilterChange({ issueType: 'ALL' })}
                className="text-[#71717A] hover:text-[#18181B]"
                aria-label="Remove issue type filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filterState.priority !== 'ALL' && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#F4F4F5] border border-[#E4E4E7] rounded-full text-[11px] font-medium text-[#18181B]">
              <span>Priority: {filterState.priority}</span>
              <button
                onClick={() => onFilterChange({ priority: 'ALL' })}
                className="text-[#71717A] hover:text-[#18181B]"
                aria-label="Remove priority filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filterState.status !== 'ALL' && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#F4F4F5] border border-[#E4E4E7] rounded-full text-[11px] font-medium text-[#18181B]">
              <span>Status: {filterState.status}</span>
              <button
                onClick={() => onFilterChange({ status: 'ALL' })}
                className="text-[#71717A] hover:text-[#18181B]"
                aria-label="Remove status filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filterState.departmentId && filterState.departmentId !== 'ALL' && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#F4F4F5] border border-[#E4E4E7] rounded-full text-[11px] font-medium text-[#18181B]">
              <span>Dept: {filterState.departmentId}</span>
              <button
                onClick={() => onFilterChange({ departmentId: 'ALL' })}
                className="text-[#71717A] hover:text-[#18181B]"
                aria-label="Remove department filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>

        {/* Match Count Badge */}
        <div className="flex items-center space-x-2 text-[11px] font-semibold text-[#71717A]">
          <span>Showing</span>
          <span className="px-2 py-0.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-[#111111] font-bold">
            {filteredCount} / {totalIncidents}
          </span>
          <span>incidents</span>
        </div>
      </div>
    </div>
  );
};
