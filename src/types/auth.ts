export type UserRole = 'RESIDENT' | 'DEPARTMENT_USER' | 'CITIZEN' | 'AUTHORITY_OFFICER' | 'FIELD_WORKER' | 'ADMIN';

export type PortalType = 'RESIDENT' | 'DEPARTMENT' | 'ADMIN';

export type Permission =
  // Citizen permissions
  | 'incident:create'
  | 'incident:view_own'
  | 'incident:upload_evidence'
  | 'incident:confirm_resolution'
  | 'incident:request_reopen'
  // Authority Officer permissions
  | 'incident:view_department'
  | 'incident:assign_work'
  | 'incident:update_workflow'
  | 'incident:approve_recommendations'
  | 'incident:submit_escalation'
  // Field Worker permissions
  | 'work:view_assigned'
  | 'work:update_progress'
  | 'work:submit_evidence'
  // Admin permissions
  | 'admin:manage_users'
  | 'admin:manage_departments'
  | 'admin:manage_teams'
  | 'admin:manage_config'
  | 'admin:access_audit'
  // Cross-cutting/Common
  | 'profile:view_own'
  | 'profile:update_own';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  role: UserRole;
  phoneNumber?: string;
  badgeNumber?: string;
  departmentId?: string;
  departmentName?: string;
  departmentCode?: string;
  authorizedPortal?: '/resident' | '/department' | '/admin';
  isActive: boolean;
  isVerified: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  status?: string;
  failedLoginAttempts: number;
  lockoutUntil?: string | null;
  createdAt: string;
  lastLoginAt?: string | null;
  deactivatedReason?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number; // in seconds
}

export interface JWTPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  departmentId?: string;
  permissions: Permission[];
  jti: string; // unique token id
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
}

export interface RefreshTokenRecord {
  token: string;
  userId: string;
  familyId: string; // for token rotation / reuse detection
  isRevoked: boolean;
  expiresAt: string;
  createdAt: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface LoginAttemptRecord {
  id: string;
  email: string;
  ip: string;
  timestamp: string;
  success: boolean;
  reason?: string;
}

export interface RateLimitStatus {
  key: string;
  remaining: number;
  limit: number;
  resetTimeMs: number;
  isBlocked: boolean;
}

export interface SecurityAuditRecord {
  id: string;
  timestamp: string;
  action: 
    | 'USER_REGISTERED'
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'ACCOUNT_LOCKED'
    | 'ACCOUNT_ACTIVATED'
    | 'ACCOUNT_DEACTIVATED'
    | 'TOKEN_REFRESHED'
    | 'TOKEN_REVOKED'
    | 'LOGOUT'
    | 'ROLE_CHANGED'
    | 'UNAUTHORIZED_ACCESS_ATTEMPT'
    | 'RATE_LIMIT_EXCEEDED'
    | 'AGENT_RBAC_CHECK_FAILED';
  actorId?: string;
  actorRole?: string;
  targetUserId?: string;
  ipAddress?: string;
  details: Record<string, unknown>;
  threatLevel: 'INFO' | 'WARNING' | 'ALERT' | 'CRITICAL';
}

export interface SecurityTestResult {
  id: string;
  name: string;
  category: 'PRIVILEGE_ESCALATION' | 'UNAUTHORIZED_ROUTE' | 'TOKEN_TAMPERING' | 'AGENT_BYPASS' | 'RATE_LIMITING' | 'ACCOUNT_LOCKOUT';
  description: string;
  simulatedRole: UserRole | 'ANONYMOUS' | 'AI_AGENT';
  targetResource: string;
  requiredPermission: Permission;
  testAction: () => Promise<{ passed: boolean; status: number; message: string; auditTriggered: boolean }>;
}
