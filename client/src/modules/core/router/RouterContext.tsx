import React, { createContext, useContext, useState, useEffect } from 'react';
import { ActiveNavView } from '@/modules/core/ui/AppShell';

interface RouteMatch {
  view: ActiveNavView;
  entityId?: string;
}

interface RouterContextType {
  pathname: string;
  navigate: (to: string | { view: ActiveNavView; id?: string }, replace?: boolean) => void;
  activeView: ActiveNavView;
  selectedEntityId?: string;
  isAuthRoute: boolean;
  authView: 'login';
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

// Route parser
export function parseRoute(pathname: string): {
  view: ActiveNavView;
  entityId?: string;
  isAuth: boolean;
  authType: 'login';
} {
  const cleanPath = pathname.split('?')[0].replace(/\/+$/, '') || '/';

  if (cleanPath === '/login' || cleanPath === '/signup') {
    return { view: 'dashboard', isAuth: true, authType: 'login' };
  }

  // Exact or parameterized routes
  if (cleanPath === '' || cleanPath === '/' || cleanPath === '/dashboard') {
    return { view: 'dashboard', isAuth: false, authType: 'login' };
  }

  if (
    cleanPath === '/inquiries/new' ||
    cleanPath === '/leads/new' ||
    cleanPath === '/new-inquiry' ||
    cleanPath === '/inquiry/new'
  ) {
    return { view: 'new_inquiry', isAuth: false, authType: 'login' };
  }

  if (cleanPath === '/leads' || cleanPath === '/inquiries') {
    return { view: 'inquiries', isAuth: false, authType: 'login' };
  }
  const leadMatch = cleanPath.match(/^\/(?:leads|inquiries)\/([a-zA-Z0-9_-]+)$/);
  if (leadMatch) {
    return { view: 'inquiry_detail', entityId: leadMatch[1], isAuth: false, authType: 'login' };
  }

  if (
    cleanPath === '/companies/new' ||
    cleanPath === '/new-company' ||
    cleanPath === '/company/new'
  ) {
    return { view: 'new_company', isAuth: false, authType: 'login' };
  }

  if (cleanPath === '/companies') {
    return { view: 'companies', isAuth: false, authType: 'login' };
  }
  const compMatch = cleanPath.match(/^\/companies\/([a-zA-Z0-9_-]+)$/);
  if (compMatch) {
    return { view: 'company_detail', entityId: compMatch[1], isAuth: false, authType: 'login' };
  }

  if (cleanPath === '/pipeline' || cleanPath === '/kanban') {
    return { view: 'pipeline', isAuth: false, authType: 'login' };
  }

  if (cleanPath === '/tasks') {
    return { view: 'tasks', isAuth: false, authType: 'login' };
  }

  if (cleanPath === '/properties/new' || cleanPath === '/warehouses/new' || cleanPath === '/new-warehouse' || cleanPath === '/new-property') {
    return { view: 'new_property', isAuth: false, authType: 'login' };
  }

  if (cleanPath === '/properties' || cleanPath === '/warehouses') {
    return { view: 'properties', isAuth: false, authType: 'login' };
  }
  const propMatch = cleanPath.match(/^\/(?:properties|warehouses)\/([a-zA-Z0-9_-]+)$/);
  if (propMatch) {
    return { view: 'property_detail', entityId: propMatch[1], isAuth: false, authType: 'login' };
  }

  if (cleanPath === '/proposals') {
    return { view: 'proposals', isAuth: false, authType: 'login' };
  }

  if (cleanPath === '/site-visits') {
    return { view: 'site_visits', isAuth: false, authType: 'login' };
  }

  if (cleanPath === '/map' || cleanPath === '/corridors') {
    return { view: 'map', isAuth: false, authType: 'login' };
  }

  if (cleanPath === '/import' || cleanPath === '/import-export') {
    return { view: 'import', isAuth: false, authType: 'login' };
  }

  if (cleanPath === '/reports' || cleanPath === '/analytics') {
    return { view: 'reports', isAuth: false, authType: 'login' };
  }

  if (
    cleanPath === '/settings' ||
    cleanPath === '/setting' ||
    cleanPath === '/rbac' ||
    cleanPath.startsWith('/setting/') ||
    cleanPath.startsWith('/settings/')
  ) {
    const settingsMatch = cleanPath.match(/^\/(?:settings|setting)(?:\/([a-zA-Z0-9_-]+))?$/);
    let subTab = 'user-management';
    if (settingsMatch && settingsMatch[1]) {
      const sub = settingsMatch[1].toLowerCase();
      if (sub === 'roles-permissions' || sub === 'roles' || sub === 'rbac') {
        subTab = 'roles-permissions';
      } else if (sub === 'pipeline-stages' || sub === 'pipeline' || sub === 'stages') {
        subTab = 'pipeline-stages';
      } else if (sub === 'audit-logs' || sub === 'audit' || sub === 'logs') {
        subTab = 'audit-logs';
      } else if (sub === 'user-management' || sub === 'users' || sub === 'members') {
        subTab = 'user-management';
      }
    } else if (cleanPath === '/rbac') {
      subTab = 'roles-permissions';
    }
    return { view: 'settings', entityId: subTab, isAuth: false, authType: 'login' };
  }

  if (cleanPath === '/profile' || cleanPath === '/user-profile' || cleanPath === '/account') {
    return { view: 'profile', isAuth: false, authType: 'login' };
  }

  if (cleanPath === '/contacts' || cleanPath === '/stakeholders') {
    return { view: 'contacts', isAuth: false, authType: 'login' };
  }

  if (cleanPath === '/documents' || cleanPath === '/files') {
    return { view: 'documents', isAuth: false, authType: 'login' };
  }

  if (cleanPath === '/communications' || cleanPath === '/inbox' || cleanPath === '/messages') {
    return { view: 'communications', isAuth: false, authType: 'login' };
  }

  if (cleanPath === '/404' || cleanPath === '/not-found') {
    return { view: 'not_found', isAuth: false, authType: 'login' };
  }

  // Unmatched / Unknown routes like /sasda -> 404 Not Found
  return { view: 'not_found', isAuth: false, authType: 'login' };
}

// Convert ActiveNavView + id to canonical URL
export function pathToView(view: ActiveNavView, entityId?: string): string {
  switch (view) {
    case 'dashboard':
      return '/dashboard';
    case 'companies':
      return '/companies';
    case 'company_detail':
      return `/companies/${entityId || 'comp_1'}`;
    case 'new_company':
      return '/companies/new';
    case 'contacts':
      return '/contacts';
    case 'inquiries':
      return '/leads';
    case 'new_inquiry':
      return '/inquiries/new';
    case 'inquiry_detail':
      return entityId ? `/leads/${entityId}` : '/leads';
    case 'pipeline':
      return '/pipeline';
    case 'tasks':
      return '/tasks';
    case 'properties':
      return '/properties';
    case 'new_property':
      return '/properties/new';
    case 'property_detail':
      return `/properties/${entityId || 'prop_1'}`;
    case 'proposals':
      return '/proposals';
    case 'site_visits':
      return '/site-visits';
    case 'documents':
      return '/documents';
    case 'communications':
      return '/communications';
    case 'map':
      return '/map';
    case 'import':
      return '/import';
    case 'reports':
    case 'analytics':
      return '/reports';
    case 'settings':
      return `/setting/${entityId || 'user-management'}`;
    case 'profile':
      return '/profile';
    case 'not_found':
      return '/404';
    default:
      return '/dashboard';
  }
}


export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pathname, setPathname] = useState<string>(() => window.location.pathname || '/login');

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname || '/login');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (to: string | { view: ActiveNavView; id?: string }, replace = false) => {
    let targetPath: string;
    if (typeof to === 'string') {
      targetPath = to.startsWith('/') ? to : `/${to}`;
    } else {
      targetPath = pathToView(to.view, to.id);
    }

    if (replace) {
      window.history.replaceState({}, '', targetPath);
    } else {
      window.history.pushState({}, '', targetPath);
    }
    setPathname(targetPath);
  };

  const parsed = parseRoute(pathname);

  return (
    <RouterContext.Provider
      value={{
        pathname,
        navigate,
        activeView: parsed.view,
        selectedEntityId: parsed.entityId,
        isAuthRoute: parsed.isAuth,
        authView: parsed.authType,
      }}
    >
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = (): RouterContextType => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
};
