import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Building2,
  FileText,
  Kanban,
  CheckSquare,
  Warehouse,
  FileSpreadsheet,
  Calendar,
  Map as MapIcon,
  BarChart3,
  UploadCloud,
  Settings,
  Users,
  FolderOpen,
  MessageSquare,
  PhoneCall,
  Search,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  UserCheck,
  RotateCcw,
  Menu,
  X,
  Compass,
  LogOut,
  Palette,
  Sun,
  Moon,
  User as UserIcon,
  ChevronsUpDown,
} from 'lucide-react';


import { useAuth } from '@/modules/core/providers/AuthContext';
import { useTheme } from '@/modules/core/providers/ThemeContext';
import { ThemeDrawer } from '@/modules/core/components/ThemeDrawer';
import { NotificationPopover } from '@/modules/core/components/NotificationPopover';
import { CommandPalette } from '@/modules/core/components/CommandPalette';
import { UserAvatar } from '@/modules/core/components/ui/UserAvatar';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/modules/core/components/ui/tooltip';
import { TaskService } from '@/modules/core/services/taskService';
import { useToast } from '@/modules/core/providers/ToastContext';


export type ActiveNavView =
  | 'dashboard'
  | 'companies'
  | 'company_detail'
  | 'new_company'
  | 'edit_company'
  | 'contacts'
  | 'inquiries'
  | 'inquiry_detail'
  | 'new_inquiry'
  | 'pipeline'
  | 'tasks'
  | 'properties'
  | 'property_detail'
  | 'new_property'
  | 'property_matching'
  | 'proposals'
  | 'site_visits'
  | 'documents'
  | 'communications'
  | 'calls'
  | 'new_call'
  | 'map'
  | 'reports'
  | 'analytics'
  | 'import'
  | 'settings'
  | 'profile'
  | 'not_found';



