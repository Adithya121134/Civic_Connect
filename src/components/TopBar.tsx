import React, { useState } from 'react';
import { Search, Bell, ChevronDown, LogOut, HelpCircle, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CivicLogo } from './CivicLogo';

interface TopBarProps {
  activeTab: string;
  onOpenCommandPalette: () => void;
  onOpenAuthModal?: (mode: 'login' | 'register') => void;
  onOpenDdl?: () => void;
  onNavigate: (tabId: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onOpenCommandPalette,
  onOpenDdl,
  onNavigate
}) => {
  const { user, logout, switchMockPersona, departmentName } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const isResident = user?.role === 'RESIDENT' || activeTab.startsWith('portal_resident');
  const isAdmin = user?.role === 'ADMIN' || activeTab.startsWith('portal_admin');
  const isDept = !isResident && !isAdmin;

  // Department name display
  const departmentSubtitle = departmentName || 'Roads & Infrastructure Department';

  const getSubtitle = () => {
    if (isResident) return 'Smart Civic Services';
    if (isAdmin) return 'Municipal Administration';
    return departmentSubtitle;
  };

  const getSearchPlaceholder = () => {
    if (isResident) return 'Search your reports, issues, or location...';
    if (isAdmin) return 'Search city, incidents, departments...';
    return 'Search incidents, locations, teams...';
  };

  // User details
  const displayName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
    : (isResident ? 'Citizen' : (isDept ? 'Department Staff' : 'Administrator'));

  const displayRole = user?.role === 'ADMIN'
    ? 'System Admin'
    : user?.role === 'RESIDENT'
    ? 'Resident'
    : 'Department Officer';

  const avatarInitial = (displayName || 'U').substring(0, 2).toUpperCase();

  const handleLogout = async () => {
    setIsProfileMenuOpen(false);
    await logout(isDept ? '/department' : '/resident');
  };

  return (
    <header className="h-16 w-full border-b border-[#E5E5E5] bg-[#FFFFFF] px-4 sm:px-6 flex items-center justify-between z-30 sticky top-0 select-none">
      {/* 1. Left: Search Bar (Reference Image Specification) */}
      <div className="flex-1 max-w-xl pr-4">
        <div
          onClick={onOpenCommandPalette}
          className="relative flex items-center w-full cursor-pointer group"
        >
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] group-hover:text-[#111827] transition-colors pointer-events-none">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            readOnly
            placeholder={getSearchPlaceholder()}
            className="w-full pl-10 pr-12 py-2 bg-[#F4F4F5] hover:bg-[#EBEBEF] focus:bg-[#FFFFFF] border border-transparent focus:border-[#111827] rounded-md text-[13px] text-[#111827] placeholder:text-[#6B7280] cursor-pointer transition-colors outline-hidden font-normal"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] font-medium text-[#6B7280] bg-[#FFFFFF] border border-[#E5E7EB] px-1.5 py-0.5 rounded shadow-2xs">
            ⌘K
          </div>
        </div>
      </div>

      {/* 2. Right: Notifications, Help, & User Profile Capsule */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Notifications Icon with Badge */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 text-[#52525B] hover:text-[#18181B] hover:bg-[#F4F4F5] rounded-full transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EF4444] rounded-full ring-2 ring-[#FFFFFF]" />
          </button>

          {isNotifOpen && (
            <div
              className="absolute right-0 mt-2 w-80 bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg shadow-lg py-2 z-50 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3.5 py-2 border-b border-[#E5E5E5] flex items-center justify-between">
                <span className="font-semibold text-[#18181B]">Department Notifications</span>
                <span className="text-[10px] font-mono text-[#71717A]">1 Unread</span>
              </div>
              <div className="divide-y divide-[#F4F4F5]">
                <div className="p-3 hover:bg-[#FAFAFA] transition-colors">
                  <div className="font-medium text-[#18181B]">INC-2026-00421 Critical Alert</div>
                  <div className="text-[11px] text-[#71717A] mt-0.5">Major Road Damage reported in Ward 04, Main Road</div>
                  <div className="text-[10px] text-[#DC2626] font-bold mt-1">SLA Target &lt; 4 Hours</div>
                </div>
                <div className="p-3 hover:bg-[#FAFAFA] transition-colors">
                  <div className="font-medium text-[#18181B]">Crew Alpha Assigned</div>
                  <div className="text-[11px] text-[#71717A] mt-0.5">Dispatched to Elm St Pothole Repair</div>
                  <div className="text-[10px] text-[#A1A1AA] mt-1">25m ago</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Help / System Icon */}
        <button
          onClick={() => {
            alert('Municipal Operations Support: Contact Control Center at ext 4001 or radio channel 4.');
          }}
          className="p-2 text-[#52525B] hover:text-[#18181B] hover:bg-[#F4F4F5] rounded-full transition-colors"
          title="Operations Help"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* User Profile Capsule */}
        <div className="relative pl-1">
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center space-x-2.5 p-1 sm:px-2 sm:py-1 rounded-md hover:bg-[#F4F4F5] transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-[#18181B] text-[#FFFFFF] font-semibold text-xs flex items-center justify-center shrink-0">
              {avatarInitial}
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="text-[13px] font-semibold text-[#111827] truncate max-w-[130px]">
                {displayName}
              </div>
              <div className="text-[11.5px] font-normal text-[#6B7280] truncate">
                {displayRole}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#6B7280] hidden sm:block" />
          </button>

          {isProfileMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-56 bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg shadow-lg py-1.5 z-50 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3.5 py-2 border-b border-[#E5E5E5]">
                <div className="font-semibold text-xs sm:text-[13px] text-[#111827]">{displayName}</div>
                <div className="text-[11px] font-normal text-[#6B7280] truncate">{user?.email || 'ravi.prakash@civicconnect.gov'}</div>
                <div className="text-[10.5px] font-mono text-[#111827] mt-1 inline-block bg-[#F4F4F5] px-1.5 py-0.5 rounded">
                  {displayRole} &bull; {departmentName || 'Roads & Infrastructure'}
                </div>
              </div>

              <div className="border-t border-[#E5E5E5] mt-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3.5 py-2 text-[#EF4444] hover:bg-[#FEF2F2] flex items-center space-x-2 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
