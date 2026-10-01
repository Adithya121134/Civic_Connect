import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search, Filter, X, MapPin, AlertCircle, AlertTriangle, CheckCircle2,
  Clock, ShieldAlert, ArrowRight, RefreshCw, ChevronDown, Layers,
  Building2, Compass, Eye, SlidersHorizontal, List, Map as MapIcon
} from 'lucide-react';
import { GoogleMap, MarkerData } from './GoogleMap';

export interface IncidentItem {
  id: string;
  tracking_number?: string;
  trackingNumber?: string;
  title: string;
  description?: string;
  status: string;
  category?: string;
  issue_type?: string;
  priority?: string;
  severity?: string;
  address?: string;
  ward_code?: string;
  wardCode?: string;
  latitude?: number | string;
  longitude?: number | string;
  department_id?: string;
  department_name?: string;
  departmentName?: string;
  department_code?: string;
  created_at?: string;
  createdAt?: string;
  sla_deadline?: string;
  sla_status?: string;
  is_sla_breached?: boolean | number;
  [key: string]: any;
}

interface IncidentMapWorkspaceProps {
  incidents: IncidentItem[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onViewIncident?: (incident: IncidentItem) => void;
  title?: string;
  subtitle?: string;
  portalType?: 'department' | 'resident' | 'admin';
  departmentName?: string;
  availableDepartments?: Array<{ id: string; name: string; code?: string }>;
  selectedDepartmentId?: string;
  onDepartmentChange?: (deptId: string) => void;
  initialSelectedId?: string | null;
}

export const IncidentMapWorkspace: React.FC<IncidentMapWorkspaceProps> = ({
  incidents = [],
  isLoading = false,
  error = null,
  onRetry,
  onViewIncident,
  title = 'Geospatial Incident Intelligence',
  subtitle = 'Real-time spatial monitoring, priority routing, and synchronized incident management',
  portalType = 'department',
  departmentName,
  availableDepartments = [],
  selectedDepartmentId = 'ALL',
  onDepartmentChange,
  initialSelectedId = null
}) => {
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedWard, setSelectedWard] = useState('ALL');

  // Selected Incident State for Two-Way Synchronization
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(initialSelectedId || null);

  // Mobile View Mode: 'map' | 'list'
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map');

  // List Ref for Auto-Scrolling
  const listContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Extract Dynamic Categories from Incidents
  const dynamicCategories = useMemo(() => {
    const categoriesSet = new Set<string>();
    incidents.forEach((inc) => {
      const cat = inc.category || inc.issue_type;
      if (cat && typeof cat === 'string') {
        categoriesSet.add(cat.trim());
      }
    });
    return Array.from(categoriesSet).sort();
  }, [incidents]);

  // Extract Dynamic Wards
  const dynamicWards = useMemo(() => {
    const wardsSet = new Set<string>();
    incidents.forEach((inc) => {
      const ward = inc.ward_code || inc.wardCode;
      if (ward && typeof ward === 'string') {
        wardsSet.add(ward.trim());
      }
    });
    return Array.from(wardsSet).sort();
  }, [incidents]);

  // Helper formatting for categories
  const formatCategoryLabel = (cat: string) => {
    return cat
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Helper formatting for priority
  const formatPriorityLabel = (prio: string) => {
    const p = prio.toUpperCase();
    if (p.includes('CRITICAL') || p === 'P1_CRITICAL') return 'Critical (P1)';
    if (p.includes('HIGH') || p === 'P2_HIGH') return 'High (P2)';
    if (p.includes('MEDIUM') || p === 'P3_STANDARD') return 'Medium (P3)';
    if (p.includes('LOW') || p === 'P4_LOW') return 'Low (P4)';
    return prio;
  };

  // Filter Incidents Based on All Combined Criteria
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const tracking = (inc.tracking_number || inc.trackingNumber || '').toLowerCase();
        const title = (inc.title || '').toLowerCase();
        const address = (inc.address || '').toLowerCase();
        const ward = (inc.ward_code || inc.wardCode || '').toLowerCase();
        const category = (inc.category || inc.issue_type || '').toLowerCase();

        if (
          !tracking.includes(q) &&
          !title.includes(q) &&
          !address.includes(q) &&
          !ward.includes(q) &&
          !category.includes(q)
        ) {
          return false;
        }
      }

      // 2. Category / Issue Type Filter
      if (selectedCategory !== 'ALL') {
        const cat = (inc.category || inc.issue_type || '').toUpperCase();
        if (cat !== selectedCategory.toUpperCase()) {
          return false;
        }
      }

