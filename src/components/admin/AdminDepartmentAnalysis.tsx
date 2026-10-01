import React, { useState, useEffect } from 'react';
import {
  Building2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  ChevronRight,
  TrendingUp,
  MapPin,
  ShieldAlert,
  Calendar,
  Layers,
  FileText
} from 'lucide-react';

interface DepartmentAnalysisProps {
  token: string;
  onNavigateToIncidents?: (deptId: string) => void;
}

export const AdminDepartmentAnalysis: React.FC<DepartmentAnalysisProps> = ({
  token,
  onNavigateToIncidents
}) => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [selectedAnalysis, setSelectedAnalysis] = useState<any | null>(null);
  const [comparisons, setComparisons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async (deptId: string = 'ALL') => {
    setIsLoading(true);
    setError(null);
    try {
      const url = `/api/v1/admin/department-analysis?departmentId=${encodeURIComponent(deptId)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Failed to load department analysis');
      }
      const data = await res.json();
      setDepartments(data.departments || []);
      setSelectedAnalysis(data.selectedDepartment || null);
      setComparisons(data.comparisons || []);
    } catch (err: any) {
      console.error('[DeptAnalysis] Fetch error:', err);
      setError(err.message || 'Error fetching department analysis');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis(selectedDeptId);
  }, [token, selectedDeptId]);

  const filteredComparisons = comparisons.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E5E5] pb-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] bg-[#F5F5F5] px-2 py-0.5 rounded">
              Administrative Operations
            </span>
            <span className="text-[10px] font-mono text-[#8A8A8A]">
              20 Authorized Municipal Departments
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#111111]">
            Department Performance & Operational Analysis
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Factual analytics, incident velocity, SLA adherence, and citizen verification rates across municipal authorities.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchAnalysis(selectedDeptId)}
            disabled={isLoading}
            className="px-3.5 py-2 bg-[#FFFFFF] hover:bg-[#F5F5F5] text-[#111111] border border-[#E5E5E5] rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Department Selector Strip */}
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-[#111111]" />
            <span className="font-bold text-[#111111]">Select Municipal Authority</span>
          </div>
          <span className="text-[#8A8A8A] text-[11px]">
            Displaying real-time database figures &bull; Zero simulated data
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          <div className="sm:col-span-2 md:col-span-3">
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full px-3 py-2 border border-[#E5E5E5] rounded-lg text-xs bg-[#FFFFFF] font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8A8A8A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter departments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-[#E5E5E5] rounded-lg text-xs bg-[#FFFFFF] focus:outline-none focus:border-[#111111]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Selected Department Overview */}
      {selectedAnalysis && (
        <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl shadow-2xs overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-[#E5E5E5] bg-[#FAFAFA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-[#8A8A8A] uppercase">
                  {selectedAnalysis.code}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#111111] text-[#FFFFFF] font-semibold">
                  Department Operational View
                </span>
              </div>
              <h2 className="text-lg font-bold text-[#111111] mt-1">
                {selectedAnalysis.name}
              </h2>
            </div>

            {onNavigateToIncidents && (
              <button
                onClick={() => onNavigateToIncidents(selectedAnalysis.id)}
                className="px-3.5 py-1.5 bg-[#111111] hover:bg-[#222222] text-[#FFFFFF] rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0"
              >
                <span>View Incident Ledger</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Factual Data Check: If no incidents, show No Data Available */}
          {!selectedAnalysis.hasData ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#F5F5F5] border border-[#E5E5E5] flex items-center justify-center text-[#8A8A8A]">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#111111]">No data available</h3>
              <p className="text-xs text-[#666666] max-w-sm mx-auto">
                No civic incident reports have been routed or registered under this department in the database.
              </p>
            </div>
          ) : (
            <div className="p-5 sm:p-6 space-y-6">
              {/* 14 Operational Metrics Grid */}
              <div>
                <div className="text-[11px] font-mono uppercase font-bold text-[#666666] tracking-wider mb-3">
                  Department Key Metrics (14 Operational Dimensions)
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                  {/* 1. Total Reports */}
                  <div className="p-3.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-[#8A8A8A] block truncate">
                      Total Reports
                    </span>
                    <div className="text-xl font-bold font-mono text-[#111111]">
                      {selectedAnalysis.metrics.totalReports}
                    </div>
                  </div>

                  {/* 2. Active Reports */}
                  <div className="p-3.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-[#8A8A8A] block truncate">
                      Active Reports
                    </span>
                    <div className="text-xl font-bold font-mono text-[#111111]">
                      {selectedAnalysis.metrics.activeReports}
                    </div>
                  </div>

                  {/* 3. High Priority Reports */}
                  <div className="p-3.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-[#D97706] block truncate">
                      High Priority
                    </span>
                    <div className="text-xl font-bold font-mono text-[#D97706]">
                      {selectedAnalysis.metrics.highPriorityReports}
                    </div>
                  </div>

                  {/* 4. Critical Reports */}
                  <div className="p-3.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-[#DC2626] block truncate">
                      Critical Reports
                    </span>
                    <div className="text-xl font-bold font-mono text-[#DC2626]">
                      {selectedAnalysis.metrics.criticalReports}
                    </div>
                  </div>

                  {/* 5. In Progress */}
                  <div className="p-3.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-[#2563EB] block truncate">
                      In Progress
                    </span>
                    <div className="text-xl font-bold font-mono text-[#2563EB]">
                      {selectedAnalysis.metrics.inProgressReports}
                    </div>
                  </div>

                  {/* 6. Completed Reports */}
                  <div className="p-3.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-[#16A34A] block truncate">
                      Completed
                    </span>
                    <div className="text-xl font-bold font-mono text-[#16A34A]">
                      {selectedAnalysis.metrics.completedReports}
                    </div>
                  </div>

                  {/* 7. Awaiting Verification */}
                  <div className="p-3.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-[#666666] block truncate">
                      Awaiting Verify
                    </span>
                    <div className="text-xl font-bold font-mono text-[#111111]">
                      {selectedAnalysis.metrics.awaitingVerification}
                    </div>
                  </div>

                  {/* 8. Verified Reports */}
                  <div className="p-3.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-[#16A34A] block truncate">
                      Verified
                    </span>
                    <div className="text-xl font-bold font-mono text-[#16A34A]">
                      {selectedAnalysis.metrics.verifiedReports}
                    </div>
                  </div>

                  {/* 9. Reopened Reports */}
                  <div className="p-3.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-[#DC2626] block truncate">
                      Reopened
                    </span>
                    <div className="text-xl font-bold font-mono text-[#DC2626]">
                      {selectedAnalysis.metrics.reopenedReports}
                    </div>
                  </div>

                  {/* 10. Avg Resolution Time */}
                  <div className="p-3.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-[#8A8A8A] block truncate">
                      Avg Resolution
                    </span>
                    <div className="text-xl font-bold font-mono text-[#111111]">
                      {selectedAnalysis.metrics.averageResolutionTimeHours !== null
                        ? `${selectedAnalysis.metrics.averageResolutionTimeHours}h`
                        : 'N/A'}
                    </div>
                  </div>

                  {/* 11. SLA At Risk */}
                  <div className="p-3.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-[#D97706] block truncate">
                      SLA At Risk
                    </span>
                    <div className="text-xl font-bold font-mono text-[#D97706]">
                      {selectedAnalysis.metrics.slaAtRisk}
                    </div>
                  </div>

                  {/* 12. SLA Breached */}
                  <div className="p-3.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-[#DC2626] block truncate">
                      SLA Breached
                    </span>
                    <div className="text-xl font-bold font-mono text-[#DC2626]">
                      {selectedAnalysis.metrics.slaBreached}
                    </div>
                  </div>

                  {/* 13. Citizen Verification Rate */}
                  <div className="p-3.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-[#16A34A] block truncate">
                      Citizen Verify Rate
                    </span>
                    <div className="text-xl font-bold font-mono text-[#16A34A]">
                      {selectedAnalysis.metrics.citizenVerificationRate !== null
                        ? `${selectedAnalysis.metrics.citizenVerificationRate}%`
                        : 'N/A'}
                    </div>
                  </div>

                  {/* 14. Completion Verification Rate */}
                  <div className="p-3.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-[#111111] block truncate">
                      Evidence Proof Rate
                    </span>
                    <div className="text-xl font-bold font-mono text-[#111111]">
                      {selectedAnalysis.metrics.completionVerificationRate !== null
                        ? `${selectedAnalysis.metrics.completionVerificationRate}%`
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Breakdown Distributions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* Status Breakdown */}
                <div className="p-4 border border-[#E5E5E5] rounded-lg space-y-3 bg-[#FFFFFF]">
                  <div className="font-semibold text-xs text-[#111111] flex items-center justify-between">
                    <span>Status Distribution</span>
                    <span className="text-[10px] font-mono text-[#8A8A8A]">
                      {selectedAnalysis.distributions.status.length} States
                    </span>
                  </div>
                  <div className="space-y-2">
                    {selectedAnalysis.distributions.status.map((item: any) => {
                      const pct = Math.round((item.count / selectedAnalysis.metrics.totalReports) * 100);
                      return (
                        <div key={item.status} className="text-xs space-y-1">
                          <div className="flex justify-between text-[#666666]">
                            <span className="font-mono text-[11px]">{item.status.replace(/_/g, ' ')}</span>
                            <span className="font-semibold text-[#111111]">{item.count} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#F5F5F5] rounded-full overflow-hidden">
                            <div className="h-full bg-[#111111]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Severity Breakdown */}
                <div className="p-4 border border-[#E5E5E5] rounded-lg space-y-3 bg-[#FFFFFF]">
                  <div className="font-semibold text-xs text-[#111111] flex items-center justify-between">
                    <span>Severity Distribution</span>
                    <span className="text-[10px] font-mono text-[#8A8A8A]">Triage Severity</span>
                  </div>
                  <div className="space-y-2">
                    {selectedAnalysis.distributions.severity.map((item: any) => {
                      const pct = Math.round((item.count / selectedAnalysis.metrics.totalReports) * 100);
                      const barColor =
                        item.severity === 'CRITICAL'
                          ? 'bg-[#DC2626]'
                          : item.severity === 'HIGH'
                          ? 'bg-[#D97706]'
                          : item.severity === 'MEDIUM'
                          ? 'bg-[#2563EB]'
                          : 'bg-[#6B7280]';
                      return (
                        <div key={item.severity} className="text-xs space-y-1">
                          <div className="flex justify-between text-[#666666]">
                            <span className="font-mono text-[11px]">{item.severity}</span>
                            <span className="font-semibold text-[#111111]">{item.count} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#F5F5F5] rounded-full overflow-hidden">
                            <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Geographic Ward Concentration */}
                <div className="p-4 border border-[#E5E5E5] rounded-lg space-y-3 bg-[#FFFFFF]">
                  <div className="font-semibold text-xs text-[#111111] flex items-center justify-between">
                    <span>Ward Concentration</span>
                    <span className="text-[10px] font-mono text-[#8A8A8A]">Top Wards</span>
                  </div>
                  <div className="space-y-2">
                    {selectedAnalysis.distributions.wards.map((item: any) => {
                      const pct = Math.round((item.count / selectedAnalysis.metrics.totalReports) * 100);
                      return (
                        <div key={item.ward} className="text-xs space-y-1">
                          <div className="flex justify-between text-[#666666]">
                            <span className="font-mono text-[11px]">{item.ward}</span>
                            <span className="font-semibold text-[#111111]">{item.count} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#F5F5F5] rounded-full overflow-hidden">
                            <div className="h-full bg-[#404040]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Factual 20-Department Comparison Table */}
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-[#E5E5E5] bg-[#FAFAFA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#111111]">
              Factual 20-Department Comparative Overview
            </h2>
            <p className="text-xs text-[#666666] mt-0.5">
              Direct operational volume and resolution metrics. No subjective scores, rankings, or ratings.
            </p>
          </div>
          <span className="text-[11px] font-mono text-[#8A8A8A]">
            Showing {filteredComparisons.length} of {departments.length} departments
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F5F5] border-b border-[#E5E5E5] text-[11px] font-mono uppercase text-[#666666]">
              <tr>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4 text-center">Reports</th>
                <th className="py-3 px-4 text-center">Active</th>
                <th className="py-3 px-4 text-center">Completed</th>
                <th className="py-3 px-4 text-center">Avg Resolution</th>
                <th className="py-3 px-4 text-center">Critical</th>
                <th className="py-3 px-4 text-center">SLA Breached</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {filteredComparisons.map((dept) => (
                <tr
                  key={dept.id}
                  className={`hover:bg-[#FAFAFA] transition-colors cursor-pointer ${
                    selectedDeptId === dept.id ? 'bg-[#F9FAFB] font-medium' : ''
                  }`}
                  onClick={() => setSelectedDeptId(dept.id)}
                >
                  <td className="py-3 px-4">
                    <div className="font-semibold text-xs text-[#111111]">
                      {dept.name}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-[#8A8A8A]">
                    {dept.code}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-semibold text-[#111111]">
                    {dept.hasData ? dept.totalReports : <span className="text-[#8A8A8A] font-normal">0</span>}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-[#666666]">
                    {dept.hasData ? dept.activeReports : <span className="text-[#8A8A8A]">0</span>}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-[#16A34A] font-semibold">
                    {dept.hasData ? dept.completedReports : <span className="text-[#8A8A8A] font-normal">0</span>}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-[#111111]">
                    {dept.hasData && dept.avgResolutionHours !== null
                      ? `${dept.avgResolutionHours}h`
                      : <span className="text-[#8A8A8A] font-normal">No data</span>}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-[#DC2626]">
                    {dept.hasData ? dept.criticalReports : <span className="text-[#8A8A8A]">0</span>}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-[#DC2626]">
                    {dept.hasData ? dept.slaBreached : <span className="text-[#8A8A8A]">0</span>}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDeptId(dept.id);
                      }}
                      className="px-2.5 py-1 text-xs border border-[#E5E5E5] hover:border-[#111111] hover:bg-[#111111] hover:text-[#FFFFFF] rounded-md transition-colors font-semibold"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
