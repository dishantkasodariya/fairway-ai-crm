import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';
import { query } from '../config/db.js';

export type PermissionAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'import'
  | 'export'
  | 'approve'
  | 'assign'
  | 'manage';

export const normalizeCategory = (moduleName: string): string => {
  const m = (moduleName || '').toLowerCase().trim();
  if (m.includes('inquir') || m.includes('lead') || m.includes('pipeline')) return 'Inquiries & Leads';
  if (m.includes('prop') || m.includes('warehouse')) return 'Properties & Warehouses';
  if (m.includes('comp') || m.includes('account') || m.includes('contact')) return 'Companies & Accounts';
  if (m.includes('prop_quote') || m.includes('proposal') || m.includes('financial') || m.includes('quote')) return 'Proposals & Financials';
  if (m.includes('task') || m.includes('site_visit') || m.includes('follow')) return 'Tasks & Follow-ups';
  if (m.includes('comm') || m.includes('mail') || m.includes('call')) return 'Communications';
  if (m.includes('rep') || m.includes('analytic')) return 'Reports & Analytics';
  if (m.includes('adm') || m.includes('setting') || m.includes('role') || m.includes('user')) return 'Administration';
  return moduleName;
};

export const matchAction = (permId: string, capability: string, action: PermissionAction): boolean => {
  const id = (permId || '').toLowerCase();
  const cap = (capability || '').toLowerCase();

  switch (action) {
    case 'export':
      return (
        id.includes('export') ||
        cap.includes('export') ||
        cap.includes('pdf') ||
        cap.includes('download') ||
        cap.includes('excel') ||
        cap.includes('csv')
      );
    case 'import':
      return (
        id.includes('import') ||
        cap.includes('import') ||
        cap.includes('upload') ||
        cap.includes('bulk') ||
        id.includes('docs')
      );
    case 'create':
      return (
        (id.includes('create') ||
          cap.includes('create') ||
          cap.includes('add') ||
          cap.includes('register') ||
          cap.includes('generate')) &&
        !id.includes('quote_edit')
      );
    case 'edit':
      return (
        (id.includes('edit') ||
          cap.includes('edit') ||
          cap.includes('update') ||
          cap.includes('reschedule') ||
          cap.includes('terms')) &&
        !id.includes('delete')
      );
    case 'delete':
      return (
        id.includes('delete') ||
        cap.includes('delete') ||
        cap.includes('archive') ||
        cap.includes('remove') ||
        cap.includes('complete')
      );
    case 'view':
      return (
        id.includes('view') ||
        cap.includes('view') ||
        cap.includes('browse') ||
        cap.includes('read') ||
        cap.includes('access') ||
        id.includes('audit')
      );
    case 'assign':
      return id.includes('assign') || cap.includes('assign') || cap.includes('reassign');
    case 'approve':
      return id.includes('approve') || cap.includes('approve') || id.includes('stage') || cap.includes('stage');
    case 'manage':
      return (
        id.includes('users') ||
        id.includes('roles') ||
        id.includes('stages') ||
        id.includes('audit') ||
        cap.includes('manage') ||
        cap.includes('configure')
      );
    default:
      return false;
  }
};

export const requirePermission = (moduleName: string, action: PermissionAction) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Determine user role: check verified user, fallback to header or database
      let role = (req.user?.role || (req.headers['x-user-role'] as string) || '').trim().toLowerCase();
      const userId = req.user?.userId || (req.headers['x-user-id'] as string);

      if (userId) {
        try {
          const userRes = await query('SELECT role FROM users WHERE id = $1', [userId]);
          if (userRes.rows.length > 0 && userRes.rows[0].role) {
            role = userRes.rows[0].role.trim().toLowerCase();
          }
        } catch {}
      }

      if (!role) {
        res.status(401).json({
          success: false,
          error: { message: 'Authentication required. No role identified for user.' },
        });
        return;
      }

      // 2. Admin & Super Admin have full unrestricted platform access
      if (role === 'admin' || role === 'super_admin') {
        return next();
      }

      // 3. Query role_permissions for capabilities matching this module
      const targetCategory = normalizeCategory(moduleName).toLowerCase();
      const permsRes = await query(
        `SELECT id, capability, category, custom_permissions 
         FROM role_permissions 
         ORDER BY id ASC`
      );

      const categoryPerms = permsRes.rows.filter((r) => {
        const cat = (r.category || '').toLowerCase();
        return cat === targetCategory || cat.includes(targetCategory) || targetCategory.includes(cat);
      });

      if (categoryPerms.length === 0) {
        // Unknown category or no capabilities defined -> reject for safety
        res.status(403).json({
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: `Permission denied: Role '${role}' has no access to '${moduleName}'.`,
          },
        });
        return;
      }

      // 4. Find matching capability permissions for this action
      const matchingActionPerms = categoryPerms.filter((p) =>
        matchAction(p.id, p.capability, action)
      );

      // Helper to evaluate value from custom_permissions
      const isPermitted = (custom: Record<string, string> | null) => {
        if (!custom) return false;
        const keys = [role, role.toUpperCase(), role.toLowerCase()];
        for (const k of keys) {
          if (custom[k] !== undefined) {
            const v = String(custom[k]).trim().toLowerCase();
            return v !== 'no' && v !== '' && v !== 'false';
          }
        }
        for (const [k, v] of Object.entries(custom)) {
          if (k.toLowerCase() === role.toLowerCase()) {
            const val = String(v).trim().toLowerCase();
            return val !== 'no' && val !== '' && val !== 'false';
          }
        }
        return false;
      };

      let allowed = false;

      if (matchingActionPerms.length > 0) {
        allowed = matchingActionPerms.some((p) => isPermitted(p.custom_permissions));
      } else if (action === 'view') {
        // If checking 'view' and no explicit 'view' capability matched, check if ANY capability in category is granted
        allowed = categoryPerms.some((p) => isPermitted(p.custom_permissions));
      }

      if (!allowed) {
        res.status(403).json({
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: `Permission denied: Action '${action}' on '${moduleName}' is disabled for role '${role}'.`,
          },
        });
        return;
      }

      next();
    } catch (err: any) {
      console.error('requirePermission error:', err);
      res.status(500).json({
        success: false,
        error: { message: 'Internal authorization error' },
      });
    }
  };
};
