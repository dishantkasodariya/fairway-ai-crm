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
  authView: 'login' | 'signup';
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

// Route parser
export function parseRoute(pathname: string): {
  view: ActiveNavView;
  entityId?: string;
  isAuth: boolean;
  authType: 'login' | 'signup';
} {
  const cleanPath = pathname.split('?')[0].replace(/\/+$/, '') || '/';

  if (cleanPath === '/login') {
    return { view: 'dashboard', isAuth: true, authType: 'login' };
  }
  if (cleanPath === '/signup') {
    return { view: 'dashboard', isAuth: true, authType: 'signup' };
  }

  // Exact or parameterized routes
  if (cleanPath === '' || cleanPath === '/' || cleanPath === '/dashboard') {
    return { view: 'dashboard', isAuth: false, authType: 'login' };
  }

  if (cleanPath === '/leads' || cleanPath === '/inquiries') {
    return { view: 'inquiries', isAuth: false, authType: 'login' };
  }
  const leadMatch = cleanPath.match(/^\/(?:leads|inquiries)\/([a-zA-Z0-9_-]+)$/);
  if (leadMatch) {
    return { view: 'inquiry_detail', entityId: leadMatch[1], isAuth: false, authType: 'login' };
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

  if (cleanPath === '/settings' || cleanPath === '/rbac') {
    return { view: 'settings', isAuth: false, authType: 'login' };
  }

  // Fallback
  return { view: 'dashboard', isAuth: false, authType: 'login' };
}

// Convert ActiveNavView + id to canonical URL
export function pathToView(view: ActiveNavView, entityId?: string): string {
  switch (view) {
    case 'dashboard':
      return '/dashboard';
    case 'inquiries':
      return '/leads';
    case 'inquiry_detail':
      return `/leads/${entityId || 'inq_1048'}`;
    case 'companies':
      return '/companies';
    case 'company_detail':
      return `/companies/${entityId || 'comp_1'}`;
    case 'pipeline':
      return '/pipeline';
    case 'tasks':
      return '/tasks';
    case 'properties':
      return '/properties';
    case 'property_detail':
      return `/properties/${entityId || 'prop_1'}`;
    case 'proposals':
      return '/proposals';
    case 'site_visits':
      return '/site-visits';
    case 'map':
      return '/map';
    case 'import':
      return '/import';
    case 'reports':
      return '/reports';
    case 'settings':
      return '/settings';
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
