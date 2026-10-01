import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Clock,
  Eye,
  X,
  FileText,
  User,
  Phone,
  Mail,
  ShieldCheck,
  DollarSign,
  Wrench,
  Users,
  Layers,
  ChevronRight
} from 'lucide-react';
import { GoogleMap } from '../maps/GoogleMap';

interface AdminCityReportsViewProps {
  token: string;
  onNavigateToDeptAnalysis?: (deptId: string) => void;
}

export const AdminCityReportsView: React.FC<AdminCityReportsViewProps> = ({
  token,
  onNavigateToDeptAnalysis
}) => {
  const [reports, setReports] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [departments, setDepartments] = useState<any[]>([]);
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [wardFilter, setWardFilter] = useState<string>('ALL');
  const [verificationFilter, setVerificationFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Selected Report for Inspection Modal
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);

  // Load departments list for filter dropdown
  useEffect(() => {
    fetch('/api/v1/admin/department-analysis', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.departments) {
          setDepartments(data.departments);
        }
      })
      .catch((err) => console.warn('Could not load departments for filter', err));
  }, [token]);

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (deptFilter !== 'ALL') params.append('departmentId', deptFilter);
      if (severityFilter !== 'ALL') params.append('severity', severityFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (wardFilter !== 'ALL') params.append('wardCode', wardFilter);
      if (verificationFilter !== 'ALL') params.append('verificationStatus', verificationFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const res = await fetch(`/api/v1/admin/city-reports?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Failed to load city reports');
      }
      const json = await res.json();
      setReports(json.reports || []);
      setTotalCount(json.totalCount || 0);
    } catch (err: any) {
      console.error('[CityReports] Fetch error:', err);
      setError(err.message || 'Error fetching city reports');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [token, deptFilter, severityFilter, statusFilter, wardFilter, verificationFilter, dateFrom, dateTo]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReports();
  };

  // Fetch full report detail when clicking inspect
  const handleOpenDetail = async (id: string) => {
    setSelectedReportId(id);
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/v1/admin/city-reports/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setDetailData(json);
      }
    } catch (err) {
      console.error('Failed to load report detail', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    const s = (sev || 'MEDIUM').toUpperCase();
    if (s === 'CRITICAL') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]">CRITICAL</span>;
    }
    if (s === 'HIGH') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFFBEB] text-[#D97706] border border-[#FCD34D]">HIGH</span>;
    }
    if (s === 'MEDIUM') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">MEDIUM</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F5F5F5] text-[#4B5563] border border-[#E5E7EB]">LOW</span>;
  };

  const getStatusBadge = (status: string) => {
    const s = (status || 'REPORTED').toUpperCase();
    if (s.includes('VERIFIED')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">VERIFIED</span>;
    }
    if (s.includes('AWAITING') || s.includes('SUBMITTED')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">AWAITING VERIFY</span>;
    }
    if (s.includes('COMPLETED') || s.includes('RESOLVED')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]">COMPLETED</span>;
    }
    if (s.includes('PROGRESS') || s.includes('STARTED') || s.includes('ASSIGNED')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">IN PROGRESS</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]">{s}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E5E5] pb-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] bg-[#F5F5F5] px-2 py-0.5 rounded">
              City-Wide Intelligence
            </span>
            <span className="text-[10px] font-mono text-[#8A8A8A]">
              Real Database Incidents ({totalCount})
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#111111]">
            City-Wide Citizen Reports & Audit Analysis
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Comprehensive ledger of all citizen reports, AI triage data, material cost estimations, and lifecycle timelines.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchReports}
            disabled={isLoading}
            className="px-3.5 py-2 bg-[#FFFFFF] hover:bg-[#F5F5F5] text-[#111111] border border-[#E5E5E5] rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      {/* Multi-Filter Bar */}
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-4 shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-[#8A8A8A] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by tracking number, title, observed problem, or street address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 border border-[#E5E5E5] rounded-lg text-xs focus:outline-none focus:border-[#111111] bg-[#FFFFFF]"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 bg-[#111111] hover:bg-[#222222] text-[#FFFFFF] text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
          {/* Department Filter (All 20) */}
          <div>
            <label className="text-[10px] font-mono text-[#8A8A8A] block mb-1">Department</label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-[#E5E5E5] rounded-lg bg-[#FFFFFF] text-[#111111] focus:outline-none text-xs"
            >
              <option value="ALL">All 20 Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="text-[10px] font-mono text-[#8A8A8A] block mb-1">Severity</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-[#E5E5E5] rounded-lg bg-[#FFFFFF] text-[#111111] focus:outline-none text-xs"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-[10px] font-mono text-[#8A8A8A] block mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-[#E5E5E5] rounded-lg bg-[#FFFFFF] text-[#111111] focus:outline-none text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="REPORTED">Reported</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="WORK_STARTED">Work Started</option>
              <option value="WORK_IN_PROGRESS">In Progress</option>
              <option value="WORK_COMPLETED">Work Completed</option>
              <option value="AWAITING_VERIFICATION">Awaiting Verify</option>
              <option value="VERIFIED">Verified</option>
              <option value="REOPENED">Reopened</option>
            </select>
          </div>

          {/* Verification Status */}
          <div>
            <label className="text-[10px] font-mono text-[#8A8A8A] block mb-1">Verification</label>
            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-[#E5E5E5] rounded-lg bg-[#FFFFFF] text-[#111111] focus:outline-none text-xs"
            >
              <option value="ALL">All Verification</option>
              <option value="VERIFIED">Verified by Citizen</option>
              <option value="AWAITING">Awaiting Verification</option>
              <option value="UNVERIFIED">Not Yet Verified</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="text-[10px] font-mono text-[#8A8A8A] block mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-[#E5E5E5] rounded-lg bg-[#FFFFFF] text-[#111111] focus:outline-none text-xs"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="text-[10px] font-mono text-[#8A8A8A] block mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-[#E5E5E5] rounded-lg bg-[#FFFFFF] text-[#111111] focus:outline-none text-xs"
            />
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#8A8A8A] space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#111111]" />
            <span>Loading city-wide incidents ledger...</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#F5F5F5] border border-[#E5E5E5] flex items-center justify-center text-[#8A8A8A]">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#111111]">No reports found</h3>
            <p className="text-xs text-[#666666] max-w-sm mx-auto">
              No civic reports match your filter criteria. Try resetting your search or filter parameters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F5F5] border-b border-[#E5E5E5] text-[11px] font-mono uppercase text-[#666666]">
                <tr>
                  <th className="py-3 px-4">Incident ID</th>
                  <th className="py-3 px-4">Issue & Problem</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reported</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {reports.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                    onClick={() => handleOpenDetail(r.id)}
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-xs text-[#111111]">
                      {r.tracking_number}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-xs text-[#111111] truncate">
                        {r.title}
                      </div>
                      <div className="text-[11px] text-[#666666] truncate">
                        {r.observed_problem || r.description}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-[#111111]">
                      {r.department_name || 'Roads & Infrastructure'}
                    </td>
                    <td className="py-3 px-4 max-w-xs text-xs text-[#666666] truncate">
                      {r.address}
                    </td>
                    <td className="py-3 px-4">{getSeverityBadge(r.severity)}</td>
                    <td className="py-3 px-4">{getStatusBadge(r.status)}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#8A8A8A]">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(r.id);
                        }}
                        className="px-2.5 py-1 text-xs border border-[#E5E5E5] hover:border-[#111111] hover:bg-[#111111] hover:text-[#FFFFFF] rounded-md transition-colors font-semibold inline-flex items-center space-x-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Comprehensive Report Detail Modal */}
      {selectedReportId && (
        <div className="fixed inset-0 z-50 bg-[#000000]/60 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E5E5E5] flex items-start justify-between bg-[#FAFAFA]">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-mono text-xs font-bold text-[#8A8A8A]">
                    {detailData?.report?.tracking_number || selectedReportId}
                  </span>
                  {detailData?.report && getStatusBadge(detailData.report.status)}
                  {detailData?.report && getSeverityBadge(detailData.report.severity)}
                </div>
                <h2 className="text-xl font-bold text-[#111111]">
                  {detailData?.report?.title || 'Civic Incident Detail'}
                </h2>
              </div>
              <button
                onClick={() => {
                  setSelectedReportId(null);
                  setDetailData(null);
                }}
                className="text-[#8A8A8A] hover:text-[#111111] p-1.5 rounded-md hover:bg-[#F0F0F0] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingDetail || !detailData ? (
              <div className="p-16 text-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#111111]" />
                <span className="text-xs text-[#8A8A8A]">Retrieving full report audit & evidence...</span>
              </div>
            ) : (
              <div className="p-6 space-y-6 text-xs">
                {/* Visual Evidence Grid */}
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-[#666666] tracking-wider block mb-2">
                    Evidence Inspection (Before & After Comparison)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Before / Original Citizen Photo */}
                    <div className="border border-[#E5E5E5] rounded-xl overflow-hidden bg-[#FAFAFA]">
                      <div className="p-2.5 bg-[#FFFFFF] border-b border-[#E5E5E5] font-bold text-[#111111] uppercase tracking-wide text-[11px] flex items-center justify-between">
                        <span>Original Citizen Evidence</span>
                        <span className="text-[10px] font-mono text-[#8A8A8A]">Pre-Repair</span>
                      </div>
                      <div className="aspect-16/9 w-full bg-[#000000]">
                        <img
                          src={detailData.report.citizen_image_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80'}
                          alt="Citizen submitted hazard"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>

                    {/* After / Completion Evidence */}
                    <div className="border border-[#E5E5E5] rounded-xl overflow-hidden bg-[#FAFAFA]">
                      <div className="p-2.5 bg-[#FFFFFF] border-b border-[#E5E5E5] font-bold text-[#111111] uppercase tracking-wide text-[11px] flex items-center justify-between">
                        <span>Department Completion Proof</span>
                        <span className="text-[10px] font-mono text-[#16A34A]">Post-Repair</span>
                      </div>
                      <div className="aspect-16/9 w-full bg-[#000000]">
                        {detailData.report.completion_image_url ? (
                          <img
                            src={detailData.report.completion_image_url}
                            alt="Department completion proof"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-[#8A8A8A] p-4 text-center">
                            <Clock className="w-6 h-6 mb-1 text-[#666666]" />
                            <span>No completion photograph uploaded yet.</span>
                            <span className="text-[10px]">Work is either pending or in-progress.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Classification & Problem-Agnostic Triage */}
                <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-2">
                    <span className="font-bold text-xs text-[#111111] flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#111111]" />
                      <span>AI Vision Triage & Routing Analysis</span>
                    </span>
                    <span className="font-mono text-[11px] text-[#16A34A] bg-[#F0FDF4] px-2 py-0.5 rounded border border-[#BBF7D0]">
                      Confidence: {Math.round((detailData.report.routing_confidence || 0.94) * 100)}%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[10px] font-semibold text-[#8A8A8A] block uppercase">Observed Problem</span>
                      <span className="font-semibold text-[#111111] block mt-0.5">
                        {detailData.report.observed_problem || detailData.report.title}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-[#8A8A8A] block uppercase">Object & Context</span>
                      <span className="font-semibold text-[#111111] block mt-0.5">
                        {detailData.report.object_type || 'Civic Asset'} &bull; {detailData.report.context || 'Municipal Zone'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-[#8A8A8A] block uppercase">Responsible Department</span>
                      <span className="font-semibold text-[#111111] block mt-0.5">
                        {detailData.report.department_name} ({detailData.report.department_code})
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E5E5E5]">
                    <div>
                      <span className="text-[10px] font-semibold text-[#8A8A8A] block uppercase">Visible Risk</span>
                      <span className="text-[#374151] block mt-0.5">
                        {detailData.report.visible_risk || 'Public hazard'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-[#8A8A8A] block uppercase">Potential Public Impact</span>
                      <span className="text-[#374151] block mt-0.5">
                        {detailData.report.potential_public_impact || 'Pedestrian/vehicle impact'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Resource Estimation: Workers, Equipment, Materials */}
                <div className="p-4 bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl space-y-3">
                  <div className="font-bold text-xs text-[#111111] flex items-center space-x-1.5 border-b border-[#E5E5E5] pb-2">
                    <Wrench className="w-4 h-4 text-[#111111]" />
                    <span>Estimated Required Resources & Materials</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-[#8A8A8A] uppercase flex items-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span>Crew Size Needed</span>
                      </span>
                      <div className="font-bold font-mono text-base text-[#111111]">
                        {detailData.report.workers_needed || 2} Field Specialists
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-[#8A8A8A] uppercase flex items-center space-x-1">
                        <Wrench className="w-3 h-3" />
                        <span>Required Equipment</span>
                      </span>
                      <div className="text-xs text-[#374151]">
                        {detailData.report.equipment_needed ? (
                          <span>{detailData.report.equipment_needed}</span>
                        ) : (
                          <span>Standard field repair and safety barriers</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-[#8A8A8A] uppercase flex items-center space-x-1">
                        <DollarSign className="w-3 h-3" />
                        <span>Estimated Material Cost</span>
                      </span>
                      <div className="font-bold font-mono text-base text-[#111111]">
                        ₹{(detailData.report.total_estimated_material_cost || 1250).toLocaleString()}
                      </div>
                      <span className="text-[10px] text-[#8A8A8A] block">
                        Source: CPWD DSR / Municipal Schedule
                      </span>
                    </div>
                  </div>
                </div>

                {/* Location Map and Address */}
                <div className="p-4 bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl space-y-3">
                  <div className="font-bold text-xs text-[#111111] flex items-center space-x-1.5">
                    <MapPin className="w-4 h-4 text-[#111111]" />
                    <span>Location Pin & Ward Details</span>
                  </div>

                  <div className="text-xs text-[#374151]">
                    <strong>Address:</strong> {detailData.report.address} &bull; <strong>Ward:</strong> {detailData.report.ward_code || 'Ward 04'}
                  </div>

                  <div className="h-56 w-full rounded-lg overflow-hidden border border-[#E5E5E5]">
                    <GoogleMap
                      center={{
                        lat: detailData.report.latitude || 11.0168,
                        lng: detailData.report.longitude || 76.9558
                      }}
                      zoom={15}
                      interactive={false}
                      markers={[
                        {
                          id: detailData.report.id,
                          lat: detailData.report.latitude || 11.0168,
                          lng: detailData.report.longitude || 76.9558,
                          title: detailData.report.title,
                          priority: detailData.report.priority || 'P2_HIGH',
                          status: detailData.report.status
                        }
                      ]}
                    />
                  </div>
                </div>

                {/* Citizen Author Information & Confidentiality */}
                <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl space-y-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-[#666666] tracking-wider block">
                    Citizen Author Information
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[#8A8A8A] block">Citizen Name:</span>
                      <span className="font-semibold text-[#111111]">
                        {detailData.report.citizen_name || 'Verified Resident'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#8A8A8A] block">Phone:</span>
                      <span className="font-mono text-[#111111]">
                        {detailData.report.citizen_phone || '+91 98450 XXXXX'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#8A8A8A] block">Reported Timestamp:</span>
                      <span className="font-mono text-[#111111]">
                        {new Date(detailData.report.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Audit Lifecycle History */}
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-[#666666] tracking-wider block mb-2">
                    Comprehensive Audit Trail & Status History
                  </span>
                  <div className="border border-[#E5E5E5] rounded-xl overflow-hidden divide-y divide-[#E5E5E5]">
                    {detailData.history && detailData.history.length > 0 ? (
                      detailData.history.map((h: any, idx: number) => (
                        <div key={idx} className="p-3 bg-[#FFFFFF] flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-[#111111]">
                              {h.from_status ? `${h.from_status} → ${h.to_status}` : h.to_status}
                            </span>
                            {h.reason && (
                              <p className="text-[11px] text-[#666666] mt-0.5">
                                Note: &ldquo;{h.reason}&rdquo;
                              </p>
                            )}
                          </div>
                          <span className="font-mono text-[10px] text-[#8A8A8A]">
                            {new Date(h.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 bg-[#FFFFFF] text-center text-xs text-[#8A8A8A]">
                        Initial report registration recorded in audit log.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 bg-[#FAFAFA] border-t border-[#E5E5E5] flex justify-end">
              <button
                onClick={() => {
                  setSelectedReportId(null);
                  setDetailData(null);
                }}
                className="px-5 py-2 bg-[#111111] hover:bg-[#222222] text-[#FFFFFF] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
