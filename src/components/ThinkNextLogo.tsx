import React from 'react';
import Image from 'next/image';

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
        <Image
          src="/ThinkNEXT-LOGO-NEW.svg"
          alt="ThinkNEXT Logo"
          width={200}
          height={80}
          className={`${heightClass} w-auto object-contain`}
          draggable={false}
          priority
        />
      </div>
    </div>
  );
}
