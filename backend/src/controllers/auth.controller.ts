import { Request, Response } from 'express';
import { query } from '../config/db.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

interface MemoryUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  avatar?: string;
  department?: string;
  status: string;
  assigned_leads_count?: number;
  last_active?: Date;
  created_at?: Date;
}

// Pre-hash default demo password for fallback memory store
const DEFAULT_DEMO_HASH = '$2a$10$8sB3GjV1v7GqV6pG.uQY..uM8J7v1i7v2g5H6k7l8m9n0o1p2q3r4'; // will be refreshed asynchronously
hashPassword('fairway123').then((h) => {
  for (const u of memoryUsers.values()) {
    if (!u.password) u.password = h;
  }
}).catch(() => {});

const memoryUsers: Map<string, MemoryUser> = new Map([
  [
    'amit@fairway.co.in',
    {
      id: 'usr_amit_1',
      name: 'Amit Patel',
      email: 'amit@fairway.co.in',
      password: '',
      role: 'super_admin',
      department: 'Executive Leadership',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      status: 'Active',
      assigned_leads_count: 16,
      last_active: new Date(),
      created_at: new Date(),
    },
  ],
  [
    'aryan@fairway.co.in',
    {
      id: 'usr_aryan_1',
      name: 'Aryan Verma',
      email: 'aryan@fairway.co.in',
      password: '',
      role: 'super_admin',
      department: 'Executive Leadership',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      status: 'Active',
      assigned_leads_count: 14,
      last_active: new Date(),
      created_at: new Date(),
    },
  ],
  [
    'bhavya@gmail.com',
    {
      id: 'usr_bhavya_1',
      name: 'Bhavya Sharma',
      email: 'bhavya@gmail.com',
      password: '', // will match on compare or fallback
      role: 'super_admin',
      department: 'Executive Leadership',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      status: 'Active',
      assigned_leads_count: 8,
      last_active: new Date(),
      created_at: new Date(),
    },
  ],
  [
    'bhavya.sharma@fairwaylogistics.in',
    {
      id: 'usr_bhavya_2',
      name: 'Bhavya Sharma',
      email: 'bhavya.sharma@fairwaylogistics.in',
      password: '',
      role: 'super_admin',
      department: 'Executive Leadership',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      status: 'Active',
      assigned_leads_count: 8,
      last_active: new Date(),
      created_at: new Date(),
    },
  ],
  [
    'admin@fairway.co.in',
    {
      id: 'usr_admin_1',
      name: 'Aditya Mehta',
      email: 'admin@fairway.co.in',
      password: '',
      role: 'admin',
      department: 'Executive Leadership',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      status: 'Active',
      assigned_leads_count: 14,
      last_active: new Date(),
      created_at: new Date(),
    },
  ],
  [
    'admin@fairway.com',
    {
      id: 'e13cc314-f451-4c91-a2c0-571973b78ad5',
      name: 'Dishant Patel (Super Admin)',
      email: 'admin@fairway.com',
      password: '',
      role: 'super_admin',
      department: 'Executive Leadership',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      status: 'Active',
      assigned_leads_count: 18,
      last_active: new Date(),
      created_at: new Date(),
    },
  ],
  [
    'sales@fairway.com',
    {
      id: '8e5d2779-3129-4e6f-9c37-bbbe5169a1db',
      name: 'Rahul Sharma',
      email: 'sales@fairway.com',
      password: '',
      role: 'admin',
      department: 'Industrial Brokerage',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      status: 'Active',
      assigned_leads_count: 12,
      last_active: new Date(),
      created_at: new Date(),
    },
  ],
  [
    'manager@fairway.com',
    {
      id: 'c31f7458-e11d-48c5-b853-18b8541b2122',
      name: 'Deepak Mehta',
      email: 'manager@fairway.com',
      password: '',
      role: 'admin',
      department: 'Executive Leadership',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      status: 'Active',
      assigned_leads_count: 9,
      last_active: new Date(),
      created_at: new Date(),
    },
  ],
  [
    'dishant@fairway.co.in',
    {
      id: 'usr_dishant',
      name: 'Dishant Patel',
      email: 'dishant@fairway.co.in',
      password: '',
      role: 'super_admin',
      department: 'Executive Leadership',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      status: 'Active',
      assigned_leads_count: 10,
      last_active: new Date(),
      created_at: new Date(),
    },
  ],
  [
    'sales@fairway.co.in',
    {
      id: 'usr_sales_1',
      name: 'Pooja Hegde',
      email: 'sales@fairway.co.in',
      password: '',
      role: 'sales',
      department: 'Gujarat Leasing Desk',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      status: 'Active',
      assigned_leads_count: 22,
      last_active: new Date(),
      created_at: new Date(),
    },
  ],
]);

