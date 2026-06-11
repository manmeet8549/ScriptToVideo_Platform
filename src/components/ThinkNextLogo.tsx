import React from 'react';

interface ThinkNextLogoProps {
  variant?: 'full' | 'compact';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xs';
}

export default function ThinkNextLogo({
  variant = 'compact',
  className = '',
  size = 'md',
}: ThinkNextLogoProps) {
  // Height classes for dynamic scaling
  const heightClasses = {
    xs: 'h-6',
    sm: 'h-9',
    md: 'h-12',
    lg: 'h-18',
  };

  // Tagline layout styles based on size
  const taglineClasses = {
    xs: {
      gap: 'gap-0',
      subText1: 'text-[7px]',
      subText2: 'text-[6px]',
    },
    sm: {
      gap: 'gap-0.5',
      subText1: 'text-[9px]',
      subText2: 'text-[8px]',
    },
    md: {
      gap: 'gap-1',
      subText1: 'text-[11px] sm:text-xs',
      subText2: 'text-[10px] sm:text-[11px]',
    },
    lg: {
      gap: 'gap-1.5',
      subText1: 'text-sm sm:text-base',
      subText2: 'text-xs sm:text-sm',
    },
  };

  const heightClass = heightClasses[size] || 'h-12';
  const taglineConfig = taglineClasses[size] || taglineClasses.md;

  return (
    <div className={`flex flex-col select-none ${className}`}>
      {/* Main Official SVG Logo */}
      <div className="flex items-center">
        <img
          src="/ThinkNEXT-LOGO-NEW.svg"
          alt="ThinkNEXT Logo"
          className={`${heightClass} w-auto object-contain`}
          draggable={false}
        />
      </div>

      {/* Taglines (Full Variant) */}
      {variant === 'full' && (
        <div className={`flex flex-col mt-1.5 font-sans ${taglineConfig.gap}`}>
          <span 
            className={`font-semibold tracking-wider text-[#231F20]/95 uppercase ${taglineConfig.subText1}`}
            style={{ letterSpacing: '0.05em' }}
          >
            Innovation at every step...
          </span>
          <span 
            className={`font-extrabold tracking-wide text-[#e1251b] uppercase ${taglineConfig.subText2}`}
            style={{ letterSpacing: '0.02em' }}
          >
            ISO 9001:2015 Certified Company
          </span>
        </div>
      )}
    </div>
  );
}
