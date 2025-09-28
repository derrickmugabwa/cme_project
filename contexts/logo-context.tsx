'use client';

import { createContext, useContext } from 'react';
import { Logo } from '@/lib/logo-service';

interface LogoContextType {
  logo: Logo | null;
}

const LogoContext = createContext<LogoContextType>({ logo: null });

/**
 * Logo Provider Component
 * Provides logo data to all child components via React Context
 * Logo is fetched server-side and passed down as prop
 */
export const LogoProvider = ({ 
  children, 
  logo 
}: { 
  children: React.ReactNode; 
  logo: Logo | null; 
}) => {
  return (
    <LogoContext.Provider value={{ logo }}>
      {children}
    </LogoContext.Provider>
  );
};

/**
 * Custom hook to access logo data
 * Use this in client components that need logo information
 * 
 * @returns {LogoContextType} Object containing logo data
 * @throws {Error} If used outside of LogoProvider
 */
export const useLogo = () => {
  const context = useContext(LogoContext);
  if (!context) {
    throw new Error('useLogo must be used within LogoProvider');
  }
  return context;
};

/**
 * Logo Display Component
 * Reusable component for displaying logo with consistent styling
 */
export const LogoDisplay = ({ 
  className = "h-8 w-40", 
  priority = false,
  fallbackText = "METROPOLIS"
}: {
  className?: string;
  priority?: boolean;
  fallbackText?: string;
}) => {
  const { logo } = useLogo();

  if (logo) {
    return (
      <div className={`relative ${className}`}>
        <img
          src={logo.url}
          alt={logo.alt_text}
          className="object-contain w-full h-full"
          loading={priority ? "eager" : "lazy"}
        />
      </div>
    );
  }

  return (
    <div className={`${className} bg-gray-200 animate-pulse rounded flex items-center justify-center`}>
      <span className="text-gray-600 font-bold text-sm">{fallbackText}</span>
    </div>
  );
};
