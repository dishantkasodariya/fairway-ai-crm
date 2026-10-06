import React, { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/modules/core/components/ui/Button';
import { AuthProvider, useAuth } from '@/modules/core/providers/AuthContext';
import { NotificationProvider } from '@/modules/core/providers/NotificationContext';
import { ToastProvider } from '@/modules/core/providers/ToastContext';
import { ThemeProvider } from '@/modules/core/providers/ThemeContext';
import { TooltipProvider } from '@/modules/core/components/ui/tooltip';
import { RouterProvider, useRouter } from '@/modules/core/router/RouterContext';
import { AppShell, ActiveNavView } from '@/modules/core/ui/AppShell';

// Auth Pages
import { LoginPage } from '@/modules/auth/pages/LoginPage';

// Feature Pages
import { DashboardPage } from '@/modules/dashboard/pages/DashboardPage';
import { InquiriesPage } from '@/modules/inquiries/pages/InquiriesPage';
import { InquiryDetailPage } from '@/modules/inquiries/pages/InquiryDetailPage';
import { NewInquiryPage } from '@/modules/inquiries/pages/NewInquiryPage';
import { CallsPage } from '@/modules/calls/pages/CallsPage';
import { NewCallPage } from '@/modules/calls/pages/NewCallPage';
import { CompaniesPage } from '@/modules/companies/pages/CompaniesPage';
import { CompanyDetailPage } from '@/modules/companies/pages/CompanyDetailPage';
import { NewCompanyPage } from '@/modules/companies/pages/NewCompanyPage';
import { PipelinePage } from '@/modules/pipeline/pages/PipelinePage';
import { TasksPage } from '@/modules/tasks/pages/TasksPage';
import { PropertiesPage } from '@/modules/properties/pages/PropertiesPage';
import { PropertyDetailPage } from '@/modules/properties/pages/PropertyDetailPage';
import { NewPropertyPage } from '@/modules/properties/pages/NewPropertyPage';
import { AiDiscoveryPage } from '@/modules/intelligence/pages/AiDiscoveryPage';
import { AiProspectDetailPage } from '@/modules/intelligence/pages/AiProspectDetailPage';
import { AiConnectionsPage } from '@/modules/intelligence/pages/AiConnectionsPage';
import { TodayPage } from '@/modules/today/pages/TodayPage';
import { ProposalsPage } from '@/modules/proposals/pages/ProposalsPage';
import { SiteVisitsPage } from '@/modules/site-visits/pages/SiteVisitsPage';
import { ContactsPage } from '@/modules/contacts/pages/ContactsPage';
import { DocumentsPage } from '@/modules/documents/pages/DocumentsPage';
import { CommunicationsPage } from '@/modules/communications/pages/CommunicationsPage';
import { MapPage } from '@/modules/map/pages/MapPage';
import { ImportWizardPage } from '@/modules/import-export/pages/ImportWizardPage';
import { ReportsPage } from '@/modules/reports/pages/ReportsPage';
import { SettingsPage } from '@/modules/settings/pages/SettingsPage';
import { ProfilePage } from '@/modules/profile/pages/ProfilePage';
import { NotFoundPage } from '@/modules/core/pages/NotFoundPage';

const AccessRestrictedView: React.FC<{
  moduleName: string;
  onGoBack: () => void;
}> = ({ moduleName, onGoBack }) => {
  const { currentUser } = useAuth();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4 shadow-sm">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-foreground tracking-tight">
        Access Restricted
      </h2>
      <p className="text-sm text-foreground-muted max-w-md mt-2">
        Your assigned role (<span className="font-semibold text-foreground capitalize">{(currentUser.role || '').replace('_', ' ')}</span>) does not have permission to view the <span className="font-semibold text-foreground">{moduleName}</span> module.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Button size="sm" variant="primary" onClick={onGoBack}>
          Return to Permitted Workspace
        </Button>
      </div>
    </div>
  );
};

