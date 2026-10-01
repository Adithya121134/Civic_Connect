import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, AlertOctagon, Map, Clock, Building2,
  Package, Sparkles, Shield, Server, RefreshCw
} from 'lucide-react';

import { AdminDashboardOverview } from './admin/AdminDashboardOverview';
import { AdminIncidentsView } from './admin/AdminIncidentsView';
import { AdminCityMapView } from './admin/AdminCityMapView';
import { AdminEscalationsView } from './admin/AdminEscalationsView';
import { AdminSlaView } from './admin/AdminSlaView';
import { AdminOrganizationView } from './admin/AdminOrganizationView';
import { AdminResourcesView } from './admin/AdminResourcesView';
import { AdminIntelligenceView } from './admin/AdminIntelligenceView';
import { AdminGovernanceView } from './admin/AdminGovernanceView';
import { AdminSystemView } from './admin/AdminSystemView';
import { AdminDepartmentAnalysis } from './admin/AdminDepartmentAnalysis';
import { AdminCityReportsView } from './admin/AdminCityReportsView';

interface AdminPortalViewProps {
  activeTab?: string;
  onNavigateTab?: (tab: string) => void;
}

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  activeTab: externalTab,
  onNavigateTab: externalNavigate
}) => {
  const { user, tokens } = useAuth();
  const token = tokens?.accessToken || '';

  // Internal active view: maps externalTab or internal buttons
  const deriveInternalSection = (tab?: string) => {
    if (!tab) return 'dashboard';
    if (tab === 'portal_admin_incidents' || tab === 'portal_admin_city_reports') return 'city_reports';
    if (tab === 'portal_admin_departments' || tab === 'portal_admin_dept_analysis') return 'dept_analysis';
    if (tab === 'portal_admin_map') return 'map';
    if (tab === 'portal_admin_escalations') return 'escalations';
    if (tab === 'portal_admin_sla') return 'sla';
    if (tab === 'portal_admin_users' || tab === 'portal_admin_roles' || tab === 'portal_admin_teams' || tab === 'portal_admin_org') return 'organization';
    if (tab === 'portal_admin_resources') return 'resources';
    if (tab === 'portal_admin_ai' || tab === 'portal_admin_recurring' || tab === 'portal_admin_hotspots' || tab === 'portal_admin_analytics' || tab === 'portal_admin_intelligence') return 'intelligence';
    if (tab === 'portal_admin_audit' || tab === 'portal_admin_security' || tab === 'portal_admin_reports' || tab === 'portal_admin_governance') return 'governance';
    if (tab === 'portal_admin_health' || tab === 'portal_admin_notifications' || tab === 'portal_admin_config' || tab === 'portal_admin_system') return 'system';
    return 'dashboard';
  };

  const [activeSection, setActiveSection] = useState<string>(() => deriveInternalSection(externalTab));
  const [overviewData, setOverviewData] = useState<any>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);

  useEffect(() => {
    if (externalTab) {
      setActiveSection(deriveInternalSection(externalTab));
    }
  }, [externalTab]);

  const handleNavigate = (targetSection: string) => {
    setActiveSection(deriveInternalSection(targetSection));
    if (externalNavigate) {
      externalNavigate(targetSection);
    }
  };

  const fetchOverview = async () => {
    if (!token) return;
    setIsLoadingOverview(true);
    try {
      const res = await fetch('/api/v1/admin/overview', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setOverviewData(json);
      }
    } catch (err) {
      console.error('Failed to fetch admin overview', err);
    } finally {
      setIsLoadingOverview(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [token]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Administrative Navigation Strip */}
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-2 shadow-2xs overflow-x-auto">
        <div className="flex items-center space-x-1 min-w-max">
          <button
            id="admin-nav-dashboard"
            onClick={() => handleNavigate('portal_admin')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeSection === 'dashboard'
                ? 'bg-[#111111] text-[#FFFFFF]'
                : 'text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <div className="h-4 w-px bg-[#E5E5E5] mx-1" />

          {/* Civic Operations */}
          <button
            id="admin-nav-city-reports"
            onClick={() => handleNavigate('portal_admin_incidents')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeSection === 'city_reports' || activeSection === 'incidents'
                ? 'bg-[#111111] text-[#FFFFFF]'
                : 'text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            <span>City Reports Ledger</span>
          </button>

          <button
            id="admin-nav-dept-analysis"
            onClick={() => handleNavigate('portal_admin_departments')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeSection === 'dept_analysis'
                ? 'bg-[#111111] text-[#FFFFFF]'
                : 'text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>20-Dept Analysis</span>
          </button>

          <button
            id="admin-nav-map"
            onClick={() => handleNavigate('portal_admin_map')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeSection === 'map'
                ? 'bg-[#111111] text-[#FFFFFF]'
                : 'text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>City Map</span>
          </button>

          <button
            id="admin-nav-escalations"
            onClick={() => handleNavigate('portal_admin_escalations')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeSection === 'escalations'
                ? 'bg-[#DC2626] text-[#FFFFFF]'
                : 'text-[#DC2626] hover:bg-[#FEF2F2]'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Escalations</span>
          </button>

          <button
            id="admin-nav-sla"
            onClick={() => handleNavigate('portal_admin_sla')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeSection === 'sla'
                ? 'bg-[#111111] text-[#FFFFFF]'
                : 'text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>SLA Management</span>
          </button>

          <div className="h-4 w-px bg-[#E5E5E5] mx-1" />

          {/* Organization */}
          <button
            id="admin-nav-organization"
            onClick={() => handleNavigate('portal_admin_org')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeSection === 'organization'
                ? 'bg-[#111111] text-[#FFFFFF]'
                : 'text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Organization</span>
          </button>

          {/* Resources */}
          <button
            id="admin-nav-resources"
            onClick={() => handleNavigate('portal_admin_resources')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeSection === 'resources'
                ? 'bg-[#111111] text-[#FFFFFF]'
                : 'text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Resources</span>
          </button>

          {/* Intelligence */}
          <button
            id="admin-nav-intelligence"
            onClick={() => handleNavigate('portal_admin_intelligence')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeSection === 'intelligence'
                ? 'bg-[#111111] text-[#FFFFFF]'
                : 'text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Intelligence</span>
          </button>

          <div className="h-4 w-px bg-[#E5E5E5] mx-1" />

          {/* Governance */}
          <button
            id="admin-nav-governance"
            onClick={() => handleNavigate('portal_admin_governance')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeSection === 'governance'
                ? 'bg-[#111111] text-[#FFFFFF]'
                : 'text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Governance</span>
          </button>

          {/* System */}
          <button
            id="admin-nav-system"
            onClick={() => handleNavigate('portal_admin_system')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeSection === 'system'
                ? 'bg-[#111111] text-[#FFFFFF]'
                : 'text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>System</span>
          </button>
        </div>
      </div>

      {/* Main Section Content Router */}
      <div>
        {activeSection === 'dashboard' && (
          <AdminDashboardOverview
            data={overviewData}
            isLoading={isLoadingOverview}
            onRefresh={fetchOverview}
            onNavigate={handleNavigate}
          />
        )}

        {(activeSection === 'city_reports' || activeSection === 'incidents') && (
          <AdminCityReportsView
            token={token}
            onNavigateToDeptAnalysis={(deptId) => handleNavigate('portal_admin_departments')}
          />
        )}

        {activeSection === 'dept_analysis' && (
          <AdminDepartmentAnalysis
            token={token}
            onNavigateToIncidents={(deptId) => handleNavigate('portal_admin_incidents')}
          />
        )}

        {activeSection === 'map' && (
          <AdminCityMapView
            token={token}
            onNavigateToIncident={(id) => handleNavigate('portal_admin_incidents')}
          />
        )}

        {activeSection === 'escalations' && (
          <AdminEscalationsView
            token={token}
            onNavigateToIncident={(id) => handleNavigate('portal_admin_incidents')}
          />
        )}

        {activeSection === 'sla' && (
          <AdminSlaView
            token={token}
          />
        )}

        {activeSection === 'organization' && (
          <AdminOrganizationView
            token={token}
          />
        )}

        {activeSection === 'resources' && (
          <AdminResourcesView
            token={token}
          />
        )}

        {activeSection === 'intelligence' && (
          <AdminIntelligenceView
            token={token}
          />
        )}

        {activeSection === 'governance' && (
          <AdminGovernanceView
            token={token}
          />
        )}

        {activeSection === 'system' && (
          <AdminSystemView
            token={token}
          />
        )}
      </div>
    </div>
  );
};
