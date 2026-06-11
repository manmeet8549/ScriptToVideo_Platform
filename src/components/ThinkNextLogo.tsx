import React from 'react';

interface ThinkNextLogoProps {
  variant?: 'full' | 'compact';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xs';
}

export default function ThinkNextLogo({
  className = '',
  size = 'md',
}: ThinkNextLogoProps) {
  // Height classes for dynamic scaling
  const heightClasses = {
    xs: 'h-8',
    sm: 'h-14',
    md: 'h-20',
    lg: 'h-28',
  };

  const heightClass = heightClasses[size] || 'h-12';

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
    </div>
  );
}
