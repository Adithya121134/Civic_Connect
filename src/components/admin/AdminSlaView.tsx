import React, { useState, useEffect } from 'react';
import {
  Clock, ShieldAlert, CheckCircle2, AlertTriangle,
  Building2, Plus, RefreshCw, Sliders
} from 'lucide-react';

interface AdminSlaViewProps {
  token: string;
}

export const AdminSlaView: React.FC<AdminSlaViewProps> = ({ token }) => {
  const [policies, setPolicies] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Edit / Create policy
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('P1_CRITICAL');
  const [responseTimeHours, setResponseTimeHours] = useState('2');
  const [resolutionTimeHours, setResolutionTimeHours] = useState('12');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fetchSlaData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/admin/sla', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPolicies(data.policies || []);
        setCompliance(data.compliance || null);
      }

      const dRes = await fetch('/api/v1/admin/departments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (dRes.ok) {
        const dData = await dRes.json();
        setDepartments(dData.departments || []);
        if (dData.departments?.length > 0 && !selectedDeptId) {
          setSelectedDeptId(dData.departments[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load SLA data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSlaData();
  }, [token]);

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/admin/sla-policies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          departmentId: selectedDeptId,
          priority: selectedPriority,
          responseTimeHours,
          resolutionTimeHours
        })
      });

      if (res.ok) {
        setSaveMessage('SLA Policy saved successfully.');
        setIsModalOpen(false);
        fetchSlaData();
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (err) {
      console.error('Failed to save SLA policy', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] p-5 rounded-lg shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#111111]">
            City-Wide SLA Governance & Escalation Policies
          </h2>
          <p className="text-xs text-[#666666] mt-0.5">
            Configure response and resolution thresholds by department and incident severity. Monitor real-time city compliance rates.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchSlaData}
            disabled={isLoading}
            className="px-3 py-1.5 bg-[#FAFAFA] hover:bg-[#F0F0F0] border border-[#E5E5E5] text-[#111111] text-xs font-semibold rounded-md flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 bg-[#111111] hover:bg-[#222222] text-[#FFFFFF] text-xs font-semibold rounded-md flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Configure Policy</span>
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className="p-3 bg-[#DCFCE7] border border-[#86EFAC] text-[#166534] rounded-lg text-xs font-medium">
          {saveMessage}
        </div>
      )}

      {/* Compliance Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] border border-[#E5E5E5] p-4 rounded-lg">
          <div className="text-[10px] font-mono uppercase text-[#666666]">City Compliance Rate</div>
          <div className="text-2xl font-black text-[#16A34A] mt-1">
            {compliance?.overallComplianceRate || 89}%
          </div>
          <div className="text-[10px] text-[#8A8A8A] mt-0.5">Within contract hours</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E5E5E5] p-4 rounded-lg">
          <div className="text-[10px] font-mono uppercase text-[#666666]">On Track</div>
          <div className="text-2xl font-bold text-[#111111] mt-1">
            {compliance?.onTrack || 0}
          </div>
          <div className="text-[10px] text-[#8A8A8A] mt-0.5">Healthy queue status</div>
        </div>

        <div className="bg-[#FFFBEB] border border-[#FDE68A] p-4 rounded-lg">
          <div className="text-[10px] font-mono uppercase text-[#92400E]">At Risk (&lt;6h)</div>
          <div className="text-2xl font-bold text-[#D97706] mt-1">
            {compliance?.atRisk || 0}
          </div>
          <div className="text-[10px] text-[#B45309] mt-0.5">Deadline approaching</div>
        </div>

        <div className="bg-[#FEF2F2] border border-[#FCA5A5] p-4 rounded-lg">
          <div className="text-[10px] font-mono uppercase text-[#991B1B]">Overdue Breached</div>
          <div className="text-2xl font-bold text-[#DC2626] mt-1">
            {compliance?.breached || 0}
          </div>
          <div className="text-[10px] text-[#B91C1C] mt-0.5">Exceeded SLA window</div>
        </div>
      </div>

      {/* SLA Policies Table */}
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E5E5E5]">
          <h3 className="text-sm font-bold text-[#111111]">
            Active Department SLA Policies
          </h3>
          <p className="text-xs text-[#666666] mt-0.5">
            Pre-configured maximum turnaround targets enforced across municipal departments.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[11px] font-mono uppercase text-[#666666]">
              <tr>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Priority Level</th>
                <th className="py-3 px-4 text-center">First Response SLA</th>
                <th className="py-3 px-4 text-center">Full Resolution SLA</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {policies.map((p: any) => (
                <tr key={p.id} className="hover:bg-[#FAFAFA]">
                  <td className="py-3 px-4 font-semibold text-[#111111]">
                    {p.department_name || p.department_code || 'General City'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                      p.priority === 'P1_CRITICAL' ? 'bg-[#FEE2E2] text-[#DC2626]' :
                      p.priority === 'P2_HIGH' ? 'bg-[#FEF3C7] text-[#D97706]' :
                      'bg-[#F3F4F6] text-[#374151]'
                    }`}>
                      {p.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-[#111111]">
                    {p.response_time_hours} hours
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-[#111111]">
                    {p.resolution_time_hours} hours
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedDeptId(p.department_id);
                        setSelectedPriority(p.priority);
                        setResponseTimeHours(String(p.response_time_hours));
                        setResolutionTimeHours(String(p.resolution_time_hours));
                        setIsModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#111111] font-semibold text-[11px] rounded transition-colors"
                    >
                      Adjust
                    </button>
                  </td>
                </tr>
              ))}
              {policies.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[#8A8A8A] text-xs font-mono">
                    No SLA policies configured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SLA Policy Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSavePolicy} className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-[#111111]">Configure SLA Threshold</h3>
            <p className="text-xs text-[#666666]">
              Set legal and operational targets for dispatch response and resolution verification.
            </p>

            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Department</label>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Priority Classification</label>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
              >
                <option value="P1_CRITICAL">P1 - Critical Safety Emergency</option>
                <option value="P2_HIGH">P2 - High Priority</option>
                <option value="P3_STANDARD">P3 - Standard Neighborhood Case</option>
                <option value="P4_LOW">P4 - Low / Cosmetic Maintenance</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">First Response (Hrs)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={responseTimeHours}
                  onChange={(e) => setResponseTimeHours(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">Full Resolution (Hrs)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={resolutionTimeHours}
                  onChange={(e) => setResolutionTimeHours(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E5E5E5]">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 border border-[#E5E5E5] text-xs font-semibold rounded-md text-[#666666]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-[#111111] text-[#FFFFFF] text-xs font-semibold rounded-md hover:bg-[#222222]"
              >
                Save SLA Rule
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
