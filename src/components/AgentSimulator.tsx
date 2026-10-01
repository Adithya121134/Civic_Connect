import React, { useState } from 'react';
import { Cpu, MapPin, CheckCircle, AlertTriangle, ArrowRight, ShieldAlert, Sparkles, UserCheck, RefreshCw } from 'lucide-react';
import { SimulatedIncident, AuditLogEntry } from '../types/architecture';

const SAMPLE_SCENARIOS = [
  {
    name: 'Scenario A: Novel Critical Pothole',
    text: 'Large deep pothole on Main Street near Lincoln Elementary. Vehicles swerving into oncoming traffic to avoid it.',
    lat: 37.7749,
    lng: -122.4194,
    category: 'ROADS_HAZARD',
  },
  {
    name: 'Scenario B: Duplicate Report (45m away)',
    text: 'Huge crater in the road right in front of Lincoln school. Broken axle danger.',
    lat: 37.7752,
    lng: -122.4191,
    category: 'ROADS_HAZARD',
  },
  {
    name: 'Scenario C: Burst Water Main (Emergency)',
    text: 'Water gushing out of broken asphalt at 5th and Market. Flooding basement and subways.',
    lat: 37.7833,
    lng: -122.4067,
    category: 'WATER_UTILITY',
  },
];

export const AgentSimulator: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState(SAMPLE_SCENARIOS[0]);
  const [obsText, setObsText] = useState(SAMPLE_SCENARIOS[0].text);
  const [lat, setLat] = useState(SAMPLE_SCENARIOS[0].lat);
  const [lng, setLng] = useState(SAMPLE_SCENARIOS[0].lng);

  const [pipelineState, setPipelineState] = useState<'IDLE' | 'PROCESSING' | 'RECOMMENDED' | 'APPROVED' | 'OVERRIDDEN'>('IDLE');
  const [currentStep, setCurrentStep] = useState(0);

  // Simulation Results
  const [simulationResult, setSimulationResult] = useState<{
    postgisCandidates: { id: string; tracking: string; distanceMeters: number; title: string }[];
    isDuplicate: boolean;
    confidence: number;
    recommendedCategory: string;
    recommendedPriority: 'P1_CRITICAL' | 'P2_HIGH' | 'P3_MEDIUM' | 'P4_LOW';
    recommendedDept: string;
    reasoning: string;
    requiresHitl: boolean;
    slaResolutionMinutes: number;
  } | null>(null);

  const [auditLedger, setAuditLedger] = useState<AuditLogEntry[]>([]);

  const handleSelectScenario = (sc: typeof SAMPLE_SCENARIOS[0]) => {
    setSelectedScenario(sc);
    setObsText(sc.text);
    setLat(sc.lat);
    setLng(sc.lng);
    setPipelineState('IDLE');
    setSimulationResult(null);
  };

  const handleRunPipeline = () => {
    setPipelineState('PROCESSING');
    setCurrentStep(1);

    // Simulate Step 1: Spatial PostGIS ST_DWithin check
    setTimeout(() => {
      setCurrentStep(2);
      // Simulate Step 2: Gemini Cognitive Processing
      setTimeout(() => {
        setCurrentStep(3);
        // Is it duplicate scenario?
        const isDup = selectedScenario.name.includes('Duplicate');
        const isCrit = selectedScenario.name.includes('Burst Water');

        const result = {
          postgisCandidates: isDup
            ? [{ id: 'inc-9021', tracking: 'CIV-2026-0914', distanceMeters: 42.5, title: 'Deep pothole outside Lincoln Elementary' }]
            : [],
          isDuplicate: isDup,
          confidence: isDup ? 0.94 : isCrit ? 0.96 : 0.88,
          recommendedCategory: isCrit ? 'WATER_UTILITY' : 'ROADS_HAZARD',
          recommendedPriority: isCrit ? ('P1_CRITICAL' as const) : isDup ? ('P3_MEDIUM' as const) : ('P2_HIGH' as const),
          recommendedDept: isCrit ? 'Department of Water & Power' : 'Department of Transportation & Roads',
          reasoning: isDup
            ? 'Observation is within 42.5m (queried via ST_DWithin) of active incident CIV-2026-0914. Semantic text matches crater near Lincoln School.'
            : isCrit
            ? 'Active high-pressure water main breach presenting flood hazard to underground infrastructure. Statutory life/property risk triggers P1.'
            : 'Road surface structural compromise adjacent to school zone. Vehicles forced into opposing traffic lanes elevates priority to P2.',
          requiresHitl: isCrit || isDup, // P1 or duplicate merger requires human approval
          slaResolutionMinutes: isCrit ? 120 : 1440,
        };

        setSimulationResult(result);
        setPipelineState('RECOMMENDED');
      }, 700);
    }, 600);
  };

  const handleOfficerDecision = (decision: 'APPROVE' | 'OVERRIDE') => {
    if (!simulationResult) return;

    const newAudit: AuditLogEntry = {
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      entityName: 'incidents',
      entityId: 'inc-' + Math.random().toString(36).substring(2, 8),
      action: decision === 'APPROVE' ? 'AGENT_RECOMMENDATION_APPROVED' : 'OFFICER_MANUAL_OVERRIDE',
      actorType: 'HUMAN_USER',
      actorName: 'Officer J. Vance (Badge #742)',
      preState: JSON.stringify({ state: 'REPORTED', priority: 'UNASSIGNED' }),
      postState: JSON.stringify({
        state: decision === 'APPROVE' && simulationResult.isDuplicate ? 'MERGED_DUPLICATE' : 'TRIAGED',
        priority: decision === 'APPROVE' ? simulationResult.recommendedPriority : 'P3_MEDIUM',
        department: simulationResult.recommendedDept,
      }),
      reason: decision === 'APPROVE' ? 'Officer verified AI recommendation.' : 'Officer down-ranked priority based on physical survey.',
    };

    setAuditLedger([newAudit, ...auditLedger]);
    setPipelineState(decision === 'APPROVE' ? 'APPROVED' : 'OVERRIDDEN');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">
          <Sparkles className="w-4 h-4" />
          <span>Interactive Cognitive Pipeline & Spatial Simulation</span>
        </div>
        <h2 className="text-xl font-bold text-white">
          Observation Intake &rarr; Spatial PostGIS Filter &rarr; Gemini Reasoning &rarr; Human-in-the-Loop Triage
        </h2>
        <p className="text-sm text-slate-300 mt-1 max-w-3xl">
          Test how non-deterministic agent recommendations interact with deterministic database boundaries, spatial deduplication (<code className="text-cyan-300">ST_DWithin</code>), and Officer sign-offs.
        </p>

        {/* Preset scenario selection */}
        <div className="mt-4 flex flex-wrap gap-2">
          {SAMPLE_SCENARIOS.map((sc) => (
            <button
              key={sc.name}
              onClick={() => handleSelectScenario(sc)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
                selectedScenario.name === sc.name
                  ? 'bg-purple-950 border-purple-500 text-purple-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {sc.name}
            </button>
          ))}
        </div>
      </div>

      {/* Observation Form & Ingestion Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider text-xs">
            1. Citizen Observation Ingestion
          </h3>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Observation Description</label>
            <textarea
              rows={4}
              value={obsText}
              onChange={(e) => setObsText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={lng}
                onChange={(e) => setLng(parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
              />
            </div>
          </div>

          <button
            onClick={handleRunPipeline}
            disabled={pipelineState === 'PROCESSING'}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2.5 px-4 rounded-lg font-medium text-xs transition cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {pipelineState === 'PROCESSING' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Executing Agent Pipeline...</span>
              </>
            ) : (
              <>
                <Cpu className="w-4 h-4" />
                <span>Ingest & Run Agent Pipeline</span>
              </>
            )}
          </button>
        </div>

        {/* Live Execution Pipeline Stages */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider text-xs">
            2. Orchestrator Pipeline & Cognitive Gating
          </h3>

          {pipelineState === 'IDLE' && (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs text-center p-6 border border-dashed border-slate-800 rounded-lg">
              <Cpu className="w-8 h-8 text-slate-600 mb-2" />
              <span>Pipeline Idle. Click "Ingest & Run Agent Pipeline" to simulate.</span>
            </div>
          )}

          {pipelineState !== 'IDLE' && simulationResult && (
            <div className="space-y-4 text-xs">
              {/* Step 1: Spatial Check */}
              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-lg">
                <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                  <span className="text-cyan-400 font-semibold flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>POSTGIS: ST_DWithin Proximity Sweep (Radius 150m)</span>
                  </span>
                  <span className="text-slate-400">1.2ms query latency</span>
                </div>
                {simulationResult.postgisCandidates.length > 0 ? (
                  <div className="mt-2 text-amber-300 bg-amber-950/40 p-2.5 rounded border border-amber-900/60">
                    <span className="font-semibold">Candidate Match Detected:</span>{' '}
                    {simulationResult.postgisCandidates[0].tracking} ({simulationResult.postgisCandidates[0].title}) —{' '}
                    <span className="font-mono text-white">{simulationResult.postgisCandidates[0].distanceMeters}m away</span>
                  </div>
                ) : (
                  <p className="text-slate-400 mt-1">No active incidents within 150 meters. Classified as novel physical coordinate.</p>
                )}
              </div>

              {/* Step 2: Agent Structured Reasoning */}
              <div className="bg-slate-950 border border-purple-500/30 p-4 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-white font-mono">Gemini 2.5 Structured Recommendation</span>
                  </div>
                  <span className="font-mono px-2 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300 text-[11px]">
                    Confidence: {(simulationResult.confidence * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 block">Category:</span>
                    <span className="text-emerald-400 font-semibold">{simulationResult.recommendedCategory}</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 block">Priority:</span>
                    <span
                      className={`font-semibold ${
                        simulationResult.recommendedPriority === 'P1_CRITICAL'
                          ? 'text-red-400'
                          : simulationResult.recommendedPriority === 'P2_HIGH'
                          ? 'text-amber-400'
                          : 'text-blue-400'
                      }`}
                    >
                      {simulationResult.recommendedPriority}
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800 col-span-2">
                    <span className="text-slate-400 block">Target Routing:</span>
                    <span className="text-cyan-300 font-semibold">{simulationResult.recommendedDept}</span>
                  </div>
                </div>

                <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800">
                  <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">Agent Chain-of-Thought:</span>
                  <p className="text-slate-300 text-xs leading-relaxed">{simulationResult.reasoning}</p>
                </div>
              </div>

              {/* Step 3: Human in the Loop Decision Box */}
              {pipelineState === 'RECOMMENDED' && (
                <div className="bg-slate-950 border border-blue-500/40 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 text-blue-400 font-semibold mb-2">
                    <UserCheck className="w-4 h-4" />
                    <span>Human-in-the-Loop Authority Officer Triage</span>
                  </div>
                  <p className="text-slate-300 text-xs mb-3">
                    {simulationResult.requiresHitl
                      ? 'Decision flagged for Officer Review: Sensitive priority or potential duplicate merge.'
                      : 'Confidence meets standard threshold. Officer confirmation commits to deterministic state machine.'}
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleOfficerDecision('APPROVE')}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded text-xs transition cursor-pointer flex items-center space-x-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Approve AI Recommendation</span>
                    </button>
                    <button
                      onClick={() => handleOfficerDecision('OVERRIDE')}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-4 py-2 rounded text-xs transition cursor-pointer flex items-center space-x-1 border border-slate-700"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Override with Custom Value</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Confirmation State */}
              {(pipelineState === 'APPROVED' || pipelineState === 'OVERRIDDEN') && (
                <div className="bg-emerald-950/40 border border-emerald-800 p-3.5 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 text-emerald-300">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>
                      {pipelineState === 'APPROVED'
                        ? 'Recommendation approved by Officer. State transitioned to TRIAGED/ASSIGNED.'
                        : 'Manual override registered. Custom values committed to PostgreSQL.'}
                    </span>
                  </div>
                  <span className="font-mono text-slate-400">Audit ID appended</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Append-Only Audit Trail View */}
      {auditLedger.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4" />
            <span>Master Append-Only Audit Ledger (audit_logs)</span>
          </h3>
          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Audit ID</th>
                  <th className="py-2 px-3">Action</th>
                  <th className="py-2 px-3">Actor</th>
                  <th className="py-2 px-3">Reasoning / Diff</th>
                  <th className="py-2 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {auditLedger.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 text-emerald-400">{a.id}</td>
                    <td className="py-2 px-3 text-cyan-300">{a.action}</td>
                    <td className="py-2 px-3 text-slate-300">{a.actorName}</td>
                    <td className="py-2 px-3 text-slate-400 max-w-xs truncate">{a.reason}</td>
                    <td className="py-2 px-3 text-slate-500">{new Date(a.timestamp).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
