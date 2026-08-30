import React, { useState } from 'react';
import {
  Compass,
  Home,
  ArrowLeft,
  Search,
  Building2,
  Users,
  Warehouse,
  MapPin,
  Kanban,
  User as UserIcon,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/modules/core/components/ui/Button';
import { useRouter } from '@/modules/core/router/RouterContext';

export interface NotFoundPageProps {
  onGoHome?: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onGoHome }) => {
  const { pathname, navigate } = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else if (onGoHome) {
      onGoHome();
    } else {
      navigate('/dashboard');
    }
  };

  const quickLinks = [
    {
      title: 'Dashboard',
      desc: 'KPIs, pipeline metrics & live alerts',
      icon: Home,
      action: () => (onGoHome ? onGoHome() : navigate('/dashboard')),
    },
    {
      title: 'Leads & Inquiries',
      desc: 'Active broker & client requirements',
      icon: Users,
      action: () => navigate('/leads'),
    },
    {
      title: 'Companies',
      desc: 'Corporate accounts & key contacts',
      icon: Building2,
      action: () => navigate('/companies'),
    },
    {
      title: 'Properties & Warehouses',
      desc: 'Available industrial parks & facilities',
      icon: Warehouse,
      action: () => navigate('/properties'),
    },
    {
      title: 'Corridor Map',
      desc: 'Interactive GIS logistics map',
      icon: MapPin,
      action: () => navigate('/map'),
    },
    {
      title: 'My Profile',
      desc: 'Manage account, info & preferences',
      icon: UserIcon,
      action: () => navigate('/profile'),
    },
  ];

  const filteredLinks = searchQuery.trim()
    ? quickLinks.filter(
        (l) =>
          l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.desc.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : quickLinks;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 py-12 animate-fade-in">
      <div className="max-w-2xl w-full space-y-8">
        {/* Animated 404 Visual Hero */}
        <div className="relative flex flex-col items-center justify-center">
          {/* Subtle glowing backdrop pulse */}
          <div className="absolute w-44 h-44 rounded-full bg-fairway-500/10 blur-2xl pointer-events-none" />

          {/* Compass Icon Badge */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-surface border border-fairway-500/30 shadow-xl flex items-center justify-center mb-4 text-fairway-600 dark:text-fairway-400 group hover:scale-105 transition-transform duration-300">
            <Compass className="w-10 h-10 sm:w-12 sm:h-12 animate-[spin_12s_linear_infinite]" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fairway-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-fairway-500" />
            </span>
          </div>

          {/* 404 Typography */}
          <h1 className="text-6xl sm:text-8xl font-black tracking-tighter bg-gradient-to-br from-foreground via-fairway-700 to-fairway-500 bg-clip-text text-transparent drop-shadow-sm select-none">
            404
          </h1>

          <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-2 tracking-tight">
            Page Not Found
          </h2>

          <p className="text-xs sm:text-sm text-foreground-muted max-w-md mt-2">
            The requested path{' '}
            <code className="px-2 py-0.5 rounded-md bg-surface-muted border border-border text-foreground font-mono text-xs">
              {pathname || '/not-found'}
            </code>{' '}
            does not exist or has been moved.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </Button>

          <Button
            onClick={() => (onGoHome ? onGoHome() : navigate('/dashboard'))}
            className="flex items-center gap-2 text-xs font-semibold px-5 py-2 bg-fairway-600 hover:bg-fairway-700 text-white shadow-xs"
          >
            <Home className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Button>
        </div>

        {/* Search Quick Help */}
        <div className="pt-4 border-t border-border/80 text-left space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <HelpCircle className="w-4 h-4 text-fairway-600" />
              <span>Looking for something specific?</span>
            </div>
            <span className="text-[11px] text-foreground-muted hidden sm:inline">
              Quick shortcuts
            </span>
          </div>

          {/* Quick Filter Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-foreground-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sections (e.g. Leads, Companies, Warehouses)..."
              className="w-full pl-9 pr-4 py-2 bg-surface border border-border focus:border-fairway-600 focus:ring-1 focus:ring-fairway-600 rounded-xl text-xs text-foreground placeholder:text-foreground-muted outline-none shadow-2xs transition-all"
            />
          </div>

          {/* Shortcuts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
            {filteredLinks.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.title}
                  onClick={item.action}
                  className="flex items-start gap-3 p-3 rounded-xl border border-border bg-surface hover:bg-surface-muted hover:border-fairway-400/60 transition-all text-left group shadow-2xs"
                >
                  <div className="p-2 rounded-lg bg-fairway-50 dark:bg-fairway-950/60 border border-fairway-200 dark:border-fairway-800 text-fairway-700 dark:text-fairway-300 group-hover:scale-110 transition-transform shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-foreground group-hover:text-fairway-600 transition-colors block truncate">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-foreground-muted line-clamp-1 block">
                      {item.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
