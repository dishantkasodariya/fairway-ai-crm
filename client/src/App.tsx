import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/modules/core/providers/AuthContext';
import { NotificationProvider } from '@/modules/core/providers/NotificationContext';
import { ToastProvider } from '@/modules/core/providers/ToastContext';
import { ThemeProvider } from '@/modules/core/providers/ThemeContext';
import { TooltipProvider } from '@/modules/core/components/ui/tooltip';
import { RouterProvider, useRouter } from '@/modules/core/router/RouterContext';
import { AppShell, ActiveNavView } from '@/modules/core/ui/AppShell';

// Auth Pages
import { LoginPage } from '@/modules/auth/pages/LoginPage';
import { SignUpPage } from '@/modules/auth/pages/SignUpPage';

// Feature Pages
import { DashboardPage } from '@/modules/dashboard/pages/DashboardPage';
import { InquiriesPage } from '@/modules/inquiries/pages/InquiriesPage';
import { InquiryDetailPage } from '@/modules/inquiries/pages/InquiryDetailPage';
import { NewInquiryPage } from '@/modules/inquiries/pages/NewInquiryPage';
import { CompaniesPage } from '@/modules/companies/pages/CompaniesPage';
import { CompanyDetailPage } from '@/modules/companies/pages/CompanyDetailPage';
import { NewCompanyPage } from '@/modules/companies/pages/NewCompanyPage';
import { PipelinePage } from '@/modules/pipeline/pages/PipelinePage';
import { TasksPage } from '@/modules/tasks/pages/TasksPage';
import { PropertiesPage } from '@/modules/properties/pages/PropertiesPage';
import { PropertyDetailPage } from '@/modules/properties/pages/PropertyDetailPage';
import { NewPropertyPage } from '@/modules/properties/pages/NewPropertyPage';
import { ProposalsPage } from '@/modules/proposals/pages/ProposalsPage';
import { SiteVisitsPage } from '@/modules/site-visits/pages/SiteVisitsPage';
import { MapPage } from '@/modules/map/pages/MapPage';
import { ImportWizardPage } from '@/modules/import-export/pages/ImportWizardPage';
import { ReportsPage } from '@/modules/reports/pages/ReportsPage';
import { SettingsPage } from '@/modules/settings/pages/SettingsPage';
import { ProfilePage } from '@/modules/profile/pages/ProfilePage';
import { NotFoundPage } from '@/modules/core/pages/NotFoundPage';


import { StorageService } from '@/modules/core/services/storageService';

