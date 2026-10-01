import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../lib/authService';
import { User, UserRole } from '../types/auth';
import {
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  ShieldAlert,
  Building,
  Key,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export const AdminUserManagement: React.FC = () => {
  const { user: currentUser, refreshUserData, refreshAuditLogs } = useAuth();
  const [usersList, setUsersList] = useState<User[]>(authService.getUsersList());
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Role upgrade modal/drawer state
  const [selectedUserForRole, setSelectedUserForRole] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('AUTHORITY_OFFICER');
  const [newBadge, setNewBadge] = useState('');
  const [newDept, setNewDept] = useState('Department of Transportation & Roads');

  const reload = () => {
    setUsersList(authService.getUsersList());
    refreshUserData();
    refreshAuditLogs();
  };

  const handleToggleActive = async (targetUser: User) => {
    if (!currentUser) return;
    const newStatus = !targetUser.isActive;
    const res = await authService.setAccountStatus(
      currentUser.id,
      targetUser.id,
      newStatus,
      newStatus ? undefined : 'Administrative security deactivation'
    );
    if (res.success) {
      setActionFeedback(`Account for ${targetUser.email} marked ${newStatus ? 'ACTIVE' : 'DEACTIVATED'}.`);
      reload();
    } else {
      setActionFeedback(`Error: ${res.error}`);
    }
  };

  const handleUnlock = (targetUser: User) => {
    authService.unlockUserAccount(targetUser.id);
    setActionFeedback(`Lockout cleared for ${targetUser.email}.`);
    reload();
  };

  const handleAssignRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedUserForRole) return;

    const res = await authService.assignPrivilegedRole(
      currentUser.id,
      selectedUserForRole.id,
      newRole,
      {
        badgeNumber: newBadge || undefined,
        departmentName: newDept || undefined,
        departmentId: 'dept-' + newDept.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      }
    );

    if (res.success) {
      setActionFeedback(`Role for ${selectedUserForRole.email} updated to ${newRole}. Prior sessions invalidated.`);
      setSelectedUserForRole(null);
      reload();
    } else {
      setActionFeedback(`Error: ${res.error}`);
    }
  };

  const isCurrentAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-purple-400">
              <Users className="w-4 h-4" />
              <span>Privileged Role Assignment & User Account Lifecycle Control</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Municipal Identity Administration Console
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Strictly enforces that <strong>CITIZEN users cannot self-promote</strong>. Privileged roles (<code className="text-blue-300">AUTHORITY_OFFICER</code>, <code className="text-amber-300">FIELD_WORKER</code>, and <code className="text-purple-300">ADMIN</code>) must be authorized and assigned directly by an authenticated Administrator.
            </p>
          </div>

          {!isCurrentAdmin && (
            <div className="bg-amber-950/40 border border-amber-800 text-amber-300 p-3 rounded-lg text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>You are currently logged in as {currentUser?.role || 'Guest'}. Switch to Sarah Connor (Admin) to execute account actions.</span>
            </div>
          )}
        </div>
      </div>

      {actionFeedback && (
        <div className="p-3 bg-slate-900 border border-emerald-500/50 text-emerald-300 rounded-lg text-xs flex items-center justify-between font-mono">
          <span>{actionFeedback}</span>
          <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Registered Municipal & Citizen Accounts ({usersList.length})
          </h3>
          <span className="text-xs font-mono text-slate-500">Argon2id Hash + Salt</span>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">User</th>
                <th className="py-2.5 px-4">Role</th>
                <th className="py-2.5 px-4">Department / Badge</th>
                <th className="py-2.5 px-4">Account Status</th>
                <th className="py-2.5 px-4">Lockout Status</th>
                <th className="py-2.5 px-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {usersList.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white">{u.firstName} {u.lastName}</div>
                    <div className="text-[11px] text-slate-400">{u.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        u.role === 'ADMIN'
                          ? 'bg-purple-950 text-purple-300 border-purple-800'
                          : u.role === 'AUTHORITY_OFFICER'
                          ? 'bg-blue-950 text-blue-300 border-blue-800'
                          : u.role === 'FIELD_WORKER'
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    <div>{u.departmentName || '—'}</div>
                    {u.badgeNumber && <div className="text-[10px] text-slate-500">Badge: {u.badgeNumber}</div>}
                  </td>
                  <td className="py-3 px-4">
                    {u.isActive ? (
                      <span className="text-emerald-400 flex items-center space-x-1 text-[11px]">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <div>
                        <span className="text-red-400 flex items-center space-x-1 text-[11px]">
                          <UserX className="w-3.5 h-3.5" />
                          <span>Deactivated</span>
                        </span>
                        {u.deactivatedReason && (
                          <span className="text-[10px] text-slate-500 block truncate max-w-xs">{u.deactivatedReason}</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {u.lockoutUntil ? (
                      <div className="text-amber-400 flex items-center space-x-1 text-[11px]">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Locked Out</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Clean (0 fails)</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2 font-sans">
                      {u.lockoutUntil && (
                        <button
                          disabled={!isCurrentAdmin}
                          onClick={() => handleUnlock(u)}
                          className="px-2 py-1 bg-amber-900/60 hover:bg-amber-800 text-amber-200 rounded text-[11px] transition cursor-pointer disabled:opacity-40"
                          title="Reset failed login counter and unlock account"
                        >
                          Unlock
                        </button>
                      )}

                      <button
                        disabled={!isCurrentAdmin || u.id === currentUser?.id}
                        onClick={() => {
                          setSelectedUserForRole(u);
                          setNewRole(u.role);
                          setNewBadge(u.badgeNumber || '');
                          setNewDept(u.departmentName || 'Department of Transportation & Roads');
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] transition cursor-pointer disabled:opacity-40"
                      >
                        Change Role
                      </button>

                      <button
                        disabled={!isCurrentAdmin || u.id === currentUser?.id}
                        onClick={() => handleToggleActive(u)}
                        className={`px-2.5 py-1 rounded text-[11px] transition cursor-pointer disabled:opacity-40 ${
                          u.isActive
                            ? 'bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800'
                            : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Assignment Modal */}
      {selectedUserForRole && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedUserForRole(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <div className="flex items-center space-x-2 text-xs font-semibold uppercase text-purple-400 mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Privileged Role Assignment</span>
            </div>
            <h3 className="text-base font-bold text-white">
              Modify Role: {selectedUserForRole.firstName} {selectedUserForRole.lastName}
            </h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Updating a user's role revokes existing refresh tokens and re-generates permission claims.
            </p>

            <form onSubmit={handleAssignRoleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Select New Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                >
                  <option value="CITIZEN">CITIZEN (Standard public user)</option>
                  <option value="AUTHORITY_OFFICER">AUTHORITY_OFFICER (Triage, work assignment)</option>
                  <option value="FIELD_WORKER">FIELD_WORKER (Field execution, evidence submission)</option>
                  <option value="ADMIN">ADMIN (System administration, user RBAC management)</option>
                </select>
              </div>

              {(newRole === 'AUTHORITY_OFFICER' || newRole === 'FIELD_WORKER') && (
                <>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Department</label>
                    <select
                      value={newDept}
                      onChange={(e) => setNewDept(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                    >
                      <option value="Department of Transportation & Roads">Department of Transportation & Roads</option>
                      <option value="Department of Water & Power">Department of Water & Power</option>
                      <option value="Municipal Parks & Public Grounds">Municipal Parks & Public Grounds</option>
                      <option value="Public Sanitation Authority">Public Sanitation Authority</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Employee Badge ID</label>
                    <input
                      type="text"
                      placeholder="e.g., BADGE-8841"
                      value={newBadge}
                      onChange={(e) => setNewBadge(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                    />
                  </div>
                </>
              )}

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForRole(null)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition"
                >
                  Confirm Role Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
