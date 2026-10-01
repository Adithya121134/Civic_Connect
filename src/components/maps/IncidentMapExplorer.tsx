import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MapPin, AlertOctagon, Filter, Layers, Navigation,
  Building2, CheckCircle2, AlertTriangle, X, ArrowRight,
  RefreshCw, ChevronUp, ChevronDown, Eye
} from 'lucide-react';
import { GoogleMap, MarkerData } from './GoogleMap';
import { MapFilters } from './MapFilters';
import { IncidentMapList } from './IncidentMapList';
import { IncidentMapPopup } from './IncidentMapPopup';
import { CivicIncidentMapItem, MapFilterState, PortalMapMode } from './mapTypes';

interface IncidentMapExplorerProps {
  token?: string;
  mode?: PortalMapMode;
  departmentId?: string;
  departmentName?: string;
  onViewIncidentDetail: (incidentId: string) => void;
  initialIncidents?: any[];
  title?: string;
  subtitle?: string;
  className?: string;
}

export const IncidentMapExplorer: React.FC<IncidentMapExplorerProps> = ({
  token,
  mode = 'department',
  departmentId,
  departmentName,
  onViewIncidentDetail,
  initialIncidents,
  title,
  subtitle,
  className = ''
}) => {
  const [rawIncidents, setRawIncidents] = useState<CivicIncidentMapItem[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Selected incident for popup & list highlight
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  // Mobile drawer state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Filter state
  const [filterState, setFilterState] = useState<MapFilterState>({
    searchQuery: '',
    issueType: 'ALL',
    priority: 'ALL',
    status: 'ALL',
    departmentId: mode === 'admin' ? 'ALL' : departmentId,
    wardCode: 'ALL'
  });

  // Fetch incidents from backend
  const fetchIncidents = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      let endpoint = '/api/v1/department/incidents';
      if (mode === 'resident') {
        endpoint = '/api/v1/resident/map';
      } else if (mode === 'admin') {
        endpoint = '/api/v1/admin/incidents';
      }

      const res = await fetch(endpoint, { headers });

      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`);
      }

      const data = await res.json();
      const rawList = data.incidents || data.priorityIncidents || [];

      // Normalize into CivicIncidentMapItem
      const normalized: CivicIncidentMapItem[] = rawList.map((item: any) => {
        let lat = Number(item.latitude || item.lat);
        let lng = Number(item.longitude || item.lng);

        // Fallback default coordinates if coordinate parsing fails
        if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
          lat = 37.7749;
          lng = -122.4194;
        }

        return {
          id: item.id || `inc-${Math.random().toString(36).slice(2, 7)}`,
          trackingNumber: item.tracking_number || item.trackingNumber || `INC-${item.id}`,
          title: item.title || 'Civic Incident',
          description: item.description || '',
          status: (item.status || 'REPORTED').toUpperCase(),
          category: (item.category || item.type || 'CIVIC_HAZARD').toUpperCase(),
          priority: (item.priority || item.severity || 'P3_STANDARD').toUpperCase(),
          severity: (item.severity || item.priority || 'MEDIUM').toUpperCase(),
          latitude: lat,
          longitude: lng,
          address: item.address || item.location || 'Municipal Ward Area',
          wardCode: item.ward_code || item.wardCode || 'WARD-04',
          departmentId: item.department_id || item.departmentId,
          departmentName: item.department_name || item.departmentName,
          departmentCode: item.department_code || item.departmentCode,
          createdAt: item.created_at || item.createdAt,
          slaDeadline: item.sla_deadline || item.slaDeadline,
          isSlaBreached: Boolean(item.is_sla_breached || item.isSlaBreached),
          assignedWorkerName: item.assigned_worker_name || item.worker_name,
          assignedTeamName: item.assigned_team_name || item.team_name,
          resolutionNotes: item.resolution_notes
        };
      });

      setRawIncidents(normalized);

      // In admin mode, also fetch departments list for filter
      if (mode === 'admin') {
        try {
          const deptRes = await fetch('/api/v1/admin/overview', { credentials: 'include', headers });
          if (deptRes.ok) {
            const dData = await deptRes.json();
            if (dData.departments) {
              setDepartments(dData.departments.map((d: any) => ({ id: d.id, name: d.name, code: d.code })));
            }
          }
        } catch {
          // Non-blocking
        }
      }
    } catch (err: any) {
      console.error('[IncidentMapExplorer] Fetch error:', err);
      // If initialIncidents was provided as fallback
      if (initialIncidents && initialIncidents.length > 0) {
        setRawIncidents(initialIncidents);
      } else {
        setLoadError(err.message || 'Unable to connect to incident data service.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, mode, departmentId, initialIncidents]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // Extract available categories dynamically from backend data
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    rawIncidents.forEach((inc) => {
      if (inc.category) cats.add(inc.category);
    });
    // Add standard categories if empty
    if (cats.size === 0) {
      ['ROAD_DAMAGE', 'STREET_LIGHTING', 'ILLEGAL_DUMPING', 'STORM_DRAIN', 'WATER_LEAKAGE'].forEach(c => cats.add(c));
    }
    return Array.from(cats);
  }, [rawIncidents]);

  // Apply filters
  const filteredIncidents = useMemo(() => {
    return rawIncidents.filter((inc) => {
      // 1. Search Query
      if (filterState.searchQuery.trim()) {
        const q = filterState.searchQuery.toLowerCase().trim();
        const matchTitle = inc.title.toLowerCase().includes(q);
        const matchTrack = inc.trackingNumber.toLowerCase().includes(q);
        const matchDesc = (inc.description || '').toLowerCase().includes(q);
        const matchAddr = inc.address.toLowerCase().includes(q);
        const matchWard = (inc.wardCode || '').toLowerCase().includes(q);
        const matchCat = inc.category.toLowerCase().includes(q);
        if (!matchTitle && !matchTrack && !matchDesc && !matchAddr && !matchWard && !matchCat) {
          return false;
        }
      }

      // 2. Issue Type / Category Filter
      if (filterState.issueType !== 'ALL') {
        if (inc.category !== filterState.issueType) {
          return false;
        }
      }

      // 3. Priority / Severity Filter
      if (filterState.priority !== 'ALL') {
        const p = inc.priority.toUpperCase();
        const s = inc.severity.toUpperCase();
        const target = filterState.priority.toUpperCase();

        if (target === 'CRITICAL') {
          if (!p.includes('CRITICAL') && !s.includes('CRITICAL') && p !== 'P1') return false;
        } else if (target === 'HIGH') {
          if (!p.includes('HIGH') && !s.includes('HIGH') && p !== 'P2') return false;
        } else if (target === 'MEDIUM') {
          if (!p.includes('MEDIUM') && !s.includes('MEDIUM') && !p.includes('STANDARD') && p !== 'P3') return false;
        } else if (target === 'LOW') {
          if (!p.includes('LOW') && !s.includes('LOW') && p !== 'P4') return false;
        }
      }

      // 4. Status Filter
      if (filterState.status !== 'ALL') {
        if (filterState.status === 'ACTIVE') {
          if (['CLOSED', 'VERIFIED', 'RESOLVED'].includes(inc.status)) return false;
        } else if (filterState.status === 'VERIFIED') {
          if (!['VERIFIED', 'RESOLVED'].includes(inc.status)) return false;
        } else if (inc.status !== filterState.status) {
          return false;
        }
      }

      // 5. Department Filter (Admin mode)
      if (mode === 'admin' && filterState.departmentId && filterState.departmentId !== 'ALL') {
        if (inc.departmentId !== filterState.departmentId) {
          return false;
        }
      }

      return true;
    });
  }, [rawIncidents, filterState, mode]);

  // Selected incident object
  const activeIncident = useMemo(() => {
    return rawIncidents.find((i) => i.id === selectedIncidentId) || null;
  }, [rawIncidents, selectedIncidentId]);

  // Convert filtered incidents to Map Marker Data
  const mapMarkers: MarkerData[] = useMemo(() => {
    return filteredIncidents.map((inc) => {
      const p = (inc.priority || inc.severity || '').toUpperCase();
      const isCritical = p.includes('CRITICAL') || p === 'P1_CRITICAL';
      const isHigh = p.includes('HIGH') || p === 'P2_HIGH';
      const isMedium = p.includes('MEDIUM') || p === 'P3_STANDARD';
      const isResolved = inc.status === 'RESOLVED' || inc.status === 'VERIFIED' || inc.status === 'CLOSED';

      let color = '#2563EB'; // Standard Blue
      if (isCritical) color = '#DC2626'; // Red
      else if (isHigh) color = '#EA580C'; // Orange
      else if (isMedium) color = '#D97706'; // Amber
      else if (isResolved) color = '#16A34A'; // Green

      return {
        id: inc.id,
        lat: inc.latitude,
        lng: inc.longitude,
        title: inc.title,
        priority: inc.priority,
        severity: inc.severity,
        status: inc.status,
        address: inc.address,
        wardCode: inc.wardCode,
        color,
        incident: inc
      };
    });
  }, [filteredIncidents]);

  // Map center calculation (average of visible incidents or default)
  const mapCenter = useMemo(() => {
    if (activeIncident) {
      return { lat: activeIncident.latitude, lng: activeIncident.longitude };
    }
    if (filteredIncidents.length > 0) {
      const avgLat = filteredIncidents.reduce((sum, i) => sum + i.latitude, 0) / filteredIncidents.length;
      const avgLng = filteredIncidents.reduce((sum, i) => sum + i.longitude, 0) / filteredIncidents.length;
      return { lat: avgLat, lng: avgLng };
    }
    return { lat: 37.7749, lng: -122.4194 };
  }, [activeIncident, filteredIncidents]);

  const handleFilterUpdate = (updates: Partial<MapFilterState>) => {
    setFilterState((prev) => ({ ...prev, ...updates }));
  };

  const handleClearFilters = () => {
    setFilterState({
      searchQuery: '',
      issueType: 'ALL',
      priority: 'ALL',
      status: 'ALL',
      departmentId: mode === 'admin' ? 'ALL' : departmentId,
      wardCode: 'ALL'
    });
  };

  // Two-way synchronization: Click list item -> Center map & open popup
  const handleSelectFromList = (incident: CivicIncidentMapItem) => {
    setSelectedIncidentId(incident.id);
  };

  // Two-way synchronization: Click marker -> Highlight list item & open popup
  const handleMarkerClick = (marker: MarkerData) => {
    setSelectedIncidentId(marker.id);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Header Banner */}
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-[#111111]">
              {title || (mode === 'department'
                ? `Geospatial Incident Command (${departmentName || 'Department'})`
                : mode === 'admin'
                ? 'City-Wide Geospatial Operations Map'
                : 'Community Civic Incident Map')}
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#111111] text-[#FFFFFF]">
              Live GIS
            </span>
          </div>
          <p className="text-xs text-[#71717A] mt-0.5">
            {subtitle || 'Real-time spatial distribution, severity markers, and municipal incident synchronization.'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchIncidents}
            disabled={isLoading}
            className="px-3 py-1.5 bg-[#FAFAFA] hover:bg-[#F4F4F5] border border-[#E5E5E5] rounded-md text-xs font-semibold text-[#111111] transition-colors flex items-center space-x-1.5 disabled:opacity-50"
            title="Refresh incident data from backend"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Error Banner */}
      {loadError && (
        <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg p-4 text-xs flex items-center justify-between gap-3 text-[#991B1B]">
          <div className="flex items-center space-x-2">
            <AlertOctagon className="w-4 h-4 text-[#DC2626] shrink-0" />
            <span>Unable to load incidents: {loadError}</span>
          </div>
          <button
            onClick={fetchIncidents}
            className="px-3 py-1 bg-[#DC2626] text-[#FFFFFF] font-semibold rounded-md hover:bg-[#B91C1C] transition-colors shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* 3. Filter Bar */}
      <MapFilters
        filterState={filterState}
        onFilterChange={handleFilterUpdate}
        onClearFilters={handleClearFilters}
        availableCategories={availableCategories}
        totalIncidents={rawIncidents.length}
        filteredCount={filteredIncidents.length}
        mode={mode}
        availableDepartments={departments}
      />

      {/* 4. Split-View Workspace: Synchronized List + Google Maps Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Desktop Synchronized List Sidebar (Hidden on small screens, shown in bottom drawer) */}
        <div className="hidden lg:block lg:col-span-4 h-[620px] flex flex-col">
          <IncidentMapList
            incidents={filteredIncidents}
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={handleSelectFromList}
            onViewIncidentDetail={onViewIncidentDetail}
            onClearFilters={handleClearFilters}
            isLoading={isLoading}
            className="h-full"
          />
        </div>

        {/* Google Maps Container */}
        <div className="col-span-1 lg:col-span-8 h-[520px] sm:h-[620px] bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg overflow-hidden shadow-2xs relative flex flex-col">
          <GoogleMap
            center={mapCenter}
            zoom={13}
            markers={mapMarkers}
            selectedMarkerId={selectedIncidentId}
            onMarkerClick={handleMarkerClick}
            autoFitBounds={!selectedIncidentId}
            onViewIncidentDetail={onViewIncidentDetail}
            className="w-full h-full"
          />

          {/* Floating Selected Incident Popup Overlay on Map */}
          {activeIncident && (
            <div className="absolute top-4 left-4 right-4 sm:left-auto sm:right-4 z-20">
              <IncidentMapPopup
                incident={activeIncident}
                onClose={() => setSelectedIncidentId(null)}
                onViewIncidentDetail={onViewIncidentDetail}
              />
            </div>
          )}

          {/* Map Legend Footer */}
          <div className="absolute bottom-3 left-3 bg-[#FFFFFF]/95 backdrop-blur-xs border border-[#E5E5E5] rounded-md px-3 py-1.5 shadow-2xs z-10 flex flex-wrap items-center gap-3 text-[11px] font-medium text-[#111111]">
            <span className="text-[#71717A] text-[10px] font-bold uppercase tracking-wider">Severity:</span>
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
              <span>Critical</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" />
              <span>High</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
              <span>Medium</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
              <span>Low / Resolved</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Mobile Drawer / Bottom Sheet for Incident List (< lg screens) */}
      <div className="block lg:hidden bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg shadow-2xs overflow-hidden">
        <button
          onClick={() => setMobileDrawerOpen(prev => !prev)}
          className="w-full p-3 bg-[#FAFAFA] flex items-center justify-between text-xs font-bold text-[#111111] hover:bg-[#F4F4F5] transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-[#71717A]" />
            <span>Incident Queue List ({filteredIncidents.length} matching)</span>
          </div>
          {mobileDrawerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {mobileDrawerOpen && (
          <div className="max-h-[420px] overflow-y-auto border-t border-[#E5E5E5]">
            <IncidentMapList
              incidents={filteredIncidents}
              selectedIncidentId={selectedIncidentId}
              onSelectIncident={(inc) => {
                handleSelectFromList(inc);
                setMobileDrawerOpen(false); // Close drawer to reveal map
              }}
              onViewIncidentDetail={onViewIncidentDetail}
              onClearFilters={handleClearFilters}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
};
