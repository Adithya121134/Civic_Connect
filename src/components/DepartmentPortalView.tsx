import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Clock, MapPin, AlertTriangle, CheckCircle2,
  RefreshCw, Search, Filter, Layers, ArrowRight, Eye, Check, X,
  Wrench, Truck, HardHat, FileText, ChevronRight, BarChart3, Bell,
  ShieldCheck, ShieldX, UserPlus, Phone, Calendar
} from 'lucide-react';
import { OverviewDashboardView } from './department/OverviewDashboardView';
import { IncidentDetailView } from './department/IncidentDetailView';
import { TeamAssignmentView } from './department/TeamAssignmentView';
import { IncidentQueueView } from './department/IncidentQueueView';
import { ResourcesView } from './department/ResourcesView';
import { AnalyticsHotspotsView } from './department/AnalyticsHotspotsView';
import { ResolutionReviewModal } from './department/ResolutionReviewModal';
import { IncidentMapWorkspace } from './maps/IncidentMapWorkspace';
import { GoogleMap, MarkerData } from './maps/GoogleMap';

interface DepartmentPortalViewProps {
  activeTab?: string;
  onNavigateTab?: (tab: string) => void;
}

export const DepartmentPortalView: React.FC<DepartmentPortalViewProps> = ({
  activeTab: propTab,
  onNavigateTab
}) => {
  const { user, tokens, departmentId, departmentName, departmentCode } = useAuth();

  // Internal tab state
  const [currentTab, setCurrentTab] = useState<
    'overview' | 'incident_queue' | 'priority_issues' | 'map' |
    'teams' | 'resources' | 'sla_escalations' | 'verification' |
    'recurring_issues' | 'analytics' | 'notifications'
  >('overview');

  // View Mode: 'normal' | 'detail' | 'assign_team'
  const [viewMode, setViewMode] = useState<'normal' | 'detail' | 'assign_team'>('normal');
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);

  // Synchronize with external propTab if provided
  useEffect(() => {
    if (!propTab) return;
    setViewMode('normal'); // Reset view mode on explicit navigation
    if (propTab === 'portal_department') setCurrentTab('overview');
    else if (propTab === 'portal_dept_queue' || propTab === 'portal_dept_incidents') setCurrentTab('incident_queue');
    else if (propTab === 'portal_dept_priority') setCurrentTab('priority_issues');
    else if (propTab === 'portal_dept_map') setCurrentTab('map');
    else if (propTab === 'portal_dept_teams') setCurrentTab('teams');
    else if (propTab === 'portal_dept_resources') setCurrentTab('resources');
    else if (propTab === 'portal_dept_sla') setCurrentTab('sla_escalations');
    else if (propTab === 'portal_dept_verification' || propTab === 'portal_dept_verify') setCurrentTab('verification');
    else if (propTab === 'portal_dept_recurring') setCurrentTab('recurring_issues');
    else if (propTab === 'portal_dept_analytics') setCurrentTab('analytics');
    else if (propTab === 'portal_dept_notifications' || propTab === 'portal_dept_notif') setCurrentTab('notifications');
  }, [propTab]);

  const handleTabChange = (tab: any) => {
    setCurrentTab(tab);
    setViewMode('normal');
    if (onNavigateTab) {
      if (tab === 'overview') onNavigateTab('portal_department');
      else onNavigateTab(`portal_dept_${tab.replace('_issues', '').replace('_escalations', '')}`);
    }
  };

  const [isLoading, setIsLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [priorityIncidents, setPriorityIncidents] = useState<any[]>([]);
  const [slaData, setSlaData] = useState<any>(null);
  const [mapPoints, setMapPoints] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [resolutions, setResolutions] = useState<any[]>([]);
  const [recurringIssues, setRecurringIssues] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Resolution modal state
  const [selectedResolutionForReview, setSelectedResolutionForReview] = useState<any | null>(null);

  const fetchAllData = async () => {
    if (!tokens) return;
    setIsLoading(true);

    const headers = { Authorization: `Bearer ${tokens.accessToken}` };

    try {
      // 1. Dashboard Metrics
      const dashRes = await fetch('/api/v1/department/dashboard', { headers });
      if (dashRes.ok) setDashboardData(await dashRes.json());

      // 2. Incident Queue
      const queueRes = await fetch('/api/v1/department/incidents', { headers });
      if (queueRes.ok) {
        const qJson = await queueRes.json();
        setIncidents(qJson.incidents || []);
      }

      // 3. Priority Queue
      const prioRes = await fetch('/api/v1/department/incidents/priority', { headers });
      if (prioRes.ok) {
        const pJson = await prioRes.json();
        setPriorityIncidents(pJson.priorityIncidents || []);
      }

      // 4. SLA Timers
      const slaRes = await fetch('/api/v1/department/sla', { headers });
      if (slaRes.ok) setSlaData(await slaRes.json());

      // 5. Map Points
      const mapRes = await fetch('/api/v1/department/map', { headers });
      if (mapRes.ok) {
        const mJson = await mapRes.json();
        setMapPoints(mJson.points || []);
      }

      // 6. Teams & Workers
      const teamsRes = await fetch('/api/v1/department/teams', { headers });
      if (teamsRes.ok) {
        const tJson = await teamsRes.json();
        setTeams(tJson.teams || []);
      }

      const workersRes = await fetch('/api/v1/department/workers', { headers });
      if (workersRes.ok) {
        const wJson = await workersRes.json();
        setWorkers(wJson.workers || []);
      }

      // 7. Resolutions / Verifications
      const verRes = await fetch('/api/v1/department/verifications', { headers });
      if (verRes.ok) {
        const vJson = await verRes.json();
        setResolutions(vJson.verifications || []);
      }

      // 8. Recurring Issues
      const recRes = await fetch('/api/v1/department/recurring-issues', { headers });
      if (recRes.ok) {
        const rJson = await recRes.json();
        setRecurringIssues(rJson.recurringIssues || []);
      }

      // 9. Notifications
      const notRes = await fetch('/api/v1/department/notifications', { headers });
      if (notRes.ok) {
        const nJson = await notRes.json();
        setNotifications(nJson.notifications || []);
      }
    } catch (err) {
      console.error('Failed to load department command data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [tokens, departmentId]);

  // Handler to open incident detail view
  const handleOpenIncidentDetail = (incident: any) => {
    setSelectedIncident(incident);
    setViewMode('detail');
  };

  // Handler to open team assignment view
  const handleOpenTeamAssignment = (incident?: any) => {
    if (incident) setSelectedIncident(incident);
    else if (!selectedIncident && incidents.length > 0) setSelectedIncident(incidents[0]);
    setViewMode('assign_team');
  };

  return (
    <div className="space-y-6 text-[#111111] max-w-7xl mx-auto pb-16">
      {/* 1. If in Detail View Mode (Reference Image Panel 2) */}
      {viewMode === 'detail' && selectedIncident && (
        <IncidentDetailView
          incident={selectedIncident}
          onBack={() => {
            setViewMode('normal');
            setSelectedIncident(null);
          }}
          onOpenTeamAssignment={() => setViewMode('assign_team')}
          onStatusUpdated={() => {
            fetchAllData();
          }}
          tokens={tokens}
        />
      )}

      {/* 2. If in Team Assignment View Mode (Reference Image Panel 3) */}
      {viewMode === 'assign_team' && (
        <TeamAssignmentView
          incident={selectedIncident || incidents[0]}
          teams={teams}
          token={tokens?.accessToken}
          onBack={() => setViewMode('detail')}
          onAssignedSuccess={(teamName) => {
            fetchAllData();
          }}
        />
      )}

      {/* 3. Normal Main Tabs */}
      {viewMode === 'normal' && (
        <>
          {/* TAB 1: OVERVIEW DASHBOARD (Reference Image Panel 1) */}
          {currentTab === 'overview' && (
            <OverviewDashboardView
              departmentName={departmentName || 'Public Works & Infrastructure'}
              incidents={incidents}
              dashboardMetrics={dashboardData}
              slaData={slaData}
              onSelectIncident={handleOpenIncidentDetail}
              onNavigateTab={handleTabChange}
              onStatusUpdated={fetchAllData}
              tokens={tokens}
            />
          )}

          {/* TAB 2: INCIDENT QUEUE (Reference Image Panel 4) */}
          {currentTab === 'incident_queue' && (
            <IncidentQueueView
              incidents={incidents}
              departmentName={departmentName || 'Roads'}
              onSelectIncident={handleOpenIncidentDetail}
              onNavigateTab={handleTabChange}
            />
          )}

          {/* TAB 3: PRIORITY ISSUES */}
          {currentTab === 'priority_issues' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-[#111111]">
                    Priority & Critical Incidents ({departmentName || 'Roads'})
                  </h1>
                  <p className="text-xs text-[#71717A] mt-0.5">
                    High-urgency civic hazards requiring immediate dispatch and SLA intervention.
                  </p>
                </div>
              </div>

              <IncidentQueueView
                incidents={
                  priorityIncidents.length > 0
                    ? priorityIncidents
                    : incidents.filter(
                        i => (i.priority || i.severity || '').toUpperCase().includes('CRITICAL') ||
                             (i.priority || i.severity || '').toUpperCase().includes('HIGH')
                      )
                }
                departmentName={departmentName || 'Roads'}
                onSelectIncident={handleOpenIncidentDetail}
                onNavigateTab={handleTabChange}
              />
            </div>
          )}

          {/* TAB 4: MAP (Full Geospatial Incident Intelligence) */}
          {currentTab === 'map' && (
            <IncidentMapWorkspace
              incidents={incidents}
              isLoading={isLoading}
              title={`Geospatial Incident Command (${departmentName || 'Department Operations'})`}
              subtitle="Real-time territory map with synchronized incident queue, multi-criteria filtering, and operational intelligence."
              portalType="department"
              departmentName={departmentName || 'Department'}
              onViewIncident={(inc) => handleOpenIncidentDetail(inc)}
              onRetry={fetchAllData}
            />
          )}

          {/* TAB 5: TEAMS */}
          {currentTab === 'teams' && (
            <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-[#111111]">
                    Department Field Crews & Teams
                  </h1>
                  <p className="text-xs text-[#71717A] mt-0.5">
                    Field crews, crew leads, active work orders, and vehicle deployment status.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { id: '1', name: 'Road Maintenance A', zone: 'Zone 04 (Central)', lead: 'Ramanathan K.', workers: 6, status: 'Active (On-Site)', workOrder: 'INC-2026-00421', phone: '+91 98401 22341' },
                  { id: '2', name: 'Road Maintenance B', zone: 'Zone 02 (North)', lead: 'Karthik S.', workers: 4, status: 'Available', workOrder: 'None (Standby)', phone: '+91 98401 22342' },
                  { id: '3', name: 'Road Maintenance C', zone: 'Zone 07 (East)', lead: 'Murugan V.', workers: 6, status: 'Active (On-Site)', workOrder: 'INC-2026-00395', phone: '+91 98401 22343' },
                ].map((t) => (
                  <div key={t.id} className="p-4 border border-[#E5E5E5] rounded-lg space-y-3 bg-[#FAFAFA]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#18181B]">{t.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.status.includes('Active') ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#EFF6FF] text-[#2563EB]'
                      }`}>
                        {t.status}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-[#52525B]">
                      <div><strong>Territory:</strong> {t.zone}</div>
                      <div><strong>Crew Lead:</strong> {t.lead}</div>
                      <div><strong>Crew Size:</strong> {t.workers} Technicians</div>
                      <div><strong>Current Work Order:</strong> <span className="font-mono font-bold text-[#18181B]">{t.workOrder}</span></div>
                    </div>

                    <div className="pt-2 border-t border-[#E5E5E5] flex items-center justify-between text-xs">
                      <span className="flex items-center space-x-1 text-[#71717A]">
                        <Phone className="w-3 h-3" />
                        <span>{t.phone}</span>
                      </span>
                      <button
                        onClick={() => handleOpenTeamAssignment()}
                        className="px-2.5 py-1 bg-[#111111] hover:bg-[#27272A] text-[#FFFFFF] text-[11px] font-semibold rounded-md transition-colors"
                      >
                        Dispatch
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: RESOURCES / REPAIR REQUIREMENTS */}
          {currentTab === 'resources' && (
            <ResourcesView
              departmentName={departmentName || 'Roads'}
              onSelectIncident={(inc) => {
                setSelectedIncident(inc);
                setViewMode('detail');
              }}
            />
          )}

          {/* TAB 7: SLA & ESCALATIONS */}
          {currentTab === 'sla_escalations' && (
            <div className="space-y-6">
              <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-5 shadow-2xs space-y-4">
                <div>
                  <h1 className="text-xl font-bold text-[#111111]">
                    SLA Compliance & Escalation Monitoring
                  </h1>
                  <p className="text-xs text-[#71717A] mt-0.5">
                    Real-time countdown clocks, breached tickets, and risk threshold tracking.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-[#FFFFFF] border border-[#16A34A] rounded-lg">
                    <span className="text-xs font-bold text-[#16A34A] uppercase">On Track</span>
                    <span className="text-2xl font-bold text-[#18181B] block mt-1">19 Incidents</span>
                    <span className="text-[11px] text-[#71717A] block mt-1">&gt; 50% SLA duration remaining</span>
                  </div>

                  <div className="p-4 bg-[#FFFFFF] border border-[#D97706] rounded-lg">
                    <span className="text-xs font-bold text-[#D97706] uppercase">At Risk</span>
                    <span className="text-2xl font-bold text-[#D97706] block mt-1">3 Incidents</span>
                    <span className="text-[11px] text-[#71717A] block mt-1">&lt; 30 mins to target breach</span>
                  </div>

                  <div className="p-4 bg-[#FFFFFF] border border-[#DC2626] rounded-lg">
                    <span className="text-xs font-bold text-[#DC2626] uppercase">Breached / Escalated</span>
                    <span className="text-2xl font-bold text-[#DC2626] block mt-1">2 Incidents</span>
                    <span className="text-[11px] text-[#71717A] block mt-1">Escalated to City Commissioner</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: RESOLUTION VERIFICATION */}
          {currentTab === 'verification' && (
            <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-[#111111]">
                    Resolution Verification Queue
                  </h1>
                  <p className="text-xs text-[#71717A] mt-0.5">
                    Field-resolved work orders pending Department Officer visual audit and closeout approval.
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-[#FEF3C7] text-[#D97706] rounded-md font-semibold text-xs">
                  {resolutions.length || 1} Pending Approval
                </span>
              </div>

              <div className="divide-y divide-[#F4F4F5] text-xs">
                {(resolutions.length > 0 ? resolutions : [
                  {
                    id: 'res-001',
                    incidentId: 'INC-2026-00405',
                    title: 'Manhole Issue Replaced',
                    teamName: 'Road Maintenance B',
                    address: 'Ward 07, Lake View Road',
                    completedAt: 'Today, 10:15 AM',
                    status: 'PENDING_OFFICER_REVIEW'
                  }
                ]).map((res) => (
                  <div key={res.id} className="py-3.5 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-[#18181B]">{res.incidentId}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#D97706]">
                          Awaiting Signoff
                        </span>
                      </div>
                      <div className="font-bold text-[#18181B]">{res.title}</div>
                      <div className="text-[11px] text-[#71717A]">
                        Resolved by {res.teamName} &bull; {res.address} &bull; {res.completedAt}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedResolutionForReview(res)}
                      className="px-3 py-1.5 bg-[#111111] hover:bg-[#27272A] text-[#FFFFFF] font-semibold text-xs rounded-md transition-colors shadow-2xs"
                    >
                      Audit & Approve
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 9 & 10: ANALYTICS & HOTSPOTS (Reference Image Panel 6) */}
          {(currentTab === 'analytics' || currentTab === 'recurring_issues') && (
            <AnalyticsHotspotsView
              departmentName={departmentName || 'Roads'}
              onSelectHotspotWard={(ward) => {
                handleTabChange('incident_queue');
              }}
            />
          )}

          {/* TAB 11: NOTIFICATIONS */}
          {currentTab === 'notifications' && (
            <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-[#111111]">
                  Department Operational Alerts
                </h1>
                <button
                  onClick={() => alert('All notifications marked as read.')}
                  className="text-xs text-[#18181B] font-semibold hover:underline"
                >
                  Mark all as read
                </button>
              </div>

              <div className="space-y-3 divide-y divide-[#F4F4F5] text-xs">
                <div className="pt-2 flex items-start space-x-3">
                  <div className="w-7 h-7 rounded-full bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-[#18181B]">P1 Critical Incident: INC-2026-00421 Dispatched</div>
                    <div className="text-[#71717A]">Road Maintenance A en route to Ward 04, Main Road. Estimated arrival in 8 mins.</div>
                    <div className="text-[10px] text-[#A1A1AA] mt-0.5 font-mono">10 minutes ago</div>
                  </div>
                </div>

                <div className="pt-3 flex items-start space-x-3">
                  <div className="w-7 h-7 rounded-full bg-[#FFEDD5] text-[#EA580C] flex items-center justify-center shrink-0 mt-0.5">
                    <Wrench className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-[#18181B]">Resource Threshold Warning: Hot Mix Asphalt Low</div>
                    <div className="text-[#71717A]">Central depot stock is at 16% capacity. Reorder request initiated with Public Works.</div>
                    <div className="text-[10px] text-[#A1A1AA] mt-0.5 font-mono">25 minutes ago</div>
                  </div>
                </div>

                <div className="pt-3 flex items-start space-x-3">
                  <div className="w-7 h-7 rounded-full bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-[#18181B]">Incident INC-2026-00405 Resolved by Crew B</div>
                    <div className="text-[#71717A]">Ready for Resolution Verification signoff by Department Officer.</div>
                    <div className="text-[10px] text-[#A1A1AA] mt-0.5 font-mono">42 minutes ago</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Resolution Review Modal */}
      {selectedResolutionForReview && (
        <ResolutionReviewModal
          resolution={selectedResolutionForReview}
          isOpen={!!selectedResolutionForReview}
          onClose={() => setSelectedResolutionForReview(null)}
          token={tokens?.accessToken || ''}
          onReviewed={() => {
            fetchAllData();
            setSelectedResolutionForReview(null);
          }}
        />
      )}
    </div>
  );
};