const AppRouter: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { activeView, selectedEntityId, navigate, pathname, isAuthRoute, authView } = useRouter();

  // Global Quick Action State
  const [defaultInquiryCompanyId, setDefaultInquiryCompanyId] = useState<string | undefined>(undefined);

  const handleNavigate = (view: ActiveNavView, entityId?: string) => {
    navigate({ view, id: entityId });
  };

  const openNewInquiryForCompany = (companyId: string) => {
    setDefaultInquiryCompanyId(companyId);
    handleNavigate('new_inquiry');
  };

  // Redirect root URL '/' to '/dashboard' if authenticated or '/login' if not authenticated
  useEffect(() => {
    if (pathname === '/' || pathname === '') {
      if (isAuthenticated) {
        navigate('/dashboard', true);
      } else {
        navigate('/login', true);
      }
    }
  }, [isAuthenticated, pathname]);

  // Handle unknown/not-found routes for unauthenticated users
  if (!isAuthenticated && activeView === 'not_found' && pathname !== '/login' && pathname !== '/signup') {
    return <NotFoundPage onGoHome={() => navigate('/login')} />;
  }

  // Auth routes (/login, /signup) or Unauthenticated: Render ONLY Auth Pages (No AppShell, No Dashboard)
  if (isAuthRoute || pathname === '/login' || pathname === '/signup' || !isAuthenticated) {
    if (pathname === '/signup' || authView === 'signup') {
      return (
        <SignUpPage
          onNavigateToLogin={() => navigate('/login')}
          onSignUpSuccess={() => {
            navigate('/dashboard');
          }}
        />
      );
    }
    return (
      <LoginPage
        onNavigateToSignUp={() => navigate('/signup')}
        onLoginSuccess={() => {
          navigate('/dashboard');
        }}
      />
    );
  }


  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardPage
            onNavigate={handleNavigate}
            onOpenNewInquiry={() => handleNavigate('new_inquiry')}
          />
        );

      case 'inquiries':
        return (
          <InquiriesPage
            onSelectInquiry={(id) => handleNavigate('inquiry_detail', id)}
            onOpenNewInquiry={() => handleNavigate('new_inquiry')}
            onOpenImport={() => handleNavigate('import')}
          />
        );

      case 'new_inquiry':
        return (
          <NewInquiryPage
            defaultCompanyId={defaultInquiryCompanyId}
            onBack={() => handleNavigate('inquiries')}
            onSuccess={(newInquiryId) => {
              setDefaultInquiryCompanyId(undefined);
              handleNavigate('inquiry_detail', newInquiryId);
            }}
          />
        );

      case 'inquiry_detail':
        return (
          <InquiryDetailPage
            inquiryId={selectedEntityId || 'inq_1048'}
            onBack={() => handleNavigate('inquiries')}
            onNavigateToCompany={(compKid) => handleNavigate('company_detail', compKid)}
            onNavigateToMap={() => handleNavigate('map')}
            onNavigateToProperty={(propId) => handleNavigate('property_detail', propId)}
          />
        );

      case 'companies':
        return (
          <CompaniesPage
            onSelectCompany={(id) => handleNavigate('company_detail', id)}
            onOpenNewCompany={() => handleNavigate('new_company')}
            onOpenImport={() => handleNavigate('import')}
            onNavigateToMap={() => handleNavigate('map')}
          />
        );

      case 'new_company':
        return (
          <NewCompanyPage
            onBack={() => handleNavigate('companies')}
            onSuccess={(newCompId) => handleNavigate('company_detail', newCompId)}
          />
        );

      case 'edit_company':
        return (
          <NewCompanyPage
            companyToEdit={StorageService.getCompanyById(selectedEntityId || '')}
            onBack={() => handleNavigate('companies')}
            onSuccess={(updatedId) => handleNavigate('company_detail', updatedId)}
          />
        );

      case 'company_detail':
        return (
          <CompanyDetailPage
            companyId={selectedEntityId || 'comp_1'}
            onBack={() => handleNavigate('companies')}
            onNavigateToInquiry={(inqId) => handleNavigate('inquiry_detail', inqId)}
            onNavigateToMap={() => handleNavigate('map')}
            onOpenNewInquiryForCompany={openNewInquiryForCompany}
          />
        );

      case 'pipeline':
        return (
          <PipelinePage
            onSelectInquiry={(id) => handleNavigate('inquiry_detail', id)}
            onOpenNewInquiry={() => handleNavigate('new_inquiry')}
          />
        );

      case 'tasks':
        return (
          <TasksPage
            onNavigateToCompany={(compKid) => handleNavigate('company_detail', compKid)}
            onNavigateToInquiry={(inqId) => handleNavigate('inquiry_detail', inqId)}
          />
        );

      case 'properties':
        return (
          <PropertiesPage
            onSelectProperty={(id) => handleNavigate('property_detail', id)}
            onNavigateToMap={() => handleNavigate('map')}
            onOpenNewProperty={() => handleNavigate('new_property')}
          />
        );

      case 'new_property':
        return (
          <NewPropertyPage
            onBack={() => handleNavigate('properties')}
            onSuccess={(newPropId) => {
              handleNavigate('property_detail', newPropId);
            }}
          />
        );

      case 'property_detail':
        return (
          <PropertyDetailPage
            propertyId={selectedEntityId || 'prop_1'}
            onBack={() => handleNavigate('properties')}
            onNavigateToInquiry={(inqId) => handleNavigate('inquiry_detail', inqId)}
            onNavigateToMap={() => handleNavigate('map')}
          />
        );

      case 'proposals':
        return (
          <ProposalsPage
            onNavigateToCompany={(compKid) => handleNavigate('company_detail', compKid)}
            onNavigateToInquiry={(inqId) => handleNavigate('inquiry_detail', inqId)}
          />
        );

      case 'site_visits':
        return (
          <SiteVisitsPage
            onNavigateToCompany={(compKid) => handleNavigate('company_detail', compKid)}
            onNavigateToInquiry={(inqId) => handleNavigate('inquiry_detail', inqId)}
          />
        );

      case 'map':
        return (
          <MapPage
            onNavigateToCompany={(compKid) => handleNavigate('company_detail', compKid)}
            onNavigateToProperty={(propId) => handleNavigate('property_detail', propId)}
          />
        );

      case 'import':
        return (
          <ImportWizardPage
            onNavigateToInquiries={() => handleNavigate('inquiries')}
            onNavigateToCompanies={() => handleNavigate('companies')}
          />
        );

      case 'reports':
        return <ReportsPage />;

      case 'settings':
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
      onSignOut={() => navigate('/login')}
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
