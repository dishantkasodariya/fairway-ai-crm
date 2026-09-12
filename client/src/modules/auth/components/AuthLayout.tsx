import React from 'react';
import { useTheme } from '@/modules/core/providers/ThemeContext';

interface AuthLayoutProps {
  headline?: string;
  subheadline?: string;
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  headline = 'Simplify. Automate. Grow.',
  subheadline = 'Built for industrial real estate developers, leasing managers, and brokerage teams. Organize inquiries, streamline property matching, and keep client follow-ups in one secure place.',
  children,
}) => {
  const { currentTheme } = useTheme();

  // Exact color selected in the theme palette (e.g. Fairway Orange #EB661F, Slate, Blue, etc.)
  const themeBgColor = currentTheme.previewColor || currentTheme.shades[600];

  return (
    <div className="min-h-screen w-full flex bg-background select-none">
      {/* Left Column: Brand Hero Showcase (Hidden on Mobile & Tablet, Visible on Laptop/Desktop >= 1024px) */}
      <div
        style={{
          backgroundColor: themeBgColor,
        }}
        className="hidden lg:flex lg:w-1/2 text-white flex-col justify-between p-12 xl:p-16 relative overflow-hidden shrink-0 min-h-screen transition-colors duration-200"
      >
        {/* Top Brand Logo */}
        <div className="flex items-center z-10 w-full">
          <img
            src="/images/logo.png"
            alt="Fairway Logo"
            className="h-9 sm:h-10 w-auto object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        {/* Middle Hero Content */}
        <div className="my-auto py-8 max-w-lg z-10 text-left">
          <h1 className="text-4xl lg:text-[44px] font-black tracking-tight text-white leading-[1.15]">
            {headline}
          </h1>
          <p className="mt-5 text-base text-white/90 leading-relaxed font-normal">
            {subheadline}
          </p>
        </div>

        {/* Bottom Footer */}
        <div className="text-xs text-white/70 z-10 text-left pt-6 border-t border-white/15">
          <span>© 2026 Powered by FAIRWAY CRM. All rights reserved.</span>
        </div>
      </div>

      {/* Right Column: Clean Surface Form Container (Full Width & Centered on Mobile/Tablet, 50% on Laptop/Desktop) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center min-h-screen p-6 sm:p-8 md:p-12 lg:p-16 bg-surface-muted/30 lg:bg-background">
        <div className="w-full max-w-[440px] mx-auto bg-surface p-7 sm:p-9 rounded-2xl border border-border shadow-card">
          {children}
        </div>
      </div>
    </div>
  );
};