interface AppShellProps {
  currentView: ActiveNavView;
  onNavigate: (view: ActiveNavView, entityId?: string) => void;
  selectedEntityId?: string;
  onOpenNewInquiry: () => void;
  onOpenNewCompany: () => void;
  onOpenNewTask: () => void;
  onSignOut?: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentView,
  onNavigate,
  selectedEntityId,
  onOpenNewInquiry,
  onOpenNewCompany,
  onOpenNewTask,
  onSignOut,
  children,
}) => {
  const { currentUser, logout, isSuperAdmin, isAdmin, canView, canImport, hasCapability } = useAuth();
  const { currentTheme, openDrawer, isDark, toggleColorMode, colorMode } = useTheme();
  const { success } = useToast();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('fw_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [hoveredNavId, setHoveredNavId] = useState<string | null>(null);
  const [tooltipCoords, setTooltipCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Global Ctrl+K / Cmd+K keyboard shortcut listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const toggleSidebarCollapse = () => {
    setHoveredNavId(null);
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('fw_sidebar_collapsed', String(next));
      } catch { }
      return next;
    });
  };

  const [taskCounts, setTaskCounts] = useState({ pending: 0, overdue: 0 });

  useEffect(() => {
    TaskService.getTasks({ status: 'Pending' }).then((res) => {
      if (res.success && res.data) {
        const todayStr = new Date().toDateString();
        const pending = res.data.length;
        const overdue = res.data.filter((t) => t.dueDate && new Date(t.dueDate) < new Date(todayStr)).length;
        setTaskCounts({ pending, overdue });
      }
    });
  }, []);

  const isNavVisible = (id: ActiveNavView): boolean => {
    if (isAdmin) return true;
    switch (id) {
      case 'dashboard':
        return (
          canView('inquiries') ||
          canView('companies') ||
          canView('properties') ||
          canView('tasks') ||
          canView('proposals') ||
          canView('reports')
        );
      case 'inquiries':
      case 'pipeline':
        return canView('inquiries');
      case 'companies':
      case 'contacts':
        return canView('companies');
      case 'tasks':
      case 'site_visits':
        return canView('tasks');
      case 'properties':
        return canView('properties');
      case 'proposals':
        return canView('proposals');
      case 'map':
        return canView('properties') || canView('reports');
      case 'import':
        return canImport('inquiries') || canImport('companies') || canImport('properties');
      case 'reports':
      case 'analytics':
        return canView('reports');
      case 'settings':
        return canView('settings') || hasCapability('perm_adm_roles') || hasCapability('perm_adm_users');
      case 'documents':
      case 'communications':
        return canView('communications');
      default:
        return true;
    }
  };

  interface NavItem {
    id: ActiveNavView;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    badgeAlert?: boolean;
  }

  const allNavItems: NavItem[] = [
    { id: 'dashboard' as ActiveNavView, label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'inquiries' as ActiveNavView, label: 'Inquiries / Leads', icon: <FileText className="w-4 h-4" /> },
    { id: 'companies' as ActiveNavView, label: 'Companies Master', icon: <Building2 className="w-4 h-4" /> },
    // Hidden / commented out as requested (do not delete)
    // { id: 'contacts' as ActiveNavView, label: 'Contacts', icon: <Users className="w-4 h-4" /> },
    { id: 'pipeline' as ActiveNavView, label: 'Pipeline Kanban', icon: <Kanban className="w-4 h-4" /> },
    {
      id: 'tasks' as ActiveNavView,
      label: 'Tasks & Follow-ups',
      icon: <CheckSquare className="w-4 h-4" />,
    },
    // Hidden / commented out as requested (do not delete)
    // { id: 'calls' as ActiveNavView, label: 'Calls', icon: <PhoneCall className="w-4 h-4" /> },
    { id: 'properties' as ActiveNavView, label: 'Warehouse Parks', icon: <Warehouse className="w-4 h-4" /> },
    { id: 'proposals' as ActiveNavView, label: 'Proposals', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'site_visits' as ActiveNavView, label: 'Site Visits', icon: <Calendar className="w-4 h-4" /> },
    // Hidden / commented out as requested (do not delete)
    // { id: 'documents' as ActiveNavView, label: 'Documents', icon: <FolderOpen className="w-4 h-4" /> },
    // { id: 'communications' as ActiveNavView, label: 'Communications', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'map' as ActiveNavView, label: 'India Corridors Map', icon: <MapIcon className="w-4 h-4" /> },
    { id: 'import' as ActiveNavView, label: 'Excel/CSV Import', icon: <UploadCloud className="w-4 h-4" /> },
    { id: 'reports' as ActiveNavView, label: 'Analytics & Reports', icon: <BarChart3 className="w-4 h-4" /> },
    // Hidden / commented out as requested (do not delete)
    // { id: 'settings' as ActiveNavView, label: 'Settings & RBAC', icon: <Settings className="w-4 h-4" /> },
  ];

  const navItems = allNavItems.filter((item) => isNavVisible(item.id));

  const handleCommandSelect = (type: string, id: string) => {
    const t = (type || '').toLowerCase().trim();
    if (t === 'inquiry' || t === 'inquiry_detail' || t === 'inquiries' || t === 'lead') {
      if (id) {
        onNavigate('inquiry_detail', id);
      } else {
        onNavigate('inquiries');
      }
    } else if (t === 'site_visit' || t === 'site_visits' || t === 'sitevisit' || t === 'site_visit_upcoming') {
      onNavigate('site_visits', id);
    } else if (t === 'task' || t === 'tasks' || t === 'followup' || t === 'followup_overdue' || t === 'followup_due') {
      onNavigate('tasks', id);
    } else if (t === 'proposal' || t === 'proposals' || t === 'proposal_updated') {
      onNavigate('proposals', id);
    } else if (t === 'company' || t === 'companies' || t === 'contact' || t === 'facility') {
      if (id) {
        onNavigate('company_detail', id);
      } else {
        onNavigate('companies');
      }
    } else if (t === 'property' || t === 'properties' || t === 'warehouse') {
      if (id) {
        onNavigate('property_detail', id);
      } else {
        onNavigate('properties');
      }
    } else if (t === 'pipeline') {
      onNavigate('pipeline');
    } else if (t === 'report' || t === 'reports' || t === 'analytics') {
      onNavigate('reports');
    } else if (t === 'call' || t === 'calls') {
      onNavigate('calls');
    } else if (t === 'setting' || t === 'settings') {
      onNavigate('settings');
    } else {
      onNavigate('dashboard');
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'super_admin':
      case 'admin':
        return 'bg-surface-muted text-foreground border border-border font-bold';
      case 'sales':
      case 'management':
      default:
        return 'bg-surface-muted text-foreground border border-border font-medium';
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground select-none font-sans">
      {/* 1. LEFT COLLAPSIBLE NAVIGATION SIDEBAR */}
      <aside
        className={`bg-surface border-r border-border flex flex-col shrink-0 z-30 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-[70px]' : 'w-60'
          } hidden md:flex`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-border flex items-center justify-between">
          {isSidebarCollapsed ? (
            /* Collapsed Brand Header: Centered Icon only with tooltip & hover-expand hint */
            <div
              onClick={toggleSidebarCollapse}
              className="w-full flex items-center justify-center cursor-pointer group relative py-1"
              title="Expand Sidebar"
              aria-label="Expand Sidebar"
            >
              <div className="w-9 h-9 flex items-center justify-center shrink-0 p-1 group-hover:scale-105 transition-transform">
                <img
                  src="/images/logo-icon.png"
                  alt="Fairway Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/images/logo.png';
                  }}
                />
              </div>

              {/* Hover State: Expand Icon Overlay */}
              <div className="absolute inset-0 w-9 h-9 mx-auto rounded-lg bg-surface-muted border border-border text-foreground flex items-center justify-center shadow-subtle opacity-0 group-hover:opacity-100 transition-all duration-200">
                <PanelLeftOpen className="w-4 h-4 text-fairway-600 dark:text-fairway-400" />
              </div>
            </div>
          ) : (
            /* Expanded Brand Header: Logo only without text and without extra white background */
            <>
              <div className="flex items-center min-w-0 py-1 overflow-hidden">
                <img
                  src="/images/logo.png"
                  alt="Fairway Logo"
                  className="h-8 max-h-8 w-auto max-w-[170px] object-contain object-left"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              {/* Sidebar Collapse Toggle Button (Always visible when sidebar is open) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSidebarCollapse();
                }}
                className="p-1.5 text-foreground-muted hover:text-foreground hover:bg-surface-muted rounded-md transition-all shrink-0 border border-transparent hover:border-border"
                title="Collapse Sidebar"
                aria-label="Collapse Sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              currentView === item.id ||
              (item.id === 'inquiries' && (currentView === 'inquiry_detail' || currentView === 'new_inquiry')) ||
              (item.id === 'companies' && (currentView === 'company_detail' || (currentView as string) === 'new_company')) ||
              (item.id === 'properties' && (currentView === 'property_detail' || currentView === 'property_matching' || currentView === 'new_property')) ||
              (item.id === 'proposals' && (currentView === 'proposals' || (currentView as string) === 'new_proposal'));

            return (
              <button
                key={item.id}
                onClick={() => {
                  setHoveredNavId(null);
                  onNavigate(item.id);
                }}
                onMouseEnter={(e) => {
                  if (isSidebarCollapsed) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltipCoords({ top: rect.top + rect.height / 2, left: rect.right + 10 });
                    setHoveredNavId(item.id);
                  }
                }}
                onMouseLeave={() => setHoveredNavId(null)}
                className={`w-full flex items-center rounded-button text-xs font-medium transition-all group relative text-left select-none ${isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
                  } ${isActive
                    ? 'bg-fairway-600 text-white shadow-sm font-bold'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface-muted active:bg-surface-muted/80'
                  }`}
              >
                <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                  <span className={isActive ? 'text-white' : 'text-foreground-muted group-hover:text-fairway-600 dark:group-hover:text-fairway-400 transition-colors'}>
                    {item.icon}
                  </span>
                  {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                </div>
                {item.badge !== undefined && (
                  isSidebarCollapsed ? (
                    <span
                      className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${item.badgeAlert ? 'bg-rose-600 ring-2 ring-white dark:ring-slate-900' : isActive ? 'bg-white' : 'bg-fairway-600'
                        }`}
                    />
                  ) : (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${item.badgeAlert
                          ? 'bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/60'
                          : isActive
                            ? 'bg-white/20 text-white border border-white/30'
                            : 'bg-surface-muted text-foreground-muted border border-border group-hover:border-fairway-300 dark:group-hover:border-fairway-700'
                        }`}
                    >
                      {item.badge}
                    </span>
                  )
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer / User Profile */}
        <div className="relative p-2 border-t border-border bg-surface-muted/30">
          {isSidebarCollapsed ? (
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setHoveredNavId(null);
                  setIsUserMenuOpen(!isUserMenuOpen);
                }}
                onMouseEnter={(e) => {
                  if (isSidebarCollapsed) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltipCoords({ top: rect.top + rect.height / 2, left: rect.right + 10 });
                    setHoveredNavId('user_profile');
                  }
                }}
                onMouseLeave={() => setHoveredNavId(null)}
                className="relative p-1 rounded-xl hover:ring-2 hover:ring-fairway-400 transition-all"
              >
                <UserAvatar
                  src={currentUser.avatar}
                  name={currentUser.name}
                  size="sm"
                  className="rounded-full ring-1 ring-border shrink-0"
                />
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-surface ${currentUser.role === 'super_admin' ? 'bg-purple-600' : currentUser.role === 'admin' ? 'bg-blue-600' : 'bg-emerald-600'
                  }`} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-surface border border-border hover:border-fairway-400 hover:bg-surface-muted transition-all text-left shadow-2xs group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <UserAvatar
                  src={currentUser.avatar}
                  name={currentUser.name}
                  size="sm"
                  className="rounded-full ring-1 ring-border shrink-0"
                />
                <div className="truncate">
                  <span className="text-xs font-bold text-foreground block truncate group-hover:text-fairway-600 transition-colors">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-foreground-muted block truncate font-mono">
                    {currentUser.email}
                  </span>
                </div>
              </div>
              <ChevronsUpDown className="w-4 h-4 text-foreground-muted shrink-0 group-hover:text-foreground transition-colors ml-1" />
            </button>
          )}

          {/* User Popover Menu above Sidebar Footer */}
          {isUserMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsUserMenuOpen(false)}
              />
              <div className="absolute bottom-full left-2 right-2 mb-2 w-64 bg-surface rounded-2xl border border-border shadow-2xl p-2.5 z-50 animate-scale-in text-left">
                {/* Header User Card */}
                <div
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onNavigate('profile');
                  }}
                  className="flex items-center gap-3 p-2 rounded-xl bg-surface-muted/50 border border-border/80 mb-2 cursor-pointer hover:bg-surface-muted transition-colors group"
                  title="View Profile"
                >
                  <UserAvatar
                    src={currentUser.avatar}
                    name={currentUser.name}
                    size="md"
                    className="rounded-full ring-1 ring-border shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-bold text-foreground group-hover:text-fairway-700 truncate block">
                        {currentUser.name}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold border uppercase shrink-0 ${getRoleBadgeStyle(
                          currentUser.role
                        )}`}
                      >
                        {currentUser.role.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-[10px] text-foreground-muted block truncate font-mono">
                      {currentUser.email}
                    </span>
                  </div>
                </div>

                {/* Options: My Profile & Settings & Preferences */}
                <div className="space-y-0.5 pt-1">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onNavigate('profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-foreground hover:bg-surface-muted transition-colors text-left font-medium"
                  >
                    <UserIcon className="w-4 h-4 text-foreground-muted" />
                    <span>My Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onNavigate('settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-foreground hover:bg-surface-muted transition-colors text-left font-medium"
                  >
                    <Settings className="w-4 h-4 text-foreground-muted" />
                    <span>Settings & Preferences</span>
                  </button>
                </div>

                {/* Log Out */}
                <div className="pt-2 mt-1 border-t border-border">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                      onSignOut?.();
                      success('Signed out', 'You have been signed out of Fairway CRM.');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 64px Topbar */}
        {/* 64px Topbar */}
        <header className="h-16 bg-surface border-b border-border px-3 sm:px-6 flex items-center justify-between shrink-0 relative z-40 gap-2 sm:gap-4">
          {/* Left: Mobile trigger & Search */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-xl min-w-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden size-9 flex items-center justify-center text-foreground-muted hover:text-foreground rounded-button border border-border bg-surface hover:bg-surface-muted shrink-0 transition-colors shadow-2xs"
              aria-label="Open navigation drawer"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Global Search Bar (Ctrl+K) */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center justify-between w-full max-w-md bg-surface-muted/60 hover:bg-surface-muted border border-border hover:border-fairway-500/50 rounded-button px-3 py-1.5 text-xs text-foreground-muted transition-colors group cursor-pointer min-w-0 h-9 shadow-2xs"
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="w-4 h-4 text-foreground-muted group-hover:text-foreground transition-colors shrink-0" />
                <span className="hidden sm:inline truncate">Search inquiries, companies, properties...</span>
                <span className="sm:hidden text-xs truncate">Search CRM...</span>
              </div>
              <div className="hidden sm:flex items-center gap-1 font-mono text-[10px] text-foreground-muted bg-surface px-1.5 py-0.5 rounded border border-border shrink-0 shadow-2xs">
                <span>Ctrl K</span>
              </div>
            </button>
          </div>

          {/* Right: Theme Toggle, Theme Settings, Notifications */}
          <div className="flex items-center gap-2 shrink-0">
            <TooltipProvider delayDuration={150}>
              {/* Quick Dark / Light Mode Toggle Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleColorMode}
                    className="relative flex items-center justify-center size-9 rounded-button border border-border hover:border-fairway-500/50 bg-surface hover:bg-surface-muted text-foreground-muted hover:text-foreground transition-all shrink-0 shadow-2xs cursor-pointer group"
                    aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                  >
                    {isDark ? (
                      <Sun className="w-4 h-4 text-foreground-muted group-hover:text-foreground transition-colors" />
                    ) : (
                      <Moon className="w-4 h-4 text-foreground-muted group-hover:text-foreground transition-colors" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {isDark ? 'Light Mode (Shift+D)' : 'Dark Mode (Shift+D)'}
                </TooltipContent>
              </Tooltip>

              {/* Theme Customizer & Brand Color Trigger */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={openDrawer}
                    className="relative flex items-center justify-center size-9 rounded-button border border-border hover:border-fairway-500/50 bg-surface hover:bg-surface-muted text-foreground-muted hover:text-foreground transition-all shrink-0 shadow-2xs cursor-pointer group"
                    aria-label="Theme Customizer"
                  >
                    <Palette className="w-4 h-4 text-foreground-muted group-hover:text-foreground transition-colors" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Theme Customizer (Shift+C)
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Notifications Popover */}
            <NotificationPopover onNavigate={(type, id) => handleCommandSelect(type, id)} />
          </div>
        </header>


        {/* Page Content Body (Responsive Mobile/Tablet/Laptop Container) */}
        <main
          className={`flex-1 min-w-0 bg-background ${
            currentView === 'pipeline'
              ? 'overflow-hidden p-2 sm:p-3 lg:p-4 flex flex-col h-[calc(100vh-61px)]'
              : 'overflow-y-auto overflow-x-hidden p-3 sm:p-5 lg:p-8'
          }`}
        >
          {children}
        </main>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative w-64 bg-surface h-full flex flex-col border-r border-border shadow-dialog z-10 p-4">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
              <div className="flex items-center min-w-0">
                <img
                  src="/images/logo.png"
                  alt="Fairway Logo"
                  className="h-8 w-auto max-w-[170px] object-contain object-left"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 text-foreground-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {navItems.map((item) => {
                const isActive =
                  currentView === item.id ||
                  (item.id === 'inquiries' && (currentView === 'inquiry_detail' || currentView === 'new_inquiry')) ||
                  (item.id === 'companies' && (currentView === 'company_detail' || (currentView as string) === 'new_company')) ||
                  (item.id === 'calls' && (currentView === 'calls' || (currentView as string) === 'new_call')) ||
                  (item.id === 'properties' && (currentView === 'property_detail' || currentView === 'property_matching' || currentView === 'new_property')) ||
                  (item.id === 'proposals' && (currentView === 'proposals' || (currentView as string) === 'new_proposal'));

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-button text-xs font-semibold transition-all ${isActive
                        ? 'bg-fairway-600 text-white shadow-sm font-bold'
                        : 'text-foreground hover:bg-fairway-50/80 hover:text-fairway-900'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? 'text-white' : 'text-foreground-muted'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-fairway-50 text-fairway-800 border border-fairway-200'
                          }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Mobile Drawer Footer: User Profile & Actions */}
            <div className="pt-3 border-t border-border mt-auto">
              <div
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onNavigate('profile');
                }}
                className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-muted/60 border border-border/80 cursor-pointer hover:bg-surface-muted transition-colors mb-2"
              >
                <UserAvatar
                  src={currentUser.avatar}
                  name={currentUser.name}
                  size="sm"
                  className="rounded-full ring-1 ring-border shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-foreground truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-foreground-muted truncate">
                    {currentUser.email}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onNavigate('settings');
                  }}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors font-medium"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Settings</span>
                </button>

                <button
                  type="button"
                  onClick={toggleColorMode}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors font-medium"
                  aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {isDark ? (
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 text-fairway-700" />
                  )}
                  <span>{isDark ? 'Light' : 'Dark'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                    onSignOut?.();
                    success('Signed out', 'You have been signed out of Fairway CRM.');
                  }}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors font-medium"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Command Palette Search */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelect={(type, id) => {
          handleCommandSelect(type, id);
        }}
      />

      {/* High-Fidelity Floating Tooltip for Collapsed Sidebar Navigation */}
      {isSidebarCollapsed && hoveredNavId && (
        <div
          style={{
            top: `${tooltipCoords.top}px`,
            left: `${tooltipCoords.left}px`,
            transform: 'translateY(-50%)',
          }}
          className="fixed z-[9999] pointer-events-none flex items-center select-none"
        >
          {/* Caret Pointer Arrow pointing directly to icon center */}
          <div className="w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-slate-900 -mr-[1px]" />

          {/* Tooltip Card */}
          <div className="bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl border border-slate-700/80 flex items-center gap-2 whitespace-nowrap">
            {hoveredNavId === 'expand_sidebar' ? (
              <span>Expand Sidebar</span>
            ) : hoveredNavId === 'user_profile' ? (
              <span>{currentUser.name} ({currentUser.role.replace('_', ' ')})</span>
            ) : (
              <>
                <span>{navItems.find((n) => n.id === hoveredNavId)?.label}</span>
                {(() => {
                  const item = navItems.find((n) => n.id === hoveredNavId);
                  if (item?.badge !== undefined) {
                    return (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${item.badgeAlert ? 'bg-rose-500 text-white' : 'bg-slate-700 text-slate-200'
                          }`}
                      >
                        {item.badge}
                      </span>
                    );
                  }
                  return null;
                })()}
              </>
            )}
          </div>
        </div>
      )}

      {/* Global Theme & Brand Color Drawer */}
      <ThemeDrawer />
    </div>
  );
};


