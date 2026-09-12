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
import { ContactsPage } from '@/modules/contacts/pages/ContactsPage';
import { DocumentsPage } from '@/modules/documents/pages/DocumentsPage';
import { CommunicationsPage } from '@/modules/communications/pages/CommunicationsPage';
import { MapPage } from '@/modules/map/pages/MapPage';
import { ImportWizardPage } from '@/modules/import-export/pages/ImportWizardPage';
import { ReportsPage } from '@/modules/reports/pages/ReportsPage';
import { SettingsPage } from '@/modules/settings/pages/SettingsPage';
import { ProfilePage } from '@/modules/profile/pages/ProfilePage';
import { NotFoundPage } from '@/modules/core/pages/NotFoundPage';

import { StorageService } from '@/modules/core/services/storageService';

const AppRouter: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const { activeView, selectedEntityId, navigate, pathname } = useRouter();

  // Global Quick Action State
  const [defaultInquiryCompanyId, setDefaultInquiryCompanyId] = useState<string | undefined>(undefined);

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

      case 'inquiry_detail': {
        const targetId = selectedEntityId || StorageService.getInquiries()[0]?.id || '';
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

      case 'contacts':
        return (
          <ContactsPage
            onSelectCompany={(id) => handleNavigate('company_detail', id)}
            onOpenNewInquiry={openNewInquiryForCompany}
          />
        );

      case 'documents':
        return (
          <DocumentsPage
            onSelectCompany={(id) => handleNavigate('company_detail', id)}
            onSelectInquiry={(id) => handleNavigate('inquiry_detail', id)}
          />
        );

      case 'communications':
        return <CommunicationsPage />;

      case 'reports':
      case 'analytics':
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