// Helper to sanitize user object for client response (camelCase & no password)
const formatUserResponse = (row: any) => {
  if (!row) return null;
  const email = (row.email || '').trim().toLowerCase();
  const isSuperAdmin = email === 'amit@fairway.co.in' || email === 'aryan@fairway.co.in';
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: isSuperAdmin ? 'super_admin' : (row.role || 'admin'),
    avatar: row.avatar || undefined,
    phone: row.phone || '+91 988496151',
    timezone: row.timezone || 'Asia/Kolkata',
    workingHoursStart: row.working_hours_start || '10:00 AM',
    workingHoursEnd: row.working_hours_end || '7:30 PM',
    twoFactorEnabled: row.two_factor_enabled === true || row.two_factor_enabled === 'true',
    birthDate: row.birth_date || undefined,
    department: isSuperAdmin ? 'Executive Leadership' : (row.department || 'Industrial Leasing'),
    status: row.status || 'Active',
    assignedLeadsCount: row.assigned_leads_count || 0,
    lastActive: row.last_active || new Date().toISOString(),
  };
};



export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, department, avatar } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        error: { message: 'Name, email, and password are required fields.' },
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        error: { message: 'Password must be at least 6 characters long.' },
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const hashedPassword = await hashPassword(password);
    const userId = `usr_${Date.now()}`;
    // Security: Restrict public self-registration to low-privilege roles (never allow self-assignment of admin/super_admin)
    const allowedSelfRoles = ['sales', 'viewer'];
    const userRole = (role && allowedSelfRoles.includes(role.toLowerCase())) ? role.toLowerCase() : 'sales';
    const userDept = department || 'Industrial Leasing';
    const userAvatar = avatar || null;


    let createdUser: any = null;

    try {
      // 1. Query PostgreSQL
      const existingRes = await query('SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1;', [normalizedEmail]);

      if (existingRes.rows.length > 0) {
        res.status(409).json({
          success: false,
          error: { message: 'An account with this email address already exists.' },
        });
        return;
      }

      const insertRes = await query(
        `INSERT INTO users (id, name, email, password, role, department, avatar, status, assigned_leads_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *;`,
        [userId, name.trim(), normalizedEmail, hashedPassword, userRole, userDept, userAvatar, 'Active', 0]
      );

      createdUser = insertRes.rows[0];
    } catch (dbError: any) {
      console.warn('⚠️ PostgreSQL write failed, falling back to memory store:', dbError.message);

      if (memoryUsers.has(normalizedEmail)) {
        res.status(409).json({
          success: false,
          error: { message: 'An account with this email address already exists.' },
        });
        return;
      }

      const fallbackUser: MemoryUser = {
        id: userId,
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: userRole,
        department: userDept,
        avatar: userAvatar || undefined,
        status: 'Active',
        assigned_leads_count: 0,
        last_active: new Date(),
        created_at: new Date(),
      };


      memoryUsers.set(normalizedEmail, fallbackUser);
      createdUser = fallbackUser;
    }

    const token = generateToken({
      userId: createdUser.id,
      email: createdUser.email,
      role: createdUser.role,
    });

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      data: {
        user: formatUserResponse(createdUser),
        token,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Internal server error during registration.' },
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: { message: 'Please provide both email and password.' },
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    let userRow: any = null;

    try {
      const dbRes = await query('SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1;', [normalizedEmail]);
      if (dbRes.rows.length > 0) {
        userRow = dbRes.rows[0];
      }
    } catch (dbError: any) {
      console.warn('⚠️ PostgreSQL query failed, checking memory store:', dbError.message);
      userRow = memoryUsers.get(normalizedEmail) || null;
    }

    if (!userRow) {
      userRow = memoryUsers.get(normalizedEmail);
    }

    if (!userRow) {
      res.status(401).json({
        success: false,
        error: { message: 'No account found with this email address. Please register first.' },
      });
      return;
    }

    let isMatch = false;
    if (userRow.password) {
      isMatch = await comparePassword(password, userRow.password).catch(() => false);
    }

    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: { message: 'Invalid password. Please check your credentials.' },
      });
      return;
    }

    // Ensure Amit and Aryan always receive super_admin privileges and tokens
    if (normalizedEmail === 'amit@fairway.co.in' || normalizedEmail === 'aryan@fairway.co.in') {
      userRow.role = 'super_admin';
      userRow.department = 'Executive Leadership';
    }

    const token = generateToken({
      userId: userRow.id,
      email: userRow.email,
      role: userRow.role,
    });

    res.status(200).json({
      success: true,
      message: 'Signed in successfully.',
      data: {
        user: formatUserResponse(userRow),
        token,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Internal server error during login.' },
    });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized.' },
      });
      return;
    }

    let userRow: any = null;

    try {
      const dbRes = await query('SELECT * FROM users WHERE id = $1 LIMIT 1;', [userId]);
      if (dbRes.rows.length > 0) {
        userRow = dbRes.rows[0];
      }
    } catch {
      for (const u of memoryUsers.values()) {
        if (u.id === userId) {
          userRow = u;
          break;
        }
      }
    }

    if (!userRow) {
      for (const u of memoryUsers.values()) {
        if (u.id === userId) {
          userRow = u;
          break;
        }
      }
    }

    if (!userRow) {
      res.status(404).json({
        success: false,
        error: { message: 'User not found.' },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: formatUserResponse(userRow),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Error fetching user profile.' },
    });
  }
};

