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
    xs: 'h-6',
    sm: 'h-9',
    md: 'h-12',
    lg: 'h-18',
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
