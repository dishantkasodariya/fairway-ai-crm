import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/modules/core/providers/AuthContext';
import { NotificationProvider } from '@/modules/core/providers/NotificationContext';
import { ToastProvider } from '@/modules/core/providers/ToastContext';
import { RouterProvider, useRouter } from '@/modules/core/router/RouterContext';
import { AppShell, ActiveNavView } from '@/modules/core/ui/AppShell';

// Auth Pages
import { LoginPage } from '@/modules/auth/pages/LoginPage';
import { SignUpPage } from '@/modules/auth/pages/SignUpPage';

// Feature Pages
import { DashboardPage } from '@/modules/dashboard/pages/DashboardPage';
import { InquiriesPage } from '@/modules/inquiries/pages/InquiriesPage';
import { InquiryDetailPage } from '@/modules/inquiries/pages/InquiryDetailPage';
import { CompaniesPage } from '@/modules/companies/pages/CompaniesPage';
import { CompanyDetailPage } from '@/modules/companies/pages/CompanyDetailPage';
import { PipelinePage } from '@/modules/pipeline/pages/PipelinePage';
import { TasksPage } from '@/modules/tasks/pages/TasksPage';
import { PropertiesPage } from '@/modules/properties/pages/PropertiesPage';
import { PropertyDetailPage } from '@/modules/properties/pages/PropertyDetailPage';
import { ProposalsPage } from '@/modules/proposals/pages/ProposalsPage';
import { SiteVisitsPage } from '@/modules/site-visits/pages/SiteVisitsPage';
import { MapPage } from '@/modules/map/pages/MapPage';
import { ImportWizardPage } from '@/modules/import-export/pages/ImportWizardPage';
import { ReportsPage } from '@/modules/reports/pages/ReportsPage';
import { SettingsPage } from '@/modules/settings/pages/SettingsPage';
import { NotFoundPage } from '@/modules/core/pages/NotFoundPage';

// Feature Modals
import { NewInquiryStepperModal } from '@/modules/inquiries/components/NewInquiryStepperModal';
import { NewCompanyModal } from '@/modules/companies/components/NewCompanyModal';

const AppRouter: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { activeView, selectedEntityId, navigate, pathname, isAuthRoute, authView } = useRouter();

  // Global Quick Action Modals
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [defaultInquiryCompanyId, setDefaultInquiryCompanyId] = useState<string | undefined>(undefined);

  const handleNavigate = (view: ActiveNavView, entityId?: string) => {
    navigate({ view, id: entityId });
  };

  const openNewInquiryForCompany = (companyId: string) => {
    setDefaultInquiryCompanyId(companyId);
    setIsInquiryModalOpen(true);
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
            onOpenNewInquiry={() => setIsInquiryModalOpen(true)}
          />
        );

      case 'inquiries':
        return (
          <InquiriesPage
            onSelectInquiry={(id) => handleNavigate('inquiry_detail', id)}
            onOpenNewInquiry={() => setIsInquiryModalOpen(true)}
            onOpenImport={() => handleNavigate('import')}
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
            onOpenNewCompany={() => setIsCompanyModalOpen(true)}
            onOpenImport={() => handleNavigate('import')}
            onNavigateToMap={() => handleNavigate('map')}
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
            onOpenNewInquiry={() => setIsInquiryModalOpen(true)}
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
        setIsInquiryModalOpen(true);
      }}
      onOpenNewCompany={() => setIsCompanyModalOpen(true)}
      onOpenNewTask={() => handleNavigate('tasks')}
      onSignOut={() => navigate('/login')}
    >
      {renderActiveView()}

      {/* Global Guided New Inquiry Stepper Modal */}
      <NewInquiryStepperModal
        isOpen={isInquiryModalOpen}
        onClose={() => {
          setIsInquiryModalOpen(false);
          setDefaultInquiryCompanyId(undefined);
        }}
        defaultCompanyId={defaultInquiryCompanyId}
        onSuccess={(newInquiryId) => {
          handleNavigate('inquiry_detail', newInquiryId);
        }}
      />

      {/* Global New Company Modal */}
      <NewCompanyModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        onSuccess={(newCompanyId) => {
          handleNavigate('company_detail', newCompanyId);
        }}
      />
    </AppShell>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ToastProvider>
          <RouterProvider>
            <AppRouter />
          </RouterProvider>
        </ToastProvider>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
