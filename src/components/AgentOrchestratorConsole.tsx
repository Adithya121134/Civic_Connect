import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { agentOrchestrator } from '../lib/agentOrchestrationService';
import { toolRegistry } from '../lib/toolRegistry';
import { incidentEngine } from '../lib/incidentManagementEngine';
import {
  AgentDefinition,
  OrchestrationWorkflowExecution,
  AgentResult,
  ToolDefinition,
} from '../types/agentOrchestrator';
import {
  Bot,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  GitBranch,
  Layers,
  Wrench,
  Shield,
  UserCheck,
  ChevronRight,
  Database,
  Search,
  ArrowRight,
  Activity,
} from 'lucide-react';

export const AgentOrchestratorConsole: React.FC = () => {
  const { user } = useAuth();
  const [agents, setAgents] = useState<AgentDefinition[]>(agentOrchestrator.getAllAgents());
  const [tools, setTools] = useState<ToolDefinition[]>(toolRegistry.getAllTools());
  const [incidents] = useState(incidentEngine.getAllIncidents());
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(
    incidents[0]?.id || 'inc-pothole-101'
  );

  // Workflow Pipeline State
  const [activeWorkflow, setActiveWorkflow] = useState<OrchestrationWorkflowExecution | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<AgentResult[]>(agentOrchestrator.getExecutionLogs());
  const [selectedLog, setSelectedLog] = useState<AgentResult | null>(null);

  // Tool Permission Matrix inspector
  const [selectedTool, setSelectedTool] = useState<ToolDefinition>(tools[0]);

  // Launch Full Orchestration Pipeline
  const handleLaunchPipeline = async () => {
    if (!user) return;
    setIsExecuting(true);

    try {
      const wf = await agentOrchestrator.runFullPipelineWorkflow(
        selectedIncidentId,
        user,
        (updatedWf) => {
          setActiveWorkflow({ ...updatedWf });
          setExecutionLogs(agentOrchestrator.getExecutionLogs());
        }
      );
      setActiveWorkflow(wf);
      setExecutionLogs(agentOrchestrator.getExecutionLogs());
    } finally {
      setIsExecuting(false);
    }
  };

  // Human Officer Approval Sign-off
  const handleOfficerSignoff = () => {
    if (!activeWorkflow || !user) return;
    const updated = agentOrchestrator.approveCheckpoint(activeWorkflow.workflowExecutionId, user, true);
    if (updated) {
      setActiveWorkflow({ ...updated });
      setExecutionLogs(agentOrchestrator.getExecutionLogs());
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-purple-400">
              <Bot className="w-4 h-4" />
              <span>Generic Multi-Agent Orchestration & Decision-Support Framework</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Autonomous Agent Orchestration Pipeline
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Coordinating 7 specialized agents: <code className="text-emerald-300">Observation</code> &rarr;{' '}
              <code className="text-emerald-300">Evidence</code> &rarr;{' '}
              <code className="text-cyan-300">Deduplication</code> &rarr;{' '}
              <code className="text-blue-300">Investigation</code> &rarr;{' '}
              <code className="text-amber-300">Priority</code> &rarr;{' '}
              <code className="text-purple-300">Routing</code> &rarr;{' '}
              <code className="text-rose-300">Assignment</code>. Agents use bounded tool boundaries with zero arbitrary database access.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <select
              value={selectedIncidentId}
              onChange={(e) => setSelectedIncidentId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
            >
              {incidents.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.trackingNumber} - {i.title.substring(0, 24)}...
                </option>
              ))}
            </select>

            <button
              onClick={handleLaunchPipeline}
              disabled={isExecuting}
              className="bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs px-4 py-2.5 rounded-lg transition flex items-center space-x-2 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              {isExecuting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Executing Pipeline...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Run Pipeline Workflow</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Human In The Loop (HITL) Alert Banner */}
      {activeWorkflow?.status === 'PAUSED_WAITING_HUMAN_APPROVAL' && (
        <div className="bg-amber-950/60 border border-amber-800 rounded-xl p-5 text-xs font-mono flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <UserCheck className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <div className="font-bold text-amber-300 text-sm">
                Human-in-the-Loop Checkpoint Triggered
              </div>
              <p className="text-slate-300 mt-0.5">
                {activeWorkflow.stages[activeWorkflow.currentStageIndex]?.result?.humanApprovalCheckpoint?.reason}
              </p>
            </div>
          </div>

          <button
            onClick={handleOfficerSignoff}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-lg transition text-xs shrink-0 cursor-pointer shadow-md"
          >
            Authority Officer Sign-Off & Resume
          </button>
        </div>
      )}

      {/* Workflow Stage Progress Pipeline Visualizer */}
      {activeWorkflow && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <GitBranch className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Workflow Execution: {activeWorkflow.workflowExecutionId}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400">
                Correlation: {activeWorkflow.correlationId}
              </span>
            </div>
            <span
              className={`text-xs font-mono px-2.5 py-0.5 rounded font-bold ${
                activeWorkflow.status === 'COMPLETED'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : activeWorkflow.status === 'PAUSED_WAITING_HUMAN_APPROVAL'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                  : 'bg-purple-950 text-purple-300 border border-purple-800'
              }`}
            >
              {activeWorkflow.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            {activeWorkflow.stages.map((stg, idx) => {
              const isCurrent = idx === activeWorkflow.currentStageIndex && activeWorkflow.status === 'RUNNING';
              return (
                <div
                  key={stg.stageId}
                  className={`p-3 rounded-lg border text-xs font-mono transition ${
                    stg.status === 'COMPLETED'
                      ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300'
                      : stg.status === 'PENDING_HUMAN_APPROVAL'
                      ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                      : isCurrent
                      ? 'bg-purple-950/40 border-purple-600 text-purple-200 animate-pulse'
                      : 'bg-slate-950/60 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-400">Stage {idx + 1}</span>
                    {stg.status === 'COMPLETED' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : stg.status === 'PENDING_HUMAN_APPROVAL' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </div>
                  <div className="font-bold text-white truncate text-[11px]">{stg.agentName}</div>
                  <div className="text-[10px] mt-1 truncate">{stg.status}</div>
                  {stg.result && (
                    <div className="text-[9px] text-slate-400 mt-1">
                      Conf: {(stg.result.confidence * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Split: Agent Registry & Tool Boundaries vs Execution Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Registered Agents & Tool Permission Boundaries (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Agent Registry */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Registered Specialized Agents ({agents.length})
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">Agent Metadata & Version Registry</h3>
              </div>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {agents.map((ag) => (
                <div key={ag.name} className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white">{ag.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-900">
                        v{ag.version}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400">
                      HITL Threshold: {(ag.confidenceThreshold * 100).toFixed(0)}%
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">{ag.purpose}</p>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-500 font-mono">Allowed Tools:</span>
                    {ag.allowedTools.map((t) => (
                      <span
                        key={t}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tool Permission Boundaries */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1">
              <Wrench className="w-4 h-4" />
              <span>Tool Registry & Security Boundaries</span>
            </div>
            <h3 className="text-sm font-bold text-white mb-3">Enforced Tool Execution Layer</h3>

            <div className="grid grid-cols-2 gap-2 mb-3">
              {tools.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setSelectedTool(t)}
                  className={`p-2 rounded text-left font-mono text-xs border transition cursor-pointer ${
                    selectedTool.name === t.name
                      ? 'bg-slate-800 border-cyan-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold truncate">{t.name}</div>
                  <div className="text-[10px] text-slate-500">v{t.version} &bull; ReadOnly: {t.isReadOnly ? 'Yes' : 'No'}</div>
                </button>
              ))}
            </div>

            {selectedTool && (
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs space-y-2">
                <div className="text-slate-300 font-bold">{selectedTool.description}</div>
                <div className="text-[11px] text-slate-400">
                  Required Role: <span className="text-purple-300">{selectedTool.requiredRole}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Parameters Schema:
                  <pre className="p-2 bg-slate-900 rounded border border-slate-800 text-[10px] text-emerald-300 overflow-x-auto mt-1">
                    {JSON.stringify(selectedTool.parametersSchema, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Execution Audit Log & Reasoning Chain Inspector (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Agent Execution Audit Log ({executionLogs.length})
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">Decision-Support Ledgers</h3>
              </div>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {executionLogs.map((log) => (
                <div
                  key={log.executionId}
                  onClick={() => setSelectedLog(log)}
                  className={`p-3 rounded-lg border cursor-pointer font-mono text-xs transition ${
                    selectedLog?.executionId === log.executionId
                      ? 'bg-slate-800 border-purple-500'
                      : 'bg-slate-950 border-slate-800 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white">{log.agentName}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        log.status === 'COMPLETED'
                          ? 'bg-emerald-950 text-emerald-300'
                          : log.status === 'PENDING_HUMAN_APPROVAL'
                          ? 'bg-amber-950 text-amber-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 truncate">
                    Proposed: <code className="text-purple-300">{log.proposedAction}</code> &bull; Confidence:{' '}
                    {(log.confidence * 100).toFixed(0)}%
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                    <span>{log.toolCalls.length} Tool Call(s)</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Execution Inspector */}
          {selectedLog && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] text-slate-500">EXECUTION DETAILS</span>
                  <h4 className="text-sm font-bold text-white">
                    {selectedLog.agentName} (v{selectedLog.agentVersion})
                  </h4>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500">CONFIDENCE</div>
                  <div className="text-sm font-bold text-emerald-400">
                    {(selectedLog.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Reasoning Chain */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 block mb-1">REASONING CHAIN</span>
                <div className="p-2.5 bg-slate-950 rounded border border-slate-800 space-y-1 text-[11px] text-slate-300">
                  {selectedLog.reasoningChain.map((step, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <span className="text-purple-400 font-bold">&bull;</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tool Calls */}
              {selectedLog.toolCalls.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">
                    TOOL CALLS ({selectedLog.toolCalls.length})
                  </span>
                  <div className="space-y-1.5">
                    {selectedLog.toolCalls.map((tc, idx) => (
                      <div key={idx} className="p-2 bg-slate-950 rounded border border-slate-800 text-[11px]">
                        <div className="flex items-center justify-between text-cyan-400 font-bold">
                          <span>{tc.toolName}</span>
                          <span className="text-[10px] text-slate-500">{new Date(tc.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-slate-400 mt-0.5">{tc.resultSummary}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Structured JSON Output */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 block mb-1">STRUCTURED OUTPUT</span>
                <pre className="p-2.5 bg-slate-950 rounded border border-slate-800 text-[10px] text-purple-300 overflow-x-auto">
                  {JSON.stringify(selectedLog.structuredOutput, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
