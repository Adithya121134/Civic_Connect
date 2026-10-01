import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../lib/authService';
import {
  History,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Filter,
} from 'lucide-react';

export const SecurityAuditStream: React.FC = () => {
  const { auditLogs, refreshAuditLogs } = useAuth();
  const [filterThreat, setFilterThreat] = useState<string>('ALL');

  const filteredLogs = auditLogs.filter((log) => {
    if (filterThreat === 'ALL') return true;
    return log.threatLevel === filterThreat;
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
              <History className="w-4 h-4" />
              <span>Immutable Append-Only Security Ledger</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Real-Time Security & RBAC Audit Telemetry
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Captures every cryptographic event, login failure, rate-limiting alert, token rotation, privilege escalation attempt, and <strong>AI Agent authorization check</strong>.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={refreshAuditLogs}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-mono transition flex items-center space-x-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Ledger</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Counter */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400">Filter Threat Level:</span>
          <div className="flex space-x-1 font-mono">
            {['ALL', 'INFO', 'WARNING', 'ALERT', 'CRITICAL'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterThreat(lvl)}
                className={`px-2.5 py-1 rounded transition cursor-pointer ${
                  filterThreat === lvl
                    ? 'bg-slate-700 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <span className="font-mono text-slate-500">
          Total Logged Events: <strong className="text-white">{filteredLogs.length}</strong>
        </span>
      </div>

      {/* Log Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2 max-h-[580px] overflow-y-auto">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No audit records matching filter.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isCritical = log.threatLevel === 'CRITICAL';
            const isAlert = log.threatLevel === 'ALERT';
            const isWarning = log.threatLevel === 'WARNING';

            return (
              <div
                key={log.id}
                className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-start justify-between gap-3 transition ${
                  isCritical
                    ? 'bg-red-950/40 border-red-800/80 text-red-200'
                    : isAlert
                    ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                    : isWarning
                    ? 'bg-yellow-950/20 border-yellow-800/50 text-yellow-200'
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        isCritical
                          ? 'bg-red-900 text-red-100 border-red-700'
                          : isAlert
                          ? 'bg-amber-900 text-amber-100 border-amber-700'
                          : isWarning
                          ? 'bg-yellow-900 text-yellow-100 border-yellow-700'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {log.threatLevel}
                    </span>
                    <span className="font-bold text-white text-[12px]">{log.action}</span>
                    {log.actorRole && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        Actor: {log.actorRole}
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-400">
                    {Object.entries(log.details).map(([key, val]) => (
                      <span key={key} className="mr-3">
                        <strong className="text-slate-300">{key}:</strong>{' '}
                        <span className="text-slate-200">{String(val)}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 whitespace-nowrap text-right shrink-0">
                  <div>{new Date(log.timestamp).toLocaleTimeString()}</div>
                  <div className="text-[9px] text-slate-600">{log.id}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
