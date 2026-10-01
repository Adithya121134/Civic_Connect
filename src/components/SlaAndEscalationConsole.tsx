import React, { useState, useEffect } from 'react';
import {
  slaEngine,
  DEPARTMENT_SLA_POLICIES,
} from '../lib/slaAndEscalationEngine';
import {
  IncidentSlaRecord,
  EscalationAuditEntry,
  SlaNotificationPayload,
  SlaMonitoringCycleReport,
  EscalationLevel,
} from '../types/slaAndEscalation';
import { incidentEngine } from '../lib/incidentManagementEngine';
import {
  Clock,
  AlertTriangle,
  Flame,
  ShieldCheck,
  ShieldAlert,
  Bell,
  RotateCcw,
  FastForward,
  Play,
  Square,
  Building,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Info,
  Calendar,
  Layers,
  ArrowUpRight,
  FileText,
} from 'lucide-react';

export const SlaAndEscalationConsole: React.FC = () => {
  const [slaRecords, setSlaRecords] = useState<IncidentSlaRecord[]>([]);
  const [escalations, setEscalations] = useState<EscalationAuditEntry[]>([]);
  const [notifications, setNotifications] = useState<SlaNotificationPayload[]>([]);
  const [reports, setReports] = useState<SlaMonitoringCycleReport[]>([]);
  const [isWorkerActive, setIsWorkerActive] = useState<boolean>(true);
  const [simOffsetHours, setSimOffsetHours] = useState<number>(0);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const refreshState = () => {
    setSlaRecords(slaEngine.getAllSlaRecords());
    setEscalations(slaEngine.getEscalationHistory());
    setNotifications(slaEngine.getNotifications());
    setReports(slaEngine.getMonitoringReports());
    setIsWorkerActive(slaEngine.isBackgroundWorkerActive());
    setSimOffsetHours(slaEngine.getSimulatedOffsetHours());
  };

  useEffect(() => {
    refreshState();
    const unsubscribe = slaEngine.subscribe(() => {
      refreshState();
    });
    return () => unsubscribe();
  }, []);

  const handleAdvanceTime = (hours: number) => {
    slaEngine.advanceTimeHours(hours);
    refreshState();
  };

  const handleResetTime = () => {
    slaEngine.resetTimeOffset();
    refreshState();
  };

  const handleToggleWorker = () => {
    if (isWorkerActive) {
      slaEngine.stopBackgroundWorker();
    } else {
      slaEngine.startBackgroundWorker(10000);
    }
    refreshState();
  };

  const handleManualSweep = () => {
    slaEngine.evaluateAllRecords();
    refreshState();
  };

  const handleSimulateStatus = (incidentId: string, status: any) => {
    incidentEngine.transitionStatus({
      incidentId,
      targetStatus: status,
      actorType: 'AUTHORITY_OFFICER',
      actorName: 'Console Operator',
      correlationId: `sim-trans-${Date.now()}`,
      source: 'WEB_UI',
      reason: `Operator testing state transition to ${status}`,
    });
    refreshState();
  };

  const handleMarkRead = (id: string) => {
    slaEngine.acknowledgeNotification(id);
    refreshState();
  };

  const selectedRecord = slaRecords.find((r) => r.id === selectedRecordId) || slaRecords[0];

  // Metrics summary
  const totalCount = slaRecords.length;
  const breachedCount = slaRecords.filter((r) => r.isBreached).length;
  const warningCount = slaRecords.filter((r) => r.trackingState === 'WARNING_APPROACHING').length;
  const healthyCount = slaRecords.filter((r) => r.trackingState === 'HEALTHY').length;
  const fulfilledCount = slaRecords.filter((r) => r.trackingState === 'FULFILLED' || r.trackingState === 'RESOLVED_LATE').length;

  const formatHours = (ms: number) => (ms / 3600000).toFixed(1);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
              <Clock className="w-4 h-4" />
              <span>Deterministic Backend SLA Engine</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              SLA Policy Enforcement & Escalation Ladder
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Deterministic, non-LLM deadline evaluations comparing system timestamps against department priority targets. Features background workers, warning thresholds, breach detection, and idempotent multi-tier escalations.
            </p>
          </div>

          {/* Time Machine & Background Worker Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleToggleWorker}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center space-x-1.5 border transition cursor-pointer ${
                isWorkerActive
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {isWorkerActive ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                  <span>Worker: ACTIVE (10s)</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-slate-400" />
                  <span>Worker: PAUSED</span>
                </>
              )}
            </button>

            <button
              onClick={handleManualSweep}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center space-x-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Run Sweep</span>
            </button>
          </div>
        </div>

        {/* Time Simulator Bar */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center space-x-2 text-slate-300">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Simulated Clock Offset:</span>
            <span className="text-amber-400 font-bold">
              +{simOffsetHours.toFixed(1)} Hours
            </span>
            <span className="text-slate-500 text-[11px]">
              (Current: {new Date(slaEngine.getCurrentTimeMs()).toLocaleTimeString()})
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 text-[11px] mr-1">Fast-forward:</span>
            <button
              onClick={() => handleAdvanceTime(2)}
              className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded text-slate-300 text-xs font-mono transition cursor-pointer flex items-center space-x-1"
            >
              <FastForward className="w-3 h-3 text-amber-400" />
              <span>+2h</span>
            </button>
            <button
              onClick={() => handleAdvanceTime(6)}
              className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded text-slate-300 text-xs font-mono transition cursor-pointer flex items-center space-x-1"
            >
              <FastForward className="w-3 h-3 text-amber-400" />
              <span>+6h</span>
            </button>
            <button
              onClick={() => handleAdvanceTime(24)}
              className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded text-slate-300 text-xs font-mono transition cursor-pointer flex items-center space-x-1"
            >
              <FastForward className="w-3 h-3 text-rose-400" />
              <span>+24h</span>
            </button>
            <button
              onClick={handleResetTime}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-slate-300 text-xs font-mono transition cursor-pointer flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-slate-500 block text-[10px] uppercase">TRACKED INCIDENTS</span>
          <span className="text-lg font-bold text-white mt-0.5 block">{totalCount}</span>
          <span className="text-[10px] text-slate-400">Total SLA monitored</span>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-slate-500 block text-[10px] uppercase">HEALTHY OPERATING</span>
          <span className="text-lg font-bold text-emerald-400 mt-0.5 block">{healthyCount}</span>
          <span className="text-[10px] text-slate-400">&lt; 75% elapsed window</span>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-slate-500 block text-[10px] uppercase">WARNING THRESHOLD</span>
          <span className="text-lg font-bold text-amber-400 mt-0.5 block">{warningCount}</span>
          <span className="text-[10px] text-slate-400">Alert issued to watch lead</span>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-slate-500 block text-[10px] uppercase">DEADLINE BREACHED</span>
          <span className="text-lg font-bold text-rose-400 mt-0.5 block">{breachedCount}</span>
          <span className="text-[10px] text-slate-400">Escalated to Division Chief</span>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl col-span-2 sm:col-span-1">
          <span className="text-slate-500 block text-[10px] uppercase">FULFILLED / RESOLVED</span>
          <span className="text-lg font-bold text-cyan-400 mt-0.5 block">{fulfilledCount}</span>
          <span className="text-[10px] text-slate-400">Clock halted</span>
        </div>
      </div>

      {/* Main Two-Column View: SLA Records Table (7 cols) + Inspector & Audit (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Real-Time SLA Monitor Table */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-white font-bold text-sm">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Active SLA Tracking Records</span>
              </div>
              <span className="text-xs font-mono text-slate-500">
                Live State Machine Sync
              </span>
            </div>

            {/* Records List */}
            <div className="space-y-3">
              {slaRecords.map((record) => {
                const isSelected = (selectedRecord?.id === record.id);
                const policy = DEPARTMENT_SLA_POLICIES[record.departmentId];

                let stateBadgeColor = 'bg-emerald-950 text-emerald-300 border-emerald-800';
                if (record.trackingState === 'WARNING_APPROACHING') {
                  stateBadgeColor = 'bg-amber-950 text-amber-300 border-amber-800 animate-pulse';
                } else if (record.trackingState === 'BREACHED') {
                  stateBadgeColor = 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse';
                } else if (record.trackingState === 'RESOLVED_LATE') {
                  stateBadgeColor = 'bg-purple-950 text-purple-300 border-purple-800';
                } else if (record.trackingState === 'FULFILLED') {
                  stateBadgeColor = 'bg-cyan-950 text-cyan-300 border-cyan-800';
                }

                return (
                  <div
                    key={record.id}
                    onClick={() => setSelectedRecordId(record.id)}
                    className={`p-4 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/90 border-amber-500/80 shadow-lg'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-white text-sm">
                            {record.trackingNumber}
                          </span>
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {record.priority}
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            {policy?.departmentCode || record.departmentId}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1 font-mono">
                          Status: <span className="text-slate-200">{record.status}</span> &bull; Target:{' '}
                          {formatHours(record.totalDurationMs)}h
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-block text-[11px] font-mono px-2.5 py-0.5 rounded-full border font-bold ${stateBadgeColor}`}
                        >
                          {record.trackingState.replace('_', ' ')}
                        </span>
                        <div className="text-[10px] font-mono text-slate-500 mt-1">
                          Escalation: {record.currentEscalationLevel.replace('LEVEL_', 'L')}
                        </div>
                      </div>
                    </div>

                    {/* Elapsed Progress Bar */}
                    <div className="mt-3 pt-2 border-t border-slate-850">
                      <div className="flex justify-between text-[11px] font-mono mb-1">
                        <span className="text-slate-400">
                          Elapsed: {formatHours(record.elapsedMs)}h / {formatHours(record.totalDurationMs)}h
                        </span>
                        <span
                          className={`font-bold ${
                            record.isBreached
                              ? 'text-rose-400'
                              : record.elapsedPercent >= 75
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {record.elapsedPercent}%
                        </span>
                      </div>

                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800 relative">
                        {/* 75% warning marker pin */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-amber-500/60 z-10"
                          style={{ left: '75%' }}
                          title="75% Warning Threshold"
                        />
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            record.isBreached
                              ? 'bg-rose-500'
                              : record.elapsedPercent >= 75
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, record.elapsedPercent)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Department Policies Matrix */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white flex items-center space-x-1.5">
                <Building className="w-4 h-4 text-cyan-400" />
                <span>Authoritative Department SLA Policies</span>
              </span>
              <span className="text-slate-500 text-[10px]">Deterministic Rulebook</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-1.5 pr-2">Dept</th>
                    <th className="py-1.5 pr-2">P1 Critical</th>
                    <th className="py-1.5 pr-2">P2 High</th>
                    <th className="py-1.5 pr-2">P3 Med</th>
                    <th className="py-1.5 pr-2">P4 Low</th>
                    <th className="py-1.5">Warn Threshold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {Object.values(DEPARTMENT_SLA_POLICIES).map((p) => (
                    <tr key={p.departmentId}>
                      <td className="py-2 pr-2 font-bold text-white">{p.departmentCode}</td>
                      <td className="py-2 pr-2 text-rose-400">{p.priorityTargetsHours.P1_CRITICAL}h</td>
                      <td className="py-2 pr-2 text-amber-400">{p.priorityTargetsHours.P2_HIGH}h</td>
                      <td className="py-2 pr-2 text-cyan-400">{p.priorityTargetsHours.P3_MEDIUM}h</td>
                      <td className="py-2 pr-2 text-emerald-400">{p.priorityTargetsHours.P4_LOW}h</td>
                      <td className="py-2 text-slate-400">{(p.warningThresholdPercent * 100).toFixed(0)}% duration</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Selected Record Inspector, Escalation History & Notifications */}
        <div className="lg:col-span-5 space-y-6">
          {/* Selected Record Deep Dive */}
          {selectedRecord && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                    INSPECTOR
                  </span>
                  <span className="text-sm font-bold text-white">
                    {selectedRecord.trackingNumber}
                  </span>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded font-bold ${
                    selectedRecord.isBreached
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {selectedRecord.currentEscalationLevel}
                </span>
              </div>

              {/* Exact Timestamps */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[9px]">START TIME</span>
                  <span className="text-slate-200">
                    {new Date(selectedRecord.startTimeMs).toLocaleTimeString()}
                  </span>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[9px]">WARNING TRIGGER (75%)</span>
                  <span className="text-amber-400">
                    {new Date(selectedRecord.warningTimeMs).toLocaleTimeString()}
                  </span>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[9px]">SLA DEADLINE</span>
                  <span className="text-rose-400 font-bold">
                    {new Date(selectedRecord.deadlineMs).toLocaleTimeString()}
                  </span>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[9px]">REMAINING</span>
                  <span className="text-slate-200">
                    {selectedRecord.isBreached
                      ? `Overdue by ${formatHours(selectedRecord.elapsedMs - selectedRecord.totalDurationMs)}h`
                      : `${formatHours(selectedRecord.remainingMs)}h left`}
                  </span>
                </div>
              </div>

              {/* Action Simulation: Resolve / Close to test SLA fulfillment */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-400 text-[10px] block mb-2 font-bold">
                  SIMULATE INCIDENT STATUS RESOLUTION (HALTS CLOCK)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSimulateStatus(selectedRecord.incidentId, 'CLOSED')}
                    className="flex-1 py-1.5 bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-700 rounded text-emerald-200 font-medium text-xs transition cursor-pointer"
                  >
                    Close / Resolve Ticket
                  </button>
                  <button
                    onClick={() => handleSimulateStatus(selectedRecord.incidentId, 'IN_PROGRESS')}
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 font-medium text-xs transition cursor-pointer"
                  >
                    Set In Progress
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Real-Time Escalation Audit History (Idempotent Trail) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Escalation Ladder Audit ({escalations.length})</span>
              </span>
              <span className="text-slate-500 text-[10px]">Idempotent Events</span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {escalations.length === 0 ? (
                <div className="text-slate-500 text-center py-4">No escalations recorded yet.</div>
              ) : (
                escalations.map((e) => (
                  <div key={e.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-white font-bold">{e.trackingNumber}</span>
                      <span className="text-[10px] text-slate-500">{new Date(e.escalatedAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-rose-400 font-bold text-[11px]">
                      <span>{e.fromLevel}</span>
                      <ChevronRight className="w-3 h-3" />
                      <span>{e.toLevel}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Dispatched to: <span className="text-slate-300">{e.notifiedRole}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 italic mt-0.5">{e.notificationBody}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Notification Queue */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white flex items-center space-x-1.5">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>Dispatched Notifications ({notifications.length})</span>
              </span>
              <span className="text-slate-500 text-[10px]">Role Dispatches</span>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <div className="text-slate-500 text-center py-4">Zero unread notifications.</div>
              ) : (
                notifications.slice(0, 10).map((n) => (
                  <div
                    key={n.id}
                    className={`p-2.5 rounded border text-[11px] ${
                      n.notificationType === 'SLA_BREACH'
                        ? 'bg-rose-950/30 border-rose-900/60 text-rose-200'
                        : 'bg-amber-950/30 border-amber-900/60 text-amber-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>{n.title}</span>
                      <span className="text-[9px] opacity-70">{new Date(n.sentAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-[10px] opacity-90 mt-0.5">{n.message}</div>
                    <div className="text-[9px] opacity-75 mt-1">Recipient: {n.recipientRole}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Background Worker Periodic Cycle Reports */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-slate-400 space-y-2">
            <div className="flex items-center justify-between text-white font-bold border-b border-slate-800 pb-1.5">
              <span>Background Monitor Cycle Logs</span>
              <span className="text-emerald-400 text-[10px]">DAEMON ONLINE</span>
            </div>
            <div className="space-y-1">
              {reports.slice(0, 3).map((rep) => (
                <div key={rep.cycleId} className="flex justify-between text-[10px]">
                  <span>{new Date(rep.executedAt).toLocaleTimeString()}</span>
                  <span>
                    Tracked: {rep.totalTracked} &bull; Breaches: {rep.breachedCount} &bull; Esc: {rep.escalationsTriggered} ({rep.durationMs}ms)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
