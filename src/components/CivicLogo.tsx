import React from 'react';

interface CivicLogoProps {
  className?: string;
  variant?: 'light' | 'dark' | 'monochrome';
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  subtitle?: string;
}

export const CivicLogo: React.FC<CivicLogoProps> = ({
  className = '',
  variant = 'dark',
  size = 'md',
  showSubtitle = true,
  subtitle = 'Smart Civic Services'
}) => {
  const isLight = variant === 'light';
  const textColor = isLight ? 'text-[#FFFFFF]' : 'text-[#111111]';
  const subColor = isLight ? 'text-[#A1A1AA]' : 'text-[#71717A]';

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl'
  };

  return (
    <div className={`flex items-center space-x-2.5 ${className}`}>
      {/* Neoclassical Municipal Temple Icon matching the reference image */}
      <div className={`shrink-0 ${iconSizes[size]} flex items-center justify-center`}>
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Pediment / Triangular Roof */}
          <path
            d="M16 4L3 11H29L16 4Z"
            fill={isLight ? '#FFFFFF' : '#111111'}
          />
          {/* Architrave / Entablature beam */}
          <rect
            x="4"
            y="12"
            width="24"
            height="2"
            rx="0.5"
            fill={isLight ? '#FFFFFF' : '#111111'}
          />
          {/* 4 Classical Columns */}
          <rect x="6" y="15" width="3" height="10" rx="0.5" fill={isLight ? '#FFFFFF' : '#111111'} />
          <rect x="11.67" y="15" width="3" height="10" rx="0.5" fill={isLight ? '#FFFFFF' : '#111111'} />
          <rect x="17.33" y="15" width="3" height="10" rx="0.5" fill={isLight ? '#FFFFFF' : '#111111'} />
          <rect x="23" y="15" width="3" height="10" rx="0.5" fill={isLight ? '#FFFFFF' : '#111111'} />
          {/* Stylobate / Base Stepped Platform */}
          <rect x="3" y="26" width="26" height="2" rx="0.5" fill={isLight ? '#FFFFFF' : '#111111'} />
          <rect x="1.5" y="28.5" width="29" height="1.5" rx="0.5" fill={isLight ? '#FFFFFF' : '#111111'} />
        </svg>
      </div>

      <div>
        <div className={`font-bold tracking-[-0.03em] leading-tight ${textSizes[size]} ${textColor}`}>
          CivicConnect
        </div>
        {showSubtitle && (
          <div className={`text-[11px] sm:text-xs font-normal tracking-normal leading-none mt-0.5 ${subColor}`}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
