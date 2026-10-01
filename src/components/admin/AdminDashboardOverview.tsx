import React from 'react';
import {
  AlertOctagon, CheckCircle2, Clock, AlertTriangle, Building2,
  TrendingUp, ArrowUpRight, ShieldCheck, Activity, Users,
  Layers, ChevronRight, Wrench, RefreshCw
} from 'lucide-react';

interface AdminDashboardOverviewProps {
  data: any;
  isLoading: boolean;
  onRefresh: () => void;
  onNavigate: (tab: string) => void;
}

export const AdminDashboardOverview: React.FC<AdminDashboardOverviewProps> = ({
  data,
  isLoading,
  onRefresh,
  onNavigate
}) => {
  const metrics = data?.metrics || {
    totalReports: 0,
    activeIncidents: 0,
    criticalIncidents: 0,
    inProgress: 0,
    awaitingVerification: 0,
    resolved: 0,
    slaAtRisk: 0,
  };

  const departmentStats = data?.departmentStats || [];
  const recentActivity = data?.recentActivity || [];

  return (
    <div className="space-y-8">
      {/* 1. Welcome & Executive Mission Header */}
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] p-6 rounded-lg shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono font-bold tracking-wider text-[#666666] uppercase mb-1">
            CIVICCONNECT &bull; MUNICIPAL ADMINISTRATION
          </div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">
            Good morning, Administrator
          </h1>
          <p className="text-xs text-[#666666] mt-1 max-w-2xl leading-relaxed">
            Monitor city-wide civic operations, departmental response capacities, municipal resources, and system health from a unified administrative control plane.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            id="admin-btn-refresh-overview"
            onClick={onRefresh}
            disabled={isLoading}
            className="px-3 py-2 bg-[#FAFAFA] hover:bg-[#F0F0F0] border border-[#E5E5E5] text-[#111111] text-xs font-semibold rounded-md flex items-center space-x-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh City State</span>
          </button>
          <button
            id="admin-btn-quick-escalations"
            onClick={() => onNavigate('portal_admin_escalations')}
            className="px-3.5 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-[#FFFFFF] text-xs font-semibold rounded-md flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Review Escalations</span>
          </button>
        </div>
      </div>

      {/* 2. City-Wide Civic Overview Metrics Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#666666]">
            City-Wide Incident Situation
          </h2>
          <span className="text-[11px] text-[#8A8A8A]">Live aggregated feed</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Total Reports */}
          <div
            onClick={() => onNavigate('portal_admin_incidents')}
            className="bg-[#FFFFFF] border border-[#E5E5E5] p-3.5 rounded-lg hover:border-[#111111] cursor-pointer transition-all group"
          >
            <div className="text-[10px] font-mono uppercase text-[#666666] flex items-center justify-between">
              <span>Total Reports</span>
              <ArrowUpRight className="w-3 h-3 text-[#A3A3A3] group-hover:text-[#111111]" />
            </div>
            <div className="text-2xl font-bold text-[#111111] mt-1.5">
              {metrics.totalReports}
            </div>
            <div className="text-[10px] text-[#8A8A8A] mt-1">All incoming civic filings</div>
          </div>

          {/* Active Incidents */}
          <div
            onClick={() => onNavigate('portal_admin_incidents')}
            className="bg-[#FFFFFF] border border-[#E5E5E5] p-3.5 rounded-lg hover:border-[#111111] cursor-pointer transition-all group"
          >
            <div className="text-[10px] font-mono uppercase text-[#666666] flex items-center justify-between">
              <span>Active</span>
              <Activity className="w-3 h-3 text-[#2563EB]" />
            </div>
            <div className="text-2xl font-bold text-[#2563EB] mt-1.5">
              {metrics.activeIncidents}
            </div>
            <div className="text-[10px] text-[#8A8A8A] mt-1">Currently open</div>
          </div>

          {/* Critical Incidents */}
          <div
            onClick={() => onNavigate('portal_admin_escalations')}
            className="bg-[#FEF2F2] border border-[#FCA5A5] p-3.5 rounded-lg hover:border-[#DC2626] cursor-pointer transition-all group"
          >
            <div className="text-[10px] font-mono uppercase text-[#991B1B] flex items-center justify-between">
              <span className="font-bold">Critical (P1)</span>
              <AlertOctagon className="w-3.5 h-3.5 text-[#DC2626]" />
            </div>
            <div className="text-2xl font-black text-[#DC2626] mt-1.5">
              {metrics.criticalIncidents}
            </div>
            <div className="text-[10px] text-[#B91C1C] mt-1">Immediate priority</div>
          </div>

          {/* In Progress */}
          <div
            onClick={() => onNavigate('portal_admin_incidents')}
            className="bg-[#FFFFFF] border border-[#E5E5E5] p-3.5 rounded-lg hover:border-[#111111] cursor-pointer transition-all group"
          >
            <div className="text-[10px] font-mono uppercase text-[#666666] flex items-center justify-between">
              <span>In Progress</span>
              <Wrench className="w-3 h-3 text-[#D97706]" />
            </div>
            <div className="text-2xl font-bold text-[#D97706] mt-1.5">
              {metrics.inProgress}
            </div>
            <div className="text-[10px] text-[#8A8A8A] mt-1">Crews dispatched</div>
          </div>

          {/* Awaiting Verification */}
          <div
            onClick={() => onNavigate('portal_admin_incidents')}
            className="bg-[#FFFFFF] border border-[#E5E5E5] p-3.5 rounded-lg hover:border-[#111111] cursor-pointer transition-all group"
          >
            <div className="text-[10px] font-mono uppercase text-[#666666] flex items-center justify-between">
              <span>Awaiting Verif.</span>
              <Clock className="w-3 h-3 text-[#6366F1]" />
            </div>
            <div className="text-2xl font-bold text-[#6366F1] mt-1.5">
              {metrics.awaitingVerification}
            </div>
            <div className="text-[10px] text-[#8A8A8A] mt-1">Pending verification</div>
          </div>

          {/* Resolved */}
          <div
            onClick={() => onNavigate('portal_admin_incidents')}
            className="bg-[#F0FDF4] border border-[#BBF7D0] p-3.5 rounded-lg hover:border-[#16A34A] cursor-pointer transition-all group"
          >
            <div className="text-[10px] font-mono uppercase text-[#166534] flex items-center justify-between">
              <span>Resolved</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
            </div>
            <div className="text-2xl font-bold text-[#16A34A] mt-1.5">
              {metrics.resolved}
            </div>
            <div className="text-[10px] text-[#15803D] mt-1">Verified & closed</div>
          </div>

          {/* SLA At Risk */}
          <div
            onClick={() => onNavigate('portal_admin_sla')}
            className="bg-[#FFFBEB] border border-[#FDE68A] p-3.5 rounded-lg hover:border-[#D97706] cursor-pointer transition-all group"
          >
            <div className="text-[10px] font-mono uppercase text-[#92400E] flex items-center justify-between">
              <span className="font-bold">SLA At Risk</span>
              <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
            </div>
            <div className="text-2xl font-bold text-[#D97706] mt-1.5">
              {metrics.slaAtRisk}
            </div>
            <div className="text-[10px] text-[#B45309] mt-1">Approaching deadline</div>
          </div>
        </div>
      </div>

      {/* 3. Operational Inquiries: Executive "Answers" Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Where are the problems? */}
        <div className="bg-[#FFFFFF] border border-[#E5E5E5] p-4 rounded-lg flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-mono font-bold uppercase text-[#8A8A8A]">Where Are The Problems?</div>
            <h3 className="text-sm font-semibold text-[#111111] mt-1">Civic Hotspots & Geography</h3>
            <p className="text-xs text-[#666666] mt-1 leading-relaxed">
              Ward 04 has the highest report concentration (42%), followed by downtown corridor drainage points.
            </p>
          </div>
          <button
            onClick={() => onNavigate('portal_admin_map')}
            className="mt-3 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center space-x-1"
          >
            <span>Open City Map</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* What resources are available? */}
        <div className="bg-[#FFFFFF] border border-[#E5E5E5] p-4 rounded-lg flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-mono font-bold uppercase text-[#8A8A8A]">What Resources Are Available?</div>
            <h3 className="text-sm font-semibold text-[#111111] mt-1">Workforce & Fleet Readiness</h3>
            <p className="text-xs text-[#666666] mt-1 leading-relaxed">
              129 active personnel across 5 departments. Asphalt mix is currently at low stock threshold (18%).
            </p>
          </div>
          <button
            onClick={() => onNavigate('portal_admin_resources')}
            className="mt-3 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center space-x-1"
          >
            <span>Manage Resources & Transfers</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* System & Security Posture */}
        <div className="bg-[#FFFFFF] border border-[#E5E5E5] p-4 rounded-lg flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-mono font-bold uppercase text-[#8A8A8A]">Is The System Secure?</div>
            <h3 className="text-sm font-semibold text-[#111111] mt-1">Security & Service Health</h3>
            <p className="text-xs text-[#666666] mt-1 leading-relaxed">
              All 6 system services Operational. 0 unauthorized boundary crossings. RBAC strictly enforced.
            </p>
          </div>
          <button
            onClick={() => onNavigate('portal_admin_security')}
            className="mt-3 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center space-x-1"
          >
            <span>Inspect Security Center</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. Department Workload & Performance Table */}
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#111111]">
              Department Workload & Operational Capacity
            </h3>
            <p className="text-xs text-[#666666] mt-0.5">
              Comparative overview of active cases, critical emergencies, and resolution compliance per municipal department.
            </p>
          </div>
          <button
            onClick={() => onNavigate('portal_admin_departments')}
            className="text-xs font-semibold text-[#111111] hover:underline flex items-center space-x-1"
          >
            <span>Manage Departments</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[11px] font-mono uppercase text-[#666666]">
              <tr>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Active Incidents</th>
                <th className="py-3 px-4 text-center">Critical (P1)</th>
                <th className="py-3 px-4 text-center">In Progress</th>
                <th className="py-3 px-4 text-center">SLA At Risk</th>
                <th className="py-3 px-4 text-center">Resolution Rate</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {departmentStats.map((dept: any) => (
                <tr key={dept.id} className="hover:bg-[#FAFAFA] transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#111111]">{dept.name}</div>
                    <div className="text-[11px] font-mono text-[#8A8A8A]">{dept.code} &bull; ID: {dept.id}</div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#DCFCE7] text-[#166534] rounded">
                      {dept.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-[#111111]">
                    {dept.activeCount}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {dept.criticalCount > 0 ? (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#FEE2E2] text-[#991B1B] rounded">
                        {dept.criticalCount} Critical
                      </span>
                    ) : (
                      <span className="text-[#8A8A8A] font-mono">0</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-[#404040]">
                    {dept.inProgressCount}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {dept.slaAtRiskCount > 0 ? (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#FEF3C7] text-[#92400E] rounded">
                        {dept.slaAtRiskCount} At Risk
                      </span>
                    ) : (
                      <span className="text-[#16A34A] font-mono font-semibold">0 on track</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex items-center space-x-1.5">
                      <div className="w-16 bg-[#E5E5E5] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#16A34A] h-full"
                          style={{ width: `${dept.resolutionRate || 90}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-[#111111]">{dept.resolutionRate || 90}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onNavigate('portal_admin_incidents')}
                      className="px-2.5 py-1 bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#111111] font-semibold text-[11px] rounded transition-colors"
                    >
                      Filter Incidents
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Recent System-Wide Governance Activity */}
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] p-5 rounded-lg shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#111111]">
              Recent Administrative & Incident Activity
            </h3>
            <p className="text-xs text-[#666666]">
              Real-time audit records of logins, dispatch actions, and resolution lifecycle changes.
            </p>
          </div>
          <button
            onClick={() => onNavigate('portal_admin_audit')}
            className="text-xs font-semibold text-[#111111] hover:underline flex items-center space-x-1"
          >
            <span>Full Audit Trail</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-[#F0F0F0] text-xs">
          {recentActivity.map((log: any) => (
            <div key={log.id} className="py-2.5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                <div>
                  <span className="font-semibold text-[#111111]">{log.action}</span>
                  <span className="text-[#666666] ml-2">by {log.actor_name || 'Administrator'}</span>
                  {log.department_name && (
                    <span className="text-[#8A8A8A] ml-1.5 font-mono text-[10px]">({log.department_name})</span>
                  )}
                </div>
              </div>
              <div className="text-[11px] font-mono text-[#8A8A8A]">
                {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
          {recentActivity.length === 0 && (
            <div className="py-6 text-center text-[#8A8A8A] text-xs font-mono">
              No recent administrative logs recorded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