export const getUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    let rows: any[] = [];

    try {
      const dbRes = await query('SELECT * FROM users ORDER BY created_at ASC;');
      rows = dbRes.rows;
    } catch {
      rows = Array.from(memoryUsers.values());
    }

    res.status(200).json({
      success: true,
      data: rows.map(formatUserResponse),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to list users.' },
    });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      return;
    }

    const { name, phone, department, avatar, timezone, workingHoursStart, workingHoursEnd, twoFactorEnabled, birthDate } = req.body;

    let updatedRow: any = null;

    try {
      const updateRes = await query(
        `UPDATE users
         SET name = COALESCE($1, name),
             phone = COALESCE($2, phone),
             department = COALESCE($3, department),
             avatar = $4,
             timezone = COALESCE($5, timezone),
             working_hours_start = COALESCE($6, working_hours_start),
             working_hours_end = COALESCE($7, working_hours_end),
             two_factor_enabled = COALESCE($8, two_factor_enabled),
             birth_date = COALESCE($9, birth_date),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $10
         RETURNING *;`,
        [
          name ? name.trim() : null,
          phone !== undefined ? phone : null,
          department !== undefined ? department : null,
          avatar !== undefined ? (avatar || null) : null,
          timezone !== undefined ? timezone : null,
          workingHoursStart !== undefined ? workingHoursStart : null,
          workingHoursEnd !== undefined ? workingHoursEnd : null,
          twoFactorEnabled !== undefined ? twoFactorEnabled : null,
          birthDate !== undefined ? birthDate : null,
          userId,
        ]
      );

      if (updateRes.rows.length > 0) {
        updatedRow = updateRes.rows[0];
      }
    } catch (dbError: any) {
      console.warn('⚠️ PostgreSQL update failed, updating memory store:', dbError.message);
      for (const [emailKey, u] of memoryUsers.entries()) {
        if (u.id === userId) {
          if (name) u.name = name.trim();
          if (phone !== undefined) (u as any).phone = phone;
          if (department !== undefined) u.department = department;
          if (avatar !== undefined) u.avatar = avatar || undefined;
          if (timezone !== undefined) (u as any).timezone = timezone;
          if (workingHoursStart !== undefined) (u as any).working_hours_start = workingHoursStart;
          if (workingHoursEnd !== undefined) (u as any).working_hours_end = workingHoursEnd;
          if (twoFactorEnabled !== undefined) (u as any).two_factor_enabled = twoFactorEnabled;
          if (birthDate !== undefined) (u as any).birth_date = birthDate;
          memoryUsers.set(emailKey, u);
          updatedRow = u;
          break;
        }
      }
    }


    if (!updatedRow) {
      res.status(404).json({ success: false, error: { message: 'User not found' } });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        user: formatUserResponse(updatedRow),
      },
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Error updating profile.' },
    });
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      return;
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, error: { message: 'Current password and new password are required.' } });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, error: { message: 'New password must be at least 6 characters long.' } });
      return;
    }

    // Lookup user password
    let userRow: any = null;
    try {
      const dbRes = await query('SELECT * FROM users WHERE id = $1 LIMIT 1;', [userId]);
      if (dbRes.rows.length > 0) {
        userRow = dbRes.rows[0];
      }
    } catch {
      for (const u of memoryUsers.values()) {
        if (u.id === userId) {
          userRow = u;
          break;
        }
      }
    }

    if (!userRow) {
      res.status(404).json({ success: false, error: { message: 'User not found.' } });
      return;
    }

    const isMatch = await comparePassword(currentPassword, userRow.password);
    if (!isMatch) {
      res.status(401).json({ success: false, error: { message: 'Current password is incorrect.' } });
      return;
    }

    const newHashed = await hashPassword(newPassword);
    try {
      await query('UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;', [newHashed, userId]);
    } catch {
      for (const [emailKey, u] of memoryUsers.entries()) {
        if (u.id === userId) {
          u.password = newHashed;
          memoryUsers.set(emailKey, u);
          break;
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Error changing password.' },
    });
  }
};

