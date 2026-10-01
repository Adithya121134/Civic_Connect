import React, { useState, useMemo } from 'react';
import {
  Search, Filter, ChevronLeft, ChevronRight, MapPin,
  AlertTriangle, ExternalLink, ArrowRight, Eye, CheckCircle2
} from 'lucide-react';
import { GoogleMap, MarkerData } from '../maps/GoogleMap';

interface IncidentQueueViewProps {
  incidents: any[];
  departmentName?: string;
  onSelectIncident: (incident: any) => void;
  onNavigateTab: (tab: string) => void;
}

export const IncidentQueueView: React.FC<IncidentQueueViewProps> = ({
  incidents,
  departmentName = 'Roads',
  onSelectIncident,
  onNavigateTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [wardFilter, setWardFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Selected incident on map preview
  const [selectedIncident, setSelectedIncident] = useState<any | null>(incidents[0] || null);

  // Mock list fallback if empty
  const defaultIncidents = useMemo(() => [
    { id: '1', tracking_number: 'INC-00421', title: 'Major Road Damage', severity: 'CRITICAL', status: 'Open', ward_code: 'Ward 04', address: 'Ward 04, Main Road', latitude: 11.0168, longitude: 76.9558 },
    { id: '2', tracking_number: 'INC-00417', title: 'Pothole', severity: 'HIGH', status: 'Assigned', ward_code: 'Ward 02', address: 'Ward 02, 5th Cross', latitude: 11.025, longitude: 76.948 },
    { id: '3', tracking_number: 'INC-00412', title: 'Road Crack', severity: 'MEDIUM', status: 'In Progress', ward_code: 'Ward 04', address: 'Ward 04, Station Rd', latitude: 11.012, longitude: 76.962 },
    { id: '4', tracking_number: 'INC-00409', title: 'Footpath Damage', severity: 'MEDIUM', status: 'Open', ward_code: 'Ward 01', address: 'Ward 01, Town Hall', latitude: 11.008, longitude: 76.959 },
    { id: '5', tracking_number: 'INC-00405', title: 'Manhole Issue', severity: 'LOW', status: 'Resolved', ward_code: 'Ward 07', address: 'Ward 07, Lake View', latitude: 11.031, longitude: 76.971 },
    { id: '6', tracking_number: 'INC-00402', title: 'Road Marking', severity: 'LOW', status: 'In Progress', ward_code: 'Ward 03', address: 'Ward 03, Ring Road', latitude: 11.019, longitude: 76.938 },
    { id: '7', tracking_number: 'INC-00398', title: 'Drainage on Road', severity: 'HIGH', status: 'Open', ward_code: 'Ward 04', address: 'Ward 04, Market Lane', latitude: 11.015, longitude: 76.953 },
    { id: '8', tracking_number: 'INC-00395', title: 'Sinkhole', severity: 'CRITICAL', status: 'Assigned', ward_code: 'Ward 02', address: 'Ward 02, Hospital Rd', latitude: 11.028, longitude: 76.942 },
    { id: '9', tracking_number: 'INC-00390', title: 'Traffic Sign', severity: 'LOW', status: 'Resolved', ward_code: 'Ward 01', address: 'Ward 01, East Blvd', latitude: 11.004, longitude: 76.965 },
    { id: '10', tracking_number: 'INC-00388', title: 'Speed Breaker', severity: 'MEDIUM', status: 'In Progress', ward_code: 'Ward 07', address: 'Ward 07, College Rd', latitude: 11.035, longitude: 76.975 },
  ], []);

  const items = incidents && incidents.length > 0 ? incidents : defaultIncidents;

  // Filtered
  const filtered = useMemo(() => {
    return items.filter((inc) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        inc.title?.toLowerCase().includes(q) ||
        inc.tracking_number?.toLowerCase().includes(q) ||
        inc.address?.toLowerCase().includes(q);

      const sev = (inc.severity || inc.priority || '').toUpperCase();
      const matchesSeverity =
        severityFilter === 'ALL' ||
        sev.includes(severityFilter);

      const st = (inc.status || '').toUpperCase();
      const matchesStatus =
        statusFilter === 'ALL' ||
        st === statusFilter.toUpperCase() ||
        (statusFilter === 'Open' && (st === 'REPORTED' || st === 'ROUTED' || st === 'OPEN')) ||
        (statusFilter === 'Assigned' && st.includes('ASSIGN')) ||
        (statusFilter === 'In Progress' && st.includes('PROGRESS')) ||
        (statusFilter === 'Resolved' && (st.includes('RESOLV') || st.includes('VERIF') || st.includes('CLOSED')));

      const matchesWard =
        wardFilter === 'ALL' || inc.ward_code === wardFilter;

      return matchesSearch && matchesSeverity && matchesStatus && matchesWard;
    });
  }, [items, searchQuery, severityFilter, statusFilter, wardFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const activeInc = selectedIncident || paginated[0] || null;

  const mapMarkers: MarkerData[] = filtered.slice(0, 30).map((inc) => {
    const isCritical = (inc.severity || inc.priority || '').toUpperCase().includes('CRITICAL');
    const isHigh = (inc.severity || inc.priority || '').toUpperCase().includes('HIGH');
    const isMedium = (inc.severity || inc.priority || '').toUpperCase().includes('MEDIUM');

    const color = isCritical ? '#DC2626' : isHigh ? '#EA580C' : isMedium ? '#D97706' : '#16A34A';

    return {
      id: inc.id,
      lat: Number(inc.latitude) || 11.0168 + (Math.random() - 0.5) * 0.05,
      lng: Number(inc.longitude) || 76.9558 + (Math.random() - 0.5) * 0.05,
      title: inc.title,
      color,
      incident: {
        id: inc.id,
        trackingNumber: inc.tracking_number || `INC-${inc.id}`,
        title: inc.title,
        status: inc.status,
        priority: inc.severity || inc.priority,
        address: inc.address || 'Coimbatore'
      }
    };
  });

  const getSeverityBadge = (sevRaw: string) => {
    const sev = (sevRaw || '').toUpperCase();
    if (sev.includes('CRITICAL')) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-semibold tracking-[0.03em] uppercase bg-[#FEE2E2] text-[#DC2626]">Critical</span>;
    }
    if (sev.includes('HIGH')) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-semibold tracking-[0.03em] uppercase bg-[#FFEDD5] text-[#EA580C]">High</span>;
    }
    if (sev.includes('MEDIUM')) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-semibold tracking-[0.03em] uppercase bg-[#FEF3C7] text-[#D97706]">Medium</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[11px] font-semibold tracking-[0.03em] uppercase bg-[#DCFCE7] text-[#16A34A]">Low</span>;
  };

  const getStatusText = (statusRaw: string) => {
    const st = (statusRaw || '').toUpperCase();
    if (st.includes('REPORTED') || st === 'OPEN') return 'Open';
    if (st.includes('ASSIGN')) return 'Assigned';
    if (st.includes('PROGRESS')) return 'In Progress';
    if (st.includes('RESOLV') || st.includes('VERIF') || st.includes('CLOSED')) return 'Resolved';
    return statusRaw;
  };

  return (
    <div className="space-y-5">
      {/* 1. Filter Bar (Reference Image Panel 4) */}
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-3.5 shadow-2xs flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search incidents, location, ID..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-[13px] font-normal text-[#111827] placeholder:text-[#6B7280] focus:outline-hidden focus:border-[#111827] transition-colors"
          />
        </div>

        {/* Status Dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-md px-3 py-1.5 text-xs sm:text-[13px] font-medium text-[#111827] focus:outline-hidden focus:border-[#111827]"
        >
          <option value="ALL">Status: All</option>
          <option value="Open">Open</option>
          <option value="Assigned">Assigned</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>

        {/* Severity Dropdown */}
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-md px-3 py-1.5 text-xs sm:text-[13px] font-medium text-[#111827] focus:outline-hidden focus:border-[#111827]"
        >
          <option value="ALL">Severity: All</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        {/* Ward Dropdown */}
        <select
          value={wardFilter}
          onChange={(e) => setWardFilter(e.target.value)}
          className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-md px-3 py-1.5 text-xs sm:text-[13px] font-medium text-[#111827] focus:outline-hidden focus:border-[#111827]"
        >
          <option value="ALL">Ward: All</option>
          <option value="Ward 01">Ward 01</option>
          <option value="Ward 02">Ward 02</option>
          <option value="Ward 03">Ward 03</option>
          <option value="Ward 04">Ward 04</option>
          <option value="Ward 07">Ward 07</option>
        </select>

        <button
          onClick={() => {
            setSearchQuery('');
            setStatusFilter('ALL');
            setSeverityFilter('ALL');
            setWardFilter('ALL');
          }}
          className="px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5E5] hover:bg-[#F4F4F5] text-xs sm:text-[13px] font-medium text-[#111827] rounded-md transition-colors flex items-center space-x-1.5 shadow-2xs"
        >
          <Filter className="w-3.5 h-3.5 text-[#6B7280]" />
          <span>Reset Filters</span>
        </button>
      </div>

      {/* 2. Split Two-Column Layout (Reference Image Panel 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Incidents Table */}
        <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#F4F4F5]">
              <h2 className="text-base sm:text-lg font-semibold text-[#111827] tracking-[-0.01em]">
                Incidents ({departmentName})
              </h2>
              <span className="text-xs font-medium text-[#6B7280]">
                Showing {filtered.length} total
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E5E5] text-[#4B5563] text-[11.5px] font-semibold tracking-[0.02em] uppercase">
                    <th className="py-2.5 pr-3">ID</th>
                    <th className="py-2.5 px-3">Issue</th>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 pl-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F4F5]">
                  {paginated.map((inc) => {
                    const isSelected = activeInc?.id === inc.id;
                    return (
                      <tr
                        key={inc.id}
                        onClick={() => setSelectedIncident(inc)}
                        onDoubleClick={() => onSelectIncident(inc)}
                        className={`hover:bg-[#FAFAFA] transition-colors cursor-pointer ${
                          isSelected ? 'bg-[#FAFAFA]' : ''
                        }`}
                      >
                        <td className="py-3.5 pr-3 font-mono text-xs sm:text-[12.5px] font-semibold text-[#1F2937] tracking-[0.02em]">
                          {inc.tracking_number || `INC-${inc.id}`}
                        </td>
                        <td className="py-3.5 px-3 text-xs sm:text-[13.5px] font-medium text-[#111827]">
                          <div className="truncate max-w-[200px]" title={inc.title}>
                            {inc.title}
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          {getSeverityBadge(inc.severity || inc.priority)}
                        </td>
                        <td className="py-3.5 pl-3 text-xs sm:text-[13px] font-normal text-[#4B5563]">
                          {getStatusText(inc.status)}
                        </td>
                      </tr>
                    );
                  })}

                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-[#6B7280]">
                        No incidents matching current criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls (Reference Image Panel 4) */}
          <div className="mt-4 pt-3 border-t border-[#F4F4F5] flex items-center justify-between text-xs text-[#4B5563]">
            <span>
              Showing {Math.min((currentPage - 1) * pageSize + 1, filtered.length)}-{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
            </span>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-md hover:bg-[#F4F4F5] disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  className={`w-6 h-6 rounded-md text-xs font-semibold ${
                    currentPage === pg
                      ? 'bg-[#111827] text-[#FFFFFF]'
                      : 'hover:bg-[#F4F4F5] text-[#4B5563]'
                  }`}
                >
                  {pg}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-md hover:bg-[#F4F4F5] disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Incident Map (Roads) */}
        <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base sm:text-lg font-semibold text-[#111827] tracking-[-0.01em]">
                Incident Map ({departmentName})
              </h2>
              <button
                onClick={() => onNavigateTab('map')}
                className="text-xs font-semibold text-[#111827] hover:text-[#4B5563] flex items-center space-x-1"
              >
                <span>View Full Map</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-[360px] rounded-md overflow-hidden border border-[#E5E5E5] relative">
              <GoogleMap
                center={{
                  lat: Number(activeInc?.latitude) || 11.0168,
                  lng: Number(activeInc?.longitude) || 76.9558
                }}
                zoom={14}
                markers={mapMarkers}
                onMarkerClick={(marker) => {
                  const found = items.find(i => i.id === marker.id);
                  if (found) setSelectedIncident(found);
                }}
                className="h-full w-full"
              />

              {/* Active Incident Popup Overlay on Map */}
              {activeInc && (
                <div className="absolute bottom-3 left-3 right-3 bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-3 shadow-lg z-10 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs sm:text-[12.5px] font-semibold text-[#1F2937] tracking-[0.02em]">
                          {activeInc.tracking_number || `INC-${activeInc.id}`}
                        </span>
                        {getSeverityBadge(activeInc.severity || activeInc.priority)}
                      </div>
                      <div className="font-semibold text-xs sm:text-sm text-[#111827] mt-0.5 truncate max-w-[240px]">
                        {activeInc.title}
                      </div>
                      <div className="text-xs text-[#4B5563] mt-0.5 flex items-center space-x-1 font-normal">
                        <MapPin className="w-3 h-3 shrink-0 text-[#6B7280]" />
                        <span>{activeInc.address || activeInc.ward_code || 'Ward 04, Coimbatore'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectIncident(activeInc)}
                      className="px-3 py-1.5 bg-[#111111] hover:bg-[#27272A] text-[#FFFFFF] text-xs font-semibold rounded-md transition-colors shrink-0 shadow-2xs"
                    >
                      View Incident &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Map Legend */}
          <div className="mt-3 pt-3 border-t border-[#F4F4F5] flex items-center space-x-4 text-xs text-[#4B5563]">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
              <span className="font-medium text-[#374151]">Critical</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" />
              <span className="font-medium text-[#374151]">High</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
              <span className="font-medium text-[#374151]">Medium</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
              <span className="font-medium text-[#374151]">Low</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
