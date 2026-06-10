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
  // Sizing mapping
  const sizeClasses = {
    xs: {
      text: 'text-sm sm:text-base',
      subText1: 'text-[7px]',
      subText2: 'text-[6px]',
      gap: 'gap-0',
    },
    sm: {
      text: 'text-lg sm:text-xl',
      subText1: 'text-[9px]',
      subText2: 'text-[8px]',
      gap: 'gap-0.5',
    },
    md: {
      text: 'text-2xl sm:text-3xl',
      subText1: 'text-[11px] sm:text-xs',
      subText2: 'text-[10px] sm:text-[11px]',
      gap: 'gap-1',
    },
    lg: {
      text: 'text-4xl sm:text-5xl',
      subText1: 'text-sm sm:text-base',
      subText2: 'text-xs sm:text-sm',
      gap: 'gap-1.5',
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Main Text Brand */}
      <div className={`flex items-baseline font-bold leading-none select-none ${currentSize.text}`}>
        {/* "Think" */}
        <span 
          className="text-[#0969a4] relative tracking-tight pr-[2px]" 
          style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700 }}
        >
          Th
          <span className="relative inline-block">
            ı
            {/* Double dot accent */}
            <span className="absolute -top-[0.25em] left-[1px] flex gap-[2px]">
              <span className="w-[2px] h-[6px] bg-[#0969a4] rounded-xs transform rotate-[20deg]" />
              <span className="w-[2px] h-[6px] bg-[#0969a4] rounded-xs transform rotate-[20deg]" />
            </span>
          </span>
          nk
        </span>

        {/* "NEXT" */}
        <span 
          className="text-[#231F20] flex items-baseline tracking-tight font-black" 
          style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 900 }}
        >
          <span>NE</span>
          {/* Custom X */}
          <span className="inline-block relative self-center mx-[1px]" style={{ width: '0.85em', height: '0.85em' }}>
            <svg 
              className="absolute inset-0 w-full h-full" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Backslash: Top-Left to Bottom-Right */}
              <path 
                d="M4 4L20 20" 
                stroke="#231F20" 
                strokeWidth="5" 
                strokeLinecap="round" 
              />
              {/* Slash bottom-left to center */}
              <path 
                d="M4 20L11 13" 
                stroke="#231F20" 
                strokeWidth="5" 
                strokeLinecap="round" 
              />
              {/* Slash center to top-right (red arrow) */}
              <path 
                d="M11 13L18 6" 
                stroke="#e1251b" 
                strokeWidth="5" 
                strokeLinecap="round" 
              />
              {/* Arrow Head */}
              <path 
                d="M13 4.5H20.5V12" 
                stroke="#e1251b" 
                strokeWidth="4.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </svg>
          </span>
          <span>T</span>
          {/* Registered Trademark Circle */}
          <span 
            className="text-[#e1251b] font-bold select-none relative -top-[0.3em] ml-[1px]"
            style={{ fontSize: '0.35em', lineHeight: 1 }}
          >
            ®
          </span>
        </span>
      </div>

      {/* Taglines (Full Variant) */}
      {variant === 'full' && (
        <div className={`flex flex-col mt-1.5 font-sans ${currentSize.gap}`}>
          <span 
            className={`font-semibold tracking-wider text-[#231F20]/95 uppercase ${currentSize.subText1}`}
            style={{ letterSpacing: '0.05em' }}
          >
            Innovation at every step...
          </span>
          <span 
            className={`font-extrabold tracking-wide text-[#e1251b] uppercase ${currentSize.subText2}`}
            style={{ letterSpacing: '0.02em' }}
          >
            ISO 9001:2015 Certified Company
          </span>
        </div>
      )}
    </div>
  );
}
