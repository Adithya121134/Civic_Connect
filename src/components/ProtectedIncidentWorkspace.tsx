import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../lib/authService';
import {
  FileText,
  AlertTriangle,
  ShieldCheck,
  CheckCircle,
  Clock,
  Send,
  Upload,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Lock,
} from 'lucide-react';

interface MockIncident {
  id: string;
  trackingNumber: string;
  title: string;
  category: string;
  department: string;
  status: 'REPORTED' | 'TRIAGED' | 'ASSIGNED' | 'IN_PROGRESS' | 'WORK_REVIEW' | 'RESOLVED' | 'CLOSED';
  priority: 'P1_CRITICAL' | 'P2_HIGH' | 'P3_MEDIUM' | 'P4_LOW';
  authorCitizenEmail: string;
  assignedWorkerName?: string;
  resolutionProofUrl?: string;
  reopenedReason?: string;
}

const INITIAL_INCIDENTS: MockIncident[] = [
  {
    id: 'inc-001',
    trackingNumber: 'CIV-2026-0811',
    title: 'Severe Pothole damaging vehicles on Main St & 4th',
    category: 'ROADS_HAZARD',
    department: 'Department of Transportation & Roads',
    status: 'TRIAGED',
    priority: 'P2_HIGH',
    authorCitizenEmail: 'citizen.elena@gmail.com',
  },
  {
    id: 'inc-002',
    trackingNumber: 'CIV-2026-0842',
    title: 'Broken water main gushing near park entrance',
    category: 'WATER_UTILITY',
    department: 'Department of Water & Power',
    status: 'ASSIGNED',
    priority: 'P1_CRITICAL',
    authorCitizenEmail: 'citizen.elena@gmail.com',
    assignedWorkerName: 'Marcus Chen',
  },
  {
    id: 'inc-003',
    trackingNumber: 'CIV-2026-0790',
    title: 'Downed streetlight post blocking sidewalk',
    category: 'POWER_LIGHTING',
    department: 'Department of Transportation & Roads',
    status: 'WORK_REVIEW',
    priority: 'P3_MEDIUM',
    authorCitizenEmail: 'citizen.elena@gmail.com',
    assignedWorkerName: 'Marcus Chen',
    resolutionProofUrl: 'https://images.unsplash.com/photo-1584463699039-44585350912a?auto=format&fit=crop&w=600&q=80',
  },
];

