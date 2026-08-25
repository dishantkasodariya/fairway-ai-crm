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
} from 'lucide-react';
import { useAuth } from '@/modules/core/providers/AuthContext';
import { NotificationPopover } from '@/modules/core/components/NotificationPopover';
import { CommandPalette } from '@/modules/core/components/CommandPalette';
import { StorageService } from '@/modules/core/services/storageService';
import { useToast } from '@/modules/core/providers/ToastContext';

export type ActiveNavView =
  | 'dashboard'
  | 'inquiries'
  | 'inquiry_detail'
  | 'companies'
  | 'company_detail'
  | 'pipeline'
  | 'tasks'
  | 'properties'
  | 'property_detail'
  | 'property_matching'
  | 'proposals'
  | 'site_visits'
  | 'map'
  | 'reports'
  | 'import'
  | 'settings';

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
  const { currentUser, logout, isSuperAdmin, isAdmin } = useAuth();
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
      } catch {}
      return next;
    });
  };

  const pendingTasks = StorageService.getTasks().filter((t) => t.status === 'Pending').length;
  const overdueTasks = StorageService.getTasks().filter(
    (t) => t.status === 'Pending' && new Date(t.dueDate) < new Date(new Date().toDateString())
  ).length;

  const handleResetData = () => {
    if (window.confirm('Reset Fairway CRM database to default demonstration seed records?')) {
      StorageService.resetToDefaults();
      success('Database reset', 'Restored all seed companies, warehouse inventory, inquiries, and tasks.');
      window.location.reload();
    }
  };

  const navItems = [
    { id: 'dashboard' as ActiveNavView, label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'inquiries' as ActiveNavView, label: 'Inquiries / Leads', icon: <FileText className="w-4 h-4" /> },
    { id: 'companies' as ActiveNavView, label: 'Companies Master', icon: <Building2 className="w-4 h-4" /> },
    { id: 'pipeline' as ActiveNavView, label: 'Pipeline Kanban', icon: <Kanban className="w-4 h-4" /> },
    {
      id: 'tasks' as ActiveNavView,
      label: 'Tasks & Follow-ups',
      icon: <CheckSquare className="w-4 h-4" />,
      badge: pendingTasks > 0 ? pendingTasks : undefined,
      badgeAlert: overdueTasks > 0,
    },
    { id: 'properties' as ActiveNavView, label: 'Warehouse Parks', icon: <Warehouse className="w-4 h-4" /> },
    { id: 'proposals' as ActiveNavView, label: 'Proposals', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'site_visits' as ActiveNavView, label: 'Site Visits', icon: <Calendar className="w-4 h-4" /> },
    { id: 'map' as ActiveNavView, label: 'India Corridors Map', icon: <MapIcon className="w-4 h-4" /> },
    { id: 'import' as ActiveNavView, label: 'Excel/CSV Import', icon: <UploadCloud className="w-4 h-4" /> },
    { id: 'reports' as ActiveNavView, label: 'Analytics & Reports', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'settings' as ActiveNavView, label: 'Settings & RBAC', icon: <Settings className="w-4 h-4" /> },
  ];

  const handleCommandSelect = (type: string, id: string) => {
    if (type === 'inquiry') {
      onNavigate('inquiry_detail', id);
    } else if (type === 'company' || type === 'contact' || type === 'facility') {
      onNavigate('company_detail', id);
    } else if (type === 'property') {
      onNavigate('property_detail', id);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'sales':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-surface border-r border-border shrink-0 z-30 transition-all duration-300 ${
          isSidebarCollapsed ? 'w-[70px]' : 'w-60'
        }`}
      >
        {/* Brand Header */}
        <div
          className={`h-16 flex items-center border-b border-border select-none transition-all group relative ${
            isSidebarCollapsed ? 'px-2 justify-center cursor-pointer' : 'px-4 justify-between gap-2'
          }`}
          onClick={isSidebarCollapsed ? toggleSidebarCollapse : undefined}
          onMouseEnter={(e) => {
            if (isSidebarCollapsed) {
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltipCoords({ top: rect.top + rect.height / 2, left: rect.right + 10 });
              setHoveredNavId('expand_sidebar');
            }
          }}
          onMouseLeave={() => setHoveredNavId(null)}
        >
          {isSidebarCollapsed ? (
            /* Collapsed Brand Header: Logo normally, Expand icon smoothly on Hover */
            <div className="relative w-9 h-9 flex items-center justify-center">
              {/* Normal State: Only Logo */}
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-white border border-border flex items-center justify-center shadow-subtle p-1 transition-opacity duration-200 group-hover:opacity-0">
                <img
                  src="/images/logo.png"
                  alt="Fairway Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              {/* Hover State: Expand Icon Overlay */}
              <div className="absolute inset-0 w-9 h-9 rounded-lg bg-fairway-50 border border-fairway-200 text-fairway-700 flex items-center justify-center shadow-subtle opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-fairway-100">
                <PanelLeftOpen className="w-4 h-4 text-fairway-700" />
              </div>
            </div>
          ) : (
            /* Expanded Brand Header: Logo + Title, Collapse Button shown on hover */
            <>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#F2F2F2] flex items-center justify-center shadow-subtle shrink-0 p-1">
                  <img
                    src="/images/logo.png"
                    alt="Fairway Logo"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black tracking-tight text-fairway-900 leading-none">FAIRWAY</span>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-accent-100 text-accent-900 border border-accent-300 shadow-2xs">
                      AI CRM
                    </span>
                  </div>
                </div>
              </div>

              {/* Sidebar Collapse Toggle Button (Always visible when sidebar is open) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSidebarCollapse();
                }}
                className="p-1.5 text-foreground-muted hover:text-fairway-800 hover:bg-fairway-50 rounded-md transition-all shrink-0 border border-transparent hover:border-fairway-200"
                title="Collapse Sidebar"
                aria-label="Collapse Sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          
          {navItems.map((item) => {
            const isActive =
              currentView === item.id ||
              (item.id === 'inquiries' && currentView === 'inquiry_detail') ||
              (item.id === 'companies' && currentView === 'company_detail') ||
              (item.id === 'properties' && (currentView === 'property_detail' || currentView === 'property_matching'));

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
                className={`w-full flex items-center rounded-button text-xs font-medium transition-all group relative text-left ${
                  isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
                } ${
                  isActive
                    ? 'bg-fairway-100/70 text-fairway-900 font-semibold'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface-muted'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-fairway-600 rounded-r" />
                )}
                <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                  <span className={isActive ? 'text-fairway-700' : 'text-foreground-muted group-hover:text-foreground'}>
                    {item.icon}
                  </span>
                  {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                </div>
                {item.badge !== undefined && (
                  isSidebarCollapsed ? (
                    <span
                      className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                        item.badgeAlert ? 'bg-rose-600 ring-2 ring-white' : 'bg-fairway-600'
                      }`}
                    />
                  ) : (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        item.badgeAlert
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-surface-muted text-foreground-muted border border-border'
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
        <div className="p-2 border-t border-border bg-surface-muted/30">
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
                className="relative p-1 rounded-full hover:ring-2 hover:ring-fairway-400 transition-all"
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover border border-border"
                />
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                  currentUser.role === 'super_admin' ? 'bg-purple-600' : currentUser.role === 'admin' ? 'bg-blue-600' : 'bg-emerald-600'
                }`} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-border">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover border border-border shrink-0"
                />
                <div className="truncate">
                  <span className="text-xs font-semibold text-foreground block truncate">{currentUser.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold border uppercase ${getRoleBadgeStyle(currentUser.role)}`}>
                    {currentUser.role.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="p-1 text-foreground-muted hover:text-foreground rounded hover:bg-surface-muted"
                title="Switch user role"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 64px Topbar */}
        <header className="h-16 bg-surface border-b border-border px-3 sm:px-6 flex items-center justify-between shrink-0 z-20 gap-2">
          {/* Left: Mobile trigger & Search */}
          <div className="flex items-center gap-2 sm:gap-4 flex-1 max-w-xl min-w-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-foreground-muted hover:text-foreground rounded-md hover:bg-surface-muted shrink-0"
              aria-label="Open navigation drawer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Search Bar (Ctrl+K) */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center justify-between w-full max-w-md bg-surface-muted/70 hover:bg-surface-muted border border-border hover:border-fairway-300 rounded-input px-2.5 sm:px-3.5 py-1.5 text-xs text-foreground-muted transition-colors group cursor-pointer min-w-0"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                <Search className="w-4 h-4 text-fairway-600 shrink-0" />
                <span className="hidden sm:inline truncate">Search companies, inquiries, properties (Dahej, Vapi...)...</span>
                <span className="sm:hidden text-[11px] truncate">Search CRM...</span>
              </div>
              <div className="hidden sm:flex items-center gap-1 font-mono text-[10px] bg-surface px-1.5 py-0.5 rounded border border-border shrink-0 shadow-subtle">
                <span>⌘K</span>
              </div>
            </button>
          </div>

          {/* Right: Quick actions, Notifications, Role Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Quick New Action Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsQuickMenuOpen(!isQuickMenuOpen)}
                className="flex items-center gap-1 sm:gap-1.5 bg-fairway-600 hover:bg-fairway-700 active:bg-fairway-800 text-white text-xs font-semibold px-2 sm:px-3 py-1.5 rounded-button shadow-subtle transition-all shrink-0"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">New Action</span>
                <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              </button>

              {isQuickMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 bg-surface rounded-card border border-border shadow-popover py-1 z-50 animate-fade-in"
                  onClick={() => setIsQuickMenuOpen(false)}
                >
                  <button
                    onClick={onOpenNewInquiry}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-surface-muted text-left font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-fairway-600 shrink-0" />
                    <span>New Inquiry Stepper</span>
                  </button>
                  <button
                    onClick={onOpenNewCompany}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-surface-muted text-left font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Add Company</span>
                  </button>
                  <button
                    onClick={onOpenNewTask}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-surface-muted text-left font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Add Follow-up Task</span>
                  </button>
                  <div className="border-t border-border my-1" />
                  <button
                    onClick={() => onNavigate('import')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-surface-muted text-left font-medium"
                  >
                    <UploadCloud className="w-4 h-4 text-indigo-600" />
                    <span>Import Excel / CSV</span>
                  </button>
                </div>
              )}
            </div>

            {/* Notifications Popover */}
            <NotificationPopover onNavigate={(type, id) => handleCommandSelect(type, id)} />

            {/* Role Switcher Popover */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1.5 p-1 pl-1.5 sm:pl-2 pr-1 rounded-full border border-border hover:border-fairway-400 bg-surface transition-colors shrink-0"
              >
                <span className="hidden sm:inline text-xs font-semibold text-foreground">{currentUser.name.split(' ')[0]}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold border uppercase shrink-0 ${getRoleBadgeStyle(currentUser.role)}`}>
                  {currentUser.role.replace('_', ' ')}
                </span>
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-6 h-6 rounded-full object-cover shrink-0"
                />
              </button>

              {isUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 bg-surface rounded-xl border border-border shadow-popover p-3 z-50 animate-fade-in text-left">
                    {/* Logged in User Profile Card */}
                    <div className="flex items-start gap-3 p-2.5 rounded-lg bg-surface-muted/60 border border-border mb-2">
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-fairway-500/20"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-xs font-bold text-foreground truncate block">
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
                        <span className="text-[11px] text-foreground-muted block truncate font-mono">
                          {currentUser.email}
                        </span>
                        {currentUser.department && (
                          <span className="text-[10px] text-foreground-muted block mt-0.5">
                            {currentUser.department}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Navigation / Settings */}
                    <div className="space-y-0.5 pt-1">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onNavigate('settings');
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-foreground hover:bg-surface-muted transition-colors text-left font-medium"
                      >
                        <Settings className="w-4 h-4 text-foreground-muted" />
                        <span>Settings & Preferences</span>
                      </button>
                    </div>

                    {/* Sign Out Action */}
                    <div className="pt-2 mt-1 border-t border-border">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                          onSignOut?.();
                          success('Signed out', 'You have been signed out of Fairway CRM.');
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-rose-600 hover:bg-rose-50 font-medium transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Body (Responsive Mobile/Tablet/Laptop Container) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background p-3 sm:p-5 lg:p-8 min-w-0">
          {children}
        </main>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative w-64 bg-surface h-full flex flex-col border-r border-border shadow-dialog z-10 p-4">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-white border border-border flex items-center justify-center shadow-subtle shrink-0 p-1">
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
                  <span className="font-black text-fairway-900 tracking-tight text-sm">FAIRWAY</span>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-accent-100 text-accent-900 border border-accent-300 shadow-2xs">
                    AI CRM
                  </span>
                </div>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 text-foreground-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-button text-xs font-medium ${
                    currentView === item.id ? 'bg-fairway-100 text-fairway-900 font-bold' : 'text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge && <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">{item.badge}</span>}
                </button>
              ))}
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
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                          item.badgeAlert ? 'bg-rose-500 text-white' : 'bg-slate-700 text-slate-200'
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
    </div>
  );
};
