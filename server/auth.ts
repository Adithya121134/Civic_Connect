import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'civic_connect_prod_secure_secret_2026';
const JWT_EXPIRES_IN = '2h';

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  role: 'RESIDENT' | 'DEPARTMENT_USER' | 'FIELD_WORKER' | 'ADMIN';
  departmentId?: string | null;
  departmentCode?: string | null;
  departmentName?: string | null;
  phoneNumber?: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  status?: string;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function determineAuthorizedPortal(role: string): '/resident' | '/department' | '/admin' {
  if (role === 'ADMIN') return '/admin';
  if (role === 'DEPARTMENT_USER' || role === 'FIELD_WORKER') return '/department';
  return '/resident';
}

export function getRolePermissions(role: string): string[] {
  switch (role) {
    case 'ADMIN':
      return [
        'admin:manage_users',
        'admin:manage_departments',
        'admin:manage_teams',
        'admin:manage_config',
        'admin:access_audit',
        'incident:view_all',
        'incident:assign_work',
        'incident:update_workflow',
        'sla:manage'
      ];
    case 'DEPARTMENT_USER':
      return [
        'incident:view_department',
        'incident:assign_work',
        'incident:update_workflow',
        'incident:approve_recommendations',
        'incident:submit_escalation',
        'department:view_dashboard',
        'department:view_analytics',
        'department:manage_assignments'
      ];
    case 'FIELD_WORKER':
      return [
        'work:view_assigned',
        'work:update_progress',
        'work:submit_evidence',
        'incident:view_department'
      ];
    case 'RESIDENT':
    default:
      return [
        'incident:create',
        'incident:view_own',
        'incident:upload_evidence',
        'incident:confirm_resolution',
        'incident:request_reopen',
        'public:view_map'
      ];
  }
}

export function generateTokens(user: { id: string; email: string; role: string; department_id?: string | null }) {
  const permissions = getRolePermissions(user.role);
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    departmentId: user.department_id || null,
    permissions
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ sub: user.id, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });

  return { accessToken, refreshToken, expiresIn: 7200 };
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication token required. Bearer token missing.'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Look up fresh user details from database to ensure not deactivated and fetch department metadata
    const userRow = db.prepare(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.full_name, u.role, u.department_id, u.is_active,
             u.phone_number, u.email_verified, u.phone_verified, u.status,
             d.name as department_name, d.code as department_code
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = ?
    `).get(decoded.sub) as any;

    if (!userRow || !userRow.is_active) {
      res.status(403).json({
        error: 'ACCOUNT_INACTIVE_OR_REVOKED',
        message: 'User account has been deactivated or not found.'
      });
      return;
    }

    req.user = {
      id: userRow.id,
      email: userRow.email,
      firstName: userRow.first_name,
      lastName: userRow.last_name,
      fullName: userRow.full_name || `${userRow.first_name} ${userRow.last_name}`.trim(),
      role: userRow.role,
      departmentId: userRow.department_id,
      departmentName: userRow.department_name,
      departmentCode: userRow.department_code,
      phoneNumber: userRow.phone_number,
      emailVerified: Boolean(userRow.email_verified),
      phoneVerified: Boolean(userRow.phone_verified),
      status: userRow.status || 'ACTIVE',
      permissions: getRolePermissions(userRow.role)
    };

    next();
  } catch (err: any) {
    res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'JWT token verification failed or expired.'
    });
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'User not authenticated' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'FORBIDDEN_ROLE',
        message: `Forbidden. Role '${req.user.role}' is not authorized to access this portal endpoint. Required one of: ${allowedRoles.join(', ')}`
      });
      return;
    }

    next();
  };
}

/**
 * Strict Department-Level Isolation Middleware
 * Guarantees that:
 * 1. The user has an assigned department (or is ADMIN).
 * 2. Any explicit departmentId in params, query, or body MUST match req.user.departmentId.
 *    Spoofed department IDs from the frontend are rejected with 403 Forbidden.
 */
export function enforceDepartmentIsolation(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'User not authenticated' });
    return;
  }

  // Admins possess cross-department operational authority
  if (req.user.role === 'ADMIN') {
    next();
    return;
  }

  if (req.user.role !== 'DEPARTMENT_USER' && req.user.role !== 'FIELD_WORKER') {
    res.status(403).json({
      error: 'CROSS_PORTAL_VIOLATION',
      message: `Residents and non-department staff cannot access department endpoints.`
    });
    return;
  }

  if (!req.user.departmentId) {
    res.status(403).json({
      error: 'NO_DEPARTMENT_ASSIGNED',
      message: 'Authenticated officer has no assigned municipal department.'
    });
    return;
  }

  // Check for spoofing in query parameters or request body
  const requestedDeptId = req.query.departmentId || req.body?.departmentId || req.params.departmentId;
  if (requestedDeptId && requestedDeptId !== req.user.departmentId) {
    res.status(403).json({
      error: 'CROSS_DEPARTMENT_ACCESS_DENIED',
      message: `Security Violation: Authenticated user is scoped to department '${req.user.departmentId}', but attempted to access or modify data for department '${requestedDeptId}'. Request blocked.`
    });
    return;
  }

  next();
}
