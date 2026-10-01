import React from 'react';
import { ShieldCheck, Cpu, Database, Network, ArrowRight, CheckCircle2, Lock, UserCheck, Flame } from 'lucide-react';
import { AGENT_SPECS } from '../data/architectureData';

export const ArchitectureOverview: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Design Axiom Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Architectural Design Axiom</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              "AI recommends. Backend validates. Authorized humans approve sensitive decisions. Backend records everything."
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              CivicConnect guarantees data integrity and deterministic auditability. Autonomous agents perform cognitive synthesis, semantic comparisons, and recommendations. Deterministic services enforce state transitions, foreign-key invariants, and cryptographic logging.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono shrink-0">
            <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-md">
              <span className="text-slate-400 block">Orchestrator:</span>
              <span className="text-emerald-400 font-bold">FastAPI + Async Worker</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-md">
              <span className="text-slate-400 block">Spatial Engine:</span>
              <span className="text-cyan-400 font-bold">PostGIS 3.4 R-Tree</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Architectural Planes Grid */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center space-x-2">
          <Network className="w-4 h-4 text-emerald-400" />
          <span>Four Operational Architectural Planes</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Plane 1 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-5">
            <div className="w-8 h-8 rounded bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold mb-3">
              1
            </div>
            <h4 className="font-semibold text-white text-base">Ingress & API Plane</h4>
            <span className="text-xs font-mono text-blue-400">FastAPI • JWT • Pydantic v2</span>
            <ul className="mt-3 text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>Cryptographic JWT with Argon2id passwords</li>
              <li>Role-Based Access Control (4 user roles)</li>
              <li>MIME-type binary validation & SHA-256</li>
              <li>ACID transaction boundary coordinators</li>
            </ul>
          </div>

          {/* Plane 2 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-5">
            <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold mb-3">
              2
            </div>
            <h4 className="font-semibold text-white text-base">Persistence Plane</h4>
            <span className="text-xs font-mono text-emerald-400">PostgreSQL 16 + PostGIS</span>
            <ul className="mt-3 text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>29 normalized relational domain tables</li>
              <li>Spatial GiST indexes (ST_DWithin, ST_Contains)</li>
              <li>Immutable append-only audit & history triggers</li>
              <li>Database-level state transition guards</li>
            </ul>
          </div>

          {/* Plane 3 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-5">
            <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold mb-3">
              3
            </div>
            <h4 className="font-semibold text-white text-base">Coordination & Cache</h4>
            <span className="text-xs font-mono text-amber-400">Redis 7 Streams & Redlock</span>
            <ul className="mt-3 text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>Worker task queues for asynchronous intake</li>
              <li>Distributed locking for state transitions</li>
              <li>Pub/Sub real-time alerts to officer consoles</li>
              <li>SLA deadline evaluation clock sweeps</li>
            </ul>
          </div>

          {/* Plane 4 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-5">
            <div className="w-8 h-8 rounded bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold mb-3">
              4
            </div>
            <h4 className="font-semibold text-white text-base">Cognitive Agent Plane</h4>
            <span className="text-xs font-mono text-purple-400">Google Gemini 2.5 SDK</span>
            <ul className="mt-3 text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>6 specialized autonomous reasoning agents</li>
              <li>Strict JSON schema constrained outputs</li>
              <li>Deterministic tool execution gateway</li>
              <li>Confidence-gated Human-in-the-Loop review</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Specialized Agent Directory */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>Specialized Autonomous Agent Fleet</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">6 Specialized Agents Configured</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AGENT_SPECS.map((agent) => (
            <div key={agent.id} className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <h4 className="font-semibold text-white text-sm">{agent.name}</h4>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-purple-300 border border-purple-500/20">
                    &ge; {(agent.confidenceThreshold * 100).toFixed(0)}% Conf
                  </span>
                </div>
                <p className="text-xs text-emerald-400 mt-0.5">{agent.role}</p>

                <div className="mt-3 space-y-2">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Context Inputs:</span>
                    <ul className="text-xs text-slate-300 list-disc list-inside">
                      {agent.inputContext.slice(0, 3).map((inp, idx) => (
                        <li key={idx} className="truncate">{inp}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Deterministic Guardrail:</span>
                    <p className="text-xs text-amber-300/90 leading-relaxed mt-0.5">{agent.deterministicGuardrail}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center space-x-1">
                  <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>HITL Gating:</span>
                </span>
                <span className="text-slate-300 font-medium">Enforced on Low Confidence</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Milestone 1: Deterministic Foundation */}
      <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-6">
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Implementation Milestone 1 (First Step)</span>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">
          Milestone 1: Deterministic Core & Spatial Lifecycle Engine
        </h3>
        <p className="text-sm text-slate-300 mb-4 max-w-4xl">
          Before deploying cognitive agents, the system requires the absolute reliability of the underlying deterministic layers.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
            <span className="font-semibold text-emerald-400 block mb-1">1. Database DDL</span>
            <p className="text-slate-400">PostGIS extensions, 29 tables, GiST indexes, and trigger-enforced state machine validation.</p>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
            <span className="font-semibold text-emerald-400 block mb-1">2. Auth & RBAC</span>
            <p className="text-slate-400">FastAPI JWT security layer with Argon2id password hashing and role-based route dependencies.</p>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
            <span className="font-semibold text-emerald-400 block mb-1">3. Spatial Ingestion</span>
            <p className="text-slate-400">POST /observations API with ST_DWithin candidate search for duplicate detection within 150m.</p>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
            <span className="font-semibold text-emerald-400 block mb-1">4. Immutable Audit</span>
            <p className="text-slate-400">Append-only audit ledger and background worker queue wiring for asynchronous agent dispatch.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
