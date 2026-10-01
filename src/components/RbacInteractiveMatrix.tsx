import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ROLE_PERMISSIONS, PERMISSION_DESCRIPTIONS, hasPermission } from '../lib/permissions';
import { UserRole, Permission } from '../types/auth';
import {
  Shield,
  CheckCircle2,
  XCircle,
  Lock,
  User,
  ShieldCheck,
  AlertCircle,
  FileCheck,
  Building,
  KeyRound,
  Eye,
  RefreshCw,
} from 'lucide-react';

export const RbacInteractiveMatrix: React.FC = () => {
  const { user, activeRole, tokens, refreshToken } = useAuth();
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [testOutcome, setTestOutcome] = useState<{
    perm: Permission;
    role: UserRole;
    allowed: boolean;
    timestamp: string;
  } | null>(null);

  const roles: UserRole[] = ['CITIZEN', 'AUTHORITY_OFFICER', 'FIELD_WORKER', 'ADMIN'];

  const allPermissions = Object.keys(PERMISSION_DESCRIPTIONS) as Permission[];

  const handleTestCheck = (role: UserRole, perm: Permission) => {
    const allowed = hasPermission(role, perm);
    setTestOutcome({
      perm,
      role,
      allowed,
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Active User Session Status Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Active Authentication & RBAC Session State</span>
            </div>
            <div className="flex items-center space-x-3 mt-1">
              <h2 className="text-xl font-bold text-white">
                {user ? `${user.firstName} ${user.lastName}` : 'Anonymous Guest'}
              </h2>
              {user && (
                <span
                  className={`text-xs px-2.5 py-0.5 rounded font-mono font-semibold border ${
                    user.role === 'ADMIN'
                      ? 'bg-purple-950 text-purple-300 border-purple-800'
                      : user.role === 'AUTHORITY_OFFICER'
                      ? 'bg-blue-950 text-blue-300 border-blue-800'
                      : user.role === 'FIELD_WORKER'
                      ? 'bg-amber-950 text-amber-300 border-amber-800'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  }`}
                >
                  {user.role}
                </span>
              )}
              {user?.badgeNumber && (
                <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  Badge: {user.badgeNumber}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {user?.email} &bull; {user?.departmentName || 'Public Citizen Domain'} &bull; Status:{' '}
              <span className={user?.isActive ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                {user?.isActive ? 'Active' : 'Deactivated'}
              </span>
            </p>
          </div>

          {/* Token Details & Refresh Trigger */}
          <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs font-mono space-y-1.5 shrink-0">
            <div className="flex items-center justify-between space-x-4">
              <span className="text-slate-500">JWT Access Token:</span>
              <span className="text-emerald-400 font-semibold">Valid (HMAC-SHA256)</span>
            </div>
            <div className="flex items-center justify-between space-x-4">
              <span className="text-slate-500">Token Strategy:</span>
              <span className="text-cyan-400">15m Access + 7d Rotated Refresh</span>
            </div>
            <button
              onClick={() => refreshToken()}
              className="mt-1 w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-1 px-2 rounded text-[11px] font-sans flex items-center justify-center space-x-1 transition cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Rotate Refresh Token</span>
            </button>
          </div>
        </div>
      </div>

      {/* Permission Verification Feedback Box */}
      {testOutcome && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono flex items-center justify-between transition ${
            testOutcome.allowed
              ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
              : 'bg-red-950/50 border-red-800 text-red-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {testOutcome.allowed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>
              RBAC Check: Role <strong>{testOutcome.role}</strong> &rarr; Permission{' '}
              <code className="bg-slate-900 px-1 py-0.5 rounded text-white">{testOutcome.perm}</code> :{' '}
              <strong>{testOutcome.allowed ? 'GRANTED (200 OK)' : 'DENIED (403 FORBIDDEN)'}</strong>
            </span>
          </div>
          <span className="text-slate-500 text-[11px]">{testOutcome.timestamp}</span>
        </div>
      )}

      {/* Interactive Permission Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Authoritative Role Permission Matrix
            </h3>
            <p className="text-xs text-slate-400">
              Click any cell to simulate a live programmatic RBAC validation check for that role/permission pair.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Filter Domain:</span>
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value as UserRole | 'ALL')}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-300"
            >
              <option value="ALL">All Roles</option>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono">
              <tr>
                <th className="py-3 px-4">Permission Key & Domain</th>
                <th className="py-3 px-4">Description</th>
                {roles.map((r) => (
                  <th
                    key={r}
                    className={`py-3 px-4 text-center ${
                      user?.role === r ? 'bg-slate-800/80 text-white font-bold' : ''
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <span>{r}</span>
                      {user?.role === r && (
                        <span className="text-[9px] text-emerald-400 uppercase tracking-tighter">Your Role</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {allPermissions.map((perm) => {
                const meta = PERMISSION_DESCRIPTIONS[perm];
                return (
                  <tr key={perm} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-200">
                      <div className="text-emerald-400">{perm}</div>
                      <div className="text-[10px] text-slate-500 font-sans">{meta.domain}</div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 text-xs">{meta.description}</td>
                    {roles.map((r) => {
                      const granted = hasPermission(r, perm);
                      const isCurrentActive = user?.role === r;
                      return (
                        <td
                          key={r}
                          className={`py-2.5 px-4 text-center cursor-pointer transition ${
                            isCurrentActive ? 'bg-slate-800/40' : ''
                          }`}
                          onClick={() => handleTestCheck(r, perm)}
                          title={`Click to test ${r} -> ${perm}`}
                        >
                          <div className="flex items-center justify-center">
                            {granted ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Granted
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-950 text-slate-600 border border-slate-800">
                                <XCircle className="w-3 h-3 mr-1" />
                                Denied
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