      // 3. Priority Filter
      if (selectedPriority !== 'ALL') {
        const prio = (inc.priority || inc.severity || '').toUpperCase();
        if (selectedPriority === 'CRITICAL' && !prio.includes('CRITICAL')) return false;
        if (selectedPriority === 'HIGH' && !prio.includes('HIGH')) return false;
        if (selectedPriority === 'MEDIUM' && !prio.includes('MEDIUM')) return false;
        if (selectedPriority === 'LOW' && !prio.includes('LOW')) return false;
      }

      // 4. Status Filter
      if (selectedStatus !== 'ALL') {
        const st = (inc.status || '').toUpperCase();
        if (selectedStatus === 'ACTIVE' && ['CLOSED', 'REJECTED', 'VERIFIED'].includes(st)) return false;
        if (selectedStatus === 'IN_PROGRESS' && st !== 'IN_PROGRESS') return false;
        if (selectedStatus === 'RESOLUTION_SUBMITTED' && st !== 'RESOLUTION_SUBMITTED') return false;
        if (selectedStatus === 'RESOLVED' && !['RESOLVED', 'VERIFIED', 'CLOSED'].includes(st)) return false;
        if (selectedStatus !== 'ACTIVE' && selectedStatus !== 'RESOLVED' && st !== selectedStatus) return false;
      }

      // 5. Ward Filter
      if (selectedWard !== 'ALL') {
        const ward = (inc.ward_code || inc.wardCode || '').toUpperCase();
        if (ward !== selectedWard.toUpperCase()) return false;
      }

      // 6. Department Filter (if applicable)
      if (selectedDepartmentId && selectedDepartmentId !== 'ALL') {
        if (inc.department_id !== selectedDepartmentId) return false;
      }

