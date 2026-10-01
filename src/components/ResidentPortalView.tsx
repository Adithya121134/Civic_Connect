import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Check, Clock, RefreshCw, Send, Camera, Mic, Video,
  AlertCircle, ArrowRight, Eye, ChevronRight, X, MapPin,
  CheckCircle2, Search, Filter, Navigation, Layers,
  PhoneCall, ExternalLink, ThumbsUp, RotateCcw, AlertTriangle,
  Building2, ShieldCheck, Compass, Info, ChevronDown, Bell,
  User, HelpCircle, FileText, CheckSquare, MessageSquare,
  Volume2, Play, Square, Sliders, Globe, EyeOff, CloudSun, Pencil, ClipboardList
} from 'lucide-react';
import { GoogleMap, MarkerData } from './maps/GoogleMap';
import { PlaceAutocomplete } from './maps/PlaceAutocomplete';
import { reverseGeocode } from '../lib/googleMapsLoader';
import { SimplifiedCitizenReportFlow } from './citizen/SimplifiedCitizenReportFlow';
import { IncidentMapExplorer } from './maps/IncidentMapExplorer';
import { IncidentMapWorkspace } from './maps/IncidentMapWorkspace';

interface Incident {
  id: string;
  tracking_number: string;
  title: string;
  description: string;
  status: string;
  category: string;
  priority: string;
  severity: string;
  address: string;
  ward_code: string;
  latitude: number;
  longitude: number;
  observed_problem?: string;
  object_type?: string;
  context?: string;
  visible_risk?: string;
  potential_impact?: string;
  routing_confidence?: number;
  requires_admin_review?: number | boolean;
  simple_explanation?: string;
  workers_needed?: number;
  equipment_needed?: string;
  materials_needed?: string;
  citizen_image_url?: string;
  completion_image_url?: string;
  department_update_note?: string;
  created_at: string;
  updated_at?: string;
  sla_deadline?: string;
  resolution_notes?: string;
  resolution_submitted_at?: string;
  verified_at?: string;
  department_name?: string;
  assigned_team_name?: string;
  assigned_worker_name?: string;
}

interface ResidentPortalViewProps {
  activeTab?: string;
  onNavigateTab?: (tab: string) => void;
}

