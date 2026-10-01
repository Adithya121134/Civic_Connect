import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { CommandPalette } from './components/CommandPalette';
import { ResidentPortalView } from './components/ResidentPortalView';
import { DepartmentPortalView } from './components/DepartmentPortalView';
import { AdminPortalView } from './components/AdminPortalView';
import { SecurityIsolationSuiteView } from './components/SecurityIsolationSuiteView';
import { DuplicateDetectionConsole } from './components/DuplicateDetectionConsole';
import { PriorityAndRoutingConsole } from './components/PriorityAndRoutingConsole';
import { SlaAndEscalationConsole } from './components/SlaAndEscalationConsole';
import { RecurringProblemConsole } from './components/RecurringProblemConsole';
import { ObservationAgentLab } from './components/ObservationAgentLab';
import { AgentOrchestratorConsole } from './components/AgentOrchestratorConsole';
import { IncidentLifecycleConsole } from './components/IncidentLifecycleConsole';
import { EvidenceVaultConsole } from './components/EvidenceVaultConsole';
import { StateMachineTestSuite } from './components/StateMachineTestSuite';
import { ArchitectureOverview } from './components/ArchitectureOverview';
import { SchemaExplorer } from './components/SchemaExplorer';
import { AgentSimulator } from './components/AgentSimulator';
import { StateMachineViewer } from './components/StateMachineViewer';
import { RbacInteractiveMatrix } from './components/RbacInteractiveMatrix';
import { AdminUserManagement } from './components/AdminUserManagement';
import { ProtectedIncidentWorkspace } from './components/ProtectedIncidentWorkspace';
import { SecurityAuditStream } from './components/SecurityAuditStream';
import { DdlExportModal } from './components/DdlExportModal';
import { AuthModal } from './components/AuthModal';
import { LoginPage } from './components/auth/LoginPage';
import { CivicFooterBanner } from './components/CivicFooterBanner';
import { Lock, ArrowRight } from 'lucide-react';

