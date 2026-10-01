import React, { useState, useEffect } from 'react';
import {
  Home, Edit3, FileText, CheckCircle, MapPin, Bell,
  User, HelpCircle, LogOut, LayoutDashboard, ListOrdered,
  AlertTriangle, Map, Users, Package, Clock, CheckSquare,
  Layers, BarChart3, Building2, ShieldCheck, Sparkles,
  Flame, Shield, Server, Settings, PlusCircle, Wrench
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenDdl?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab
}) => {
  const { user, tokens, logout, departmentName } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Poll for real, isolated unread notifications count for the authenticated actor
  useEffect(() => {
    if (!tokens?.accessToken) {
      setUnreadCount(0);
      return;
    }
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/v1/notifications?unreadOnly=true', {
          headers: { Authorization: `Bearer ${tokens.accessToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount ?? data.count ?? 0);
        }
      } catch {
        // Silent catch for network hiccups
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [tokens?.accessToken]);

  const isResident = user?.role === 'RESIDENT' || activeTab.startsWith('portal_resident');
  const isAdmin = user?.role === 'ADMIN' || activeTab.startsWith('portal_admin');
  const isDept = !isResident && !isAdmin;

  // Active check helper with robust alias matching
  const isActive = (tabKey: string) => {
    if (activeTab === tabKey) return true;
    if (tabKey === 'portal_resident_verify' && activeTab === 'portal_resident_verification') return true;
    if (tabKey === 'portal_resident_notif' && activeTab === 'portal_resident_notifications') return true;
    if (tabKey === 'portal_dept_incidents' && activeTab === 'portal_dept_queue') return true;
    if (tabKey === 'portal_dept_verify' && activeTab === 'portal_dept_verification') return true;
    if (tabKey === 'portal_dept_notif' && activeTab === 'portal_dept_notifications') return true;
    if (tabKey === 'portal_admin_notif' && activeTab === 'portal_admin_notifications') return true;
    return false;
  };

  return (
    <aside className="w-60 lg:w-64 bg-[#111111] text-[#E4E4E7] flex flex-col shrink-0 h-screen select-none border-r border-[#18181B] z-20">
      {/* 1. Brand & Department Identifier Header (Reference Image Specification) */}
      <div className="p-4 border-b border-[#222225] flex items-center space-x-3 shrink-0">
        <div className="w-8 h-8 rounded-md bg-[#FFFFFF] text-[#111111] flex items-center justify-center font-black shadow-xs">
          <Building2 className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-sm text-[#FFFFFF] tracking-[-0.03em]">CivicConnect</div>
          <div className="text-[11.5px] text-[#A1A1AA] truncate font-normal mt-0.5" title={departmentName || undefined}>
            {isDept ? (departmentName || 'Department Operations') : isResident ? 'Smart Civic Services' : 'Municipal Administration'}
          </div>
          <div className="text-[10px] text-[#71717A] uppercase font-mono tracking-wider font-semibold mt-0.5">
            {isDept ? (departmentName ? `${departmentName} Officer` : 'Department Officer') : isResident ? 'Resident' : 'System Admin'}
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 text-[13px] font-medium scrollbar-thin">
        {/* RESIDENT PORTAL NAVIGATION */}
        {isResident && (
          <>
            <button
              id="sidebar-res-home"
              onClick={() => setActiveTab('portal_resident')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_resident')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>Home</span>
            </button>

            <button
              id="sidebar-res-report"
              onClick={() => setActiveTab('portal_resident_report')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_resident_report')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <Edit3 className="w-4 h-4 shrink-0" />
              <span>Report an Issue</span>
            </button>

            <button
              id="sidebar-res-my-reports"
              onClick={() => setActiveTab('portal_resident_reports')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_resident_reports')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>My Reports</span>
            </button>

            <button
              id="sidebar-res-verification"
              onClick={() => setActiveTab('portal_resident_verify')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_resident_verify')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Verification</span>
            </button>

            <button
              id="sidebar-res-nearby"
              onClick={() => setActiveTab('portal_resident_map')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_resident_map')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <MapPin className="w-4 h-4 shrink-0" />
              <span>Nearby Issues</span>
            </button>

            <button
              id="sidebar-res-notif"
              onClick={() => setActiveTab('portal_resident_notif')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_resident_notif')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Bell className="w-4 h-4 shrink-0" />
                <span>Notifications</span>
              </div>
              {unreadCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#EF4444] text-[#FFFFFF] text-[11px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            <button
              id="sidebar-res-profile"
              onClick={() => setActiveTab('portal_resident_profile')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_resident_profile')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              <span>Profile</span>
            </button>

            <button
              id="sidebar-res-help"
              onClick={() => setActiveTab('portal_resident_help')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_resident_help')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>Help & Support</span>
            </button>
          </>
        )}

        {/* DEPARTMENT PORTAL NAVIGATION */}
        {isDept && (
          <>
            <button
              id="sidebar-dept-overview"
              onClick={() => setActiveTab('portal_department')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_department')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Overview</span>
            </button>

            <button
              id="sidebar-dept-queue"
              onClick={() => setActiveTab('portal_dept_incidents')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_dept_incidents')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <ListOrdered className="w-4 h-4 shrink-0" />
              <span>Incident Queue</span>
            </button>

            <button
              id="sidebar-dept-priority"
              onClick={() => setActiveTab('portal_dept_priority')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_dept_priority')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Priority Issues</span>
            </button>

            <button
              id="sidebar-dept-map"
              onClick={() => setActiveTab('portal_dept_map')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_dept_map')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <Map className="w-4 h-4 shrink-0" />
              <span>Map</span>
            </button>

            <button
              id="sidebar-dept-teams"
              onClick={() => setActiveTab('portal_dept_teams')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_dept_teams')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Teams</span>
            </button>

            <button
              id="sidebar-dept-resources"
              onClick={() => setActiveTab('portal_dept_resources')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_dept_resources')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <Wrench className="w-4 h-4 shrink-0" />
              <span>Repair Requirements</span>
            </button>

            <button
              id="sidebar-dept-sla"
              onClick={() => setActiveTab('portal_dept_sla')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_dept_sla')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>SLA & Escalations</span>
            </button>

            <button
              id="sidebar-dept-verify"
              onClick={() => setActiveTab('portal_dept_verify')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_dept_verify')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <CheckSquare className="w-4 h-4 shrink-0" />
              <span>Resolution Verification</span>
            </button>

            <button
              id="sidebar-dept-recurring"
              onClick={() => setActiveTab('portal_dept_recurring')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_dept_recurring')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span>Recurring Issues</span>
            </button>

            <button
              id="sidebar-dept-analytics"
              onClick={() => setActiveTab('portal_dept_analytics')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_dept_analytics')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>Analytics</span>
            </button>

            <button
              id="sidebar-dept-notif"
              onClick={() => setActiveTab('portal_dept_notif')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_dept_notif')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Bell className="w-4 h-4 shrink-0" />
                <span>Notifications</span>
              </div>
              {unreadCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#EF4444] text-[#FFFFFF] text-[11px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </>
        )}

        {/* ADMIN PORTAL NAVIGATION */}
        {isAdmin && (
          <>
            <button
              id="sidebar-admin-dashboard"
              onClick={() => setActiveTab('portal_admin')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_admin')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Dashboard</span>
            </button>

            <button
              id="sidebar-admin-city-map"
              onClick={() => setActiveTab('portal_admin_city_map')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_admin_city_map')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <Map className="w-4 h-4 shrink-0" />
              <span>City Map</span>
            </button>

            <button
              id="sidebar-admin-incidents"
              onClick={() => setActiveTab('portal_admin_incidents')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_admin_incidents')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <ListOrdered className="w-4 h-4 shrink-0" />
              <span>City-Wide Reports</span>
            </button>

            <button
              id="sidebar-admin-depts"
              onClick={() => setActiveTab('portal_admin_departments')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_admin_departments')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <Building2 className="w-4 h-4 shrink-0" />
              <span>Department Analysis</span>
            </button>

            <button
              id="sidebar-admin-users"
              onClick={() => setActiveTab('portal_admin_users')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_admin_users')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Users</span>
            </button>

            <button
              id="sidebar-admin-roles"
              onClick={() => setActiveTab('portal_admin_roles')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_admin_roles')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Roles & Permissions</span>
            </button>

            <button
              id="sidebar-admin-teams"
              onClick={() => setActiveTab('portal_admin_teams')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_admin_teams')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Field Teams</span>
            </button>

            <button
              id="sidebar-admin-resources"
              onClick={() => setActiveTab('portal_admin_resources')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_admin_resources')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <Package className="w-4 h-4 shrink-0" />
              <span>Resources</span>
            </button>

            <button
              id="sidebar-admin-sla"
              onClick={() => setActiveTab('portal_admin_sla')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_admin_sla')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>SLA Management</span>
            </button>

            <button
              id="sidebar-admin-escalations"
              onClick={() => setActiveTab('portal_admin_escalations')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_admin_escalations')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Escalations</span>
            </button>

            <button
              id="sidebar-admin-ai"
              onClick={() => setActiveTab('portal_admin_insights')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_admin_insights')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>AI Insights</span>
            </button>

            <button
              id="sidebar-admin-hotspots"
              onClick={() => setActiveTab('portal_admin_hotspots')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_admin_hotspots')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <Flame className="w-4 h-4 shrink-0" />
              <span>Civic Hotspots</span>
            </button>

            <button
              id="sidebar-admin-analytics"
              onClick={() => setActiveTab('portal_admin_analytics')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_admin_analytics')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>Analytics</span>
            </button>

            <button
              id="sidebar-admin-audit"
              onClick={() => setActiveTab('system_audit')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('system_audit')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Audit Logs</span>
            </button>

            <button
              id="sidebar-admin-security"
              onClick={() => setActiveTab('security_suite')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('security_suite')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <Shield className="w-4 h-4 shrink-0" />
              <span>Security</span>
            </button>

            <button
              id="sidebar-admin-health"
              onClick={() => setActiveTab('portal_admin_health')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_admin_health')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <Server className="w-4 h-4 shrink-0" />
              <span>System Health</span>
            </button>

            <button
              id="sidebar-admin-notif"
              onClick={() => setActiveTab('portal_admin_notif')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_admin_notif')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <Bell className="w-4 h-4 shrink-0" />
              <span>Notifications</span>
            </button>

            <button
              id="sidebar-admin-config"
              onClick={() => setActiveTab('portal_admin_config')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive('portal_admin_config')
                  ? 'bg-[#27272A] text-[#FFFFFF] font-semibold'
                  : 'text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E]'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Configuration</span>
            </button>
          </>
        )}
      </div>

      {/* Logout Footer Button */}
      <div className="p-3 border-t border-[#1C1C1E]">
        <button
          onClick={() => logout(isDept ? '/department' : '/resident')}
          className="w-full flex items-center space-x-3 px-3 py-2 rounded-md text-[#A1A1AA] hover:text-[#FFFFFF] hover:bg-[#1C1C1E] transition-colors text-xs font-medium"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
