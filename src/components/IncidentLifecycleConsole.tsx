import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { incidentEngine } from '../lib/incidentManagementEngine';
import {
  CivicIncident,
  ControlledIncidentStatus,
  IncidentPriority,
  IncidentSeverity,
  AgentStructuredRecommendation,
  IncidentHistoryRecord,
} from '../types/incident';
import { INCIDENT_STATE_MACHINE } from '../lib/incidentStateMachine';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
  FileText,
  Tag,
  Share2,
  History,
  Bot,
  Plus,
  Send,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  Link,
  ChevronRight,
  RefreshCw,
  GitBranch,
} from 'lucide-react';

export const IncidentLifecycleConsole: React.FC = () => {
  const { user, tokens, refreshAuditLogs } = useAuth();
  const [incidents, setIncidents] = useState<CivicIncident[]>(incidentEngine.getAllIncidents());
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(
    incidents[0]?.id || 'inc-pothole-101'
  );

  // Status transition form state
  const [targetStatus, setTargetStatus] = useState<ControlledIncidentStatus>('IN_PROGRESS');
  const [transitionReason, setTransitionReason] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [resolutionUrl, setResolutionUrl] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [duplicateOfId, setDuplicateOfId] = useState('');

  // Relationship establish state
  const [relTargetId, setRelTargetId] = useState('');
  const [relType, setRelType] = useState<'DUPLICATE_OF' | 'PARENT_OF' | 'CHILD_OF'>('DUPLICATE_OF');

  // Agent Recommendation Simulator state
  const [agentConf, setAgentConf] = useState(0.88);
  const [agentProposedStatus, setAgentProposedStatus] = useState<ControlledIncidentStatus>('CLASSIFIED');
  const [agentReasoning, setAgentReasoning] = useState('Computer Vision detected road pothole with 88% spatial match.');

  // Notification state
  const [bannerNotice, setBannerNotice] = useState<{ success: boolean; message: string } | null>(null);

  // New incident modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createCategory, setCreateCategory] = useState('ROADS_HAZARD');
  const [createPriority, setCreatePriority] = useState<IncidentPriority>('P2_HIGH');
  const [createSeverity, setCreateSeverity] = useState<IncidentSeverity>('SEVERE');
  const [createLat, setCreateLat] = useState('37.7749');
  const [createLng, setCreateLng] = useState('-122.4194');
  const [createAddr, setCreateAddr] = useState('Market St & 5th St, Central District');

  const reloadData = () => {
    setIncidents(incidentEngine.getAllIncidents());
    refreshAuditLogs();
  };

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId) || incidents[0];
  const historyRecords = selectedIncident ? incidentEngine.getIncidentHistory(selectedIncident.id) : [];
  const currentRule = selectedIncident ? INCIDENT_STATE_MACHINE[selectedIncident.status] : null;

  // Handle Transition Submission
  const handleExecuteTransition = () => {
    if (!selectedIncident || !user) return;

    const correlationId = `corr-txn-${Date.now()}`;
    const result = incidentEngine.transitionStatus({
      incidentId: selectedIncident.id,
      targetStatus,
      actorType: user.role === 'ADMIN' ? 'ADMINISTRATOR' : user.role === 'AUTHORITY_OFFICER' ? 'AUTHORITY_OFFICER' : user.role === 'FIELD_WORKER' ? 'FIELD_WORKER' : 'CITIZEN',
      actorId: user.id,
      actorName: `${user.firstName} ${user.lastName}`,
      correlationId,
      source: 'WEB_UI',
      reason: transitionReason || `Manual transition to ${targetStatus}`,
      resolutionSummary: targetStatus === 'RESOLUTION_SUBMITTED' ? resolutionSummary || 'Completed work order' : undefined,
      resolutionEvidenceUrl: targetStatus === 'RESOLUTION_SUBMITTED' ? resolutionUrl || 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6' : undefined,
      reopenReason: targetStatus === 'REOPENED' ? reopenReason || 'Defect recurring' : undefined,
      duplicateOfId: targetStatus === 'DUPLICATE' ? duplicateOfId : undefined,
    });

    if (result.success) {
      setBannerNotice({
        success: true,
        message: `State transition to '${targetStatus}' successful. Audit record logged with correlation ID ${correlationId}.`,
      });
      setTransitionReason('');
      reloadData();
    } else {
      setBannerNotice({
        success: false,
        message: `Transition Rejected: ${result.error}`,
      });
    }
  };

  // Handle Agent Structured Recommendation Test
  const handleApplyAgentRecommendation = () => {
    if (!selectedIncident) return;

    const rec: AgentStructuredRecommendation = {
      recommendationId: `rec-${Date.now()}`,
      agentName: 'agent-triage-gemini-01',
      agentRole: 'TRIAGE_SPECIALIST',
      modelId: 'gemini-2.5-flash',
      confidence: agentConf,
      proposedStatusTransition: agentProposedStatus,
      proposedCategory: 'ROADS_HAZARD',
      proposedPriority: 'P1_CRITICAL',
      proposedSeverity: 'SEVERE',
      reasoning: agentReasoning,
      generatedAt: new Date().toISOString(),
    };

    const evalResult = incidentEngine.evaluateAndApplyAgentRecommendation(
      selectedIncident.id,
      rec,
      user?.role === 'AUTHORITY_OFFICER' || user?.role === 'ADMIN' ? user.id : undefined
    );

    if (evalResult.approved) {
      setBannerNotice({
        success: true,
        message: `Agent Recommendation Validated & Applied: ${evalResult.appliedTransitions.join(', ')}`,
      });
      reloadData();
    } else {
      setBannerNotice({
        success: false,
        message: `Agent Recommendation Blocked: ${evalResult.rejectionReason}`,
      });
    }
  };

  // Handle Relationship Establishment
  const handleLinkRelationship = () => {
    if (!selectedIncident || !relTargetId) return;

    const res = incidentEngine.establishRelationship({
      sourceIncidentId: selectedIncident.id,
      targetIncidentId: relTargetId,
      relationshipType: relType,
      confidenceScore: 0.95,
      establishedBy: user?.role === 'ADMIN' ? 'ADMINISTRATOR' : 'AUTHORITY_OFFICER',
      establishedById: user?.id,
      notes: `Linked via lifecycle console as ${relType}`,
      correlationId: `corr-rel-${Date.now()}`,
    });

    if (res.success) {
      setBannerNotice({
        success: true,
        message: `Relationship '${relType}' successfully established.`,
      });
      setRelTargetId('');
      reloadData();
    } else {
      setBannerNotice({
        success: false,
        message: `Failed to establish relationship: ${res.error}`,
      });
    }
  };

  // Handle Create Incident Modal Submit
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const res = incidentEngine.createIncident({
      title: createTitle,
      description: createDesc,
      category: createCategory,
      priority: createPriority,
      severity: createSeverity,
      latitude: parseFloat(createLat) || 37.7749,
      longitude: parseFloat(createLng) || -122.4194,
      address: createAddr,
      citizenAuthorId: user.id,
      citizenAuthorEmail: user.email,
      citizenAuthorName: `${user.firstName} ${user.lastName}`,
      actorType: 'CITIZEN',
      correlationId: `corr-new-${Date.now()}`,
    });

    if (res.success && res.incident) {
      setBannerNotice({
        success: true,
        message: `Incident ${res.incident.trackingNumber} successfully created in REPORTED state.`,
      });
      setIsCreateModalOpen(false);
      setCreateTitle('');
      setCreateDesc('');
      reloadData();
      setSelectedIncidentId(res.incident.id);
    } else {
      setBannerNotice({
        success: false,
        message: `Creation error: ${res.error}`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <Layers className="w-4 h-4" />
              <span>Deterministic Incident Lifecycle & State Machine Engine</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              CivicConnect Incident Management Console
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Implements the complete 17-state controlled lifecycle from <code className="text-emerald-300">REPORTED</code> through <code className="text-cyan-300">INVESTIGATING</code>, <code className="text-amber-300">IN_PROGRESS</code>, to <code className="text-purple-300">CLOSED</code>. AI agents produce recommendations that are strictly validated by backend state machine guards.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 py-2.5 rounded-lg transition flex items-center space-x-2 cursor-pointer shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Incident</span>
          </button>
        </div>
      </div>

      {bannerNotice && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono flex items-center justify-between ${
            bannerNotice.success
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-red-950/60 border-red-800 text-red-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {bannerNotice.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{bannerNotice.message}</span>
          </div>
          <button onClick={() => setBannerNotice(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Split View: Incident Queue vs Detail & Transitions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Incident List (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Incident Queue ({incidents.length})
            </span>
            <button
              onClick={reloadData}
              className="text-slate-400 hover:text-white text-xs flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {incidents.map((inc) => {
              const isSelected = inc.id === selectedIncidentId;
              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncidentId(inc.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    isSelected
                      ? 'bg-slate-800 border-emerald-500/80 shadow-md'
                      : 'bg-slate-950/80 border-slate-800/80 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      {inc.trackingNumber}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                        inc.status === 'REPORTED'
                          ? 'bg-slate-800 text-slate-300'
                          : inc.status === 'IN_PROGRESS'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : inc.status === 'CLOSED'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : inc.status === 'ESCALATED'
                          ? 'bg-red-950 text-red-300 border border-red-800'
                          : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}
                    >
                      {inc.status}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-white line-clamp-1">{inc.title}</h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
                    <span>{inc.category}</span>
                    <span className="text-cyan-400">{inc.priority}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Incident Operations (8 cols) */}
        {selectedIncident && (
          <div className="lg:col-span-8 space-y-6">
            {/* Incident Header Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4 mb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {selectedIncident.trackingNumber}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-slate-300">
                      {selectedIncident.category}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-950 border border-purple-800 font-mono text-purple-300">
                      Confidence: {(selectedIncident.confidenceScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">{selectedIncident.title}</h3>
                </div>

                <div className="text-right shrink-0 font-mono">
                  <div className="text-xs text-slate-400">Current Status:</div>
                  <div className="text-sm font-bold text-emerald-400">{selectedIncident.status}</div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4">{selectedIncident.description}</p>

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px]">PRIORITY</span>
                  <span className="text-amber-400 font-bold">{selectedIncident.priority}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">SEVERITY</span>
                  <span className="text-rose-400 font-bold">{selectedIncident.severity}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">DEPARTMENT</span>
                  <span className="text-blue-300 truncate block">{selectedIncident.departmentName || 'Unassigned'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">ASSIGNED CREW</span>
                  <span className="text-slate-200 truncate block">{selectedIncident.assignedWorkerName || selectedIncident.assignedTeamName || 'Unassigned'}</span>
                </div>
              </div>

              {/* Geospatial Location & Citizen Info */}
              <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono border-t border-slate-800/80 pt-3">
                <div className="flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {selectedIncident.location.address} ({selectedIncident.location.latitude.toFixed(4)},{' '}
                    {selectedIncident.location.longitude.toFixed(4)})
                  </span>
                </div>
                <div>
                  Reported by: <span className="text-slate-200">{selectedIncident.citizenAuthorName}</span>
                </div>
              </div>

              {/* Duplicate or Hierarchical Parent Notice */}
              {(selectedIncident.duplicateOfIncidentId || selectedIncident.parentIncidentId) && (
                <div className="mt-3 p-2.5 bg-blue-950/40 border border-blue-900 rounded-lg text-xs font-mono text-blue-300 flex items-center space-x-2">
                  <Link className="w-3.5 h-3.5" />
                  {selectedIncident.duplicateOfIncidentId && (
                    <span>Marked as DUPLICATE of Incident ID: {selectedIncident.duplicateOfIncidentId}</span>
                  )}
                  {selectedIncident.parentIncidentId && (
                    <span>Child of Parent Incident ID: {selectedIncident.parentIncidentId}</span>
                  )}
                </div>
              )}
            </div>

            {/* Controlled State Transition Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
                <GitBranch className="w-4 h-4" />
                <span>Deterministic State Transition Gate</span>
              </div>
              <h4 className="text-sm font-bold text-white">Execute State Machine Mutation</h4>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                The state machine allows target states based on current state <strong>'{selectedIncident.status}'</strong>.
                {currentRule && (
                  <span className="block text-slate-300 font-mono mt-1">
                    Allowed Targets: [{currentRule.allowedTargetStates.join(', ') || 'None (Terminal)'}]
                  </span>
                )}
              </p>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Target Status</label>
                    <select
                      value={targetStatus}
                      onChange={(e) => setTargetStatus(e.target.value as ControlledIncidentStatus)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                    >
                      <option value="PROCESSING">PROCESSING</option>
                      <option value="VALIDATING">VALIDATING</option>
                      <option value="VALIDATION_FAILED">VALIDATION_FAILED</option>
                      <option value="CLASSIFIED">CLASSIFIED</option>
                      <option value="INVESTIGATING">INVESTIGATING</option>
                      <option value="ROUTED">ROUTED</option>
                      <option value="ASSIGNED">ASSIGNED</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="ESCALATED">ESCALATED</option>
                      <option value="RESOLUTION_SUBMITTED">RESOLUTION_SUBMITTED</option>
                      <option value="VERIFYING">VERIFYING</option>
                      <option value="VERIFIED">VERIFIED</option>
                      <option value="CLOSED">CLOSED</option>
                      <option value="REOPENED">REOPENED</option>
                      <option value="DUPLICATE">DUPLICATE</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Audit Reason / Justification</label>
                    <input
                      type="text"
                      placeholder="e.g. Field inspection completed; dispatched asphalt crew"
                      value={transitionReason}
                      onChange={(e) => setTransitionReason(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                    />
                  </div>
                </div>

                {/* Conditional fields based on transition */}
                {targetStatus === 'RESOLUTION_SUBMITTED' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Resolution Summary</label>
                      <input
                        type="text"
                        placeholder="Description of repair completed"
                        value={resolutionSummary}
                        onChange={(e) => setResolutionSummary(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Proof Photo URL</label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={resolutionUrl}
                        onChange={(e) => setResolutionUrl(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200 text-xs"
                      />
                    </div>
                  </div>
                )}

                {targetStatus === 'DUPLICATE' && (
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <label className="block text-slate-300 font-medium mb-1">Primary Incident ID (Parent/Master)</label>
                    <input
                      type="text"
                      placeholder="e.g. inc-pothole-101"
                      value={duplicateOfId}
                      onChange={(e) => setDuplicateOfId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200 text-xs font-mono"
                    />
                  </div>
                )}

                {targetStatus === 'REOPENED' && (
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <label className="block text-slate-300 font-medium mb-1">Citizen Reopening Reason</label>
                    <input
                      type="text"
                      placeholder="e.g. Patch failed after heavy rainfall"
                      value={reopenReason}
                      onChange={(e) => setReopenReason(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200 text-xs"
                    />
                  </div>
                )}

                <button
                  onClick={handleExecuteTransition}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition cursor-pointer flex items-center justify-center space-x-1 mt-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Transition to State Machine</span>
                </button>
              </div>
            </div>

            {/* AI Agent Recommendation Simulator */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">
                <Bot className="w-4 h-4" />
                <span>AI Agent Recommendation & Backend Validation</span>
              </div>
              <h4 className="text-sm font-bold text-white">Simulate Agent Decision Support</h4>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Validates the architectural mandate: <strong>AI agents cannot directly alter database fields</strong>. Agents generate structured proposals which are submitted to backend validator gates.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Agent Model</label>
                  <input
                    type="text"
                    disabled
                    value="Gemini 2.5 Flash Structured Agent"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Proposed Status Transition</label>
                  <select
                    value={agentProposedStatus}
                    onChange={(e) => setAgentProposedStatus(e.target.value as ControlledIncidentStatus)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  >
                    <option value="PROCESSING">PROCESSING</option>
                    <option value="VALIDATING">VALIDATING</option>
                    <option value="CLASSIFIED">CLASSIFIED</option>
                    <option value="ROUTED">ROUTED</option>
                    <option value="DUPLICATE">DUPLICATE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Confidence Score ({agentConf.toFixed(2)})
                  </label>
                  <input
                    type="range"
                    min="0.4"
                    max="0.99"
                    step="0.01"
                    value={agentConf}
                    onChange={(e) => setAgentConf(parseFloat(e.target.value))}
                    className="w-full mt-2"
                  />
                </div>
              </div>

              <div className="mb-3 text-xs">
                <label className="block text-slate-300 font-medium mb-1">Structured Reasoning Chain</label>
                <input
                  type="text"
                  value={agentReasoning}
                  onChange={(e) => setAgentReasoning(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>

              <button
                onClick={handleApplyAgentRecommendation}
                className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg text-xs transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Submit Structured Agent Proposal to Backend</span>
              </button>
            </div>

            {/* Relationship Linking Tool */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1">
                <Share2 className="w-4 h-4" />
                <span>Incident Relationships & Deduplication Linker</span>
              </div>
              <h4 className="text-sm font-bold text-white">Link Related, Parent/Child, or Duplicate Incidents</h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mt-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Relationship Type</label>
                  <select
                    value={relType}
                    onChange={(e) => setRelType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  >
                    <option value="DUPLICATE_OF">DUPLICATE_OF</option>
                    <option value="PARENT_OF">PARENT_OF</option>
                    <option value="CHILD_OF">CHILD_OF</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-medium mb-1">Target Incident</label>
                  <select
                    value={relTargetId}
                    onChange={(e) => setRelTargetId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  >
                    <option value="">Select target incident...</option>
                    {incidents
                      .filter((i) => i.id !== selectedIncident.id)
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.trackingNumber} - {i.title}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleLinkRelationship}
                disabled={!relTargetId}
                className="mt-3 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-xs transition cursor-pointer disabled:opacity-40"
              >
                Establish Incident Relationship
              </button>
            </div>

            {/* Audit & Transition History Stream */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <History className="w-4 h-4" />
                  <span>Immutable Incident Lifecycle History ({historyRecords.length} Events)</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Append-Only Audit Ledger</span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto font-mono text-xs">
                {historyRecords.map((h) => (
                  <div
                    key={h.id}
                    className="p-2.5 bg-slate-950 rounded border border-slate-800 text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-emerald-400">{h.action}</span>
                        {h.previousValue !== null && h.previousValue !== undefined ? (
                          <span className="text-slate-400">
                            {String(h.previousValue)} &rarr;{' '}
                            <strong className="text-white">{String(h.newValue)}</strong>
                          </span>
                        ) : (
                          <strong className="text-white">{String(h.newValue)}</strong>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-purple-300">
                          Actor: {h.actorType}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">{h.reason}</div>
                    </div>
                    <div className="text-[10px] text-slate-500 text-right shrink-0">
                      <div>{new Date(h.timestamp).toLocaleTimeString()}</div>
                      <div className="text-[9px] text-slate-600 truncate max-w-[120px]">{h.correlationId}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE NEW INCIDENT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <h3 className="text-base font-bold text-white mb-1">Create Civic Observation Incident</h3>
            <p className="text-xs text-slate-400 mb-4">
              All new incidents enter the pipeline at the strict starting state: <code className="text-emerald-400">REPORTED</code>.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Incident Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hazardous subsidence fissure across pedestrian crosswalk"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Detailed Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide precise visual and contextual details for the incident..."
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category</label>
                  <select
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-200"
                  >
                    <option value="ROADS_HAZARD">ROADS_HAZARD</option>
                    <option value="WATER_UTILITY">WATER_UTILITY</option>
                    <option value="POWER_LIGHTING">POWER_LIGHTING</option>
                    <option value="PARKS_SANITATION">PARKS_SANITATION</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Priority</label>
                  <select
                    value={createPriority}
                    onChange={(e) => setCreatePriority(e.target.value as IncidentPriority)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-200 font-mono"
                  >
                    <option value="P1_CRITICAL">P1_CRITICAL</option>
                    <option value="P2_HIGH">P2_HIGH</option>
                    <option value="P3_MEDIUM">P3_MEDIUM</option>
                    <option value="P4_LOW">P4_LOW</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Severity</label>
                  <select
                    value={createSeverity}
                    onChange={(e) => setCreateSeverity(e.target.value as IncidentSeverity)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-200 font-mono"
                  >
                    <option value="CATASTROPHIC">CATASTROPHIC</option>
                    <option value="SEVERE">SEVERE</option>
                    <option value="MODERATE">MODERATE</option>
                    <option value="MINOR">MINOR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Address / Landmark</label>
                <input
                  type="text"
                  value={createAddr}
                  onChange={(e) => setCreateAddr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Latitude</label>
                  <input
                    type="text"
                    value={createLat}
                    onChange={(e) => setCreateLat(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Longitude</label>
                  <input
                    type="text"
                    value={createLng}
                    onChange={(e) => setCreateLng(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition"
                >
                  Create & Ingest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
