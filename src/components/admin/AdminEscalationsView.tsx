import React, { useState, useEffect } from 'react';
import {
  AlertOctagon, Clock, AlertTriangle, Building2,
  RefreshCw, CheckCircle2, ShieldAlert, ArrowRight,
  Send, Users, MapPin, Wrench
} from 'lucide-react';

interface AdminEscalationsViewProps {
  token: string;
  onNavigateToIncident?: (id: string) => void;
}

export const AdminEscalationsView: React.FC<AdminEscalationsViewProps> = ({ token }) => {
  const [escalations, setEscalations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);

  const fetchEscalations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/admin/escalations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEscalations(data.escalations || []);
      }

      const dRes = await fetch('/api/v1/admin/departments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (dRes.ok) {
        const dData = await dRes.json();
        setDepartments(dData.departments || []);
      }
    } catch (err) {
      console.error('Failed to load escalations', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEscalations();
  }, [token]);

  const handleNotifySupervisor = (incidentId: string, deptName: string) => {
    setNotificationStatus(`Emergency alert dispatched to ${deptName} Department Supervisor for Incident #${incidentId.slice(0, 8)}`);
    setTimeout(() => setNotificationStatus(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] p-5 rounded-lg shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#DC2626] text-xs font-mono font-bold uppercase mb-1">
            <AlertOctagon className="w-4 h-4" />
            <span>MUNICIPAL ESCALATION CENTER</span>
          </div>
          <h2 className="text-lg font-bold text-[#111111]">
            High-Priority Governance & Administrative Intervention
          </h2>
          <p className="text-xs text-[#666666] mt-0.5">
            Incidents flagged for urgent attention: P1 critical emergencies, active SLA breaches, and citizen-reopened cases requiring direct intervention.
          </p>
        </div>

        <button
          onClick={fetchEscalations}
          disabled={isLoading}
          className="px-3 py-1.5 bg-[#FAFAFA] hover:bg-[#F0F0F0] border border-[#E5E5E5] text-[#111111] text-xs font-semibold rounded-md flex items-center space-x-1.5 transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {notificationStatus && (
        <div className="p-3 bg-[#EFF6FF] border border-[#93C5FD] text-[#1E40AF] rounded-lg text-xs flex items-center justify-between shadow-xs">
          <span>{notificationStatus}</span>
          <button onClick={() => setNotificationStatus(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* Escalation Queue Cards */}
      <div className="space-y-4">
        {escalations.map((item: any) => {
          const isCritical = item.priority === 'P1_CRITICAL';
          const isBreached = item.is_sla_breached === 1;
          const isReopened = !!item.reopened_reason;

          return (
            <div
              key={item.id}
              className={`p-5 rounded-lg border transition-all ${
                isCritical
                  ? 'bg-[#FEF2F2] border-[#FCA5A5]'
                  : 'bg-[#FFFFFF] border-[#E5E5E5]'
              } shadow-xs space-y-3.5`}
            >
              {/* Card Top Line */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#111111] text-[#FFFFFF] rounded">
                    {item.id}
                  </span>

                  {isCritical && (
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#DC2626] text-[#FFFFFF] rounded flex items-center space-x-1">
                      <AlertOctagon className="w-3 h-3" />
                      <span>P1 EMERGENCY</span>
                    </span>
                  )}

                  {isBreached && (
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#FEF3C7] text-[#92400E] rounded border border-[#FDE68A] flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>SLA DEADLINE BREACHED</span>
                    </span>
                  )}

                  {isReopened && (
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#F3E8FF] text-[#6B21A8] rounded border border-[#E9D5FF] flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>CITIZEN REOPENED</span>
                    </span>
                  )}
                </div>

                <div className="text-[11px] font-mono text-[#8A8A8A]">
                  Filed: {new Date(item.created_at).toLocaleDateString()}
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="text-sm font-bold text-[#111111]">
                  {item.title}
                </h3>
                <div className="text-xs text-[#666666] flex items-center space-x-2 mt-1">
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-[#8A8A8A]" />
                    <span>{item.address} ({item.ward_code || 'Ward 04'})</span>
                  </span>
                  <span>&bull;</span>
                  <span className="font-semibold text-[#111111]">
                    {item.department_name || item.department_code || 'Unassigned Department'}
                  </span>
                </div>
                <p className="text-xs text-[#333333] mt-2 leading-relaxed bg-[#FFFFFF]/80 p-2.5 rounded border border-[#E5E5E5]/60">
                  {item.description}
                </p>
                {isReopened && item.reopened_reason && (
                  <div className="mt-2 text-xs text-[#6B21A8] bg-[#FAF5FF] p-2 rounded border border-[#E9D5FF]">
                    <strong>Citizen Reopen Reason:</strong> {item.reopened_reason}
                  </div>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="pt-2 border-t border-[#E5E5E5] flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleNotifySupervisor(item.id, item.department_name || 'Department')}
                    className="px-3 py-1.5 bg-[#111111] hover:bg-[#222222] text-[#FFFFFF] text-xs font-semibold rounded-md flex items-center space-x-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Alert Supervisor</span>
                  </button>
                  <button
                    onClick={() => handleNotifySupervisor(item.id, 'Rapid Emergency Reserve')}
                    className="px-3 py-1.5 bg-[#FAFAFA] hover:bg-[#F0F0F0] border border-[#E5E5E5] text-[#111111] text-xs font-semibold rounded-md flex items-center space-x-1.5 transition-colors"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Dispatch Emergency Crew</span>
                  </button>
                </div>

                <span className="text-[11px] font-mono text-[#666666]">
                  Status: <strong>{item.status}</strong>
                </span>
              </div>
            </div>
          );
        })}

        {escalations.length === 0 && (
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] p-10 rounded-lg text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[#16A34A] mx-auto" />
            <h3 className="text-sm font-bold text-[#111111]">Escalation Queue Clear</h3>
            <p className="text-xs text-[#666666] max-w-sm mx-auto">
              No incidents currently breach SLA thresholds or require urgent administrative intervention.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
