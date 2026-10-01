import React, { useState } from 'react';
import {
  Shield, Database, Cpu, Activity, GitBranch, Lock, UserCheck,
  ShieldAlert, Users, LogOut, LogIn, History, FileCheck2, Layers,
  Bot, Sparkles, Copy, Flame, Clock, TrendingUp, Building2, User,
  CheckCircle, ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenDdl: () => void;
  onOpenAuthModal: (mode: 'login' | 'register') => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenDdl,
  onOpenAuthModal,
}) => {
  const { user, isAuthenticated, logout, switchMockPersona, authorizedPortal } = useAuth();
  const [isPersonaMenuOpen, setIsPersonaMenuOpen] = useState(false);

  const personas = [
    {
      name: 'Elena Rostova',
      email: 'citizen.elena@gmail.com',
      role: 'RESIDENT',
      dept: 'Civic Resident',
      badge: 'CITIZEN',
      targetTab: 'portal_resident'
    },
    {
      name: 'Officer James Vance',
      email: 'officer.roads@civicconnect.gov',
      role: 'DEPARTMENT_USER',
      dept: 'Roads & Infrastructure',
      badge: 'OFFICER',
      targetTab: 'portal_department'
    },
    {
      name: 'Officer Lucas Dubois',
      email: 'officer.water@civicconnect.gov',
      role: 'DEPARTMENT_USER',
      dept: 'Water Supply',
      badge: 'OFFICER',
      targetTab: 'portal_department'
    },
    {
      name: 'Officer Ramesh Nair',
      email: 'officer.sewer@civicconnect.gov',
      role: 'DEPARTMENT_USER',
      dept: 'Sewerage & Drainage',
      badge: 'OFFICER',
      targetTab: 'portal_department'
    },
    {
      name: 'Officer Maya Patel',
      email: 'officer.solidwaste@civicconnect.gov',
      role: 'DEPARTMENT_USER',
      dept: 'Solid Waste Management',
      badge: 'OFFICER',
      targetTab: 'portal_department'
    },
    {
      name: 'Officer Deepak Sharma',
      email: 'officer.lighting@civicconnect.gov',
      role: 'DEPARTMENT_USER',
      dept: 'Street Lighting & Electrical',
      badge: 'OFFICER',
      targetTab: 'portal_department'
    },
    {
      name: 'Officer Carlos Santos',
      email: 'officer.buildings@civicconnect.gov',
      role: 'DEPARTMENT_USER',
      dept: 'Public Buildings & Facilities',
      badge: 'OFFICER',
      targetTab: 'portal_department'
    },
    {
      name: 'Officer David Kim',
      email: 'officer.transport@civicconnect.gov',
      role: 'DEPARTMENT_USER',
      dept: 'Public Transport',
      badge: 'OFFICER',
      targetTab: 'portal_department'
    },
    {
      name: 'Worker David Chen',
      email: 'worker.chen@civicconnect.gov',
      role: 'FIELD_WORKER',
      dept: 'Roads Field Crew Alpha',
      badge: 'FIELD',
      targetTab: 'portal_department'
    },
    {
      name: 'Sarah Jenkins',
      email: 'admin@civicconnect.gov',
      role: 'ADMIN',
      dept: 'City Administration',
      badge: 'ADMIN',
      targetTab: 'portal_admin'
    }
  ];

  const handleSelectPersona = async (email: string, targetTab: string) => {
    setIsPersonaMenuOpen(false);
    await switchMockPersona(email);
    setActiveTab(targetTab);
  };

  const domainTabs = [
    { id: 'recurring_problems', label: 'Recurring Problem Intelligence', icon: TrendingUp },
    { id: 'sla_engine', label: 'SLA & Escalation Engine', icon: Clock },
    { id: 'priority_and_routing', label: 'Priority & Routing Agents', icon: Flame },
    { id: 'duplicate_detection', label: 'Duplicate Detection Agent', icon: Copy },
    { id: 'observation_lab', label: 'Observation Agent (Lab)', icon: Sparkles },
    { id: 'agent_orchestrator', label: 'Agent Orchestrator (7 Agents)', icon: Bot },
    { id: 'incident_console', label: 'Incident Engine (17-State)', icon: GitBranch },
    { id: 'evidence_vault', label: 'Evidence Vault & Storage', icon: FileCheck2 },
    { id: 'state_tests', label: 'State Machine Tests (10/10)', icon: ShieldAlert },
    { id: 'topology', label: 'System Topology', icon: Activity },
    { id: 'schema', label: 'Database Schema (SQLite WAL)', icon: Database },
    { id: 'agent_simulator', label: 'Agent Pipeline Simulator', icon: Cpu },
    { id: 'lifecycle', label: 'Incident State Graph', icon: Layers },
    { id: 'rbac', label: 'Security & RBAC Matrix', icon: Lock },
    { id: 'user_management', label: 'Identity & Roles Console', icon: Users },
    { id: 'audit_stream', label: 'Security Audit Ledger', icon: History },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950 text-slate-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Navbar Row */}
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold tracking-tight text-white">CivicConnect</span>
                <span className="text-xs uppercase px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800/80 text-emerald-400 font-semibold tracking-wider">
                  Production Backend
                </span>
              </div>
              <p className="text-xs text-slate-400">Three-Tier Role-Aware & Department-Isolated Municipal Platform</p>
            </div>
          </div>

          {/* User Status / Persona Switcher / Login */}
          <div className="flex items-center space-x-3 text-xs">
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setIsPersonaMenuOpen(!isPersonaMenuOpen)}
                  className="flex items-center space-x-3 bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg text-left transition"
                >
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        user.role === 'ADMIN'
                          ? 'bg-purple-400'
                          : user.role === 'DEPARTMENT_USER' || user.role === 'AUTHORITY_OFFICER'
                          ? 'bg-blue-400'
                          : user.role === 'FIELD_WORKER'
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                    />
                    <div>
                      <div className="font-semibold text-white leading-tight flex items-center gap-1">
                        {user.firstName} {user.lastName}
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {user.role} {user.departmentCode ? `[${user.departmentCode}]` : ''}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Persona Switcher Dropdown */}
                {isPersonaMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in">
                    <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                      Switch Role & Department Persona
                    </div>
                    <div className="py-1 space-y-1">
                      {personas.map((p) => {
                        const isCurrent = user.email === p.email;
                        return (
                          <button
                            key={p.email}
                            onClick={() => handleSelectPersona(p.email, p.targetTab)}
                            className={`w-full text-left p-2 rounded-lg text-xs transition flex items-center justify-between ${
                              isCurrent
                                ? 'bg-slate-800 text-white font-semibold'
                                : 'text-slate-300 hover:bg-slate-800/60'
                            }`}
                          >
                            <div>
                              <div className="font-medium text-slate-100">{p.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{p.dept}</div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              p.role === 'ADMIN'
                                ? 'bg-purple-500/20 text-purple-300'
                                : p.role === 'DEPARTMENT_USER'
                                ? 'bg-blue-500/20 text-blue-300'
                                : p.role === 'RESIDENT'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}>
                              {p.badge}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="pt-2 border-t border-slate-800">
                      <button
                        onClick={() => {
                          setIsPersonaMenuOpen(false);
                          logout();
                        }}
                        className="w-full text-left p-2 rounded-lg text-xs text-rose-400 hover:bg-rose-950/40 flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onOpenAuthModal('login')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md font-medium transition flex items-center space-x-1"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => onOpenAuthModal('register')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-medium transition flex items-center space-x-1"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Register Citizen</span>
                </button>
              </div>
            )}

            <button
              onClick={onOpenDdl}
              className="hidden sm:flex bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-md text-xs font-medium transition items-center space-x-1"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>DDL Schema</span>
            </button>
          </div>
        </div>

        {/* PRIMARY PORTAL BAR (Three-Tier Portal Architecture) */}
        <div className="py-2.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Portals:</span>

            {/* Resident Portal */}
            <button
              onClick={() => setActiveTab('portal_resident')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'portal_resident'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <User className="w-3.5 h-3.5 text-emerald-400" />
              Resident Portal
              {user?.role === 'RESIDENT' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              )}
            </button>

            {/* Department Portal */}
            <button
              onClick={() => setActiveTab('portal_department')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'portal_department'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-950/50'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              Department Portal
              {user?.departmentCode && (
                <span className="px-1.5 py-0.2 rounded bg-blue-950/80 text-[10px] font-mono border border-blue-400/40">
                  {user.departmentCode}
                </span>
              )}
            </button>

            {/* Admin Portal */}
            <button
              onClick={() => setActiveTab('portal_admin')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'portal_admin'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-950/50'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              Admin Portal
              {user?.role === 'ADMIN' && (
                <span className="w-1.5 h-1.5 rounded-full bg-purple-300 animate-pulse" />
              )}
            </button>

            {/* Security Isolation Suite */}
            <button
              onClick={() => setActiveTab('portal_security_tests')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'portal_security_tests'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
              Security Suite (6/6 Tests)
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded border border-slate-800">
            <span>Active Bound:</span>
            <span className="text-slate-200 font-semibold">
              {user?.role} {user?.departmentId ? `(${user.departmentId})` : ''}
            </span>
          </div>
        </div>

        {/* Secondary Domain Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto py-2 border-t border-slate-900 scrollbar-none text-xs">
          <span className="text-slate-500 font-mono self-center mr-2 text-[11px]">Consoles:</span>
          {domainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs whitespace-nowrap transition ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 shadow-sm font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