export const ProtectedIncidentWorkspace: React.FC = () => {
  const { user, hasPermission, tokens, refreshAuditLogs } = useAuth();
  const [incidents, setIncidents] = useState<MockIncident[]>(INITIAL_INCIDENTS);
  const [actionNotice, setActionNotice] = useState<{ success: boolean; message: string } | null>(null);

  // New incident state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('ROADS_HAZARD');

  const executeProtectedAction = async (
    requiredPerm: Parameters<typeof hasPermission>[0],
    actionName: string,
    actionFn: () => void
  ) => {
    if (!tokens) {
      setActionNotice({ success: false, message: 'Unauthorized: No active JWT token found.' });
      return;
    }

    const authz = await authService.authorizeRequest(tokens.accessToken, requiredPerm, 'HUMAN_USER');
    refreshAuditLogs();

    if (!authz.authorized) {
      setActionNotice({
        success: false,
        message: `RBAC Interception (${authz.status}): You do not have '${requiredPerm}' permission. ${authz.message}`,
      });
      return;
    }

    actionFn();
    setActionNotice({
      success: true,
      message: `Action '${actionName}' executed successfully with authorization '${requiredPerm}'.`,
    });
  };

  // 1. Citizen creates incident
  const handleCreateIncident = () => {
    executeProtectedAction('incident:create', 'Create Incident', () => {
      const newInc: MockIncident = {
        id: 'inc-' + Math.random().toString(36).substring(2, 7),
        trackingNumber: 'CIV-2026-' + Math.floor(1000 + Math.random() * 9000),
        title: newTitle || 'Pavement obstruction reported by citizen',
        category: newCategory,
        department: 'Department of Transportation & Roads',
        status: 'REPORTED',
        priority: 'P3_MEDIUM',
        authorCitizenEmail: user?.email || 'citizen.elena@gmail.com',
      };
      setIncidents([newInc, ...incidents]);
      setNewTitle('');
    });
  };

  // 2. Officer assigns work
  const handleAssignWork = (incId: string) => {
    executeProtectedAction('incident:assign_work', 'Assign Work to Field Crew', () => {
      setIncidents((prev) =>
        prev.map((inc) =>
          inc.id === incId
            ? { ...inc, status: 'ASSIGNED', assignedWorkerName: 'Marcus Chen (WRK-5521)' }
            : inc
        )
      );
    });
  };

  // 3. Officer approves recommendations
  const handleApproveRec = (incId: string) => {
    executeProtectedAction('incident:approve_recommendations', 'Approve AI Recommendation', () => {
      setIncidents((prev) =>
        prev.map((inc) => (inc.id === incId ? { ...inc, status: 'TRIAGED' } : inc))
      );
    });
  };

  // 4. Worker updates progress & submits resolution evidence
  const handleWorkerProgress = (incId: string) => {
    executeProtectedAction('work:update_progress', 'Update Field Progress', () => {
      setIncidents((prev) =>
        prev.map((inc) => (inc.id === incId ? { ...inc, status: 'IN_PROGRESS' } : inc))
      );
    });
  };

  const handleWorkerSubmitEvidence = (incId: string) => {
    executeProtectedAction('work:submit_evidence', 'Submit Resolution Evidence', () => {
      setIncidents((prev) =>
        prev.map((inc) =>
          inc.id === incId
            ? {
                ...inc,
                status: 'WORK_REVIEW',
                resolutionProofUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=600&q=80',
              }
            : inc
        )
      );
    });
  };

  // 5. Citizen confirms resolution or requests reopen
  const handleCitizenConfirmResolution = (incId: string) => {
    executeProtectedAction('incident:confirm_resolution', 'Confirm Citizen Resolution', () => {
      setIncidents((prev) =>
        prev.map((inc) => (inc.id === incId ? { ...inc, status: 'RESOLVED' } : inc))
      );
    });
  };

  const handleCitizenReopen = (incId: string) => {
    executeProtectedAction('incident:request_reopen', 'Request Incident Reopening', () => {
      setIncidents((prev) =>
        prev.map((inc) =>
          inc.id === incId
            ? { ...inc, status: 'TRIAGED', reopenedReason: 'Citizen reported defect re-emerged within 48 hours.' }
            : inc
        )
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Protected Incident Lifecycle Routes</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Live Operations & Role-Gated Action Workspace
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Every button below represents an authoritative backend mutation protected by JWT authorization and RBAC claims. Attempting an action outside your active role will trigger an <strong>HTTP 403 Forbidden interception</strong>.
            </p>
          </div>

          <div className="bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 text-xs font-mono">
            <span className="text-slate-400 block">Current Persona:</span>
            <span className="text-emerald-400 font-bold">{user?.role || 'ANONYMOUS'}</span>
          </div>
        </div>
      </div>

      {actionNotice && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono flex items-center justify-between ${
            actionNotice.success
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-red-950/60 border-red-800 text-red-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {actionNotice.success ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Citizen Submission Box (Only Citizen should have permission) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Citizen Incident Submission (Requires incident:create)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">Role: CITIZEN</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Describe civic issue (e.g. Hazardous fallen tree limb obstructing crosswalk)..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex space-x-2">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 text-slate-200"
            >
              <option value="ROADS_HAZARD">ROADS_HAZARD</option>
              <option value="WATER_UTILITY">WATER_UTILITY</option>
              <option value="POWER_LIGHTING">POWER_LIGHTING</option>
              <option value="PARKS_SANITATION">PARKS_SANITATION</option>
            </select>
            <button
              onClick={handleCreateIncident}
              className="px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-xs transition cursor-pointer flex items-center space-x-1 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Incidents Interactive Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Municipal Incidents & Role-Specific Operational Controls ({incidents.length})
        </h3>

        <div className="space-y-4">
          {incidents.map((inc) => (
            <div
              key={inc.id}
              className="bg-slate-950 border border-slate-800/90 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-emerald-400">{inc.trackingNumber}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {inc.status}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                      inc.priority === 'P1_CRITICAL'
                        ? 'bg-red-950 text-red-300 border border-red-800'
                        : inc.priority === 'P2_HIGH'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-blue-950 text-blue-300 border border-blue-800'
                    }`}
                  >
                    {inc.priority}
                  </span>
                </div>
                <h4 className="font-semibold text-white text-sm">{inc.title}</h4>
                <div className="text-xs text-slate-400 flex items-center space-x-3">
                  <span>{inc.department}</span>
                  <span>&bull;</span>
                  <span>Reported by: {inc.authorCitizenEmail}</span>
                  {inc.assignedWorkerName && (
                    <>
                      <span>&bull;</span>
                      <span className="text-amber-300">Assigned: {inc.assignedWorkerName}</span>
                    </>
                  )}
                </div>
                {inc.reopenedReason && (
                  <p className="text-xs text-rose-300 bg-rose-950/30 p-1.5 rounded border border-rose-900/50 mt-1">
                    Reopen notice: {inc.reopenedReason}
                  </p>
                )}
              </div>

              {/* Action Buttons Matrix */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Authority Officer Actions */}
                <button
                  onClick={() => handleApproveRec(inc.id)}
                  title="Requires incident:approve_recommendations (Officer)"
                  className="px-2.5 py-1.5 bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800 rounded text-xs transition cursor-pointer flex items-center space-x-1"
                >
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  <span>Approve Rec (Officer)</span>
                </button>

                <button
                  onClick={() => handleAssignWork(inc.id)}
                  title="Requires incident:assign_work (Officer)"
                  className="px-2.5 py-1.5 bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800 rounded text-xs transition cursor-pointer flex items-center space-x-1"
                >
                  <span>Assign Crew (Officer)</span>
                </button>

                {/* Field Worker Actions */}
                <button
                  onClick={() => handleWorkerProgress(inc.id)}
                  title="Requires work:update_progress (Worker)"
                  className="px-2.5 py-1.5 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 rounded text-xs transition cursor-pointer flex items-center space-x-1"
                >
                  <span>Start Work (Worker)</span>
                </button>

                <button
                  onClick={() => handleWorkerSubmitEvidence(inc.id)}
                  title="Requires work:submit_evidence (Worker)"
                  className="px-2.5 py-1.5 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 rounded text-xs transition cursor-pointer flex items-center space-x-1"
                >
                  <Upload className="w-3 h-3 text-amber-400" />
                  <span>Submit Proof (Worker)</span>
                </button>

                {/* Citizen Reverification & Reopen Actions */}
                <button
                  onClick={() => handleCitizenConfirmResolution(inc.id)}
                  title="Requires incident:confirm_resolution (Citizen)"
                  className="px-2.5 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded text-xs transition cursor-pointer flex items-center space-x-1"
                >
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  <span>Confirm (Citizen)</span>
                </button>

                <button
                  onClick={() => handleCitizenReopen(inc.id)}
                  title="Requires incident:request_reopen (Citizen)"
                  className="px-2.5 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded text-xs transition cursor-pointer flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3 text-rose-400" />
                  <span>Reopen (Citizen)</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
