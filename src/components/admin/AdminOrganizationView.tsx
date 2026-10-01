import React, { useState, useEffect } from 'react';
import {
  Building2, Users, Shield, Briefcase, Plus,
  Search, Check, X, Edit3, KeyRound, UserCheck,
  RefreshCw, Lock
} from 'lucide-react';

interface AdminOrganizationViewProps {
  token: string;
}

export const AdminOrganizationView: React.FC<AdminOrganizationViewProps> = ({ token }) => {
  const [activeSubTab, setActiveSubTab] = useState<'departments' | 'users' | 'roles' | 'teams'>('departments');

  // Data
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userSearch, setUserSearch] = useState('');

  // Department Modal State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');

  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserRole, setNewUserRole] = useState('DEPARTMENT_USER');
  const [newUserDeptId, setNewUserDeptId] = useState('dept-transport');
  const [newUserBadge, setNewUserBadge] = useState('');

  // Team Modal State
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [newTeamDeptId, setNewTeamDeptId] = useState('dept-transport');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamCode, setNewTeamCode] = useState('');
  const [newTeamLead, setNewTeamLead] = useState('');

  const [notification, setNotification] = useState<string | null>(null);

  const fetchOrgData = async () => {
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const dRes = await fetch('/api/v1/admin/departments', { headers });
      if (dRes.ok) setDepartments((await dRes.json()).departments || []);

      const uRes = await fetch('/api/v1/admin/users', { headers });
      if (uRes.ok) setUsers((await uRes.json()).users || []);

      const rRes = await fetch('/api/v1/admin/roles', { headers });
      if (rRes.ok) setRoles((await rRes.json()).roles || []);

      const tRes = await fetch('/api/v1/admin/teams', { headers });
      if (tRes.ok) setTeams((await tRes.json()).teams || []);
    } catch (err) {
      console.error('Failed to load organization data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgData();
  }, [token]);

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/admin/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newDeptName,
          code: newDeptCode,
          description: newDeptDesc
        })
      });
      if (res.ok) {
        setNotification(`Department '${newDeptName}' created successfully.`);
        setIsDeptModalOpen(false);
        setNewDeptName('');
        setNewDeptCode('');
        setNewDeptDesc('');
        fetchOrgData();
        setTimeout(() => setNotification(null), 3500);
      }
    } catch (err) {
      console.error('Failed to create department', err);
    }
  };

  const handleToggleDepartmentStatus = async (dept: any) => {
    const newStatus = dept.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/v1/admin/departments/${dept.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setNotification(`Department ${dept.code} status changed to ${newStatus}.`);
        fetchOrgData();
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (err) {
      console.error('Failed to update department', err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          email: newUserEmail,
          firstName: newUserFirstName,
          lastName: newUserLastName,
          role: newUserRole,
          departmentId: newUserRole === 'RESIDENT' || newUserRole === 'ADMIN' ? null : newUserDeptId,
          badgeNumber: newUserBadge || null
        })
      });
      if (res.ok) {
        setNotification(`User '${newUserEmail}' provisioned successfully.`);
        setIsUserModalOpen(false);
        setNewUserEmail('');
        setNewUserFirstName('');
        setNewUserLastName('');
        setNewUserBadge('');
        fetchOrgData();
        setTimeout(() => setNotification(null), 3500);
      }
    } catch (err) {
      console.error('Failed to create user', err);
    }
  };

  const handleToggleUserActive = async (user: any) => {
    const newActiveState = !user.is_active;
    try {
      const res = await fetch(`/api/v1/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: newActiveState })
      });
      if (res.ok) {
        setNotification(`User account ${user.email} ${newActiveState ? 'activated' : 'deactivated'}.`);
        fetchOrgData();
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (err) {
      console.error('Failed to toggle user status', err);
    }
  };

  const handleResetPassword = async (userId: string, email: string) => {
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ resetPassword: 'CivicSecure#2026!' })
      });
      if (res.ok) {
        setNotification(`Password for ${email} reset to default ('CivicSecure#2026!').`);
        setTimeout(() => setNotification(null), 3500);
      }
    } catch (err) {
      console.error('Failed to reset password', err);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/admin/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          departmentId: newTeamDeptId,
          name: newTeamName,
          code: newTeamCode,
          leadName: newTeamLead
        })
      });
      if (res.ok) {
        setNotification(`Field Team '${newTeamName}' registered.`);
        setIsTeamModalOpen(false);
        setNewTeamName('');
        setNewTeamCode('');
        setNewTeamLead('');
        fetchOrgData();
        setTimeout(() => setNotification(null), 3500);
      }
    } catch (err) {
      console.error('Failed to create team', err);
    }
  };

  const filteredUsers = users.filter(u => {
    if (userRoleFilter !== 'ALL' && u.role !== userRoleFilter) return false;
    if (userSearch) {
      const q = userSearch.toLowerCase();
      const matchName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      const matchBadge = (u.badge_number || '').toLowerCase().includes(q);
      return matchName || matchEmail || matchBadge;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Sub-Tab Switcher */}
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] p-5 rounded-lg shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#111111]">
              Municipal Organization & Personnel Governance
            </h2>
            <p className="text-xs text-[#666666]">
              Department configuration, access credentials, role boundaries, and operational field team management.
            </p>
          </div>

          <button
            onClick={fetchOrgData}
            disabled={isLoading}
            className="px-3 py-1.5 bg-[#FAFAFA] hover:bg-[#F0F0F0] border border-[#E5E5E5] text-[#111111] text-xs font-semibold rounded-md flex items-center space-x-1.5 transition-colors self-start md:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Roster</span>
          </button>
        </div>

        {/* Sub-Navigation Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#F0F0F0]">
          <button
            onClick={() => setActiveSubTab('departments')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeSubTab === 'departments'
                ? 'bg-[#111111] text-[#FFFFFF]'
                : 'bg-[#FAFAFA] text-[#666666] hover:bg-[#F0F0F0] hover:text-[#111111]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Departments ({departments.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeSubTab === 'users'
                ? 'bg-[#111111] text-[#FFFFFF]'
                : 'bg-[#FAFAFA] text-[#666666] hover:bg-[#F0F0F0] hover:text-[#111111]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Accounts ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('roles')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeSubTab === 'roles'
                ? 'bg-[#111111] text-[#FFFFFF]'
                : 'bg-[#FAFAFA] text-[#666666] hover:bg-[#F0F0F0] hover:text-[#111111]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Roles & Permissions (4)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('teams')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeSubTab === 'teams'
                ? 'bg-[#111111] text-[#FFFFFF]'
                : 'bg-[#FAFAFA] text-[#666666] hover:bg-[#F0F0F0] hover:text-[#111111]'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Field Teams ({teams.length})</span>
          </button>
        </div>

        {notification && (
          <div className="p-2.5 bg-[#DCFCE7] border border-[#86EFAC] text-[#166534] rounded text-xs">
            {notification}
          </div>
        )}
      </div>

      {/* SUB-VIEW 1: DEPARTMENTS */}
      {activeSubTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#666666]">Active Municipal Departments</span>
            <button
              onClick={() => setIsDeptModalOpen(true)}
              className="px-3 py-1.5 bg-[#111111] hover:bg-[#222222] text-[#FFFFFF] text-xs font-semibold rounded-md flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Department</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((d: any) => (
              <div
                key={d.id}
                className="bg-[#FFFFFF] border border-[#E5E5E5] p-5 rounded-lg shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#F3F4F6] text-[#374151] rounded">
                      {d.code}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                      d.status === 'ACTIVE' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEE2E2] text-[#991B1B]'
                    }`}>
                      {d.status || 'ACTIVE'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#111111] mt-2">{d.name}</h3>
                  <p className="text-xs text-[#666666] mt-1 line-clamp-2 leading-relaxed">
                    {d.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#F0F0F0] flex items-center justify-between text-xs">
                  <div className="font-mono text-[#8A8A8A] text-[11px]">
                    <span>{d.staff_count || 0} staff</span> &bull; <span>{d.team_count || 0} teams</span>
                  </div>
                  <button
                    onClick={() => handleToggleDepartmentStatus(d)}
                    className="text-[11px] font-semibold text-[#2563EB] hover:underline"
                  >
                    {d.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: USERS */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8A8A8A] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
              >
                <option value="ALL">All Roles</option>
                <option value="RESIDENT">Resident (Citizen)</option>
                <option value="DEPARTMENT_USER">Department Officer</option>
                <option value="FIELD_WORKER">Field Worker</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>

            <button
              onClick={() => setIsUserModalOpen(true)}
              className="px-3 py-1.5 bg-[#111111] hover:bg-[#222222] text-[#FFFFFF] text-xs font-semibold rounded-md flex items-center space-x-1.5 transition-colors self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Provision User</span>
            </button>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[11px] font-mono uppercase text-[#666666]">
                <tr>
                  <th className="py-3 px-4">Name & Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department / Team</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {filteredUsers.map((u: any) => (
                  <tr key={u.id} className="hover:bg-[#FAFAFA]">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#111111]">
                        {u.first_name} {u.last_name || ''}
                      </div>
                      <div className="text-[11px] font-mono text-[#8A8A8A]">{u.email}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                        u.role === 'ADMIN' ? 'bg-[#F3E8FF] text-[#6B21A8]' :
                        u.role === 'DEPARTMENT_USER' ? 'bg-[#EFF6FF] text-[#1E40AF]' :
                        u.role === 'FIELD_WORKER' ? 'bg-[#FEF3C7] text-[#92400E]' :
                        'bg-[#F3F4F6] text-[#374151]'
                      }`}>
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-[#404040]">
                      {u.department_name ? `${u.department_name} (${u.department_code})` : 'None / Citizen'}
                      {u.team_name && <div className="text-[#8A8A8A] text-[10px]">&bull; {u.team_name}</div>}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                        u.is_active ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEE2E2] text-[#991B1B]'
                      }`}>
                        {u.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleResetPassword(u.id, u.email)}
                        title="Reset password"
                        className="px-2 py-1 bg-[#FAFAFA] hover:bg-[#E5E5E5] text-[#111111] text-[11px] font-semibold rounded"
                      >
                        Reset PW
                      </button>
                      <button
                        onClick={() => handleToggleUserActive(u)}
                        className={`px-2 py-1 text-[11px] font-semibold rounded ${
                          u.is_active
                            ? 'bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2]'
                            : 'bg-[#F0FDF4] text-[#16A34A] hover:bg-[#DCFCE7]'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: ROLES & PERMISSIONS */}
      {activeSubTab === 'roles' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map((r: any) => (
              <div key={r.id} className="bg-[#FFFFFF] border border-[#E5E5E5] p-5 rounded-lg shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-[#111111]" />
                    <h3 className="text-sm font-bold text-[#111111]">{r.name}</h3>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#F3F4F6] text-[#374151] rounded">
                    {r.userCount} Active Users
                  </span>
                </div>

                <p className="text-xs text-[#666666] leading-relaxed">{r.description}</p>

                <div>
                  <span className="text-[10px] font-mono uppercase text-[#8A8A8A] block mb-1.5">
                    Permitted Backend Capabilities
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {r.permissions.map((perm: string) => (
                      <span
                        key={perm}
                        className="px-2 py-0.5 text-[10px] font-mono bg-[#FAFAFA] border border-[#E5E5E5] text-[#404040] rounded"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: FIELD TEAMS */}
      {activeSubTab === 'teams' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#666666]">Municipal Dispatch Units</span>
            <button
              onClick={() => setIsTeamModalOpen(true)}
              className="px-3 py-1.5 bg-[#111111] hover:bg-[#222222] text-[#FFFFFF] text-xs font-semibold rounded-md flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Field Team</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {teams.map((t: any) => (
              <div key={t.id} className="bg-[#FFFFFF] border border-[#E5E5E5] p-4 rounded-lg shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#F3F4F6] text-[#374151] rounded">
                    {t.code}
                  </span>
                  <span className="text-[10px] font-mono text-[#8A8A8A]">{t.department_name}</span>
                </div>

                <h4 className="text-sm font-bold text-[#111111]">{t.name}</h4>
                <div className="text-xs text-[#666666]">
                  Lead: <strong>{t.lead_name || 'Unassigned'}</strong>
                </div>

                <div className="pt-2 border-t border-[#F0F0F0] flex items-center justify-between text-xs font-mono text-[#8A8A8A]">
                  <span>{t.member_count} Members</span>
                  <span className="text-[#111111] font-semibold">{t.active_tasks || 0} Active Tasks</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Create Department */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleCreateDepartment} className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-[#111111]">Register Municipal Department</h3>

            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Department Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Department of Urban Forestry"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Department Code</label>
              <input
                type="text"
                required
                placeholder="e.g. DUF"
                value={newDeptCode}
                onChange={(e) => setNewDeptCode(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Description / Jurisdiction</label>
              <textarea
                rows={2}
                value={newDeptDesc}
                onChange={(e) => setNewDeptDesc(e.target.value)}
                className="w-full p-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E5E5E5]">
              <button
                type="button"
                onClick={() => setIsDeptModalOpen(false)}
                className="px-3 py-1.5 border border-[#E5E5E5] text-xs font-semibold rounded-md text-[#666666]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-[#111111] text-[#FFFFFF] text-xs font-semibold rounded-md"
              >
                Create Department
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Provision User */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleCreateUser} className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-[#111111]">Provision Authorized User Account</h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={newUserFirstName}
                  onChange={(e) => setNewUserFirstName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={newUserLastName}
                  onChange={(e) => setNewUserLastName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Official Email Address</label>
              <input
                type="email"
                required
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">System Role</label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
              >
                <option value="DEPARTMENT_USER">DEPARTMENT_USER (Department Officer / Dispatcher)</option>
                <option value="FIELD_WORKER">FIELD_WORKER (Field Tech / On-Site Repair)</option>
                <option value="ADMIN">ADMIN (System Administrator)</option>
                <option value="RESIDENT">RESIDENT (Citizen User)</option>
              </select>
            </div>

            {newUserRole !== 'RESIDENT' && newUserRole !== 'ADMIN' && (
              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">Assigned Department</label>
                <select
                  value={newUserDeptId}
                  onChange={(e) => setNewUserDeptId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Badge Number (Optional)</label>
              <input
                type="text"
                placeholder="e.g. DOT-9412"
                value={newUserBadge}
                onChange={(e) => setNewUserBadge(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E5E5E5]">
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="px-3 py-1.5 border border-[#E5E5E5] text-xs font-semibold rounded-md text-[#666666]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-[#111111] text-[#FFFFFF] text-xs font-semibold rounded-md"
              >
                Provision Account
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Register Team */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleCreateTeam} className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-[#111111]">Register Dispatch Team</h3>

            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Department</label>
              <select
                value={newTeamDeptId}
                onChange={(e) => setNewTeamDeptId(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Team Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Storm Drainage Unit Beta"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Team Code</label>
              <input
                type="text"
                required
                placeholder="e.g. DPW-DRN-2"
                value={newTeamCode}
                onChange={(e) => setNewTeamCode(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Lead Supervisor Name</label>
              <input
                type="text"
                placeholder="e.g. Lead Tech O'Connor"
                value={newTeamLead}
                onChange={(e) => setNewTeamLead(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E5E5E5]">
              <button
                type="button"
                onClick={() => setIsTeamModalOpen(false)}
                className="px-3 py-1.5 border border-[#E5E5E5] text-xs font-semibold rounded-md text-[#666666]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-[#111111] text-[#FFFFFF] text-xs font-semibold rounded-md"
              >
                Register Team
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
