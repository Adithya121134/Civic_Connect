import React, { useState } from 'react';
import {
  MapPin, AlertTriangle, ArrowRight, Eye, CheckCircle2,
  Users, Wrench, HardHat, Clock, Camera, ChevronRight,
  Filter, RefreshCw, Upload, Check, AlertCircle, Sparkles,
  Package, CheckSquare
} from 'lucide-react';

interface OverviewDashboardViewProps {
  departmentName?: string;
  incidents: any[];
  dashboardMetrics: any;
  slaData?: any;
  onSelectIncident: (incident: any) => void;
  onNavigateTab: (tab: string) => void;
  onStatusUpdated?: () => void;
  tokens?: any;
}

export const OverviewDashboardView: React.FC<OverviewDashboardViewProps> = ({
  departmentName = 'Public Works & Infrastructure',
  incidents = [],
  dashboardMetrics,
  onSelectIncident,
  onNavigateTab,
  onStatusUpdated,
  tokens
}) => {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED' | 'CRITICAL'>('ALL');
  const [statusModalIncident, setStatusModalIncident] = useState<any | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('WORK STARTED');
  const [updateNote, setUpdateNote] = useState<string>('');
  const [completionImage, setCompletionImage] = useState<string | null>(null);
  const [isSubmittingStatus, setIsSubmittingStatus] = useState<boolean>(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);

  // Derive 4 Core Stats
  const activeReportsCount = dashboardMetrics?.activeReports ?? incidents.filter(i => {
    const s = (i.status || '').toUpperCase();
    return s !== 'WORK COMPLETED' && s !== 'WORK_COMPLETED' && s !== 'RESOLVED' && s !== 'CLOSED';
  }).length;

  const workInProgressCount = dashboardMetrics?.workInProgress ?? incidents.filter(i => {
    const s = (i.status || '').toUpperCase();
    return s === 'WORK STARTED' || s === 'WORK_STARTED' || s === 'WORK IN PROGRESS' || s === 'WORK_IN_PROGRESS' || s === 'IN_PROGRESS' || s === 'ASSIGNED';
  }).length;

  const completedCount = dashboardMetrics?.completed ?? incidents.filter(i => {
    const s = (i.status || '').toUpperCase();
    return s === 'WORK COMPLETED' || s === 'WORK_COMPLETED' || s === 'RESOLVED' || s === 'CLOSED';
  }).length;

  const criticalCount = dashboardMetrics?.critical ?? incidents.filter(i => {
    const isCrit = (i.severity || i.priority || '').toUpperCase().includes('CRITICAL');
    const s = (i.status || '').toUpperCase();
    return isCrit && s !== 'WORK COMPLETED' && s !== 'WORK_COMPLETED' && s !== 'RESOLVED' && s !== 'CLOSED';
  }).length;

  // Filtered incidents
  const filteredIncidents = incidents.filter(i => {
    const s = (i.status || '').toUpperCase();
    const isCrit = (i.severity || i.priority || '').toUpperCase().includes('CRITICAL');
    const isDone = s === 'WORK COMPLETED' || s === 'WORK_COMPLETED' || s === 'RESOLVED' || s === 'CLOSED';
    const isWip = s === 'WORK STARTED' || s === 'WORK_STARTED' || s === 'WORK IN PROGRESS' || s === 'WORK_IN_PROGRESS' || s === 'IN_PROGRESS' || s === 'ASSIGNED';

    if (filter === 'ACTIVE') return !isDone;
    if (filter === 'IN_PROGRESS') return isWip;
    if (filter === 'COMPLETED') return isDone;
    if (filter === 'CRITICAL') return isCrit && !isDone;
    return true;
  });

  const getSeverityBadge = (severityStr?: string, priorityStr?: string) => {
    const s = (severityStr || priorityStr || 'MEDIUM').toUpperCase();
    if (s.includes('CRITICAL')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]">
          Critical
        </span>
      );
    }
    if (s.includes('HIGH')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-[#FFEDD5] text-[#EA580C] border border-[#FED7AA]">
          High
        </span>
      );
    }
    if (s.includes('LOW')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]">
          Low
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
        Medium
      </span>
    );
  };

  const getStatusBadge = (statusStr?: string) => {
    const s = (statusStr || 'REPORTED').toUpperCase().replace(/_/g, ' ');
    if (s.includes('COMPLETED') || s.includes('RESOLVED')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>WORK COMPLETED</span>
        </span>
      );
    }
    if (s.includes('PROGRESS')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
          <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse" />
          <span>WORK IN PROGRESS</span>
        </span>
      );
    }
    if (s.includes('STARTED')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
          <span>WORK STARTED</span>
        </span>
      );
    }
    if (s.includes('ASSIGN')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F3E8FF] text-[#7E22CE] border border-[#E9D5FF]">
          <span>ASSIGNED</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F4F4F5] text-[#52525B] border border-[#E4E4E7]">
        <span>REPORTED</span>
      </span>
    );
  };

  const parseJsonList = (val: any): any[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [String(val)];
    }
  };

  const formatItemName = (item: any): string => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    if (typeof item === 'object' && item !== null) {
      if (item.name) {
        if (item.quantity && item.unit && item.unit !== 'unit') {
          return `${item.name} (${item.quantity} ${item.unit})`;
        }
        return item.name;
      }
      return JSON.stringify(item);
    }
    return String(item);
  };

  const openStatusModal = (incident: any, defaultTarget = 'WORK STARTED') => {
    setStatusModalIncident(incident);
    setTargetStatus(defaultTarget);
    setCompletionImage(null);
    setStatusError(null);
    setStatusSuccess(null);
    if (defaultTarget === 'WORK STARTED') {
      setUpdateNote('Repair team has reached the location and started the work.');
    } else if (defaultTarget === 'WORK IN PROGRESS') {
      setUpdateNote('Repairs are actively underway by municipal field workers.');
    } else if (defaultTarget === 'WORK COMPLETED') {
      setUpdateNote('Repair work completed on site. Area inspected and cleared for public use.');
    } else {
      setUpdateNote('');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCompletionImage(event.target?.result as string);
      setStatusError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitStatusUpdate = async () => {
    if (!statusModalIncident) return;
    if ((targetStatus === 'WORK COMPLETED' || targetStatus === 'RESOLVED') && !completionImage && !statusModalIncident.completion_image_url) {
      setStatusError('A completion proof image is required to mark this incident as WORK COMPLETED.');
      return;
    }

    setIsSubmittingStatus(true);
    setStatusError(null);

    try {
      const res = await fetch(`/api/v1/department/incidents/${statusModalIncident.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: tokens ? `Bearer ${tokens.accessToken}` : ''
        },
        body: JSON.stringify({
          targetStatus,
          updateNote,
          completionPhotoDataUrl: completionImage,
          expectedVersion: statusModalIncident.version || 1
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update work status.');
      }

      setStatusSuccess('Work status updated successfully! Residents can now view this update.');
      setTimeout(() => {
        setStatusModalIncident(null);
        if (onStatusUpdated) onStatusUpdated();
      }, 1200);
    } catch (err: any) {
      setStatusError(err.message || 'Error updating status.');
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header with Department Name */}
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md bg-[#F4F4F5] text-[11px] font-semibold text-[#52525B] uppercase tracking-wider mb-2">
            <span>Department Operations Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight">
            {departmentName}
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1 font-normal">
            Understand reported problems, plan personnel and equipment, update work status, and submit completion proof.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigateTab('map')}
            className="px-3.5 py-2 bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#18181B] rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Map View</span>
          </button>
          {onStatusUpdated && (
            <button
              onClick={onStatusUpdated}
              className="p-2 bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#18181B] rounded-lg transition-colors"
              title="Refresh Queue"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Below the header: ONLY 4 Core Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Reports */}
        <div
          onClick={() => setFilter('ACTIVE')}
          className={`p-5 rounded-xl border transition-all cursor-pointer ${
            filter === 'ACTIVE'
              ? 'bg-[#FFFFFF] border-[#18181B] shadow-sm ring-1 ring-[#18181B]'
              : 'bg-[#FFFFFF] border-[#E5E5E5] hover:border-[#D4D4D8] shadow-2xs'
          }`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
            Active Reports
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-[#111827] mt-2 tracking-tight">
            {activeReportsCount}
          </div>
          <div className="text-[11px] text-[#9CA3AF] mt-1">Pending or ongoing repairs</div>
        </div>

        {/* Work in Progress */}
        <div
          onClick={() => setFilter('IN_PROGRESS')}
          className={`p-5 rounded-xl border transition-all cursor-pointer ${
            filter === 'IN_PROGRESS'
              ? 'bg-[#FFFFFF] border-[#2563EB] shadow-sm ring-1 ring-[#2563EB]'
              : 'bg-[#FFFFFF] border-[#E5E5E5] hover:border-[#D4D4D8] shadow-2xs'
          }`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
            Work in Progress
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-[#2563EB] mt-2 tracking-tight">
            {workInProgressCount}
          </div>
          <div className="text-[11px] text-[#9CA3AF] mt-1">Crews assigned & active on site</div>
        </div>

        {/* Completed */}
        <div
          onClick={() => setFilter('COMPLETED')}
          className={`p-5 rounded-xl border transition-all cursor-pointer ${
            filter === 'COMPLETED'
              ? 'bg-[#FFFFFF] border-[#16A34A] shadow-sm ring-1 ring-[#16A34A]'
              : 'bg-[#FFFFFF] border-[#E5E5E5] hover:border-[#D4D4D8] shadow-2xs'
          }`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-[#16A34A]">
            Completed
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-[#16A34A] mt-2 tracking-tight">
            {completedCount}
          </div>
          <div className="text-[11px] text-[#9CA3AF] mt-1">Resolved with photo proof</div>
        </div>

        {/* Critical */}
        <div
          onClick={() => setFilter('CRITICAL')}
          className={`p-5 rounded-xl border transition-all cursor-pointer ${
            filter === 'CRITICAL'
              ? 'bg-[#FFFFFF] border-[#DC2626] shadow-sm ring-1 ring-[#DC2626]'
              : 'bg-[#FFFFFF] border-[#E5E5E5] hover:border-[#D4D4D8] shadow-2xs'
          }`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-[#DC2626]">
            Critical
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-[#DC2626] mt-2 tracking-tight">
            {criticalCount}
          </div>
          <div className="text-[11px] text-[#9CA3AF] mt-1">Urgent safety hazards</div>
        </div>
      </div>

      {/* 3. Filter Pills */}
      <div className="flex items-center justify-between gap-4 border-b border-[#E5E5E5] pb-3">
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
          {(['ALL', 'ACTIVE', 'IN_PROGRESS', 'CRITICAL', 'COMPLETED'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === f
                  ? 'bg-[#18181B] text-[#FFFFFF]'
                  : 'bg-[#F4F4F5] text-[#52525B] hover:text-[#18181B] hover:bg-[#E4E4E7]'
              }`}
            >
              {f === 'ALL' ? 'All Reports' : f === 'ACTIVE' ? 'Active' : f === 'IN_PROGRESS' ? 'In Progress' : f === 'CRITICAL' ? 'Critical Only' : 'Completed'}
            </button>
          ))}
        </div>

        <div className="text-xs text-[#6B7280]">
          Showing <strong>{filteredIncidents.length}</strong> reports
        </div>
      </div>

      {/* 4. Incident / Report Cards List */}
      {filteredIncidents.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-12 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-[#16A34A] mx-auto opacity-70" />
          <h3 className="text-sm font-semibold text-[#18181B]">No reports in this category</h3>
          <p className="text-xs text-[#6B7280]">Select another filter above to review reports.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIncidents.map((incident) => {
            const trackingId = incident.tracking_number || `INC-${incident.id}`;
            const simpleExplanation = incident.simple_explanation || incident.observed_problem || incident.description || 'Hazard creates accessibility or safety risk for the public.';
            const workersNeeded = incident.workers_needed || 2;
            const equipmentList = parseJsonList(incident.equipment_needed);
            const materialsList = parseJsonList(incident.materials_needed);
            const citizenImage = incident.citizen_image_url || incident.photoDataUrl || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80';
            const statusUpper = (incident.status || 'REPORTED').toUpperCase();
            const isDone = statusUpper.includes('COMPLETED') || statusUpper.includes('RESOLVED');

            return (
              <div
                key={incident.id}
                className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-5 sm:p-6 shadow-2xs hover:border-[#D4D4D8] transition-all space-y-4"
              >
                {/* Card Top Row: ID, Created, Status, Severity */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F4F4F5] pb-3">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-mono text-xs font-bold text-[#18181B] bg-[#F4F4F5] px-2.5 py-1 rounded">
                      {trackingId}
                    </span>
                    {getSeverityBadge(incident.severity, incident.priority)}
                    <span className="text-xs text-[#6B7280]">
                      {incident.created_at ? new Date(incident.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {getStatusBadge(incident.status)}
                  </div>
                </div>

                {/* Card Middle: Left Image + Right Details */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  {/* Citizen Image Thumbnail */}
                  <div className="md:col-span-3">
                    <div className="relative rounded-lg overflow-hidden border border-[#E5E5E5] bg-[#FAFAFA] aspect-4/3 group">
                      <img
                        src={citizenImage}
                        alt="Citizen reported problem"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-1.5 left-1.5 bg-[#000000]/70 text-[#FFFFFF] text-[10px] font-medium px-2 py-0.5 rounded backdrop-blur-xs">
                        Citizen Evidence
                      </div>
                    </div>
                  </div>

                  {/* Incident Information */}
                  <div className="md:col-span-9 space-y-3">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-[#111827] leading-snug">
                        {incident.title}
                      </h2>
                      <div className="flex items-center space-x-1.5 text-xs text-[#4B5563] mt-1">
                        <MapPin className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
                        <span>{incident.address || 'Public Municipal Location'}</span>
                        {incident.ward_code && (
                          <span className="font-mono text-[11px] text-[#6B7280] bg-[#F4F4F5] px-1.5 py-0.5 rounded ml-1">
                            {incident.ward_code}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Simple Explanation */}
                    <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-3 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block mb-0.5">
                        Risk & Safety Assessment
                      </span>
                      <p className="text-[#374151] font-medium leading-relaxed">
                        {simpleExplanation}
                      </p>
                    </div>

                    {/* Planning: Workers Needed + Equipment Needed */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Workers */}
                      <div className="flex items-center space-x-2.5 bg-[#F9FAFB] border border-[#E5E5E5] rounded-lg px-3 py-2 text-xs">
                        <div className="w-7 h-7 rounded-full bg-[#E5E7EB] flex items-center justify-center text-[#1F2937] shrink-0">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-[10px] text-[#6B7280] uppercase font-semibold">Workers Needed</div>
                          <div className="font-bold text-[#111827]">
                            {workersNeeded} Personnel
                          </div>
                        </div>
                      </div>

                      {/* Equipment */}
                      <div className="flex items-start space-x-2.5 bg-[#F9FAFB] border border-[#E5E5E5] rounded-lg px-3 py-2 text-xs">
                        <div className="w-7 h-7 rounded-full bg-[#E5E7EB] flex items-center justify-center text-[#1F2937] shrink-0 mt-0.5">
                          <Wrench className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] text-[#6B7280] uppercase font-semibold">Equipment Needed</div>
                          <div className="text-[#1F2937] font-medium truncate">
                            {equipmentList.length > 0 ? equipmentList.map(item => formatItemName(item)).join(', ') : 'Standard repair & inspection kit'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#F4F4F5]">
                  <div className="text-xs text-[#6B7280] flex items-center space-x-1.5">
                    {incident.department_update_note && (
                      <span className="italic truncate max-w-md">
                        Latest update: &ldquo;{incident.department_update_note}&rdquo;
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2.5">
                    <button
                      onClick={() => onSelectIncident(incident)}
                      className="px-3.5 py-2 border border-[#E5E5E5] hover:border-[#18181B] bg-[#FFFFFF] text-[#18181B] rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Report</span>
                    </button>

                    {!isDone && (
                      <button
                        onClick={() => openStatusModal(incident, statusUpper.includes('STARTED') ? 'WORK IN PROGRESS' : 'WORK STARTED')}
                        className="px-4 py-2 bg-[#18181B] hover:bg-[#27272A] text-[#FFFFFF] rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 shadow-2xs"
                      >
                        <span>Update Work Status</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {statusUpper.includes('PROGRESS') && !isDone && (
                      <button
                        onClick={() => openStatusModal(incident, 'WORK COMPLETED')}
                        className="px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-[#FFFFFF] rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 shadow-2xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete Work & Proof</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Fast Status Update & Proof Modal */}
      {statusModalIncident && (
        <div className="fixed inset-0 z-50 bg-[#000000]/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-[#E5E5E5] pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-[#6B7280]">
                  {statusModalIncident.tracking_number || `INC-${statusModalIncident.id}`}
                </span>
                <h3 className="text-base font-bold text-[#111827] mt-0.5">
                  Update Work Status
                </h3>
              </div>
              <button
                onClick={() => setStatusModalIncident(null)}
                className="text-[#9CA3AF] hover:text-[#111827] p-1 rounded-md"
              >
                &times;
              </button>
            </div>

            {statusError && (
              <div className="p-3 bg-[#FEE2E2] border border-[#FECACA] rounded-lg text-xs text-[#DC2626] font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{statusError}</span>
              </div>
            )}

            {statusSuccess && (
              <div className="p-3 bg-[#DCFCE7] border border-[#BBF7D0] rounded-lg text-xs text-[#16A34A] font-medium flex items-center space-x-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{statusSuccess}</span>
              </div>
            )}

            {/* Target Status Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#374151] block uppercase tracking-wider">
                Select New Status
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'ASSIGNED', label: 'ASSIGNED' },
                  { id: 'WORK STARTED', label: 'WORK STARTED' },
                  { id: 'WORK IN PROGRESS', label: 'IN PROGRESS' },
                  { id: 'WORK COMPLETED', label: 'COMPLETED' },
                ].map(st => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setTargetStatus(st.id);
                      if (st.id === 'WORK STARTED') setUpdateNote('Repair team has reached the location and started the work.');
                      else if (st.id === 'WORK IN PROGRESS') setUpdateNote('Damaged steps are being repaired.');
                      else if (st.id === 'WORK COMPLETED') setUpdateNote('Repair completed and verified on site with photo proof.');
                    }}
                    className={`py-2 px-2 text-xs font-semibold rounded-lg border transition-all text-center ${
                      targetStatus === st.id
                        ? 'bg-[#18181B] text-[#FFFFFF] border-[#18181B] shadow-2xs'
                        : 'bg-[#F9FAFB] text-[#4B5563] border-[#E5E7EB] hover:border-[#9CA3AF]'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Note field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151] block uppercase tracking-wider">
                Status Update Note (Visible to Resident)
              </label>
              <textarea
                rows={3}
                value={updateNote}
                onChange={e => setUpdateNote(e.target.value)}
                placeholder="Describe what the team has accomplished or is currently doing..."
                className="w-full px-3 py-2 text-xs border border-[#E5E5E5] rounded-lg focus:outline-none focus:border-[#18181B] bg-[#FAFAFA]"
              />
            </div>

            {/* Mandatory Completion Image upload if WORK COMPLETED */}
            {(targetStatus === 'WORK COMPLETED' || targetStatus === 'RESOLVED') && (
              <div className="space-y-2 p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-xs">
                <div className="flex items-center space-x-1.5 text-[#16A34A] font-bold">
                  <Camera className="w-4 h-4" />
                  <span>Completion Evidence Image (Required)</span>
                </div>
                <p className="text-[#4B5563]">
                  Department workflow requires a photograph showing the completed repair before finalizing this work order.
                </p>

                {completionImage ? (
                  <div className="relative rounded-lg overflow-hidden border border-[#16A34A] h-40 group">
                    <img
                      src={completionImage}
                      alt="Completed work"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setCompletionImage(null)}
                      className="absolute top-2 right-2 bg-[#000000]/70 text-[#FFFFFF] p-1 rounded-md text-xs hover:bg-[#DC2626]"
                    >
                      Change Photo
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[#86EFAC] bg-[#FFFFFF] rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-[#F0FDF4] transition-colors">
                    <Upload className="w-6 h-6 text-[#16A34A] mb-1.5" />
                    <span className="font-semibold text-xs text-[#16A34A]">Upload Completed Work Photo</span>
                    <span className="text-[10px] text-[#6B7280] mt-0.5">JPEG, PNG or Camera capture</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E5E5E5]">
              <button
                type="button"
                onClick={() => setStatusModalIncident(null)}
                className="px-4 py-2 border border-[#E5E5E5] rounded-lg text-xs font-semibold text-[#374151] hover:bg-[#F4F4F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingStatus}
                onClick={handleSubmitStatusUpdate}
                className="px-5 py-2 bg-[#18181B] hover:bg-[#27272A] disabled:opacity-50 text-[#FFFFFF] rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 shadow-2xs"
              >
                {isSubmittingStatus ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save & Notify Resident</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
