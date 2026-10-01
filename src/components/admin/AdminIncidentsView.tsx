import React, { useState, useEffect } from 'react';
import {
  Search, Filter, AlertOctagon, Clock, CheckCircle2,
  Building2, MapPin, ArrowRight, UserCheck, ShieldAlert,
  Calendar, RefreshCw, X, ChevronRight, AlertTriangle
} from 'lucide-react';

interface AdminIncidentsViewProps {
  token: string;
  onNavigate?: (tab: string) => void;
}

export const AdminIncidentsView: React.FC<AdminIncidentsViewProps> = ({ token }) => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [slaFilter, setSlaFilter] = useState('ALL');

  // Modals & Action States
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [reassignDeptId, setReassignDeptId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const fetchIncidents = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (departmentFilter !== 'ALL') params.append('departmentId', departmentFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter);
      if (slaFilter !== 'ALL') params.append('slaStatus', slaFilter);
      if (search) params.append('search', search);

      const res = await fetch(`/api/v1/admin/incidents?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.incidents || []);
      }
    } catch (err) {
      console.error('Failed to fetch incidents', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/v1/admin/departments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments || []);
      }
    } catch (err) {
      console.error('Failed to fetch departments', err);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [token]);

  useEffect(() => {
    fetchIncidents();
  }, [token, departmentFilter, statusFilter, priorityFilter, slaFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchIncidents();
  };

  const handleReassignDepartment = async () => {
    if (!selectedIncident || !reassignDeptId) return;
    try {
      const res = await fetch(`/api/v1/admin/incidents/${selectedIncident.id}/reassign-dept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          departmentId: reassignDeptId,
          reason: reassignReason || 'Administrative departmental reassignment'
        })
      });

      if (res.ok) {
        setActionSuccessMessage(`Incident reassigned to target department successfully.`);
        setIsReassignModalOpen(false);
        setReassignReason('');
        fetchIncidents();
        // Update selected incident state
        setSelectedIncident((prev: any) => ({
          ...prev,
          department_id: reassignDeptId,
          department_name: departments.find(d => d.id === reassignDeptId)?.name || reassignDeptId
        }));
      }
    } catch (err) {
      console.error('Failed to reassign', err);
    }
  };

  const handleEscalateIncident = async () => {
    if (!selectedIncident) return;
    try {
      const res = await fetch(`/api/v1/admin/incidents/${selectedIncident.id}/escalate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: escalateReason || 'Urgent public safety administrative escalation'
        })
      });

      if (res.ok) {
        setActionSuccessMessage(`Incident escalated to P1 Critical priority.`);
        setIsEscalateModalOpen(false);
        setEscalateReason('');
        fetchIncidents();
        setSelectedIncident((prev: any) => ({
          ...prev,
          priority: 'P1_CRITICAL',
          severity: 'CRITICAL'
        }));
      }
    } catch (err) {
      console.error('Failed to escalate', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Filter Bar */}
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] p-5 rounded-lg shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#111111]">
              City-Wide Incident Oversight & Dispatch
            </h2>
            <p className="text-xs text-[#666666]">
              Authorized administrative search, multi-department monitoring, reassignment, and escalation controls.
            </p>
          </div>

          <button
            id="admin-btn-refresh-incidents"
            onClick={fetchIncidents}
            disabled={isLoading}
            className="px-3 py-1.5 bg-[#FAFAFA] hover:bg-[#F0F0F0] border border-[#E5E5E5] text-[#111111] text-xs font-semibold rounded-md flex items-center space-x-1.5 transition-colors self-start md:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Incidents</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2 border-t border-[#F0F0F0]">
          {/* Keyword Search */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-3.5 h-3.5 text-[#8A8A8A] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search title, address, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111] placeholder-[#8A8A8A] focus:outline-none focus:border-[#111111]"
            />
          </form>

          {/* Department Filter */}
          <div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
            >
              <option value="ALL">All Statuses</option>
              <option value="REPORTED">Reported</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved (Pending Verification)</option>
              <option value="VERIFIED">Verified</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
            >
              <option value="ALL">All Priorities</option>
              <option value="P1_CRITICAL">P1 - Critical Safety</option>
              <option value="P2_HIGH">P2 - High Priority</option>
              <option value="P3_STANDARD">P3 - Standard</option>
              <option value="P4_LOW">P4 - Low Priority</option>
            </select>
          </div>

          {/* SLA Filter */}
          <div>
            <select
              value={slaFilter}
              onChange={(e) => setSlaFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
            >
              <option value="ALL">All SLA Statuses</option>
              <option value="at_risk">SLA At Risk (&lt;6h)</option>
              <option value="breached">SLA Breached</option>
              <option value="on_track">SLA On Track</option>
            </select>
          </div>
        </div>

        {actionSuccessMessage && (
          <div className="p-2.5 bg-[#DCFCE7] border border-[#86EFAC] text-[#166534] rounded text-xs flex items-center justify-between">
            <span>{actionSuccessMessage}</span>
            <button onClick={() => setActionSuccessMessage(null)} className="text-[#166534] font-bold">✕</button>
          </div>
        )}
      </div>

      {/* Incidents Table */}
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg shadow-xs overflow-hidden">
        <div className="p-3 bg-[#FAFAFA] border-b border-[#E5E5E5] flex items-center justify-between text-xs text-[#666666]">
          <span>Showing <strong className="text-[#111111] font-mono">{incidents.length}</strong> city-wide incidents</span>
          <span className="text-[11px] font-mono text-[#8A8A8A]">Click any row for administrative inspection</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[11px] font-mono uppercase text-[#666666]">
              <tr>
                <th className="py-3 px-4">Priority & ID</th>
                <th className="py-3 px-4">Title & Location</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned Team / Tech</th>
                <th className="py-3 px-4">SLA Deadline</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {incidents.map((inc: any) => {
                const isCritical = inc.priority === 'P1_CRITICAL';
                const isBreached = inc.is_sla_breached === 1;

                return (
                  <tr
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className="hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        {isCritical ? (
                          <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[#FEE2E2] text-[#DC2626] rounded border border-[#FCA5A5]">
                            P1
                          </span>
                        ) : inc.priority === 'P2_HIGH' ? (
                          <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[#FEF3C7] text-[#D97706] rounded border border-[#FDE68A]">
                            P2
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[10px] font-mono bg-[#F3F4F6] text-[#4B5563] rounded">
                            {inc.priority ? inc.priority.slice(0, 2) : 'P3'}
                          </span>
                        )}
                        <span className="font-mono text-[11px] text-[#8A8A8A]">{inc.id.slice(0, 10)}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#111111] max-w-xs truncate">{inc.title}</div>
                      <div className="text-[11px] text-[#666666] flex items-center space-x-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-[#8A8A8A] shrink-0" />
                        <span className="truncate">{inc.address || 'Downtown'}</span>
                        {inc.ward_code && (
                          <span className="font-mono text-[10px] text-[#8A8A8A] ml-1">({inc.ward_code})</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-[#F5F5F5] text-[#111111] rounded">
                        {inc.department_name || inc.department_code || 'Unassigned'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded ${
                        inc.status === 'VERIFIED' ? 'bg-[#DCFCE7] text-[#166534]' :
                        inc.status === 'IN_PROGRESS' ? 'bg-[#FEF3C7] text-[#92400E]' :
                        inc.status === 'RESOLVED' ? 'bg-[#E0E7FF] text-[#3730A3]' :
                        'bg-[#F3F4F6] text-[#374151]'
                      }`}>
                        {inc.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-[#404040]">
                      {inc.team_name ? inc.team_name : inc.worker_name ? inc.worker_name : (
                        <span className="text-[#8A8A8A]">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {isBreached ? (
                        <span className="text-[#DC2626] font-mono font-bold text-[11px] flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Breached</span>
                        </span>
                      ) : inc.sla_deadline ? (
                        <span className="text-[#666666] font-mono text-[11px]">
                          {new Date(inc.sla_deadline).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-[#8A8A8A] font-mono text-[11px]">&mdash;</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIncident(inc);
                        }}
                        className="px-2.5 py-1 bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#111111] font-semibold text-[11px] rounded transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
              {incidents.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#8A8A8A] text-xs font-mono">
                    No incidents matched the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incident Detail Drawer / Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#E5E5E5] pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#111111] text-[#FFFFFF] rounded">
                    {selectedIncident.id}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#F3F4F6] text-[#374151] rounded">
                    {selectedIncident.status}
                  </span>
                  {selectedIncident.priority === 'P1_CRITICAL' && (
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#FEE2E2] text-[#DC2626] rounded">
                      P1 CRITICAL
                    </span>
                  )}
                </div>
                <h2 className="text-base font-bold text-[#111111] mt-2">
                  {selectedIncident.title}
                </h2>
                <div className="text-xs text-[#666666] flex items-center space-x-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-[#8A8A8A]" />
                  <span>{selectedIncident.address} &bull; {selectedIncident.ward_code || 'Ward 04'}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedIncident(null)}
                className="p-1.5 text-[#8A8A8A] hover:text-[#111111] rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Incident Summary Information */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-[#FAFAFA] p-4 rounded-lg border border-[#E5E5E5]">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#8A8A8A] block">Department</span>
                <span className="font-semibold text-[#111111]">{selectedIncident.department_name || 'Unassigned'}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-[#8A8A8A] block">Citizen Author</span>
                <span className="font-semibold text-[#111111]">{selectedIncident.citizen_name || 'Verified Citizen'}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-[#8A8A8A] block">Assigned Team</span>
                <span className="font-semibold text-[#111111]">{selectedIncident.team_name || 'Triage Queue'}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-[#8A8A8A] block">Created Date</span>
                <span className="font-semibold text-[#111111]">
                  {new Date(selectedIncident.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-mono font-bold uppercase text-[#666666] mb-1">Citizen Narrative</h4>
              <div className="p-3 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#333333] leading-relaxed">
                {selectedIncident.description}
              </div>
            </div>

            {/* Admin Action Buttons */}
            <div className="pt-3 border-t border-[#E5E5E5] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <button
                  id="admin-btn-reassign-dept"
                  onClick={() => setIsReassignModalOpen(true)}
                  className="px-3 py-2 bg-[#111111] hover:bg-[#222222] text-[#FFFFFF] text-xs font-semibold rounded-md flex items-center space-x-1.5 transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Reassign Department</span>
                </button>

                {selectedIncident.priority !== 'P1_CRITICAL' && (
                  <button
                    id="admin-btn-escalate-priority"
                    onClick={() => setIsEscalateModalOpen(true)}
                    className="px-3 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-[#FFFFFF] text-xs font-semibold rounded-md flex items-center space-x-1.5 transition-colors"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Escalate to P1 Critical</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedIncident(null)}
                className="px-3 py-2 border border-[#E5E5E5] hover:bg-[#F5F5F5] text-[#111111] text-xs font-semibold rounded-md transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modal: Reassign Department */}
      {isReassignModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-[#111111]">
              Reassign Incident to Department
            </h3>
            <p className="text-xs text-[#666666]">
              Transfer jurisdiction of incident <strong>{selectedIncident?.id}</strong>. This administrative action will be recorded in the system audit trail.
            </p>

            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Target Department</label>
              <select
                value={reassignDeptId}
                onChange={(e) => setReassignDeptId(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111] focus:outline-none focus:border-[#111111]"
              >
                <option value="">Select destination department...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Reason for Reassignment</label>
              <textarea
                rows={2}
                placeholder="e.g. Initial triage misclassification or cross-jurisdiction jurisdiction"
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                className="w-full p-2.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111] placeholder-[#8A8A8A] focus:outline-none focus:border-[#111111]"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E5E5E5]">
              <button
                onClick={() => setIsReassignModalOpen(false)}
                className="px-3 py-1.5 border border-[#E5E5E5] text-xs font-semibold rounded-md text-[#666666]"
              >
                Cancel
              </button>
              <button
                disabled={!reassignDeptId}
                onClick={handleReassignDepartment}
                className="px-3.5 py-1.5 bg-[#111111] text-[#FFFFFF] text-xs font-semibold rounded-md disabled:opacity-50"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modal: Escalate Priority */}
      {isEscalateModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-[#DC2626]">
              <AlertOctagon className="w-5 h-5" />
              <h3 className="text-sm font-bold">Escalate to P1 Critical Priority</h3>
            </div>
            <p className="text-xs text-[#666666]">
              This will elevate incident <strong>{selectedIncident?.id}</strong> to highest severity, dispatch priority alerts to department supervisors, and contract the SLA response deadline.
            </p>

            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Administrative Escalation Reason</label>
              <textarea
                rows={3}
                placeholder="e.g. Immediate public hazard, risk of arterial gridlock, or active contamination"
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                className="w-full p-2.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111] placeholder-[#8A8A8A] focus:outline-none focus:border-[#111111]"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E5E5E5]">
              <button
                onClick={() => setIsEscalateModalOpen(false)}
                className="px-3 py-1.5 border border-[#E5E5E5] text-xs font-semibold rounded-md text-[#666666]"
              >
                Cancel
              </button>
              <button
                onClick={handleEscalateIncident}
                className="px-3.5 py-1.5 bg-[#DC2626] text-[#FFFFFF] text-xs font-semibold rounded-md hover:bg-[#B91C1C]"
              >
                Confirm P1 Escalation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
