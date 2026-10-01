import React from 'react';
import { X, MapPin, Clock, ArrowRight, ShieldAlert, Tag, Building2 } from 'lucide-react';
import { CivicIncidentMapItem } from './mapTypes';

interface IncidentMapPopupProps {
  incident: CivicIncidentMapItem | null;
  onClose: () => void;
  onViewIncidentDetail: (incidentId: string) => void;
  className?: string;
}

export const IncidentMapPopup: React.FC<IncidentMapPopupProps> = ({
  incident,
  onClose,
  onViewIncidentDetail,
  className = ''
}) => {
  if (!incident) return null;

  const p = (incident.priority || incident.severity || '').toUpperCase();
  const isCritical = p.includes('CRITICAL') || p === 'P1_CRITICAL';
  const isHigh = p.includes('HIGH') || p === 'P2_HIGH';
  const isMedium = p.includes('MEDIUM') || p === 'P3_STANDARD';

  const priorityColorClass = isCritical
    ? 'bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]'
    : isHigh
    ? 'bg-[#FFEDD5] text-[#EA580C] border-[#FED7AA]'
    : isMedium
    ? 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]'
    : 'bg-[#DCFCE7] text-[#16A34A] border-[#BBF7D0]';

  const formatCategory = (category: string) => {
    return category
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div
      className={`bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg shadow-lg p-4 max-w-sm w-full space-y-3 animate-in fade-in zoom-in-95 duration-150 ${className}`}
    >
      {/* Header with Tracking ID and Close */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-bold text-[#111111] tracking-wide">
          {incident.trackingNumber || incident.id}
        </span>
        <div className="flex items-center space-x-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-bold border uppercase tracking-wider ${priorityColorClass}`}
          >
            {incident.priority ? incident.priority.replace(/_/g, ' ') : 'Standard'}
          </span>
          <button
            onClick={onClose}
            className="text-[#71717A] hover:text-[#111111] p-1 rounded-md hover:bg-[#F4F4F5] transition-colors"
            aria-label="Close popup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Title and Category */}
      <div>
        <h4 className="text-sm font-bold text-[#111111] leading-snug">
          {incident.title}
        </h4>
        <div className="mt-1 flex items-center space-x-2 text-[11px] text-[#71717A]">
          <span className="font-medium text-[#52525B]">
            {formatCategory(incident.category)}
          </span>
          {incident.wardCode && (
            <>
              <span>&bull;</span>
              <span className="font-mono text-[10px] bg-[#F4F4F5] text-[#27272A] px-1.5 py-0.5 rounded-xs font-semibold">
                {incident.wardCode}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Location */}
      <div className="flex items-start space-x-1.5 text-xs text-[#52525B] bg-[#FAFAFA] p-2 rounded-md border border-[#F4F4F5]">
        <MapPin className="w-3.5 h-3.5 text-[#71717A] shrink-0 mt-0.5" />
        <span className="line-clamp-2 leading-tight">
          {incident.address || 'Municipal Ward Area'}
        </span>
      </div>

      {/* Status & CTA Button */}
      <div className="pt-2 border-t border-[#E5E5E5] flex items-center justify-between gap-3">
        <div className="text-xs">
          <span className="text-[#71717A] text-[11px]">Status: </span>
          <strong className="text-[#111111] font-semibold">
            {(incident.status || 'REPORTED').replace(/_/g, ' ')}
          </strong>
        </div>

        <button
          type="button"
          onClick={() => onViewIncidentDetail(incident.id)}
          className="px-3 py-1.5 bg-[#111111] hover:bg-[#27272A] text-[#FFFFFF] text-xs font-semibold rounded-md transition-colors flex items-center space-x-1 shadow-xs"
        >
          <span>View Incident</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
