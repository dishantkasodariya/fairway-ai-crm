import React from 'react';

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
  return (
    <div className="min-h-screen w-full flex bg-background select-none">
      {/* Left Column: Brand Fairway Green Hero Showcase (Hidden on Mobile & Tablet, Visible on Laptop/Desktop >= 1024px) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#073325] via-[#0F6B4F] to-[#128260] text-white flex-col justify-between p-12 xl:p-16 relative overflow-hidden shrink-0 min-h-screen">
        {/* Decorative Wave/Contour Circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute -top-16 -left-16 w-96 h-96 rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute top-1/2 right-0 w-64 h-64 bg-accent-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Brand Logo */}
        <div className="flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-md shrink-0 border border-white/20">
            <img
              src="/images/logo.png"
              alt="Fairway Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-black tracking-tight text-white">FAIRWAY</span>
            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-accent-400/20 text-accent-300 border border-accent-400/30">
              AI CRM
            </span>
          </div>
        </div>

        {/* Middle Hero Content */}
        <div className="my-auto py-8 max-w-lg z-10 text-left">
          <h1 className="text-4xl lg:text-[44px] font-black tracking-tight text-white leading-[1.15]">
            {headline}
          </h1>
          <p className="mt-5 text-base text-fairway-100/90 leading-relaxed font-normal">
            {subheadline}
          </p>
        </div>

        {/* Bottom Footer */}
        <div className="text-xs text-fairway-200/70 z-10 text-left pt-6 border-t border-white/10">
          <span>© 2026 Powered by FAIRWAY CRM. All rights reserved.</span>
        </div>
      </div>

      {/* Right Column: Clean White / Surface Form Container (Full Width & Centered on Mobile/Tablet, 50% on Laptop/Desktop) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center min-h-screen p-4 sm:p-6 md:p-10 lg:p-16 bg-surface-muted/30 lg:bg-background">
        <div className="w-full max-w-[420px] mx-auto bg-surface p-6 sm:p-8 rounded-2xl border border-border shadow-card lg:bg-transparent lg:border-0 lg:shadow-none lg:p-0">
          {children}
        </div>
      </div>
    </div>
  );
};