const AppRouter: React.FC = () => {
  const { isAuthenticated, logout, isSuperAdmin, isAdmin, canView, canImport, hasCapability } = useAuth();
  const { activeView, selectedEntityId, navigate, pathname } = useRouter();


  // Global Quick Action State
  const [defaultInquiryCompanyId, setDefaultInquiryCompanyId] = useState<string | undefined>(undefined);
  const [newCallType, setNewCallType] = useState<'schedule' | 'log'>('schedule');

  const handleNavigate = (view: ActiveNavView, entityId?: string) => {
    navigate({ view, id: entityId });
  };

  const openNewInquiryForCompany = (companyId?: string) => {
    setDefaultInquiryCompanyId(companyId);
    handleNavigate('new_inquiry');
  };

  // Route redirection handling
  useEffect(() => {
    if (pathname === '/' || pathname === '') {
      if (isAuthenticated) {
        navigate('/dashboard', true);
      } else {
        navigate('/login', true);
      }
    } else if (isAuthenticated && (pathname === '/login' || pathname === '/signup')) {
      // If already authenticated and trying to view /login or /signup, go straight to dashboard
      navigate('/dashboard', true);
    }
  }, [isAuthenticated, pathname]);

  // Handle unknown/not-found routes for unauthenticated users
  if (!isAuthenticated && activeView === 'not_found' && pathname !== '/login') {
    return <NotFoundPage onGoHome={() => navigate('/login')} />;
  }

  // Unauthenticated or visiting /login: Render ONLY Login Page
  if (!isAuthenticated || pathname === '/login' || pathname === '/signup') {
    return (
      <LoginPage
        onLoginSuccess={() => {
          navigate('/dashboard');
        }}
      />
    );
  }


  const getFirstAllowedView = (): ActiveNavView => {
    if (isSuperAdmin || isAdmin) return 'dashboard';
    if (canView('inquiries')) return 'inquiries';
    if (canView('companies')) return 'companies';
    if (canView('properties')) return 'properties';
    if (canView('tasks')) return 'tasks';
    if (canView('proposals')) return 'proposals';
    if (canView('reports')) return 'reports';
    return 'dashboard';
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard': {
        const canAccessDashboard =
          isSuperAdmin ||
          isAdmin ||
          canView('inquiries') ||
          canView('companies') ||
          canView('properties') ||
          canView('tasks') ||
          canView('proposals') ||
          canView('reports');
        if (!canAccessDashboard) {
          return (
            <AccessRestrictedView
              moduleName="Dashboard"
              onGoBack={() => handleNavigate(getFirstAllowedView())}
            />
          );
        }

        return (
          <DashboardPage
            onNavigate={handleNavigate}
            onOpenNewInquiry={() => handleNavigate('new_inquiry')}
          />
        );
      }

      case 'inquiries':
        if (!canView('inquiries')) {
          return (
            <AccessRestrictedView
              moduleName="Inquiries & Leads"
              onGoBack={() => handleNavigate(getFirstAllowedView())}
            />
          );
        }
        return (
          <InquiriesPage
            onSelectInquiry={(id) => handleNavigate('inquiry_detail', id)}
            onOpenNewInquiry={() => handleNavigate('new_inquiry')}
            onOpenImport={() => handleNavigate('import')}
          />
        );

      case 'new_inquiry':
        if (!canView('inquiries')) {
          return (
            <AccessRestrictedView
              moduleName="Inquiries & Leads"
              onGoBack={() => handleNavigate(getFirstAllowedView())}
            />
          );
        }
        return (
          <NewInquiryPage
            defaultCompanyId={defaultInquiryCompanyId}
            onBack={() => handleNavigate('inquiries')}
            onSuccess={() => {
              setDefaultInquiryCompanyId(undefined);
              handleNavigate('inquiries');
            }}
          />
        );

      case 'inquiry_detail': {
        if (!canView('inquiries')) {
          return (
            <AccessRestrictedView
              moduleName="Inquiries & Leads"
              onGoBack={() => handleNavigate(getFirstAllowedView())}
            />
          );
        }
        const targetId = selectedEntityId || '';
        return (
          <InquiryDetailPage
            key={targetId}
            inquiryId={targetId}
            onBack={() => handleNavigate('inquiries')}
            onNavigateToCompany={(compKid) => handleNavigate('company_detail', compKid)}
            onNavigateToMap={() => handleNavigate('map')}
            onNavigateToProperty={(propId) => handleNavigate('property_detail', propId)}
          />
        );
      }

      case 'companies':
        if (!canView('companies')) {
          return (
            <AccessRestrictedView
              moduleName="Companies & Accounts"
              onGoBack={() => handleNavigate(getFirstAllowedView())}
            />
          );
        }
        return (
          <CompaniesPage
            onSelectCompany={(id) => handleNavigate('company_detail', id)}
            onOpenNewCompany={() => handleNavigate('new_company')}
            onOpenImport={() => handleNavigate('import')}
            onNavigateToMap={() => handleNavigate('map')}
          />
        );

      case 'new_company':
        if (!canView('companies')) {
          return (
            <AccessRestrictedView
              moduleName="Companies & Accounts"
              onGoBack={() => handleNavigate(getFirstAllowedView())}
            />
          );
        }
        return (
          <NewCompanyPage
            onBack={() => handleNavigate('companies')}
            onSuccess={(newCompId) => handleNavigate('company_detail', newCompId)}
          />
        );

      case 'edit_company':
        if (!canView('companies')) {
          return (
            <AccessRestrictedView
              moduleName="Companies & Accounts"
              onGoBack={() => handleNavigate(getFirstAllowedView())}
            />
          );
        }
        return (
          <NewCompanyPage
            companyId={selectedEntityId}
            onBack={() => handleNavigate('companies')}
            onSuccess={(updatedId) => handleNavigate('company_detail', updatedId)}
          />
        );

      case 'company_detail':
        if (!canView('companies')) {
          return (
            <AccessRestrictedView
              moduleName="Companies & Accounts"
              onGoBack={() => handleNavigate(getFirstAllowedView())}
            />
          );
        }
        return (
          <CompanyDetailPage
            companyId={selectedEntityId || ''}
            onBack={() => handleNavigate('companies')}
            onNavigateToInquiry={(inqId) => handleNavigate('inquiry_detail', inqId)}
            onNavigateToMap={() => handleNavigate('map')}
            onOpenNewInquiryForCompany={openNewInquiryForCompany}
          />
        );

      case 'pipeline':
        if (!canView('inquiries')) {
          return (
            <AccessRestrictedView
              moduleName="Pipeline Kanban"
              onGoBack={() => handleNavigate(getFirstAllowedView())}
            />
          );
        }
        return (
          <PipelinePage
            onSelectInquiry={(id) => handleNavigate('inquiry_detail', id)}
            onOpenNewInquiry={() => handleNavigate('new_inquiry')}
          />
        );

      case 'today':
        if (!canView('inquiries')) {
          return <AccessRestrictedView moduleName="Today" onGoBack={() => handleNavigate(getFirstAllowedView())} />;
        }
        return (
          <TodayPage
            onOpenInquiry={(id) => handleNavigate('inquiry_detail', id)}
            onOpenProspect={(id) => handleNavigate('ai_prospect_detail', String(id))}
            onOpenProperty={(id) => handleNavigate('property_detail', id)}
            onOpenTasks={() => handleNavigate('tasks')}
            onOpenPipeline={() => handleNavigate('pipeline')}
          />
        );

      case 'tasks':
        if (!canView('tasks')) {
          return (
            <AccessRestrictedView
              moduleName="Tasks & Follow-ups"
              onGoBack={() => handleNavigate(getFirstAllowedView())}
            />
          );
        }
        return (
          <TasksPage
            onNavigateToCompany={(compKid) => handleNavigate('company_detail', compKid)}
            onNavigateToInquiry={(inqId) => handleNavigate('inquiry_detail', inqId)}
          />
        );

      case 'properties':
        if (!canView('properties')) {
          return (
            <AccessRestrictedView
              moduleName="Properties & Warehouses"
              onGoBack={() => handleNavigate(getFirstAllowedView())}
            />
          );
        }
        return (
          <PropertiesPage
            onSelectProperty={(id) => handleNavigate('property_detail', id)}
            onNavigateToMap={() => handleNavigate('map')}
            onOpenNewProperty={() => handleNavigate('new_property')}
          />
        );

      case 'new_property':
        if (!canView('properties')) {
          return (
            <AccessRestrictedView
              moduleName="Properties & Warehouses"
              onGoBack={() => handleNavigate(getFirstAllowedView())}
            />
          );
        }
        return (
          <NewPropertyPage
            onBack={() => handleNavigate('properties')}
            onSuccess={(newPropId) => {
              handleNavigate('property_detail', newPropId);
            }}
          />
        );

      case 'property_detail':
        if (!canView('properties')) {
          return (
            <AccessRestrictedView
              moduleName="Properties & Warehouses"
              onGoBack={() => handleNavigate(getFirstAllowedView())}
            />
          );
        }
        return (
          <PropertyDetailPage
            propertyId={selectedEntityId || 'prop_1'}
            onBack={() => handleNavigate('properties')}
            onNavigateToInquiry={(inqId) => handleNavigate('inquiry_detail', inqId)}
            onNavigateToMap={() => handleNavigate('map')}
          />
        );

      case 'ai_discovery':
        if (!canView('companies')) {
          return (
            <AccessRestrictedView
              moduleName="AI Discovery"
              onGoBack={() => handleNavigate(getFirstAllowedView())}
            />
          );
        }
        return <AiDiscoveryPage onSelectProspect={(id) => handleNavigate('ai_prospect_detail', String(id))} />;

      case 'ai_prospect_detail':
        if (!canView('companies')) {
          return (
            <AccessRestrictedView
              moduleName="AI Discovery"
              onGoBack={() => handleNavigate(getFirstAllowedView())}
            />
          );
        }
        return (
          <AiProspectDetailPage
            prospectId={Number(selectedEntityId)}
            onBack={() => handleNavigate('ai_discovery')}
            onOpenInquiry={(id) => handleNavigate('inquiry_detail', id)}
            onOpenProspect={(id) => handleNavigate('ai_prospect_detail', String(id))}
          />
        );

      case 'ai_connections':
        if (!canView('companies')) {
          return (
            <AccessRestrictedView
              moduleName="AI Connections"
              onGoBack={() => handleNavigate(getFirstAllowedView())}
            />
          );
        }
        return <AiConnectionsPage />;

      case 'proposals':
        if (!canView('proposals')) {
          return (
            <AccessRestrictedView
              moduleName="Proposals & Financials"
              onGoBack={() => handleNavigate(getFirstAllowedView())}
            />
          );
        }
        return (
          <ProposalsPage
            onNavigateToCompany={(compKid) => handleNavigate('company_detail', compKid)}
            onNavigateToInquiry={(inqId) => handleNavigate('inquiry_detail', inqId)}
          />
        );

      case 'site_visits':
        if (!canView('tasks')) {
          return (
            <AccessRestrictedView
              moduleName="Site Visits"
              onGoBack={() => handleNavigate(getFirstAllowedView())}
            />
          );
        }
        return (
          <SiteVisitsPage
            onNavigateToCompany={(compKid) => handleNavigate('company_detail', compKid)}
            onNavigateToInquiry={(inqId) => handleNavigate('inquiry_detail', inqId)}
          />
        );

      case 'map':
        if (!canView('properties') && !canView('reports')) {
          return (
            <AccessRestrictedView
              moduleName="India Corridors Map"
              onGoBack={() => handleNavigate(getFirstAllowedView())}
            />
          );
        }
        return (
          <MapPage
            onNavigateToCompany={(compKid) => handleNavigate('company_detail', compKid)}
            onNavigateToProperty={(propId) => handleNavigate('property_detail', propId)}
          />
        );

      case 'import':
        if (!canImport('inquiries') && !canImport('companies') && !canImport('properties')) {
          return (
            <AccessRestrictedView
              moduleName="Excel/CSV Import"
              onGoBack={() => handleNavigate(getFirstAllowedView())}
            />
          );
        }
        return (
          <ImportWizardPage
            onNavigateToInquiries={() => handleNavigate('inquiries')}
            onNavigateToCompanies={() => handleNavigate('companies')}
          />
        );

      case 'contacts':
        if (!canView('companies')) {
          return (
            <AccessRestrictedView
              moduleName="Contacts"
              onGoBack={() => handleNavigate(getFirstAllowedView())}
            />
          );
        }
        return (
          <ContactsPage
            onSelectCompany={(id) => handleNavigate('company_detail', id)}
            onOpenNewInquiry={openNewInquiryForCompany}
          />
        );

      case 'documents':
        if (!canView('communications')) {
          return (
            <AccessRestrictedView
              moduleName="Documents"
              onGoBack={() => handleNavigate(getFirstAllowedView())}
            />
          );
        }
        return (
          <DocumentsPage
            onSelectCompany={(id) => handleNavigate('company_detail', id)}
            onSelectInquiry={(id) => handleNavigate('inquiry_detail', id)}
          />
        );

      case 'communications':
        if (!canView('communications')) {
          return (
            <AccessRestrictedView
              moduleName="Communications"
              onGoBack={() => handleNavigate(getFirstAllowedView())}
            />
          );
        }
        return <CommunicationsPage />;

      case 'calls':
        return (
          <CallsPage
            onOpenNewCall={(type) => {
              setNewCallType(type || 'schedule');
              handleNavigate('new_call');
            }}
          />
        );

      case 'new_call':
        return (
          <NewCallPage
            initialCallType={newCallType}
            onBack={() => handleNavigate('calls')}
            onSuccess={() => handleNavigate('calls')}
          />
        );

      case 'reports':
      case 'analytics':
        if (!canView('reports')) {
          return (
            <AccessRestrictedView
              moduleName="Reports & Analytics"
              onGoBack={() => handleNavigate(getFirstAllowedView())}
            />
          );
        }
        return <ReportsPage />;

      case 'settings':
        if (!isAdmin && !isSuperAdmin && !canView('settings') && !hasCapability('perm_adm_roles') && !hasCapability('perm_adm_users')) {
          return (
            <AccessRestrictedView
              moduleName="Settings & RBAC"
              onGoBack={() => handleNavigate(getFirstAllowedView())}
            />
          );
        }
        return <SettingsPage />;


      case 'profile':
        return <ProfilePage />;

      default:
        return <NotFoundPage onGoHome={() => handleNavigate('dashboard')} />;
    }
  };

  return (
    <AppShell
      currentView={activeView}
      onNavigate={handleNavigate}
      selectedEntityId={selectedEntityId}
      onOpenNewInquiry={() => {
        setDefaultInquiryCompanyId(undefined);
        handleNavigate('new_inquiry');
      }}
      onOpenNewCompany={() => handleNavigate('new_company')}
      onOpenNewTask={() => handleNavigate('tasks')}
      onSignOut={() => {
        logout();
        navigate('/login');
      }}
    >
      {renderActiveView()}
    </AppShell>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={150}>
        <AuthProvider>
          <NotificationProvider>
            <ToastProvider>
              <RouterProvider>
                <AppRouter />
              </RouterProvider>
            </ToastProvider>
          </NotificationProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
};

export default App;
