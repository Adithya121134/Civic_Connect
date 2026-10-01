import React, { useEffect, useRef } from 'react';
import { MapPin, Clock, AlertTriangle, ArrowRight, CheckCircle2, ShieldAlert, Layers } from 'lucide-react';
import { CivicIncidentMapItem } from './mapTypes';

interface IncidentMapListProps {
  incidents: CivicIncidentMapItem[];
  selectedIncidentId: string | null;
  onSelectIncident: (incident: CivicIncidentMapItem) => void;
  onViewIncidentDetail: (incidentId: string) => void;
  onClearFilters?: () => void;
  isLoading?: boolean;
  className?: string;
}

export const IncidentMapList: React.FC<IncidentMapListProps> = ({
  incidents,
  selectedIncidentId,
  onSelectIncident,
  onViewIncidentDetail,
  onClearFilters,
  isLoading = false,
  className = ''
}) => {
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Auto-scroll selected item into view smoothly
  useEffect(() => {
    if (selectedIncidentId) {
      const el = itemRefs.current.get(selectedIncidentId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedIncidentId]);

  const getPriorityBadge = (priority: string, severity: string) => {
    const p = (priority || severity || '').toUpperCase();
    if (p.includes('CRITICAL') || p === 'P1_CRITICAL' || p === 'P1') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-bold bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]">
          Critical
        </span>
      );
    }
    if (p.includes('HIGH') || p === 'P2_HIGH' || p === 'P2') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-bold bg-[#FFEDD5] text-[#EA580C] border border-[#FED7AA]">
          High
        </span>
      );
    }
    if (p.includes('MEDIUM') || p === 'P3_STANDARD' || p === 'P3') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-bold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
          Medium
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-bold bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]">
        Low
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'REPORTED':
      case 'TRIAGED':
        return <span className="text-[10px] font-semibold text-[#6B7280]">Reported</span>;
      case 'ASSIGNED':
        return <span className="text-[10px] font-semibold text-[#2563EB]">Assigned</span>;
      case 'IN_PROGRESS':
        return <span className="text-[10px] font-semibold text-[#D97706]">In Progress</span>;
      case 'RESOLUTION_SUBMITTED':
        return <span className="text-[10px] font-semibold text-[#7C3AED]">Pending Review</span>;
      case 'VERIFIED':
      case 'RESOLVED':
        return <span className="text-[10px] font-semibold text-[#16A34A]">Verified</span>;
      case 'CLOSED':
        return <span className="text-[10px] font-semibold text-[#4B5563]">Closed</span>;
      default:
        return <span className="text-[10px] font-semibold text-[#71717A]">{status}</span>;
    }
  };

  const formatCategory = (category: string) => {
    return category
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className={`flex flex-col bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg shadow-2xs overflow-hidden ${className}`}>
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-[#E5E5E5] bg-[#FAFAFA] flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
            Incident Queue ({incidents.length})
          </h3>
          <p className="text-[11px] text-[#71717A] mt-0.5">
            Click to locate on map &bull; Real-time synchronized
          </p>
        </div>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#F4F4F5] max-h-[580px]">
        {isLoading && incidents.length === 0 && (
          <div className="p-8 text-center text-xs text-[#71717A] space-y-2">
            <div className="w-5 h-5 border-2 border-[#111111] border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Loading incidents from backend...</p>
          </div>
        )}

        {!isLoading && incidents.length === 0 && (
          <div className="p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#F4F4F5] flex items-center justify-center mx-auto text-[#71717A]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#111111]">No incidents match filters</p>
              <p className="text-[11px] text-[#71717A] mt-0.5">
                Try adjusting the issue type, priority, or search term.
              </p>
            </div>
            {onClearFilters && (
              <button
                onClick={onClearFilters}
                className="px-3 py-1.5 bg-[#111111] text-[#FFFFFF] text-xs font-semibold rounded-md hover:bg-[#27272A] transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}

        {incidents.map((incident) => {
          const isSelected = selectedIncidentId === incident.id;

          return (
            <div
              key={incident.id}
              ref={(el) => {
                if (el) itemRefs.current.set(incident.id, el);
                else itemRefs.current.delete(incident.id);
              }}
              onClick={() => onSelectIncident(incident)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectIncident(incident);
                }
              }}
              tabIndex={0}
              role="button"
              aria-pressed={isSelected}
              className={`p-3.5 text-left cursor-pointer transition-all duration-150 focus:outline-none focus:bg-[#F4F4F5] ${
                isSelected
                  ? 'bg-[#F4F4F5] border-l-4 border-l-[#111111]'
                  : 'hover:bg-[#FAFAFA] border-l-4 border-l-transparent'
              }`}
            >
              {/* Top Row: Tracking ID + Priority + Status */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-bold text-[#111111]">
                  {incident.trackingNumber || incident.id}
                </span>
                <div className="flex items-center space-x-1.5">
                  {getPriorityBadge(incident.priority, incident.severity)}
                  {getStatusBadge(incident.status)}
                </div>
              </div>

              {/* Title */}
              <div className="mt-1.5 font-bold text-xs text-[#111111] line-clamp-1">
                {incident.title}
              </div>

              {/* Category & Ward */}
              <div className="mt-1 flex items-center justify-between text-[11px] text-[#71717A]">
                <span className="font-medium text-[#52525B]">
                  {formatCategory(incident.category)}
                </span>
                {incident.wardCode && (
                  <span className="font-mono text-[10px] bg-[#E4E4E7] text-[#27272A] px-1.5 py-0.2 rounded-xs font-semibold">
                    {incident.wardCode}
                  </span>
                )}
              </div>

              {/* Location Address */}
              <div className="mt-1.5 flex items-center space-x-1 text-[11px] text-[#71717A]">
                <MapPin className="w-3 h-3 text-[#A1A1AA] shrink-0" />
                <span className="truncate">{incident.address || 'Municipal Ward Area'}</span>
              </div>

              {/* Actions Footer */}
              <div className="mt-2.5 pt-2 border-t border-[#E5E5E5]/60 flex items-center justify-between text-[11px]">
                <span className="text-[#A1A1AA] text-[10px]">
                  {incident.createdAt ? new Date(incident.createdAt).toLocaleDateString() : 'Active'}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewIncidentDetail(incident.id);
                  }}
                  className="inline-flex items-center space-x-1 text-[#111111] hover:text-[#000000] font-semibold text-[11px] hover:underline"
                >
                  <span>Details</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