function AppContent() {
  const { user, authorizedPortal, tokens } = useAuth();
  const [activeTab, setActiveTab] = useState('portal_department');
  const [isDdlModalOpen, setIsDdlModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Sync active portal tab when authorized portal changes on login / persona switch
  useEffect(() => {
    if (authorizedPortal === '/resident') {
      setActiveTab('portal_resident');
    } else if (authorizedPortal === '/admin') {
      setActiveTab('portal_admin');
    } else if (authorizedPortal === '/department') {
      setActiveTab('portal_department');
    }
  }, [authorizedPortal, user?.email]);

  // Global Keyboard Shortcut: ⌘K or Ctrl+K for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  // If user is not authenticated, render LoginPage matching reference image
  if (!user && !tokens) {
    let initialView: 'landing' | 'citizen_login' | 'citizen_register' | 'department_login' | 'citizen_forgot_password' | 'department_forgot_password' = 'landing';
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.includes('/register')) {
        initialView = 'citizen_register';
      } else if (path.includes('/department/login')) {
        initialView = 'department_login';
      } else if (path.includes('/department/forgot-password')) {
        initialView = 'department_forgot_password';
      } else if (path.includes('/forgot-password')) {
        initialView = 'citizen_forgot_password';
      } else if (path.includes('/login') || path.includes('/resident')) {
        initialView = 'citizen_login';
      }
    }

    return (
      <LoginPage
        initialView={initialView}
        onSuccess={() => {
          // Handled by AuthContext state change
        }}
      />
    );
  }

  // Check frontend role authorization for the selected portal tab
  const isResidentTryingDepartment = activeTab.startsWith('portal_dept') && user?.role === 'RESIDENT';
  const isNonAdminTryingAdmin = activeTab.startsWith('portal_admin') && user?.role !== 'ADMIN';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FFFFFF] text-[#111111] font-sans antialiased">
      {/* Desktop Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenDdl={() => setIsDdlModalOpen(true)}
      />

      {/* Right Main Column: TopBar + Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Global TopBar */}
        <TopBar
          activeTab={activeTab}
          onNavigate={setActiveTab}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenDdl={() => setIsDdlModalOpen(true)}
          onOpenAuthModal={handleOpenAuth}
        />

        {/* Scrollable Content Viewport + Footer Banner */}
        <main className="flex-1 overflow-y-auto bg-[#FAFAFA] flex flex-col justify-between">
          <div className="px-6 lg:px-8 py-6">
            {/* Portal Access Violation Interceptors */}
            {isResidentTryingDepartment ? (
              <div className="border border-[#000000] p-8 max-w-xl mx-auto bg-[#FFFFFF] text-center space-y-4 shadow-xs mt-8">
                <div className="w-12 h-12 border border-[#000000] bg-[#000000] text-[#FFFFFF] flex items-center justify-center mx-auto rounded-md">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#000000] text-[#FFFFFF] uppercase rounded">
                    HTTP 403 &bull; PORTAL BOUNDARY RESTRICTED
                  </span>
                  <h2 className="text-xl font-bold uppercase text-[#000000] mt-3">
                    DEPARTMENT ACCESS DENIED
                  </h2>
                  <p className="text-xs text-[#666666] mt-1 max-w-md mx-auto leading-relaxed">
                    Your authenticated session is bound to role <strong className="text-[#000000] font-mono">RESIDENT</strong>. Residents are barred from municipal dispatch queues, crew assignments, and internal triage tools.
                  </p>
                </div>

                <div className="p-3 bg-[#FAFAFA] border border-[#E5E5E5] text-left font-mono text-[11px] text-[#404040] rounded">
                  <div>// Server Enforcement Middleware:</div>
                  <div className="text-[#000000] font-bold">requireRole(['DEPARTMENT_USER', 'FIELD_WORKER', 'ADMIN'])</div>
                  <div className="text-[#8A8A8A]">Status: 403 FORBIDDEN &bull; Unauthorized role traversal blocked</div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab('portal_resident')}
                    className="px-6 py-2.5 bg-[#000000] hover:bg-[#222222] text-[#FFFFFF] text-xs font-mono font-bold uppercase transition-colors inline-flex items-center space-x-2 rounded-md"
                  >
                    <span>RETURN TO RESIDENT PORTAL</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : isNonAdminTryingAdmin ? (
              <div className="border border-[#000000] p-8 max-w-xl mx-auto bg-[#FFFFFF] text-center space-y-4 shadow-xs mt-8">
                <div className="w-12 h-12 border border-[#000000] bg-[#000000] text-[#FFFFFF] flex items-center justify-center mx-auto rounded-md">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#000000] text-[#FFFFFF] uppercase rounded">
                    HTTP 403 &bull; ADMINISTRATIVE PRIVILEGE REQUIRED
                  </span>
                  <h2 className="text-xl font-bold uppercase text-[#000000] mt-3">
                    ADMINISTRATIVE CONTROL PLANE RESTRICTED
                  </h2>
                  <p className="text-xs text-[#666666] mt-1 max-w-md mx-auto leading-relaxed">
                    User provisioning, department configurations, and SLA policy modifications require <strong className="text-[#000000] font-mono">ADMIN</strong> clearance.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab(user?.role === 'RESIDENT' ? 'portal_resident' : 'portal_department')}
                    className="px-6 py-2.5 bg-[#000000] hover:bg-[#222222] text-[#FFFFFF] text-xs font-mono font-bold uppercase transition-colors rounded-md"
                  >
                    RETURN TO AUTHORIZED PORTAL
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* PRIMARY PORTALS */}
                {activeTab.startsWith('portal_resident') && (
                  <ResidentPortalView activeTab={activeTab} onNavigateTab={setActiveTab} />
                )}
                {(activeTab === 'portal_department' || activeTab.startsWith('portal_dept_')) && (
                  <DepartmentPortalView activeTab={activeTab} onNavigateTab={setActiveTab} />
                )}
                {activeTab.startsWith('portal_admin') && (
                  <AdminPortalView activeTab={activeTab} onNavigateTab={setActiveTab} />
                )}

                {/* SECURITY & AGENT CAPABILITIES */}
                {activeTab === 'security_suite' && <SecurityIsolationSuiteView />}
                {activeTab === 'duplicate_detection' && <DuplicateDetectionConsole />}
                {activeTab === 'sla_monitoring' && <SlaAndEscalationConsole />}
                {activeTab === 'priority_routing' && <PriorityAndRoutingConsole />}
                {activeTab === 'recurring_patterns' && <RecurringProblemConsole />}
                {activeTab === 'agent_telemetry' && <AgentOrchestratorConsole />}
                {activeTab === 'observation_agent' && <ObservationAgentLab />}

                {/* TECHNICAL ENGINE & AUDIT VIEWS */}
                {activeTab === 'incident_workspace' && <ProtectedIncidentWorkspace />}
                {activeTab === 'incident_lifecycle' && <IncidentLifecycleConsole />}
                {activeTab === 'evidence_vault' && <EvidenceVaultConsole />}
                {activeTab === 'system_audit' && <SecurityAuditStream />}
                {activeTab === 'rbac_matrix' && <RbacInteractiveMatrix />}
                {activeTab === 'admin_users' && <AdminUserManagement />}
                {activeTab === 'state_machine' && <StateMachineViewer />}
                {activeTab === 'state_tests' && <StateMachineTestSuite />}
                {activeTab === 'agent_simulator' && <AgentSimulator />}
                {activeTab === 'schema_explorer' && <SchemaExplorer onOpenDdl={() => setIsDdlModalOpen(true)} />}
                {activeTab === 'architecture' && <ArchitectureOverview />}
              </>
            )}
          </div>

          {/* Context-Sensitive Municipal Bottom Banner */}
          <CivicFooterBanner />
        </main>
      </div>

      {/* Global Command Palette (⌘K) Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={setActiveTab}
        onOpenDdl={() => setIsDdlModalOpen(true)}
      />

      {/* DDL Export Modal */}
      <DdlExportModal
        isOpen={isDdlModalOpen}
        onClose={() => setIsDdlModalOpen(false)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultMode={authModalMode}
      />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
