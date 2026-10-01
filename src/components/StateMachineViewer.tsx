import React, { useState } from 'react';
import { GitBranch, AlertOctagon, CheckCircle2, ShieldAlert, ArrowRight } from 'lucide-react';
import { IncidentState } from '../types/architecture';

const STATE_NODES: { state: IncidentState; description: string; allowedTransitions: IncidentState[] }[] = [
  {
    state: 'REPORTED',
    description: 'Raw citizen observation recorded; awaiting automated pipeline categorization and spatial deduplication.',
    allowedTransitions: ['TRIAGED', 'REJECTED', 'MERGED_DUPLICATE'],
  },
  {
    state: 'TRIAGED',
    description: 'Categorized, priority assigned, duplicate checks evaluated. Awaiting departmental assignment.',
    allowedTransitions: ['ASSIGNED', 'REJECTED', 'MERGED_DUPLICATE'],
  },
  {
    state: 'ASSIGNED',
    description: 'Allocated to an authoritative department and field crew with active SLA countdown.',
    allowedTransitions: ['IN_PROGRESS', 'TRIAGED'],
  },
  {
    state: 'IN_PROGRESS',
    description: 'Field crew has acknowledged work order and initiated physical repairs on-site.',
    allowedTransitions: ['WORK_REVIEW', 'ASSIGNED'],
  },
  {
    state: 'WORK_REVIEW',
    description: 'Field worker submitted after-photos; awaiting visual inspection and officer sign-off.',
    allowedTransitions: ['RESOLVED', 'IN_PROGRESS'],
  },
  {
    state: 'RESOLVED',
    description: 'Physical work accepted and signed off by officer. Open to citizen reverification.',
    allowedTransitions: ['CLOSED', 'TRIAGED'],
  },
  {
    state: 'CLOSED',
    description: 'Citizen satisfaction confirmed or 7-day observation period elapsed without dispute.',
    allowedTransitions: ['TRIAGED'],
  },
  {
    state: 'REJECTED',
    description: 'Proven spam, duplicate, out-of-jurisdiction, or non-civic matter.',
    allowedTransitions: [],
  },
  {
    state: 'MERGED_DUPLICATE',
    description: 'Merged into primary parent incident; linked to master resolution work order.',
    allowedTransitions: [],
  },
];

export const StateMachineViewer: React.FC = () => {
  const [selectedState, setSelectedState] = useState<IncidentState>('REPORTED');
  const [testTargetState, setTestTargetState] = useState<IncidentState>('ASSIGNED');
  const [transitionOutcome, setTransitionOutcome] = useState<{ success: boolean; message: string } | null>(null);

  const activeNode = STATE_NODES.find((n) => n.state === selectedState)!;

  const handleTestTransition = () => {
    const isValid = activeNode.allowedTransitions.includes(testTargetState);
    if (isValid) {
      setTransitionOutcome({
        success: true,
        message: `VALID TRANSITION: Trigger allows ${selectedState} -> ${testTargetState}. Timestamp and status history row appended.`,
      });
      setSelectedState(testTargetState);
    } else {
      setTransitionOutcome({
        success: false,
        message: `EXCEPTION: PostgreSQL Trigger chk_incident_state_transition raised ERRCODE 'check_violation'. Illegal transition from ${selectedState} directly to ${testTargetState}.`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
          <GitBranch className="w-4 h-4" />
          <span>Deterministic Incident Lifecycle State Machine</span>
        </div>
        <h2 className="text-xl font-bold text-white">
          Declarative PostgreSQL Trigger-Enforced State Machine
        </h2>
        <p className="text-sm text-slate-300 mt-1 max-w-3xl">
          State transitions are governed by database constraints and trigger functions. AI agents cannot alter states arbitrarily; every state change is audited in <code className="text-emerald-300">incident_status_history</code>.
        </p>
      </div>

      {/* Visual State Graph */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Lifecycle State Graph (Click a state to inspect transitions)
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {STATE_NODES.map((node) => {
            const isSelected = selectedState === node.state;
            const isTerminal = node.allowedTransitions.length === 0;
            return (
              <button
                key={node.state}
                onClick={() => {
                  setSelectedState(node.state);
                  setTransitionOutcome(null);
                }}
                className={`p-3.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-800 border-emerald-500 text-white shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold">{node.state}</span>
                    {isTerminal && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        Terminal
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{node.description}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-emerald-400">
                  {node.allowedTransitions.length} Valid Next Step{node.allowedTransitions.length !== 1 ? 's' : ''}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive State Transition Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider text-xs">
            Current State: <span className="font-mono text-emerald-400">{selectedState}</span>
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">{activeNode.description}</p>

          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-2">Permitted Target States:</span>
            {activeNode.allowedTransitions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {activeNode.allowedTransitions.map((t) => (
                  <span key={t} className="px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300 font-mono text-xs flex items-center space-x-1">
                    <span>&rarr;</span>
                    <span>{t}</span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-500 font-mono italic">Terminal State (No forward transitions permitted)</span>
            )}
          </div>
        </div>

        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider text-xs">
            Transition Validation Test
          </h4>

          <div className="flex items-center space-x-3 text-xs font-mono">
            <span className="text-emerald-400 font-bold">{selectedState}</span>
            <ArrowRight className="w-4 h-4 text-slate-500" />
            <select
              value={testTargetState}
              onChange={(e) => setTestTargetState(e.target.value as IncidentState)}
              className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {STATE_NODES.map((n) => (
                <option key={n.state} value={n.state}>
                  {n.state}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleTestTransition}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 rounded-lg text-xs transition cursor-pointer border border-slate-700"
          >
            Execute State Transition Call
          </button>

          {transitionOutcome && (
            <div
              className={`p-3.5 rounded-lg border text-xs font-mono leading-relaxed ${
                transitionOutcome.success
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : 'bg-red-950/40 border-red-800 text-red-300'
              }`}
            >
              <div className="flex items-start space-x-2">
                {transitionOutcome.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <span>{transitionOutcome.message}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
