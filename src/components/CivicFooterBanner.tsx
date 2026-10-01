import React from 'react';
import { CivicLogo } from './CivicLogo';
import { Edit3, Settings, BarChart2, Flag } from 'lucide-react';

export const CivicFooterBanner: React.FC = () => {
  return (
    <div className="w-full bg-[#FFFFFF] border-t border-[#E5E5E5] py-4 px-6 sm:px-10 flex flex-col md:flex-row items-center justify-between gap-4 select-none">
      {/* Brand & Subtitle */}
      <div className="flex items-center space-x-6">
        <CivicLogo size="md" subtitle="Smart Civic Services" />
        <div className="hidden lg:block h-6 w-px bg-[#E5E5E5]" />
        <div className="hidden lg:block text-xs font-medium text-[#71717A]">
          One Platform. Cleaner Cities. Stronger Communities.
        </div>
      </div>

      {/* 4 Pillars */}
      <div className="flex items-center space-x-6 sm:space-x-8 text-xs font-semibold text-[#18181B]">
        <div className="flex items-center space-x-1.5 hover:text-[#000000] transition-colors">
          <Edit3 className="w-3.5 h-3.5 text-[#71717A]" />
          <span>Report</span>
        </div>
        <div className="flex items-center space-x-1.5 hover:text-[#000000] transition-colors">
          <Settings className="w-3.5 h-3.5 text-[#71717A]" />
          <span>Resolve</span>
        </div>
        <div className="flex items-center space-x-1.5 hover:text-[#000000] transition-colors">
          <BarChart2 className="w-3.5 h-3.5 text-[#71717A]" />
          <span>Monitor</span>
        </div>
        <div className="flex items-center space-x-1.5 hover:text-[#000000] transition-colors">
          <Flag className="w-3.5 h-3.5 text-[#71717A]" />
          <span>Improve</span>
        </div>
      </div>
    </div>
  );
};