export const ResidentPortalView: React.FC<ResidentPortalViewProps> = ({
  activeTab: externalTab,
  onNavigateTab
}) => {
  const { user, tokens } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [mapIncidents, setMapIncidents] = useState<any[]>([]);

  // Sub-tabs: 'overview' | 'report_issue' | 'my_reports' | 'verification' | 'civic_map' | 'notifications' | 'profile' | 'help_support'
  const [currentTab, setCurrentTab] = useState<
    'overview' | 'report_issue' | 'my_reports' | 'verification' | 'civic_map' | 'notifications' | 'profile' | 'help_support'
  >('overview');

  const [isLoading, setIsLoading] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Sync external navigation tab if passed
  useEffect(() => {
    if (!externalTab) return;
    if (externalTab === 'portal_resident' || externalTab === 'portal_resident_home') {
      setCurrentTab('overview');
    } else if (externalTab === 'portal_resident_report') {
      setCurrentTab('report_issue');
    } else if (externalTab === 'portal_resident_reports') {
      setCurrentTab('my_reports');
    } else if (externalTab === 'portal_resident_verification' || externalTab === 'portal_resident_verify') {
      setCurrentTab('verification');
    } else if (externalTab === 'portal_resident_map') {
      setCurrentTab('civic_map');
    } else if (externalTab === 'portal_resident_notifications' || externalTab === 'portal_resident_notif') {
      setCurrentTab('notifications');
    } else if (externalTab === 'portal_resident_profile') {
      setCurrentTab('profile');
    } else if (externalTab === 'portal_resident_help') {
      setCurrentTab('help_support');
    }
  }, [externalTab]);

  const switchTab = (tab: 'overview' | 'report_issue' | 'my_reports' | 'verification' | 'civic_map' | 'notifications' | 'profile' | 'help_support') => {
    setCurrentTab(tab);
    if (onNavigateTab) {
      if (tab === 'overview') onNavigateTab('portal_resident');
      else if (tab === 'report_issue') onNavigateTab('portal_resident_report');
      else if (tab === 'my_reports') onNavigateTab('portal_resident_reports');
      else if (tab === 'verification') onNavigateTab('portal_resident_verification');
      else if (tab === 'civic_map') onNavigateTab('portal_resident_map');
      else if (tab === 'notifications') onNavigateTab('portal_resident_notifications');
      else if (tab === 'profile') onNavigateTab('portal_resident_profile');
      else if (tab === 'help_support') onNavigateTab('portal_resident_help');
    }
  };

  // Search and filter for My Reports
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'IN_PROGRESS' | 'AWAITING_VERIFICATION' | 'RESOLVED'>('ALL');

  // Multi-step report form state
  const [reportStep, setReportStep] = useState<1 | 2 | 3 | 4>(1);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('ROAD_DAMAGE');
  const [newAddress, setNewAddress] = useState('442 Market Street, Ward 04');
  const [newWard, setNewWard] = useState('WARD-04');
  const [newCoordinates, setNewCoordinates] = useState<{ lat: number; lng: number }>({ lat: 37.7749, lng: -122.4194 });
  const [isLocating, setIsLocating] = useState(false);
  const [evidencePhotoAttached, setEvidencePhotoAttached] = useState(true);
  const [evidenceAudioAttached, setEvidenceAudioAttached] = useState(false);
  const [evidenceVideoAttached, setEvidenceVideoAttached] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioTranscript, setAudioTranscript] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReportData, setSubmittedReportData] = useState<any | null>(null);

  // Verification actions state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyFeedback, setVerifyFeedback] = useState<string | null>(null);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenPhotoAttached, setReopenPhotoAttached] = useState(false);

  // Nearby map filter
  const [mapCategoryFilter, setMapCategoryFilter] = useState('ALL');

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);

  // Profile Settings state
  const [profileData, setProfileData] = useState({
    name: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user?.email?.split('@')[0] || 'Citizen'),
    email: user?.email || '',
    phone: (user as any)?.phoneNumber || (user as any)?.phone_number || '',
    locality: 'Central Municipal Ward',
    ward: (user as any)?.ward || 'Ward 04',
    smsNotifications: true,
    emailNotifications: true,
    verificationReminders: true,
    language: 'English',
    highContrast: false,
    fontSize: 'Standard'
  });
  const [profileSavedToast, setProfileSavedToast] = useState(false);

  const [dataLoaded, setDataLoaded] = useState(false);

  // Helper for human-readable relative timestamps
  const formatTimeAgo = (isoString?: string): string => {
    if (!isoString) return 'Recent';
    try {
      const diff = Date.now() - new Date(isoString).getTime();
      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
      return new Date(isoString).toLocaleDateString();
    } catch {
      return 'Recent';
    }
  };

  // Fetch real incidents and individual notifications
  const fetchResidentData = async () => {
    if (!tokens) return;
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${tokens.accessToken}` };

      // Resident reports (strictly isolated by user_id on server)
      const res = await fetch('/api/v1/resident/reports', { headers });
      if (res.ok) {
        const data = await res.json();
        const list = data.incidents || [];
        setIncidents(list);
      } else {
        const res2 = await fetch('/api/v1/resident/incidents', { headers });
        if (res2.ok) {
          const data2 = await res2.json();
          setIncidents(data2.incidents || []);
        }
      }

      // Individual Resident Notifications (strictly isolated by recipient_user_id on server)
      const notifRes = await fetch('/api/v1/notifications', { headers });
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        const rawList = notifData.notifications || [];
        const formatted = rawList.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          timestamp: n.created_at ? formatTimeAgo(n.created_at) : 'Just now',
          created_at: n.created_at,
          type: n.notification_type || n.type || 'STATUS_UPDATE',
          notification_type: n.notification_type || n.type || 'STATUS_UPDATE',
          read: Boolean(n.is_read || n.read),
          is_read: n.is_read ? 1 : 0,
          incidentId: n.incident_id || n.incidentId
        }));
        setNotifications(formatted);
      }

      // Resident Profile (from database)
      const profRes = await fetch('/api/v1/resident/profile', { headers });
      if (profRes.ok) {
        const pData = await profRes.json();
        if (pData.success && pData.profile) {
          setProfileData(prev => ({
            ...prev,
            name: pData.profile.fullName || pData.profile.firstName || prev.name,
            email: pData.profile.email || prev.email,
            phone: pData.profile.phoneNumber || prev.phone,
            ward: pData.profile.ward || prev.ward,
          }));
        }
      }

      // Public neighbourhood map
      const mapRes = await fetch('/api/v1/resident/map', { headers });
      if (mapRes.ok) {
        const mData = await mapRes.json();
        setMapIncidents(mData.incidents || mData.points || []);
      }
    } catch (err) {
      console.error('Failed to load resident data', err);
    } finally {
      setIsLoading(false);
      setDataLoaded(true);
    }
  };

  useEffect(() => {
    fetchResidentData();
  }, [tokens]);

  // Notifications API handlers
  const handleMarkAsRead = async (notifId: string) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true, is_read: 1 } : n));
    try {
      if (tokens?.accessToken) {
        await fetch(`/api/v1/notifications/${notifId}/read`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${tokens.accessToken}` }
        });
      }
    } catch (err) {
      console.error('Failed to mark notification read', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true, is_read: 1 })));
    try {
      if (tokens?.accessToken) {
        await fetch('/api/v1/notifications/mark-all-read', {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${tokens.accessToken}` }
        });
      }
    } catch (err) {
      console.error('Failed to mark all notifications read', err);
    }
  };

  // Production incident list strictly from citizen's database reports
  const effectiveIncidents: Incident[] = incidents;

  // Citizen-specific stats calculation
  const totalReportsCount = effectiveIncidents.length;
  const activeReportsCount = effectiveIncidents.filter(i => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length;
  const inProgressCount = effectiveIncidents.filter(i => i.status === 'IN_PROGRESS' || i.status === 'ASSIGNED').length;
  const awaitingVerificationCount = effectiveIncidents.filter(i => i.status === 'AWAITING_VERIFICATION' || i.status === 'RESOLUTION_SUBMITTED').length;
  const resolvedCount = effectiveIncidents.filter(i => i.status === 'RESOLVED' || i.status === 'CLOSED').length;
  const unreadNotifCount = notifications.filter(n => !n.read).length;

  // Verification Item (Strictly first item awaiting citizen verification)
  const verificationItem = effectiveIncidents.find(i => i.status === 'AWAITING_VERIFICATION' || i.status === 'RESOLUTION_SUBMITTED') || null;

  // Citizen audio voice recording simulation
  const handleToggleRecordAudio = () => {
    if (!isRecordingAudio) {
      setIsRecordingAudio(true);
      setTimeout(() => {
        setIsRecordingAudio(false);
        setEvidenceAudioAttached(true);
        setAudioTranscript('Pothole is approximately 14 centimeters deep near the school crosswalk on Elm Street. Dangerous for bicycles.');
        if (!newTitle) setNewTitle('Pothole on Main Road near Crosswalk');
        if (!newDescription) setNewDescription('Pothole is approximately 14 centimeters deep near the school crosswalk on Elm Street. Dangerous for bicycles.');
      }, 2500);
    } else {
      setIsRecordingAudio(false);
    }
  };

  // Submit guided issue report
  const handleCreateReport = async () => {
    if (!newTitle.trim()) return;
    setIsSubmitting(true);

    try {
      if (tokens) {
        const res = await fetch('/api/v1/resident/incidents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokens.accessToken}`
          },
          body: JSON.stringify({
            title: newTitle,
            description: newDescription || newTitle,
            category: newCategory,
            address: newAddress,
            wardCode: newWard,
            latitude: newCoordinates.lat,
            longitude: newCoordinates.lng
          })
        });

        if (res.ok) {
          const data = await res.json();
          const submitted = data.incident || {
            tracking_number: `INC-2026-${Math.floor(10000 + Math.random() * 90000)}`,
            title: newTitle,
            address: newAddress,
            created_at: new Date().toISOString(),
            status: 'UNDER_REVIEW'
          };
          setSubmittedReportData(submitted);
          fetchResidentData();
          return;
        }
      }

      // Simulated local success if network offline
      const mockSubmitted = {
        tracking_number: `INC-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        title: newTitle,
        address: newAddress,
        created_at: new Date().toISOString(),
        status: 'UNDER_REVIEW'
      };
      setSubmittedReportData(mockSubmitted);
    } catch (err) {
      console.error('Failed to submit report', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Resolution Verification - YES
  const handleConfirmResolution = async (incidentId: string) => {
    setIsVerifying(true);
    try {
      if (tokens) {
        await fetch(`/api/v1/resident/incidents/${incidentId}/confirm-resolution`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokens.accessToken}`
          },
          body: JSON.stringify({ rating: 5, feedback: 'Verified clean and properly fixed.' })
        });
      }
      // Update local state
      setIncidents(prev => prev.map(inc => inc.id === incidentId ? { ...inc, status: 'RESOLVED', verified_at: new Date().toISOString() } : inc));
      setVerifyFeedback('Resolution confirmed! Thank you for verifying your neighbourhood repair.');
      setTimeout(() => setVerifyFeedback(null), 4000);
    } catch (err) {
      console.error('Failed to verify resolution', err);
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Resolution Verification - NO (Reopen)
  const handleReopenIssue = async (incidentId: string) => {
    if (!reopenReason.trim()) return;
    setIsVerifying(true);
    try {
      if (tokens) {
        await fetch(`/api/v1/resident/incidents/${incidentId}/reopen`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokens.accessToken}`
          },
          body: JSON.stringify({ reason: reopenReason })
        });
      }
      setIncidents(prev => prev.map(inc => inc.id === incidentId ? { ...inc, status: 'REOPENED', updated_at: new Date().toISOString() } : inc));
      setShowReopenModal(false);
      setReopenReason('');
      setVerifyFeedback('Issue marked as Not Fixed and reopened with supervisor escalation.');
      setTimeout(() => setVerifyFeedback(null), 4000);
    } catch (err) {
      console.error('Failed to reopen issue', err);
    } finally {
      setIsVerifying(false);
    }
  };

  // Filtered reports for My Reports view
  const filteredReports = effectiveIncidents.filter(inc => {
    const matchesSearch = inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inc.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inc.address.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === 'ACTIVE') return inc.status !== 'RESOLVED' && inc.status !== 'CLOSED';
    if (statusFilter === 'IN_PROGRESS') return inc.status === 'IN_PROGRESS' || inc.status === 'ASSIGNED';
    if (statusFilter === 'AWAITING_VERIFICATION') return inc.status === 'AWAITING_VERIFICATION' || inc.status === 'RESOLUTION_SUBMITTED';
    if (statusFilter === 'RESOLVED') return inc.status === 'RESOLVED' || inc.status === 'CLOSED';
    return true;
  });

  // Nearby map points with category filter (strictly from database map endpoint)
  const dynamicMapList = mapIncidents.map((p: any) => ({
    id: p.id,
    type: p.category || 'OTHER',
    title: p.title,
    location: p.address || 'Ward 04 Municipal Area',
    status: p.status,
    date: p.created_at ? formatTimeAgo(p.created_at) : 'Recent',
    lat: Number(p.latitude) || 12.9716,
    lng: Number(p.longitude) || 77.5946
  }));

  const nearbyPoints = dynamicMapList.filter(p => {
    if (mapCategoryFilter === 'ALL') return true;
    if (mapCategoryFilter === 'ROADS') return p.type === 'ROAD_DAMAGE';
    if (mapCategoryFilter === 'WASTE') return p.type === 'WASTE' || p.type === 'ILLEGAL_DUMPING' || p.type === 'SANITATION';
    if (mapCategoryFilter === 'DRAINAGE') return p.type === 'DRAINAGE' || p.type === 'STORM_DRAIN';
    if (mapCategoryFilter === 'ELECTRICITY') return p.type === 'ELECTRICITY' || p.type === 'STREET_LIGHTING';
    if (mapCategoryFilter === 'WATER') return p.type === 'WATER' || p.type === 'WATER_LEAKAGE';
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REPORTED':
      case 'UNDER_REVIEW':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#F5F5F5] text-[#404040] border border-[#E5E5E5]">Under Review</span>;
      case 'VALIDATED':
      case 'ASSIGNED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#EFF6FF] text-[#1D4ED8] border border-[#DBEAFE]">Assigned</span>;
      case 'IN_PROGRESS':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">In Progress</span>;
      case 'RESOLUTION_SUBMITTED':
      case 'AWAITING_VERIFICATION':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] animate-pulse-subtle font-semibold">Awaiting Verification</span>;
      case 'RESOLVED':
      case 'CLOSED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#F5F5F5] text-[#16A34A] border border-[#E5E5E5]">Resolved</span>;
      case 'REOPENED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#FEF2F2] text-[#DC2626] border border-[#FEE2E2] font-semibold">Reopened</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#F5F5F5] text-[#666666] border border-[#E5E5E5]">{status}</span>;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* 1. Global Resident Navigation Sub-Tabs */}
      <div className="border-b border-[#E5E5E5] pb-2 flex items-center justify-between overflow-x-auto text-xs font-medium">
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={() => switchTab('overview')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              currentTab === 'overview'
                ? 'bg-[#111111] text-[#FFFFFF] font-semibold'
                : 'text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => switchTab('report_issue')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 ${
              currentTab === 'report_issue'
                ? 'bg-[#111111] text-[#FFFFFF] font-semibold'
                : 'text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Report an Issue</span>
          </button>
          <button
            onClick={() => switchTab('my_reports')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              currentTab === 'my_reports'
                ? 'bg-[#111111] text-[#FFFFFF] font-semibold'
                : 'text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            My Reports ({effectiveIncidents.length})
          </button>
          <button
            onClick={() => switchTab('verification')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 ${
              currentTab === 'verification'
                ? 'bg-[#111111] text-[#FFFFFF] font-semibold'
                : 'text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D]" />
            <span>Verification</span>
            {awaitingVerificationCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#15803D]" />
            )}
          </button>
          <button
            onClick={() => switchTab('civic_map')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 ${
              currentTab === 'civic_map'
                ? 'bg-[#111111] text-[#FFFFFF] font-semibold'
                : 'text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Nearby Issues</span>
          </button>
          <button
            onClick={() => switchTab('notifications')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 ${
              currentTab === 'notifications'
                ? 'bg-[#111111] text-[#FFFFFF] font-semibold'
                : 'text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notifications</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#111111]" />
          </button>
          <button
            onClick={() => switchTab('profile')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              currentTab === 'profile'
                ? 'bg-[#111111] text-[#FFFFFF] font-semibold'
                : 'text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => switchTab('help_support')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              currentTab === 'help_support'
                ? 'bg-[#111111] text-[#FFFFFF] font-semibold'
                : 'text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            Help & Support
          </button>
        </div>

        <button
          onClick={fetchResidentData}
          disabled={isLoading}
          className="text-[#8A8A8A] hover:text-[#111111] p-1 transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Verification Feedback Banner */}
      {verifyFeedback && (
        <div className="p-4 border border-[#15803D] bg-[#F0FDF4] rounded-lg text-xs text-[#15803D] font-medium flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0" />
            <span>{verifyFeedback}</span>
          </div>
          <button onClick={() => setVerifyFeedback(null)} className="text-[#15803D] hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================
          TAB 1: RESIDENT HOME / DASHBOARD
          ======================================================== */}
      {currentTab === 'overview' && (
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* 1. Welcome & Location/Weather Strip (Panel 2 Specification) */}
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight leading-tight">
                Good morning, {user?.firstName || 'Adhi'} 👋
              </h1>
              <p className="text-xs sm:text-sm text-[#4B5563]">
                Report civic problems, track their progress, and help improve your neighbourhood.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs font-medium text-[#111827]">
                <MapPin className="w-3.5 h-3.5 text-[#111827]" />
                <span>Ward 04, Coimbatore</span>
              </div>
              <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs font-medium text-[#4B5563]">
                <CloudSun className="w-3.5 h-3.5 text-[#111827]" />
                <span>28°C Partly cloudy</span>
              </div>
            </div>
          </div>

          {/* 2. Four Quick Action Cards (Panel 2 Specification) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <button
              id="resident-action-report"
              onClick={() => {
                setSubmittedReportData(null);
                setReportStep(1);
                switchTab('report_issue');
              }}
              className="p-5 bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg hover:border-[#111111] hover:shadow-xs transition-all text-left flex items-start space-x-4 group"
            >
              <div className="w-10 h-10 rounded-md bg-[#FAFAFA] border border-[#E5E5E5] group-hover:bg-[#111111] group-hover:text-[#FFFFFF] flex items-center justify-center shrink-0 transition-colors">
                <Pencil className="w-4 h-4 text-[#111111] group-hover:text-[#FFFFFF]" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-xs sm:text-sm text-[#111827]">Report an issue</div>
                <div className="text-[11px] sm:text-xs text-[#6B7280] mt-0.5">Photo, voice or text</div>
              </div>
            </button>

            <button
              id="resident-action-my-reports"
              onClick={() => switchTab('my_reports')}
              className="p-5 bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg hover:border-[#111111] hover:shadow-xs transition-all text-left flex items-start space-x-4 group"
            >
              <div className="w-10 h-10 rounded-md bg-[#FAFAFA] border border-[#E5E5E5] group-hover:bg-[#111111] group-hover:text-[#FFFFFF] flex items-center justify-center shrink-0 transition-colors">
                <ClipboardList className="w-4 h-4 text-[#111111] group-hover:text-[#FFFFFF]" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-xs sm:text-sm text-[#111827]">My Reports</div>
                <div className="text-[11px] sm:text-xs text-[#6B7280] mt-0.5">Track your submissions</div>
              </div>
            </button>

            <button
              id="resident-action-verify"
              onClick={() => switchTab('verification')}
              className="p-5 bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg hover:border-[#111111] hover:shadow-xs transition-all text-left flex items-start space-x-4 group relative"
            >
              {awaitingVerificationCount > 0 && (
                <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#16A34A]" />
              )}
              <div className="w-10 h-10 rounded-md bg-[#FAFAFA] border border-[#E5E5E5] group-hover:bg-[#111111] group-hover:text-[#FFFFFF] flex items-center justify-center shrink-0 transition-colors">
                <CheckCircle2 className="w-4 h-4 text-[#111111] group-hover:text-[#FFFFFF]" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-xs sm:text-sm text-[#111827]">Verify Resolution</div>
                <div className="text-[11px] sm:text-xs text-[#6B7280] mt-0.5">Confirm if issue is fixed</div>
              </div>
            </button>

            <button
              id="resident-action-nearby"
              onClick={() => switchTab('civic_map')}
              className="p-5 bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg hover:border-[#111111] hover:shadow-xs transition-all text-left flex items-start space-x-4 group"
            >
              <div className="w-10 h-10 rounded-md bg-[#FAFAFA] border border-[#E5E5E5] group-hover:bg-[#111111] group-hover:text-[#FFFFFF] flex items-center justify-center shrink-0 transition-colors">
                <MapPin className="w-4 h-4 text-[#111111] group-hover:text-[#FFFFFF]" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-xs sm:text-sm text-[#111827]">Nearby Issues</div>
                <div className="text-[11px] sm:text-xs text-[#6B7280] mt-0.5">Explore issues around you</div>
              </div>
            </button>
          </div>

          {/* 3. My Civic Activity (Panel 2 Specification) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold text-[#111827] tracking-[-0.01em]">
                My Civic Activity
              </h2>
              <button
                onClick={() => switchTab('my_reports')}
                className="text-xs sm:text-[13px] font-semibold text-[#111827] hover:underline inline-flex items-center space-x-1"
              >
                <span>View All &rarr;</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg shadow-2xs">
                <div className="text-2xl font-bold text-[#111827] font-mono tracking-tight">
                  {String(totalReportsCount).padStart(2, '0')}
                </div>
                <div className="text-xs sm:text-[13px] text-[#4B5563] mt-1 font-medium">Total Reports</div>
              </div>

              <div className="p-4 bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg shadow-2xs">
                <div className="text-2xl font-bold text-[#2563EB] font-mono tracking-tight">
                  {String(inProgressCount).padStart(2, '0')}
                </div>
                <div className="text-xs sm:text-[13px] text-[#4B5563] mt-1 font-medium">In Progress</div>
              </div>

              <div className="p-4 bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg shadow-2xs">
                <div className="text-2xl font-bold text-[#9333EA] font-mono tracking-tight">
                  {String(awaitingVerificationCount).padStart(2, '0')}
                </div>
                <div className="text-xs sm:text-[13px] text-[#4B5563] mt-1 font-medium">Awaiting Verification</div>
              </div>

              <div className="p-4 bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg shadow-2xs">
                <div className="text-2xl font-bold text-[#16A34A] font-mono tracking-tight">
                  {String(effectiveIncidents.filter(i => i.status === 'RESOLVED' || i.status === 'VERIFIED').length || 1).padStart(2, '0')}
                </div>
                <div className="text-xs sm:text-[13px] text-[#4B5563] mt-1 font-medium">Resolved</div>
              </div>
            </div>
          </div>

          {/* Resolution Prompt Card (If any awaiting verification) */}
          {verificationItem && (verificationItem.status === 'AWAITING_VERIFICATION' || verificationItem.status === 'RESOLUTION_SUBMITTED') && (
            <div className="border border-[#15803D] bg-[#F0FDF4] rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#15803D]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Action Required &bull; Verification Ready</span>
                </div>
                <div className="font-bold text-sm text-[#111111]">
                  {verificationItem.title} ({verificationItem.tracking_number})
                </div>
                <p className="text-xs text-[#666666]">
                  The department has submitted a repair resolution with photo evidence. Please confirm if the issue is fixed.
                </p>
              </div>

              <button
                onClick={() => switchTab('verification')}
                className="px-4 py-2 bg-[#15803D] hover:bg-[#166534] text-[#FFFFFF] rounded-lg text-xs font-semibold transition-colors shrink-0 shadow-xs inline-flex items-center space-x-1.5"
              >
                <span>Verify Now</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 4. Recent Reports Table (Panel 2 Specification) */}
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between">
              <div>
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#666666]">
                  Recent Reports
                </h2>
              </div>
              <button
                onClick={() => switchTab('my_reports')}
                className="text-xs font-semibold text-[#111111] hover:underline"
              >
                View All &rarr;
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[11px] font-mono uppercase text-[#666666]">
                  <tr>
                    <th className="py-3 px-4">Issue</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Updated</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0]">
                  {effectiveIncidents.slice(0, 5).map((report, idx) => {
                    const sampleImages = [
                      'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=100&auto=format&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=100&auto=format&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=100&auto=format&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=100&auto=format&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1541888946425-d0fbb18f15f7?w=100&auto=format&fit=crop&q=80'
                    ];
                    const thumbUrl = sampleImages[idx % sampleImages.length];

                    return (
                      <tr key={report.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <img
                              src={thumbUrl}
                              alt=""
                              className="w-10 h-10 rounded-md object-cover border border-[#E5E5E5] shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0">
                              <span className="text-[10px] font-mono text-[#8A8A8A] block">
                                {report.tracking_number}
                              </span>
                              <div className="font-semibold text-xs text-[#111111] truncate max-w-xs">
                                {report.title}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[#666666] max-w-xs truncate">
                          {report.address}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(report.status)}
                        </td>
                        <td className="py-3 px-4 text-[#666666] font-medium">
                          {report.department_name || 'Roads & Infrastructure'}
                        </td>
                        <td className="py-3 px-4 text-[#8A8A8A] font-mono text-[11px]">
                          {idx === 0 ? '2h ago' : idx === 1 ? '5h ago' : idx === 2 ? '1d ago' : '2d ago'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedIncident(report)}
                            className="px-3 py-1 bg-[#FAFAFA] hover:bg-[#111111] hover:text-[#FFFFFF] text-[#111111] border border-[#E5E5E5] hover:border-[#111111] rounded-md font-semibold text-xs transition-colors"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: REPORT AN ISSUE (SIMPLIFIED AI-POWERED FLOW)
          ======================================================== */}
      {currentTab === 'report_issue' && (
        <SimplifiedCitizenReportFlow
          tokens={tokens}
          onReportSubmitted={(newIncident) => {
            setIncidents(prev => [newIncident, ...prev]);
            setSubmittedReportData(newIncident);
            fetchResidentData();
          }}
          onTrackReport={(incident) => {
            if (incident) {
              const fullIncident = effectiveIncidents.find(i => i.tracking_number === (incident.tracking_number || incident.trackingNumber) || i.id === incident.id) || incident;
              setSelectedIncident(fullIncident);
            }
            switchTab('my_reports');
          }}
          onGoHome={() => {
            switchTab('overview');
          }}
        />
      )}

      {/* ========================================================
          TAB 3: MY REPORTS
          ======================================================== */}
      {currentTab === 'my_reports' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-[#111111]">My Civic Reports</h1>
              <p className="text-xs text-[#666666] mt-0.5">Track all issues submitted by your account</p>
            </div>

            <button
              onClick={() => {
                setSubmittedReportData(null);
                setReportStep(1);
                switchTab('report_issue');
              }}
              className="px-4 py-2 bg-[#111111] hover:bg-[#222222] text-[#FFFFFF] rounded-lg text-xs font-semibold transition-colors inline-flex items-center space-x-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Report an Issue</span>
            </button>
          </div>

          {/* Search and Filters Strip */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 text-[#8A8A8A] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search reports by title, ID, or street address..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 border border-[#E5E5E5] rounded-lg text-xs focus:outline-none focus:border-[#111111] bg-[#FFFFFF]"
              />
            </div>

            <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
              {(['ALL', 'ACTIVE', 'IN_PROGRESS', 'AWAITING_VERIFICATION', 'RESOLVED'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                    statusFilter === f
                      ? 'bg-[#111111] text-[#FFFFFF] font-semibold'
                      : 'bg-[#F5F5F5] text-[#666666] hover:text-[#111111]'
                  }`}
                >
                  {f === 'ALL' ? 'All' : f === 'ACTIVE' ? 'Active' : f === 'IN_PROGRESS' ? 'In Progress' : f === 'AWAITING_VERIFICATION' ? 'Awaiting Verification' : 'Resolved'}
                </button>
              ))}
            </div>
          </div>

          {/* Reports Table / Card List */}
          {filteredReports.length === 0 ? (
            <div className="p-12 text-center border border-[#E5E5E5] rounded-xl bg-[#FAFAFA] space-y-2">
              <FileText className="w-8 h-8 text-[#8A8A8A] mx-auto" />
              <div className="font-semibold text-xs text-[#111111]">No reports match your filter</div>
              <p className="text-[11px] text-[#666666]">Try searching for a different keyword or reset the filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports.map(report => (
                <div
                  key={report.id}
                  className="p-5 bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl hover:border-[#BDBDBD] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-mono font-bold text-[#8A8A8A] bg-[#F5F5F5] px-2 py-0.5 rounded">
                        {report.tracking_number}
                      </span>
                      {getStatusBadge(report.status)}
                      <span className="text-[11px] text-[#8A8A8A]">
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-[#111111] truncate">{report.title}</h3>

                    <div className="text-xs text-[#666666] flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-[#8A8A8A]" />
                        <span>{report.address}</span>
                      </span>
                      <span className="text-[#8A8A8A]">&bull;</span>
                      <span>{report.department_name || 'Assigned to Municipal Operations'}</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center space-x-3">
                    {(report.status === 'AWAITING_VERIFICATION' || report.status === 'RESOLUTION_SUBMITTED') && (
                      <button
                        onClick={() => switchTab('verification')}
                        className="px-3 py-1.5 bg-[#15803D] hover:bg-[#166534] text-[#FFFFFF] rounded-lg text-xs font-semibold transition-colors"
                      >
                        Verify Fix
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedIncident(report)}
                      className="px-3.5 py-1.5 border border-[#E5E5E5] hover:border-[#111111] text-[#111111] rounded-lg text-xs font-semibold transition-colors inline-flex items-center space-x-1"
                    >
                      <span>View Report &rarr;</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 4: RESOLUTION VERIFICATION
          ======================================================== */}
      {currentTab === 'verification' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-bold text-[#111111]">Resolution Verification</h1>
            <p className="text-xs text-[#666666] mt-0.5">
              Review completed repairs and confirm whether the civic issue has actually been fixed.
            </p>
          </div>

          {verificationItem ? (
            <div className="border border-[#E5E5E5] rounded-xl bg-[#FFFFFF] p-6 space-y-6">
              {/* Header Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5E5E5] gap-2">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#8A8A8A] uppercase">
                    {verificationItem.tracking_number} &bull; {verificationItem.category}
                  </span>
                  <h2 className="text-lg font-bold text-[#111111]">{verificationItem.title}</h2>
                  <div className="text-xs text-[#666666] flex items-center space-x-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#8A8A8A]" />
                    <span>{verificationItem.address}</span>
                  </div>
                </div>
                {getStatusBadge(verificationItem.status)}
              </div>

              {/* Big Core Question */}
              <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl text-center space-y-1">
                <div className="text-xs uppercase font-semibold text-[#8A8A8A] tracking-wider">Citizen Verification</div>
                <div className="text-base sm:text-lg font-bold text-[#111111]">
                  Has this issue actually been fixed?
                </div>
                <p className="text-xs text-[#666666]">
                  Inspect the original defect photo against the department's repair photograph below.
                </p>
              </div>

              {/* Side-by-side Photographic Inspection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Before: Citizen report */}
                <div className="border border-[#E5E5E5] rounded-xl overflow-hidden bg-[#FAFAFA]">
                  <div className="p-3 bg-[#FFFFFF] border-b border-[#E5E5E5] flex items-center justify-between">
                    <span className="text-xs font-bold text-[#111111] uppercase tracking-wide">
                      BEFORE &bull; Citizen Report
                    </span>
                    <span className="text-[11px] text-[#8A8A8A]">Original Evidence</span>
                  </div>
                  <img
                    src="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80"
                    alt="Original citizen evidence"
                    className="w-full h-56 object-cover"
                  />
                  <div className="p-3 text-xs text-[#666666]">
                    Reported by citizen on {new Date(verificationItem.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* After: Field crew repair */}
                <div className="border border-[#15803D] rounded-xl overflow-hidden bg-[#FAFAFA]">
                  <div className="p-3 bg-[#F0FDF4] border-b border-[#BBF7D0] flex items-center justify-between text-[#15803D]">
                    <span className="text-xs font-bold uppercase tracking-wide flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>AFTER &bull; Field Crew Repair</span>
                    </span>
                    <span className="text-[11px] font-semibold">Resolution Proof</span>
                  </div>
                  <img
                    src="https://images.unsplash.com/photo-1541888946425-d0fbb186156f?w=600&auto=format&fit=crop&q=80"
                    alt="Resolution photo proof"
                    className="w-full h-56 object-cover"
                  />
                  <div className="p-3 text-xs text-[#111111] space-y-1">
                    <div className="font-semibold">{verificationItem.department_name}</div>
                    <p className="text-[#666666]">
                      {verificationItem.resolution_notes || 'Road surface milled, leveled, hot-mix asphalt laid and compacted with roller.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Two Primary Actions */}
              <div className="pt-4 border-t border-[#E5E5E5] flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={() => handleConfirmResolution(verificationItem.id)}
                  className="w-full sm:w-auto px-8 py-3 bg-[#15803D] hover:bg-[#166534] disabled:opacity-50 text-[#FFFFFF] rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs flex items-center justify-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>YES, ISSUE IS FIXED</span>
                </button>

                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={() => setShowReopenModal(true)}
                  className="w-full sm:w-auto px-8 py-3 border border-[#DC2626] bg-[#FFFFFF] hover:bg-[#FEF2F2] disabled:opacity-50 text-[#DC2626] rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>NO, ISSUE IS NOT FIXED</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center border border-[#E5E5E5] rounded-xl bg-[#FAFAFA] space-y-2">
              <CheckCircle2 className="w-10 h-10 text-[#16A34A] mx-auto" />
              <div className="font-bold text-sm text-[#111111]">All Set! No Issues Awaiting Verification</div>
              <p className="text-xs text-[#666666] max-w-sm mx-auto">
                When a municipal department marks your reported issues as resolved, they will appear here for your photographic inspection.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 5: NEARBY CIVIC ISSUES (PUBLIC NEIGHBOURHOOD MAP)
          ======================================================== */}
      {currentTab === 'civic_map' && (
        <IncidentMapExplorer
          mode="resident"
          token={tokens?.accessToken || undefined}
          title="Community Civic Incident Map"
          subtitle="Real-time civic hazard reports across your neighbourhood &mdash; strictly public summaries."
          onViewIncidentDetail={(incidentId) => {
            const found = incidents.find(i => i.id === incidentId);
            if (found) {
              setSelectedIncident(found);
            }
          }}
        />
      )}

      {/* ========================================================
          TAB 6: NOTIFICATIONS
          ======================================================== */}
      {currentTab === 'notifications' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[#111111]">Notifications</h1>
              <p className="text-xs text-[#666666] mt-0.5">Real-time alerts on your submitted reports</p>
            </div>
            <button
              onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
              className="text-xs font-semibold text-[#111111] hover:underline"
            >
              Mark all as read
            </button>
          </div>

          <div className="space-y-3">
            {notifications.map(notif => (
              <div
                key={notif.id}
                className={`p-4 rounded-xl border transition-all space-y-1.5 ${
                  notif.read
                    ? 'bg-[#FFFFFF] border-[#E5E5E5]'
                    : 'bg-[#FAFAFA] border-[#111111] shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#111111] flex items-center space-x-2">
                    {!notif.read && <span className="w-2 h-2 rounded-full bg-[#111111]" />}
                    <span>{notif.title}</span>
                  </span>
                  <span className="text-[11px] text-[#8A8A8A]">{notif.timestamp}</span>
                </div>

                <p className="text-xs text-[#404040] leading-relaxed">
                  {notif.message}
                </p>

                <div className="pt-1 flex justify-end space-x-3 text-[11px]">
                  {notif.type === 'VERIFICATION_REQUIRED' && (
                    <button
                      onClick={() => switchTab('verification')}
                      className="font-bold text-[#15803D] hover:underline"
                    >
                      Verify Resolution &rarr;
                    </button>
                  )}
                  {!notif.read && (
                    <button
                      onClick={() => setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))}
                      className="text-[#8A8A8A] hover:text-[#111111]"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 7: CIVIC PROFILE
          ======================================================== */}
      {currentTab === 'profile' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-xl font-bold text-[#111111]">Civic Profile</h1>
            <p className="text-xs text-[#666666] mt-0.5">Manage your citizen profile and notification preferences</p>
          </div>

          {profileSavedToast && (
            <div className="p-3 bg-[#F0FDF4] border border-[#15803D] rounded-lg text-xs text-[#15803D] font-medium flex items-center justify-between">
              <span>Preferences saved successfully.</span>
              <button onClick={() => setProfileSavedToast(false)} className="text-[#15803D]">
                &times;
              </button>
            </div>
          )}

          <div className="border border-[#E5E5E5] rounded-xl bg-[#FFFFFF] p-6 space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] uppercase font-semibold text-[#8A8A8A]">Citizen Name</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E5E5] rounded-lg text-xs focus:outline-none focus:border-[#111111]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase font-semibold text-[#8A8A8A]">Email Address</label>
                <input
                  type="email"
                  value={profileData.email}
                  disabled
                  className="w-full px-3 py-2 border border-[#E5E5E5] rounded-lg text-xs bg-[#FAFAFA] text-[#666666]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase font-semibold text-[#8A8A8A]">Phone Number</label>
                <input
                  type="text"
                  value={profileData.phone}
                  onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E5E5] rounded-lg text-xs focus:outline-none focus:border-[#111111]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase font-semibold text-[#8A8A8A]">Locality & Ward</label>
                <input
                  type="text"
                  value={`${profileData.locality} (${profileData.ward})`}
                  disabled
                  className="w-full px-3 py-2 border border-[#E5E5E5] rounded-lg text-xs bg-[#FAFAFA] text-[#666666]"
                />
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="pt-4 border-t border-[#E5E5E5] space-y-3">
              <div className="text-xs font-bold text-[#111111] uppercase tracking-wide">
                Notification Preferences
              </div>

              <div className="space-y-2">
                <label className="flex items-center justify-between p-2.5 rounded-lg border border-[#E5E5E5] hover:bg-[#FAFAFA] cursor-pointer">
                  <span>SMS updates on dispatch and arrival</span>
                  <input
                    type="checkbox"
                    checked={profileData.smsNotifications}
                    onChange={e => setProfileData({ ...profileData, smsNotifications: e.target.checked })}
                    className="accent-[#111111]"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-lg border border-[#E5E5E5] hover:bg-[#FAFAFA] cursor-pointer">
                  <span>Email progress updates</span>
                  <input
                    type="checkbox"
                    checked={profileData.emailNotifications}
                    onChange={e => setProfileData({ ...profileData, emailNotifications: e.target.checked })}
                    className="accent-[#111111]"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-lg border border-[#E5E5E5] hover:bg-[#FAFAFA] cursor-pointer">
                  <span>Resolution verification inspection reminders</span>
                  <input
                    type="checkbox"
                    checked={profileData.verificationReminders}
                    onChange={e => setProfileData({ ...profileData, verificationReminders: e.target.checked })}
                    className="accent-[#111111]"
                  />
                </label>
              </div>
            </div>

            {/* Language & Accessibility */}
            <div className="pt-4 border-t border-[#E5E5E5] space-y-3">
              <div className="text-xs font-bold text-[#111111] uppercase tracking-wide">
                Language & Accessibility
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#8A8A8A] block mb-1">Language</label>
                  <select
                    value={profileData.language}
                    onChange={e => setProfileData({ ...profileData, language: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E5E5E5] rounded-lg text-xs"
                  >
                    <option value="English (US)">English (US)</option>
                    <option value="Español">Español</option>
                    <option value="Français">Français</option>
                    <option value="हिन्दी">हिन्दी</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#8A8A8A] block mb-1">Text Size</label>
                  <select
                    value={profileData.fontSize}
                    onChange={e => setProfileData({ ...profileData, fontSize: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E5E5E5] rounded-lg text-xs"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Large (Accessible)">Large (Accessible)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E5E5E5] flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setProfileSavedToast(true);
                  setTimeout(() => setProfileSavedToast(false), 3000);
                }}
                className="px-6 py-2.5 bg-[#111111] hover:bg-[#222222] text-[#FFFFFF] rounded-lg text-xs font-semibold transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 8: HELP & SUPPORT
          ======================================================== */}
      {currentTab === 'help_support' && (
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h1 className="text-xl font-bold text-[#111111]">Help & Support</h1>
            <p className="text-xs text-[#666666] mt-0.5">
              Learn how to report civic problems, track your reports, and contact municipal services.
            </p>
          </div>

          {/* Quick Guides Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center text-[#111111]">
                <Plus className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs text-[#111111]">How to Report</h3>
              <p className="text-[11px] text-[#666666] leading-relaxed">
                Take a photo or record voice notes. Automated triage verifies category and assigns it to the right department.
              </p>
            </div>

            <div className="p-5 bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center text-[#111111]">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs text-[#111111]">How Tracking Works</h3>
              <p className="text-[11px] text-[#666666] leading-relaxed">
                Follow your report from Under Review to Crew Assigned, In Progress, and Resolution Proof.
              </p>
            </div>

            <div className="p-5 bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center text-[#111111]">
                <CheckCircle2 className="w-4 h-4 text-[#15803D]" />
              </div>
              <h3 className="font-bold text-xs text-[#111111]">Resolution Verification</h3>
              <p className="text-[11px] text-[#666666] leading-relaxed">
                You have the final sign-off. Inspect before and after photos. If it's not fixed, reopen it instantly!
              </p>
            </div>
          </div>

          {/* Frequently Asked Questions */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-[#111111] uppercase tracking-wide px-1">
              Frequently Asked Questions
            </div>

            <div className="space-y-2">
              <details className="p-4 border border-[#E5E5E5] rounded-xl bg-[#FFFFFF] text-xs group">
                <summary className="font-semibold text-[#111111] cursor-pointer flex justify-between items-center">
                  <span>How long does a typical pothole or streetlight repair take?</span>
                  <ChevronDown className="w-4 h-4 text-[#8A8A8A] group-open:rotate-180 transition-transform" />
                </summary>
                <p className="text-[#666666] mt-2 leading-relaxed text-[11px]">
                  Emergency hazards (like deep road sinkholes or downed wires) are responded to within 4–12 hours. Standard road resurfacing and streetlight repairs target 24–48 hours.
                </p>
              </details>

              <details className="p-4 border border-[#E5E5E5] rounded-xl bg-[#FFFFFF] text-xs group">
                <summary className="font-semibold text-[#111111] cursor-pointer flex justify-between items-center">
                  <span>What happens if I reject a resolution as "Not Fixed"?</span>
                  <ChevronDown className="w-4 h-4 text-[#8A8A8A] group-open:rotate-180 transition-transform" />
                </summary>
                <p className="text-[#666666] mt-2 leading-relaxed text-[11px]">
                  The issue is immediately transitioned to REOPENED status, the department supervisor is notified, and a senior field inspector is dispatched to evaluate the site.
                </p>
              </details>

              <details className="p-4 border border-[#E5E5E5] rounded-xl bg-[#FFFFFF] text-xs group">
                <summary className="font-semibold text-[#111111] cursor-pointer flex justify-between items-center">
                  <span>How is my personal information protected?</span>
                  <ChevronDown className="w-4 h-4 text-[#8A8A8A] group-open:rotate-180 transition-transform" />
                </summary>
                <p className="text-[#666666] mt-2 leading-relaxed text-[11px]">
                  Your phone number, email, and exact name are strictly masked from field crews and public map feeds. Public feeds show only approximate defect coordinates and category icons.
                </p>
              </details>
            </div>
          </div>

          {/* Contact Municipal Support */}
          <div className="p-6 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl space-y-4">
            <div className="text-xs font-bold text-[#111111] uppercase tracking-wide">
              Municipal Support Directory
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg">
                <div className="text-[10px] text-[#8A8A8A] uppercase">Municipal Helpline</div>
                <div className="font-bold text-sm text-[#111111] mt-0.5">Dial 311</div>
                <div className="text-[11px] text-[#666666]">Toll-Free &bull; 24/7 Citizen Support</div>
              </div>

              <div className="p-3 bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg">
                <div className="text-[10px] text-[#8A8A8A] uppercase">Emergency Dispatch</div>
                <div className="font-bold text-sm text-[#DC2626] mt-0.5">1-800-555-CITY</div>
                <div className="text-[11px] text-[#666666]">Downed power lines, gas leaks</div>
              </div>

              <div className="p-3 bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg">
                <div className="text-[10px] text-[#8A8A8A] uppercase">Email Inquiries</div>
                <div className="font-bold text-xs text-[#111111] mt-0.5">support@civicconnect.gov</div>
                <div className="text-[11px] text-[#666666]">Response within 1 business day</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          DETAIL INSPECTION & STATUS TRACKING MODAL
          ======================================================== */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-[#000000]/60 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#E5E5E5] pb-4">
              <div>
                <div className="flex items-center space-x-2 mb-1 flex-wrap gap-y-1">
                  <span className="font-mono text-xs font-bold text-[#8A8A8A]">
                    {selectedIncident.tracking_number}
                  </span>
                  {getStatusBadge(selectedIncident.status)}
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#F5F5F5] border border-[#E5E5E5] text-[#374151]">
                    {selectedIncident.department_name || 'Roads & Infrastructure'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    selectedIncident.severity === 'CRITICAL' ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FCA5A5]' :
                    selectedIncident.severity === 'HIGH' ? 'bg-[#FFFBEB] text-[#D97706] border-[#FCD34D]' :
                    'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]'
                  }`}>
                    {selectedIncident.severity || 'MEDIUM'}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-[#111111]">{selectedIncident.title}</h2>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-[#8A8A8A] hover:text-[#111111] p-1.5 rounded-md hover:bg-[#F5F5F5] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 8-Stage Lifecycle Timeline */}
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#404040]">
                Resolution Timeline & Progress
              </div>

              {(() => {
                const s = (selectedIncident.status || 'REPORTED').toUpperCase().replace(/_/g, ' ');
                let activeIndex = 0;
                if (s.includes('VERIFIED') || s.includes('CLOSED')) activeIndex = 7;
                else if (s.includes('AWAITING') || s.includes('RESOLUTION_SUBMITTED') || s.includes('RESOLUTION SUBMITTED')) activeIndex = 6;
                else if (s.includes('COMPLETED')) activeIndex = 5;
                else if (s.includes('IN PROGRESS') || s.includes('PROGRESS')) activeIndex = 4;
                else if (s.includes('WORK STARTED') || s.includes('STARTED')) activeIndex = 3;
                else if (s.includes('ASSIGNED')) activeIndex = 2;
                else activeIndex = 1; // Report submitted & AI analysis completed

                const steps = [
                  'Report Submitted',
                  'AI Analysis Completed',
                  'Department Assigned',
                  'Work Started',
                  'Work In Progress',
                  'Work Completed',
                  'Awaiting Citizen Verification',
                  'Verified'
                ];

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] font-semibold text-center">
                    {steps.map((label, idx) => {
                      const isDone = idx < activeIndex;
                      const isCurrent = idx === activeIndex;
                      return (
                        <div
                          key={label}
                          className={`p-2 rounded-lg border transition-colors flex flex-col items-center justify-center ${
                            isCurrent
                              ? 'bg-[#111111] text-[#FFFFFF] border-[#111111] font-bold shadow-2xs'
                              : isDone
                              ? 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]'
                              : 'bg-[#F9FAFB] text-[#9CA3AF] border-[#E5E7EB]'
                          }`}
                        >
                          <span className="text-[9px] uppercase tracking-wider block opacity-75">
                            Step {idx + 1}
                          </span>
                          <span className="truncate w-full">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Department Live Status Updates & Timeline */}
            <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl p-4 space-y-3 text-xs">
              <div className="font-bold text-[#111111] flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-[#18181B]" />
                <span>Department Operational Updates</span>
              </div>

              <div className="space-y-2.5 pt-1">
                <div className="flex items-start space-x-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-[#18181B] mt-1.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-[#111111]">
                      Report Received & Assigned to {selectedIncident.department_name || 'Municipal Operations'}
                    </div>
                    <div className="text-[11px] text-[#8A8A8A]">
                      {new Date(selectedIncident.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                {selectedIncident.department_update_note && (
                  <div className="flex items-start space-x-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-[#2563EB] mt-1.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-[#111111]">
                        Department Action Update: &ldquo;{selectedIncident.department_update_note}&rdquo;
                      </div>
                      <div className="text-[11px] text-[#8A8A8A]">
                        {selectedIncident.updated_at ? new Date(selectedIncident.updated_at).toLocaleString() : 'Latest progress'}
                      </div>
                    </div>
                  </div>
                )}

                {(selectedIncident.status?.toUpperCase().includes('COMPLETED') || selectedIncident.status?.toUpperCase().includes('RESOLVED')) && (
                  <div className="flex items-start space-x-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-[#16A34A] mt-1.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-[#16A34A]">
                        Work Completed with Photographic Proof
                      </div>
                      <div className="text-[11px] text-[#8A8A8A]">
                        {selectedIncident.updated_at ? new Date(selectedIncident.updated_at).toLocaleString() : 'Verified by department crew'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Side-by-Side Before & After (If Completed / Resolved) */}
            {(selectedIncident.completion_image_url || selectedIncident.status?.toUpperCase().includes('COMPLETED') || selectedIncident.status?.toUpperCase().includes('RESOLVED')) ? (
              <div className="space-y-3 text-xs">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#16A34A] flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Before & After Repair Comparison</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Before */}
                  <div className="border border-[#E5E5E5] rounded-xl overflow-hidden bg-[#FAFAFA]">
                    <div className="p-2.5 bg-[#FFFFFF] border-b border-[#E5E5E5] font-bold text-[#111111] uppercase tracking-wide text-[11px]">
                      BEFORE &bull; Original Defect
                    </div>
                    <img
                      src={selectedIncident.citizen_image_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80'}
                      alt="Before repair"
                      className="w-full h-44 object-cover"
                    />
                  </div>

                  {/* After */}
                  <div className="border border-[#16A34A] rounded-xl overflow-hidden bg-[#FAFAFA]">
                    <div className="p-2.5 bg-[#F0FDF4] border-b border-[#BBF7D0] font-bold text-[#16A34A] uppercase tracking-wide text-[11px]">
                      AFTER &bull; Completed Repair Proof
                    </div>
                    <img
                      src={selectedIncident.completion_image_url || 'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?w=600&auto=format&fit=crop&q=80'}
                      alt="After repair completion"
                      className="w-full h-44 object-cover"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Single Evidence Preview when in progress */
              <div className="space-y-3 text-xs">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#404040]">
                  Submitted Citizen Evidence
                </div>
                <div className="rounded-xl overflow-hidden border border-[#E5E5E5] bg-[#FAFAFA] h-48">
                  <img
                    src={selectedIncident.citizen_image_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80'}
                    alt="Citizen submitted hazard"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Location with Google Map & Address */}
            <div className="p-4 border border-[#E5E5E5] rounded-xl space-y-3 text-xs">
              <div className="flex items-center space-x-1.5 text-[#111111] font-semibold">
                <MapPin className="w-3.5 h-3.5 text-[#8A8A8A]" />
                <span>{selectedIncident.address}</span>
              </div>
              <p className="text-[#4B5563] leading-relaxed">
                {selectedIncident.description || selectedIncident.observed_problem}
              </p>

              <div className="h-44 w-full rounded-lg overflow-hidden border border-[#E5E5E5]">
                <GoogleMap
                  center={{
                    lat: selectedIncident.latitude || 11.0168,
                    lng: selectedIncident.longitude || 76.9558
                  }}
                  zoom={15}
                  interactive={false}
                  markers={[
                    {
                      id: selectedIncident.id,
                      lat: selectedIncident.latitude || 11.0168,
                      lng: selectedIncident.longitude || 76.9558,
                      title: selectedIncident.title,
                      priority: selectedIncident.priority || 'P2_HIGH',
                      status: selectedIncident.status
                    }
                  ]}
                />
              </div>
            </div>

            {/* Verification Status & Action Controls */}
            <div className="pt-2 border-t border-[#E5E5E5] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div>
                {selectedIncident.status === 'VERIFIED' ? (
                  <span className="font-semibold text-[#15803D] flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Resolution verified and confirmed by you.</span>
                  </span>
                ) : (selectedIncident.status === 'AWAITING_VERIFICATION' || selectedIncident.status === 'RESOLUTION_SUBMITTED' || selectedIncident.status === 'WORK COMPLETED') ? (
                  <span className="font-semibold text-[#B45309] flex items-center space-x-1.5">
                    <Clock className="w-4 h-4" />
                    <span>Awaiting your confirmation of field work completion.</span>
                  </span>
                ) : (
                  <span className="text-[#8A8A8A]">
                    Assigned department is actively tracking this issue towards SLA completion.
                  </span>
                )}
              </div>

              {(selectedIncident.status === 'AWAITING_VERIFICATION' || selectedIncident.status === 'RESOLUTION_SUBMITTED' || selectedIncident.status === 'WORK COMPLETED') && (
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => {
                      setSelectedIncident(null);
                      switchTab('verification');
                    }}
                    className="px-3.5 py-2 bg-[#FFFFFF] hover:bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Report Not Fixed
                  </button>
                  <button
                    onClick={() => {
                      const id = selectedIncident.id;
                      setSelectedIncident(null);
                      handleConfirmResolution(id);
                    }}
                    className="px-4 py-2 bg-[#15803D] hover:bg-[#166534] text-[#FFFFFF] rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm Resolution</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          REOPEN ISSUE MODAL (WHEN RESIDENT SELECTS NOT FIXED)
          ======================================================== */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 bg-[#000000]/60 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#DC2626] rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
              <div className="flex items-center space-x-2 text-[#DC2626]">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-sm text-[#111111]">Issue Not Fixed &mdash; Escalation</h3>
              </div>
              <button onClick={() => setShowReopenModal(false)} className="text-[#8A8A8A] hover:text-[#111111]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#666666] leading-relaxed">
              Please tell us why this repair is unsatisfactory. Your feedback will reopen the work order and alert the department supervisor.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase text-[#404040] block">
                Explanation
              </label>
              <textarea
                rows={3}
                placeholder="e.g. The asphalt patch is uneven and water is still pooling, or only part of the pothole was filled..."
                value={reopenReason}
                onChange={e => setReopenReason(e.target.value)}
                className="w-full px-3 py-2 border border-[#E5E5E5] rounded-lg text-xs focus:outline-none focus:border-[#DC2626]"
              />
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setReopenPhotoAttached(!reopenPhotoAttached)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center space-x-1.5 transition-colors ${
                  reopenPhotoAttached
                    ? 'border-[#16A34A] bg-[#F0FDF4] text-[#16A34A]'
                    : 'border-[#E5E5E5] text-[#666666] hover:border-[#111111]'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{reopenPhotoAttached ? 'Photo Attached' : 'Attach Re-inspection Photo'}</span>
              </button>
            </div>

            <div className="pt-3 border-t border-[#E5E5E5] flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowReopenModal(false)}
                className="px-4 py-2 border border-[#E5E5E5] rounded-lg text-xs font-semibold text-[#111111] hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reopenReason.trim() || isVerifying}
                onClick={() => handleReopenIssue(verificationItem?.id || 'seed-inc-01')}
                className="px-5 py-2 bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-50 text-[#FFFFFF] rounded-lg text-xs font-semibold transition-colors"
              >
                Submit & Reopen Issue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
