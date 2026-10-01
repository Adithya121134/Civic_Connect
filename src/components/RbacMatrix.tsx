import React from 'react';
import { Lock, EyeOff, ShieldAlert, User, ShieldCheck } from 'lucide-react';
import { RBAC_PERMISSIONS } from '../data/architectureData';

export const RbacMatrix: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
          <Lock className="w-4 h-4" />
          <span>Security, Access Control & Privacy Redaction</span>
        </div>
        <h2 className="text-xl font-bold text-white">
          Role-Based Access Control (RBAC) & PII Isolation Matrix
        </h2>
        <p className="text-sm text-slate-300 mt-1 max-w-3xl">
          CivicConnect enforces strict boundary segregation. Public citizen interfaces never receive raw employee telemetry, internal model scratchpads, or private citizen PII.
        </p>
      </div>

      {/* RBAC Matrix Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Functional Permission Matrix Across Operational Roles
        </h3>
        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono">
              <tr>
                <th className="py-3 px-4">Domain Area</th>
                <th className="py-3 px-4 text-emerald-400">Citizen</th>
                <th className="py-3 px-4 text-blue-400">Authority Officer</th>
                <th className="py-3 px-4 text-amber-400">Field Worker</th>
                <th className="py-3 px-4 text-purple-400">Administrator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {RBAC_PERMISSIONS.map((perm) => (
                <tr key={perm.domain} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-semibold text-white font-mono">{perm.domain}</td>
                  <td className="py-3 px-4 text-slate-300">{perm.citizen}</td>
                  <td className="py-3 px-4 text-slate-300">{perm.officer}</td>
                  <td className="py-3 px-4 text-slate-300">{perm.worker}</td>
                  <td className="py-3 px-4 text-slate-300">{perm.admin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Redaction Rules & Append-Only Guarantees */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Redacted Fields */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center space-x-2 text-rose-400 font-semibold text-xs uppercase tracking-wider">
            <EyeOff className="w-4 h-4" />
            <span>Fields Strictly Redacted from Citizens</span>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-start space-x-2">
              <span className="text-rose-400 font-bold">&bull;</span>
              <div>
                <strong className="text-white font-mono">observations.citizen_id:</strong> Redacted on public read endpoints to eliminate retaliation risks against reporting residents.
              </div>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-rose-400 font-bold">&bull;</span>
              <div>
                <strong className="text-white font-mono">users.phone_number & badge_number:</strong> Private officer and field contractor numbers remain hidden from external access.
              </div>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-rose-400 font-bold">&bull;</span>
              <div>
                <strong className="text-white font-mono">agent_executions.system_prompt_hash & raw_response_text:</strong> LLM reasoning scratchpads and internal tokens are restricted to official staff.
              </div>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-rose-400 font-bold">&bull;</span>
              <div>
                <strong className="text-white font-mono">audit_logs.client_ip & user_agent:</strong> Internal network forensics are isolated to security administrators.
              </div>
            </li>
          </ul>
        </div>

        {/* Append-Only Tables */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center space-x-2 text-amber-400 font-semibold text-xs uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4" />
            <span>Strictly Append-Only Tables (No UPDATE / DELETE)</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {[
              'audit_logs',
              'incident_status_history',
              'sla_events',
              'agent_executions',
              'agent_decisions',
              'agent_tool_calls',
              'human_approvals',
              'incident_reopens',
            ].map((tbl) => (
              <div key={tbl} className="bg-slate-950 p-2 rounded border border-slate-800 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-slate-200">{tbl}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed pt-2 border-t border-slate-800">
            Protected via PostgreSQL statement triggers (<code className="text-amber-300">prevent_audit_log_mutation()</code>) that raise error code <code className="text-amber-300">insufficient_privilege</code> if any process attempts an <code className="text-slate-300">UPDATE</code> or <code className="text-slate-300">DELETE</code>.
          </p>
        </div>
      </div>
    </div>
  );
};