      return true;
    });
  }, [
    incidents,
    searchQuery,
    selectedCategory,
    selectedPriority,
    selectedStatus,
    selectedWard,
    selectedDepartmentId
  ]);

  // Transform Filtered Incidents to Map Markers (validating coords)
  const mapMarkers: MarkerData[] = useMemo(() => {
    const list: MarkerData[] = [];
    filteredIncidents.forEach((inc) => {
      const lat = Number(inc.latitude);
      const lng = Number(inc.longitude);

      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
        return;
      }

      const prio = (inc.priority || inc.severity || '').toUpperCase();
      const isCritical = prio.includes('CRITICAL');
      const isHigh = prio.includes('HIGH');
      const isMedium = prio.includes('MEDIUM');
      const isResolved = ['RESOLVED', 'VERIFIED', 'CLOSED'].includes((inc.status || '').toUpperCase());

      let color = '#2563EB'; // Blue default
      if (isCritical) color = '#DC2626'; // Red
      else if (isHigh) color = '#EA580C'; // Orange
      else if (isMedium) color = '#D97706'; // Amber
      else if (isResolved) color = '#16A34A'; // Green

      list.push({
        id: inc.id,
        lat,
        lng,
        title: inc.title || 'Civic Incident',
        category: inc.category || inc.issue_type,
        priority: inc.priority || inc.severity,
        severity: inc.severity,
        status: inc.status,
        address: inc.address,
        wardCode: inc.ward_code || inc.wardCode,
        departmentName: inc.department_name || inc.departmentName,
        color,
        incident: inc
      });
    });
    return list;
  }, [filteredIncidents]);

  // Selected Incident Object
  const selectedIncident = useMemo(() => {
    if (!selectedIncidentId) return null;
    return filteredIncidents.find((i) => i.id === selectedIncidentId) || null;
  }, [selectedIncidentId, filteredIncidents]);

  // Dynamically calculate map center from markers or selected incident
  const calculatedCenter = useMemo(() => {
    if (selectedIncident && !isNaN(Number(selectedIncident.latitude)) && Number(selectedIncident.latitude) !== 0) {
      return {
        lat: Number(selectedIncident.latitude),
        lng: Number(selectedIncident.longitude)
      };
    }
    if (mapMarkers.length > 0) {
      const avgLat = mapMarkers.reduce((sum, m) => sum + m.lat, 0) / mapMarkers.length;
      const avgLng = mapMarkers.reduce((sum, m) => sum + m.lng, 0) / mapMarkers.length;
      return { lat: avgLat, lng: avgLng };
    }
    return { lat: 37.7749, lng: -122.4194 };
  }, [selectedIncident, mapMarkers]);

  // Handle marker click (synchronizes list + opens popup)
  const handleMarkerClick = (marker: MarkerData) => {
    setSelectedIncidentId(marker.id);

    // Scroll list item into view
    const el = itemRefs.current.get(marker.id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // Handle list item click (centers map + selects marker + opens popup)
  const handleListItemClick = (incident: IncidentItem) => {
    setSelectedIncidentId(incident.id);
  };

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedCategory !== 'ALL') count++;
    if (selectedPriority !== 'ALL') count++;
    if (selectedStatus !== 'ALL') count++;
    if (selectedWard !== 'ALL') count++;
    if (selectedDepartmentId && selectedDepartmentId !== 'ALL') count++;
    return count;
  }, [searchQuery, selectedCategory, selectedPriority, selectedStatus, selectedWard, selectedDepartmentId]);

  // Clear all filters
  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedPriority('ALL');
    setSelectedStatus('ALL');
    setSelectedWard('ALL');
    if (onDepartmentChange) onDepartmentChange('ALL');
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* 1. TOP HEADER & FILTER BAR */}
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-[#111111]">{title}</h2>
              {departmentName && (
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-[#FAFAFA] text-[#111111] border border-[#E5E5E5] rounded-md">
                  {departmentName}
                </span>
              )}
            </div>
            <p className="text-xs text-[#71717A] mt-0.5">{subtitle}</p>
          </div>

          {/* Quick Metrics Badge & Mobile View Switcher */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-medium text-[#18181B] bg-[#F4F4F5] border border-[#E4E4E7] px-2.5 py-1 rounded-md">
              {filteredIncidents.length} of {incidents.length} Incidents
            </span>

            {/* Mobile View Toggle */}
            <div className="flex lg:hidden bg-[#F4F4F5] p-0.5 rounded-md border border-[#E4E4E7]">
              <button
                onClick={() => setMobileView('map')}
                className={`flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded ${
                  mobileView === 'map'
                    ? 'bg-[#FFFFFF] text-[#111111] shadow-2xs'
                    : 'text-[#71717A]'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Map</span>
              </button>
              <button
                onClick={() => setMobileView('list')}
                className={`flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded ${
                  mobileView === 'list'
                    ? 'bg-[#FFFFFF] text-[#111111] shadow-2xs'
                    : 'text-[#71717A]'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List ({filteredIncidents.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search incidents, ID, address..."
              className="w-full pl-9 pr-8 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111] placeholder-[#A1A1AA] focus:outline-none focus:border-[#111111] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#111111]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Issue Type / Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2.5 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
            >
              <option value="ALL">All Issue Types</option>
              {dynamicCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {formatCategoryLabel(cat)}
                </option>
              ))}
            </select>
          </div>

          {/* Priority / Severity Filter */}
          <div>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-2.5 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">🔴 Critical (P1)</option>
              <option value="HIGH">🟠 High (P2)</option>
              <option value="MEDIUM">🟡 Medium (P3)</option>
              <option value="LOW">🟢 Low / Standard (P4)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Incidents</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLUTION_SUBMITTED">Pending Verification</option>
              <option value="RESOLVED">Resolved / Closed</option>
            </select>
          </div>

          {/* Department or Ward Filter */}
          {availableDepartments.length > 0 && onDepartmentChange ? (
            <div>
              <select
                value={selectedDepartmentId}
                onChange={(e) => onDepartmentChange(e.target.value)}
                className="w-full px-2.5 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
              >
                <option value="ALL">All Departments</option>
                {availableDepartments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <select
                value={selectedWard}
                onChange={(e) => setSelectedWard(e.target.value)}
                className="w-full px-2.5 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111] transition-colors"
              >
                <option value="ALL">All Wards</option>
                {dynamicWards.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Active Filter Chips & Clear All */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs border-t border-[#F4F4F5]">
            <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider mr-1">
              Active Filters:
            </span>

            {searchQuery.trim() && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#F4F4F5] border border-[#E4E4E7] rounded text-[11px] text-[#18181B]">
                <span>Search: &quot;{searchQuery}&quot;</span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="hover:text-[#DC2626]"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedCategory !== 'ALL' && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#F4F4F5] border border-[#E4E4E7] rounded text-[11px] text-[#18181B]">
                <span>Type: {formatCategoryLabel(selectedCategory)}</span>
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className="hover:text-[#DC2626]"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedPriority !== 'ALL' && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#F4F4F5] border border-[#E4E4E7] rounded text-[11px] text-[#18181B]">
                <span>Priority: {selectedPriority}</span>
                <button
                  onClick={() => setSelectedPriority('ALL')}
                  className="hover:text-[#DC2626]"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedStatus !== 'ALL' && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#F4F4F5] border border-[#E4E4E7] rounded text-[11px] text-[#18181B]">
                <span>Status: {selectedStatus}</span>
                <button
                  onClick={() => setSelectedStatus('ALL')}
                  className="hover:text-[#DC2626]"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedWard !== 'ALL' && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#F4F4F5] border border-[#E4E4E7] rounded text-[11px] text-[#18181B]">
                <span>Ward: {selectedWard}</span>
                <button
                  onClick={() => setSelectedWard('ALL')}
                  className="hover:text-[#DC2626]"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              onClick={handleClearAllFilters}
              className="text-[11px] font-semibold text-[#DC2626] hover:underline ml-1"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* 2. ERROR STATE */}
      {error && (
        <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-[#991B1B]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Unable to load incidents: {error}</span>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1.5 bg-[#991B1B] text-[#FFFFFF] text-xs font-semibold rounded hover:bg-[#7F1D1D] transition-colors flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}

      {/* 3. MAIN SPLIT-VIEW WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[550px] lg:min-h-[620px]">
        {/* LEFT COLUMN: Synchronized Incident List */}
        <div
          className={`lg:col-span-4 flex flex-col bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg overflow-hidden shadow-xs ${
            mobileView === 'list' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="p-3.5 border-b border-[#E5E5E5] bg-[#FAFAFA] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                Incident Queue
              </span>
              <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 bg-[#E4E4E7] text-[#18181B] rounded">
                {filteredIncidents.length}
              </span>
            </div>
            <div className="text-[10px] text-[#71717A]">
              Click incident to locate on map
            </div>
          </div>

          {/* List Content */}
          <div
            ref={listContainerRef}
            className="flex-1 overflow-y-auto divide-y divide-[#F4F4F5] max-h-[580px]"
          >
            {filteredIncidents.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Compass className="w-8 h-8 text-[#A1A1AA] mx-auto opacity-60" />
                <h3 className="text-xs font-bold text-[#111111]">
                  No incidents found
                </h3>
                <p className="text-[11px] text-[#71717A] max-w-xs mx-auto">
                  No incidents match your current search and filter selections.
                </p>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={handleClearAllFilters}
                    className="mt-2 text-xs font-semibold text-[#111111] underline"
                  >
                    Reset all filters
                  </button>
                )}
              </div>
            ) : (
              filteredIncidents.map((inc) => {
                const isSelected = selectedIncidentId === inc.id;
                const prio = (inc.priority || inc.severity || '').toUpperCase();
                const isCritical = prio.includes('CRITICAL');
                const isHigh = prio.includes('HIGH');
                const isMedium = prio.includes('MEDIUM');

                const severityBadge = isCritical ? (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] rounded">
                    CRITICAL
                  </span>
                ) : isHigh ? (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#FFEDD5] text-[#EA580C] border border-[#FED7AA] rounded">
                    HIGH
                  </span>
                ) : isMedium ? (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] rounded">
                    MEDIUM
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0] rounded">
                    LOW
                  </span>
                );

                const hasValidCoords =
                  !isNaN(Number(inc.latitude)) &&
                  !isNaN(Number(inc.longitude)) &&
                  Number(inc.latitude) !== 0;

                return (
                  <div
                    key={inc.id}
                    ref={(el) => {
                      if (el) itemRefs.current.set(inc.id, el);
                      else itemRefs.current.delete(inc.id);
                    }}
                    onClick={() => handleListItemClick(inc)}
                    className={`p-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#F4F4F5] border-l-4 border-l-[#111111]'
                        : 'hover:bg-[#FAFAFA] border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center space-x-1.5 truncate">
                        <span className="font-mono text-[10px] font-bold text-[#71717A]">
                          {inc.tracking_number || inc.trackingNumber || inc.id}
                        </span>
                        {severityBadge}
                      </div>

                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          inc.status === 'IN_PROGRESS'
                            ? 'bg-[#DBEAFE] text-[#1D4ED8]'
                            : inc.status === 'RESOLUTION_SUBMITTED'
                            ? 'bg-[#FEF3C7] text-[#B45309]'
                            : inc.status === 'VERIFIED' || inc.status === 'CLOSED'
                            ? 'bg-[#DCFCE7] text-[#15803D]'
                            : 'bg-[#F4F4F5] text-[#52525B]'
                        }`}
                      >
                        {inc.status ? inc.status.replace(/_/g, ' ') : 'Reported'}
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-[#111111] line-clamp-1 mb-1">
                      {inc.title}
                    </h4>

                    <div className="flex items-center justify-between text-[10px] text-[#71717A] mt-1.5">
                      <div className="flex items-center space-x-1 truncate max-w-[220px]">
                        <MapPin className="w-3 h-3 text-[#A1A1AA] shrink-0" />
                        <span className="truncate">
                          {inc.address || (inc.ward_code ? `Ward ${inc.ward_code}` : 'Location Available')}
                        </span>
                      </div>

                      {!hasValidCoords && (
                        <span className="text-[9px] text-[#A1A1AA] italic">
                          No GPS
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Google Map View + Floating Incident Popup */}
        <div
          className={`lg:col-span-8 flex flex-col bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg overflow-hidden shadow-xs relative ${
            mobileView === 'map' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Map Container */}
          <div className="relative w-full h-[550px] lg:h-[620px]">
            <GoogleMap
              center={calculatedCenter}
              zoom={13}
              markers={mapMarkers}
              selectedMarkerId={selectedIncidentId}
              onMarkerClick={handleMarkerClick}
              autoFitBounds={!selectedIncidentId}
              height="100%"
              className="w-full h-full"
            />

            {/* Map Severity Legend */}
            <div className="absolute top-3 right-3 bg-[#FFFFFF]/95 backdrop-blur-xs border border-[#E5E5E5] p-2.5 rounded-md shadow-sm z-20 text-[10px] space-y-1.5 pointer-events-auto">
              <div className="font-bold text-[#111111] uppercase tracking-wider mb-1 flex items-center space-x-1">
                <Layers className="w-3 h-3" />
                <span>Severity Pins</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
                <span className="text-[#18181B] font-medium">Critical (P1)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" />
                <span className="text-[#18181B] font-medium">High (P2)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                <span className="text-[#18181B] font-medium">Medium (P3)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
                <span className="text-[#18181B] font-medium">Low / Resolved</span>
              </div>
            </div>

            {/* FLOATING INCIDENT POPUP CARD */}
            {selectedIncident && (
              <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm bg-[#FFFFFF] border-2 border-[#111111] rounded-lg shadow-xl p-4 z-20 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono text-xs font-bold text-[#111111]">
                        {selectedIncident.tracking_number ||
                          selectedIncident.trackingNumber ||
                          selectedIncident.id}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ${
                          (selectedIncident.priority || '').includes('CRITICAL')
                            ? 'bg-[#FEE2E2] text-[#DC2626]'
                            : (selectedIncident.priority || '').includes('HIGH')
                            ? 'bg-[#FFEDD5] text-[#EA580C]'
                            : 'bg-[#FEF3C7] text-[#D97706]'
                        }`}
                      >
                        {selectedIncident.priority || selectedIncident.severity || 'Standard'}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-[#111111] mt-1 leading-snug">
                      {selectedIncident.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => setSelectedIncidentId(null)}
                    className="p-1 hover:bg-[#F4F4F5] rounded text-[#71717A] hover:text-[#111111]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1 text-xs text-[#52525B] mb-3">
                  <div className="flex items-center space-x-1 text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
                    <span className="truncate">
                      {selectedIncident.address || 'Address unlisted'}{' '}
                      {selectedIncident.ward_code ? `(${selectedIncident.ward_code})` : ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#71717A] pt-1">
                    <span>
                      Status:{' '}
                      <strong className="text-[#111111]">
                        {selectedIncident.status ? selectedIncident.status.replace(/_/g, ' ') : 'Reported'}
                      </strong>
                    </span>
                    {selectedIncident.category && (
                      <span className="bg-[#F4F4F5] px-1.5 py-0.5 rounded font-mono text-[9px]">
                        {formatCategoryLabel(selectedIncident.category)}
                      </span>
                    )}
                  </div>
                </div>

                {onViewIncident && (
                  <button
                    onClick={() => onViewIncident(selectedIncident)}
                    className="w-full py-2 bg-[#111111] hover:bg-[#27272A] text-[#FFFFFF] text-xs font-bold uppercase tracking-wider rounded-md flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <span>View Incident Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
