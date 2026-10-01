import {
  User,
  UserRole,
  Permission,
  AuthTokens,
  JWTPayload,
  RefreshTokenRecord,
  SecurityAuditRecord,
  RateLimitStatus,
} from '../types/auth';
import { ROLE_PERMISSIONS, hasPermission } from './permissions';
import {
  hashPassword,
  verifyPassword,
  signJWT,
  verifyJWT,
  validatePasswordSecurity,
} from './cryptoAuth';

// In-Memory Database for CivicConnect Identity & Authentication State
interface StoredUser extends User {
  passwordHash: string;
}

const ACCESS_TOKEN_EXPIRY_SEC = 15 * 60; // 15 minutes
const REFRESH_TOKEN_EXPIRY_SEC = 7 * 24 * 60 * 60; // 7 days
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

class AuthService {
  private users: Map<string, StoredUser> = new Map();
  private refreshTokens: Map<string, RefreshTokenRecord> = new Map(); // token -> record
  private revokedTokenJtis: Set<string> = new Set(); // Revocation blocklist for access tokens
  private auditLogs: SecurityAuditRecord[] = [];
  private rateLimitBuckets: Map<string, { count: number; resetAt: number }> = new Map();
  private isInitialized = false;

  constructor() {
    this.initDefaultUsers();
  }

  private async initDefaultUsers() {
    if (this.isInitialized) return;

    // Standard Passwords for Initial Municipal Persona Seed: "CivicSecure#2026!"
    const defaultPassword = 'CivicSecure#2026!';
    const defaultHash = await hashPassword(defaultPassword, 'seed_salt_1');

    const seedUsers: StoredUser[] = [
      {
        id: 'usr-admin-01',
        email: 'admin@civicconnect.gov',
        firstName: 'Sarah',
        lastName: 'Connor',
        role: 'ADMIN',
        isActive: true,
        isVerified: true,
        failedLoginAttempts: 0,
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        passwordHash: defaultHash,
      },
      {
        id: 'usr-officer-01',
        email: 'officer.vance@civicconnect.gov',
        firstName: 'James',
        lastName: 'Vance',
        role: 'AUTHORITY_OFFICER',
        badgeNumber: 'OFF-7429',
        departmentId: 'dept-roads',
        departmentName: 'Department of Transportation & Roads',
        isActive: true,
        isVerified: true,
        failedLoginAttempts: 0,
        createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
        passwordHash: defaultHash,
      },
      {
        id: 'usr-worker-01',
        email: 'worker.chen@civicconnect.gov',
        firstName: 'Marcus',
        lastName: 'Chen',
        role: 'FIELD_WORKER',
        badgeNumber: 'WRK-5521',
        departmentId: 'dept-roads',
        departmentName: 'Department of Transportation & Roads',
        isActive: true,
        isVerified: true,
        failedLoginAttempts: 0,
        createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
        passwordHash: defaultHash,
      },
      {
        id: 'usr-citizen-priya',
        email: 'citizen.priya@example.com',
        firstName: 'Priya',
        lastName: 'Sharma',
        role: 'CITIZEN',
        phoneNumber: '+1-555-019-8812',
        isActive: true,
        isVerified: true,
        failedLoginAttempts: 0,
        createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
        passwordHash: defaultHash,
      },
      {
        id: 'usr-citizen-kumar',
        email: 'resident.kumar@example.com',
        firstName: 'Rajesh',
        lastName: 'Kumar',
        role: 'CITIZEN',
        phoneNumber: '+1-555-019-9943',
        isActive: true,
        isVerified: true,
        failedLoginAttempts: 0,
        createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        passwordHash: defaultHash,
      },
      {
        id: 'usr-citizen-01',
        email: 'citizen.elena@gmail.com',
        firstName: 'Elena',
        lastName: 'Rostova',
        role: 'CITIZEN',
        phoneNumber: '+1-555-019-2831',
        isActive: true,
        isVerified: true,
        failedLoginAttempts: 0,
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        passwordHash: defaultHash,
      },
      {
        id: 'usr-resident-adhi',
        email: 'citizen.adhi@gmail.com',
        firstName: 'Adhi',
        lastName: 'Narayanan',
        role: 'CITIZEN',
        phoneNumber: '+1-555-019-4421',
        isActive: true,
        isVerified: true,
        failedLoginAttempts: 0,
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        passwordHash: defaultHash,
      },
      {
        id: 'usr-deactivated-01',
        email: 'suspended.contractor@external.org',
        firstName: 'Derrick',
        lastName: 'Miller',
        role: 'FIELD_WORKER',
        badgeNumber: 'WRK-9901',
        isActive: false,
        isVerified: true,
        deactivatedReason: 'Contract concluded. Deactivated by administrator.',
        failedLoginAttempts: 0,
        createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
        passwordHash: defaultHash,
      },
    ];

    for (const u of seedUsers) {
      this.users.set(u.email.toLowerCase(), u);
    }

    this.logAudit({
      action: 'ACCOUNT_ACTIVATED',
      threatLevel: 'INFO',
      details: { message: 'CivicConnect Security & Auth Service Seeded with Standard Municipal Profiles.' },
    });

    this.isInitialized = true;
  }

  // ==========================================
  // RATE LIMITING
  // ==========================================
  public checkRateLimit(key: string, limit = 5, windowMs = 60000): RateLimitStatus {
    const now = Date.now();
    let bucket = this.rateLimitBuckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      this.rateLimitBuckets.set(key, bucket);
    }

    bucket.count += 1;
    const isBlocked = bucket.count > limit;
    const remaining = Math.max(0, limit - bucket.count);

    if (isBlocked && bucket.count === limit + 1) {
      this.logAudit({
        action: 'RATE_LIMIT_EXCEEDED',
        threatLevel: 'ALERT',
        details: { key, attemptCount: bucket.count, windowMs },
      });
    }

    return {
      key,
      limit,
      remaining,
      resetTimeMs: bucket.resetAt,
      isBlocked,
    };
  }

  public resetRateLimit(key: string): void {
    this.rateLimitBuckets.delete(key);
  }

  // ==========================================
  // AUDIT LOGGING
  // ==========================================
  public logAudit(entry: Omit<SecurityAuditRecord, 'id' | 'timestamp'>): SecurityAuditRecord {
    const record: SecurityAuditRecord = {
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.auditLogs.unshift(record);
    if (this.auditLogs.length > 200) {
      this.auditLogs.pop();
    }
    return record;
  }

  public getAuditLogs(): SecurityAuditRecord[] {
    return [...this.auditLogs];
  }

  // ==========================================
  // 1. REGISTRATION (Public Citizen Only)
  // ==========================================
  public async registerCitizen(params: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    requestedRole?: string; // To test & verify rejection of privileged role attempts
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    const emailKey = params.email.trim().toLowerCase();

    // Enforce Rate Limit on Registration: 10 attempts per minute
    const rateCheck = this.checkRateLimit(`register:${emailKey}`, 10, 60000);
    if (rateCheck.isBlocked) {
      return { success: false, error: 'Registration rate limit exceeded. Please wait a minute.' };
    }

    // PRIVILEGED ROLE ESCALATION GUARD
    if (params.requestedRole && params.requestedRole !== 'CITIZEN') {
      this.logAudit({
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        threatLevel: 'ALERT',
        details: {
          attemptedRole: params.requestedRole,
          email: params.email,
          reason: 'Public registration attempted to request non-CITIZEN privileged role.',
        },
      });
      return {
        success: false,
        error: `Privileged role '${params.requestedRole}' cannot be chosen during public registration. Privileged credentials must be provisioned by a Municipal Administrator.`,
      };
    }

    if (this.users.has(emailKey)) {
      return { success: false, error: 'An account with this email address already exists.' };
    }

    // Password Complexity Validation
    const pwCheck = validatePasswordSecurity(params.password);
    if (!pwCheck.isValid) {
      return { success: false, error: pwCheck.errors.join('. ') };
    }

    const salt = 'salt_' + Math.random().toString(36).substring(2, 8);
    const hash = await hashPassword(params.password, salt);
    const newUserId = 'usr-' + Math.random().toString(36).substring(2, 10);

    const newUser: StoredUser = {
      id: newUserId,
      email: emailKey,
      firstName: params.firstName.trim(),
      lastName: params.lastName.trim(),
      role: 'CITIZEN', // STRICTLY ENFORCED: Never privileged
      phoneNumber: params.phoneNumber,
      isActive: true,
      isVerified: true,
      failedLoginAttempts: 0,
      createdAt: new Date().toISOString(),
      passwordHash: hash,
    };

    this.users.set(emailKey, newUser);

    this.logAudit({
      action: 'USER_REGISTERED',
      actorId: newUserId,
      actorRole: 'CITIZEN',
      targetUserId: newUserId,
      threatLevel: 'INFO',
      details: { email: emailKey, role: 'CITIZEN' },
    });

    const { passwordHash: _, ...safeUser } = newUser;
    return { success: true, user: safeUser };
  }

  // ==========================================
  // 2. LOGIN & FAILED LOGIN PROTECTION
  // ==========================================
  public async login(
    email: string,
    password: string,
    ip = '127.0.0.1'
  ): Promise<{ success: boolean; tokens?: AuthTokens; user?: User; error?: string; lockoutRemainingMs?: number }> {
    await this.initDefaultUsers();
    const emailKey = email.trim().toLowerCase();

    // 1. IP / Email Rate Limiting (5 attempts per minute)
    const rateStatus = this.checkRateLimit(`login:${emailKey}`, 5, 60000);
    if (rateStatus.isBlocked) {
      return {
        success: false,
        error: 'Too many rapid login attempts. Rate limit enforced (60-second cool-down).',
      };
    }

    const user = this.users.get(emailKey);
    if (!user) {
      this.logAudit({
        action: 'LOGIN_FAILED',
        threatLevel: 'WARNING',
        ipAddress: ip,
        details: { email: emailKey, reason: 'User not found' },
      });
      return { success: false, error: 'Invalid email or password.' };
    }

    // 2. Check Account Status (Active / Deactivated)
    if (!user.isActive) {
      this.logAudit({
        action: 'LOGIN_FAILED',
        threatLevel: 'WARNING',
        targetUserId: user.id,
        details: { email: emailKey, reason: 'Account deactivated or suspended' },
      });
      return {
        success: false,
        error: `Account is deactivated. Reason: ${user.deactivatedReason || 'Administrative suspension'}. Contact administrator.`,
      };
    }

    // 3. Failed Login Lockout Evaluation
    const now = Date.now();
    if (user.lockoutUntil) {
      const lockTime = new Date(user.lockoutUntil).getTime();
      if (now < lockTime) {
        const remainingMs = lockTime - now;
        this.logAudit({
          action: 'LOGIN_FAILED',
          threatLevel: 'ALERT',
          targetUserId: user.id,
          details: { email: emailKey, reason: 'Account locked due to consecutive failed attempts' },
        });
        return {
          success: false,
          error: `Account is temporarily locked due to ${MAX_FAILED_LOGINS} consecutive failed login attempts.`,
          lockoutRemainingMs: remainingMs,
        };
      } else {
        // Lockout expired, reset failed counter
        user.lockoutUntil = null;
        user.failedLoginAttempts = 0;
      }
    }

    // 4. Verify Cryptographic Password Hash
    const isPwValid = await verifyPassword(password, user.passwordHash);
    if (!isPwValid) {
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= MAX_FAILED_LOGINS) {
        user.lockoutUntil = new Date(now + LOCKOUT_DURATION_MS).toISOString();
        this.logAudit({
          action: 'ACCOUNT_LOCKED',
          threatLevel: 'CRITICAL',
          targetUserId: user.id,
          details: {
            email: emailKey,
            consecutiveFailures: user.failedLoginAttempts,
            lockedUntil: user.lockoutUntil,
          },
        });
        return {
          success: false,
          error: `Incorrect credentials. Account has now been locked for 15 minutes due to ${MAX_FAILED_LOGINS} failed attempts.`,
          lockoutRemainingMs: LOCKOUT_DURATION_MS,
        };
      } else {
        this.logAudit({
          action: 'LOGIN_FAILED',
          threatLevel: 'WARNING',
          targetUserId: user.id,
          details: {
            email: emailKey,
            failedAttempts: user.failedLoginAttempts,
            remainingBeforeLock: MAX_FAILED_LOGINS - user.failedLoginAttempts,
          },
        });
        return {
          success: false,
          error: `Invalid email or password. Attempt ${user.failedLoginAttempts} of ${MAX_FAILED_LOGINS} before security lockout.`,
        };
      }
    }

    // Login Successful: Reset counters
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
    user.lastLoginAt = new Date().toISOString();
    this.resetRateLimit(`login:${emailKey}`);

    // Generate JWT Access & Refresh Tokens
    const tokens = await this.generateTokenPair(user);

    this.logAudit({
      action: 'LOGIN_SUCCESS',
      actorId: user.id,
      actorRole: user.role,
      targetUserId: user.id,
      ipAddress: ip,
      threatLevel: 'INFO',
      details: { email: user.email, role: user.role },
    });

    const { passwordHash: _, ...safeUser } = user;
    return { success: true, tokens, user: safeUser };
  }

  // ==========================================
  // 4 & 5. JWT TOKENS & REFRESH TOKEN STRATEGY
  // ==========================================
  private async generateTokenPair(user: StoredUser): Promise<AuthTokens> {
    const now = Math.floor(Date.now() / 1000);
    const permissions = ROLE_PERMISSIONS[user.role] || [];
    const familyId = 'fam-' + Math.random().toString(36).substring(2, 10);
    const accessJti = 'jti-acc-' + Math.random().toString(36).substring(2, 10);
    const refreshJti = 'jti-ref-' + Math.random().toString(36).substring(2, 10);

    // 1. Access Token (Short-lived 15 mins)
    const accessPayload: JWTPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      permissions,
      jti: accessJti,
      iat: now,
      exp: now + ACCESS_TOKEN_EXPIRY_SEC,
      type: 'access',
    };
    const accessToken = await signJWT(accessPayload);

    // 2. Refresh Token (Long-lived 7 days with rotation)
    const refreshPayload: JWTPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      permissions,
      jti: refreshJti,
      iat: now,
      exp: now + REFRESH_TOKEN_EXPIRY_SEC,
      type: 'refresh',
    };
    const refreshToken = await signJWT(refreshPayload);

    // Store refresh record in state for rotation and reuse detection
    const refreshRecord: RefreshTokenRecord = {
      token: refreshToken,
      userId: user.id,
      familyId,
      isRevoked: false,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SEC * 1000).toISOString(),
    };
    this.refreshTokens.set(refreshToken, refreshRecord);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: ACCESS_TOKEN_EXPIRY_SEC,
    };
  }

  /**
   * Refresh token rotation strategy:
   * 1. Validates refresh token cryptographic integrity.
   * 2. Detects token reuse: if an already-revoked refresh token is used,
   *    REVOKES THE ENTIRE TOKEN FAMILY immediately (compromise alert).
   * 3. Issues fresh access token and fresh rotated refresh token.
   */
  public async refreshAccessToken(oldRefreshToken: string): Promise<{ success: boolean; tokens?: AuthTokens; error?: string }> {
    const verified = await verifyJWT(oldRefreshToken);
    if (!verified.valid || !verified.payload || verified.payload.type !== 'refresh') {
      return { success: false, error: verified.error || 'Invalid or malformed refresh token' };
    }

    const record = this.refreshTokens.get(oldRefreshToken);
    if (!record) {
      return { success: false, error: 'Refresh token record not found or already purged' };
    }

    // REUSE DETECTION: If this refresh token was already revoked, someone is replaying it!
    if (record.isRevoked) {
      // Invalidate the entire family
      this.revokeTokenFamily(record.familyId);
      this.logAudit({
        action: 'TOKEN_REVOKED',
        actorId: record.userId,
        threatLevel: 'CRITICAL',
        details: {
          reason: 'Refresh token reuse detected! Revoked entire token family for user safety.',
          familyId: record.familyId,
        },
      });
      return { success: false, error: 'Security breach detected: Refresh token already used. All active sessions invalidated.' };
    }

    // Mark current refresh token as used/revoked
    record.isRevoked = true;

    // Fetch user to verify still active
    const user = Array.from(this.users.values()).find((u) => u.id === record.userId);
    if (!user || !user.isActive) {
      return { success: false, error: 'User is inactive or deleted' };
    }

    // Issue new token pair
    const tokens = await this.generateTokenPair(user);

    this.logAudit({
      action: 'TOKEN_REFRESHED',
      actorId: user.id,
      actorRole: user.role,
      threatLevel: 'INFO',
      details: { email: user.email },
    });

    return { success: true, tokens };
  }

  private revokeTokenFamily(familyId: string): void {
    for (const record of this.refreshTokens.values()) {
      if (record.familyId === familyId) {
        record.isRevoked = true;
      }
    }
  }

  // ==========================================
  // 6. LOGOUT & TOKEN REVOCATION STRATEGY
  // ==========================================
  public async logout(accessToken: string, refreshToken?: string): Promise<boolean> {
    // 1. Revoke access token by blacklisting its unique JTI
    const verified = await verifyJWT(accessToken);
    if (verified.payload?.jti) {
      this.revokedTokenJtis.add(verified.payload.jti);
    }

    // 2. Revoke refresh token
    if (refreshToken) {
      const rec = this.refreshTokens.get(refreshToken);
      if (rec) {
        rec.isRevoked = true;
      }
    }

    if (verified.payload?.sub) {
      this.logAudit({
        action: 'LOGOUT',
        actorId: verified.payload.sub,
        actorRole: verified.payload.role,
        threatLevel: 'INFO',
        details: { jti: verified.payload.jti },
      });
    }

    return true;
  }

  public isTokenRevoked(jti: string): boolean {
    return this.revokedTokenJtis.has(jti);
  }

  // ==========================================
  // 7, 8, 9. RBAC & ROUTE VALIDATION
  // ==========================================
  /**
   * Protected route authorizer.
   * Can be invoked by UI, API middlewares, or autonomous agents.
   * STRICT DIRECTIVE: AGENTS MUST NOT BYPASS RBAC.
   */
  public async authorizeRequest(
    accessToken: string,
    requiredPermission: Permission,
    callerType: 'HUMAN_USER' | 'AI_AGENT' = 'HUMAN_USER'
  ): Promise<{ authorized: boolean; status: number; message: string; user?: JWTPayload }> {
    const verified = await verifyJWT(accessToken);

    if (!verified.valid || !verified.payload) {
      this.logAudit({
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        threatLevel: 'WARNING',
        details: {
          callerType,
          requiredPermission,
          reason: verified.error || 'Invalid or missing Bearer token',
        },
      });
      return { authorized: false, status: 401, message: verified.error || 'Authentication required' };
    }

    const payload = verified.payload;

    // Check Revocation
    if (payload.jti && this.isTokenRevoked(payload.jti)) {
      this.logAudit({
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        threatLevel: 'ALERT',
        actorId: payload.sub,
        details: {
          callerType,
          requiredPermission,
          reason: 'Token has been revoked in logout blocklist',
        },
      });
      return { authorized: false, status: 401, message: 'Token has been revoked. Please log in again.' };
    }

    // Verify Active User Status
    const user = Array.from(this.users.values()).find((u) => u.id === payload.sub);
    if (!user || !user.isActive) {
      return { authorized: false, status: 403, message: 'Account is deactivated' };
    }

    // Check Role Permission
    const hasPerm = hasPermission(payload.role, requiredPermission);

    if (!hasPerm) {
      const threatLevel = callerType === 'AI_AGENT' ? 'CRITICAL' : 'WARNING';
      const actionName = callerType === 'AI_AGENT' ? 'AGENT_RBAC_CHECK_FAILED' : 'UNAUTHORIZED_ACCESS_ATTEMPT';

      this.logAudit({
        action: actionName,
        actorId: payload.sub,
        actorRole: payload.role,
        threatLevel,
        details: {
          callerType,
          role: payload.role,
          requiredPermission,
          reason: `Forbidden: Role '${payload.role}' lacks permission '${requiredPermission}'. Agents and users cannot bypass RBAC.`,
        },
      });

      return {
        authorized: false,
        status: 403,
        message: `Forbidden (403): Role '${payload.role}' does not possess '${requiredPermission}' authorization.`,
        user: payload,
      };
    }

    return { authorized: true, status: 200, message: 'Authorized', user: payload };
  }

  // ==========================================
  // 10. ACCOUNT ACTIVATION / DEACTIVATION & ROLE ASSIGNMENT
  // ==========================================
  public async setAccountStatus(
    adminUserId: string,
    targetUserId: string,
    isActive: boolean,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const admin = Array.from(this.users.values()).find((u) => u.id === adminUserId);
    if (!admin || admin.role !== 'ADMIN') {
      this.logAudit({
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        actorId: adminUserId,
        threatLevel: 'ALERT',
        details: { reason: 'Non-admin attempted to change account status.' },
      });
      return { success: false, error: 'Only administrators can activate/deactivate accounts.' };
    }

    const targetUser = Array.from(this.users.values()).find((u) => u.id === targetUserId);
    if (!targetUser) {
      return { success: false, error: 'Target user not found.' };
    }

    targetUser.isActive = isActive;
    targetUser.deactivatedReason = isActive ? null : reason || 'Deactivated by administrator';

    if (!isActive) {
      // Invalidate all active tokens for deactivated user
      for (const rec of this.refreshTokens.values()) {
        if (rec.userId === targetUserId) {
          rec.isRevoked = true;
        }
      }
    }

    this.logAudit({
      action: isActive ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_DEACTIVATED',
      actorId: adminUserId,
      actorRole: 'ADMIN',
      targetUserId: targetUserId,
      threatLevel: 'WARNING',
      details: {
        newStatus: isActive ? 'ACTIVE' : 'DEACTIVATED',
        reason: targetUser.deactivatedReason,
      },
    });

    return { success: true };
  }

  public async assignPrivilegedRole(
    adminUserId: string,
    targetUserId: string,
    newRole: UserRole,
    meta?: { badgeNumber?: string; departmentId?: string; departmentName?: string }
  ): Promise<{ success: boolean; error?: string }> {
    const admin = Array.from(this.users.values()).find((u) => u.id === adminUserId);
    if (!admin || admin.role !== 'ADMIN') {
      this.logAudit({
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        actorId: adminUserId,
        threatLevel: 'CRITICAL',
        details: { reason: 'Unauthorized role escalation attempt by non-admin.' },
      });
      return { success: false, error: 'Permission denied: Only administrators can assign privileged roles.' };
    }

    const targetUser = Array.from(this.users.values()).find((u) => u.id === targetUserId);
    if (!targetUser) {
      return { success: false, error: 'Target user not found.' };
    }

    const oldRole = targetUser.role;
    targetUser.role = newRole;
    if (meta?.badgeNumber) targetUser.badgeNumber = meta.badgeNumber;
    if (meta?.departmentId) targetUser.departmentId = meta.departmentId;
    if (meta?.departmentName) targetUser.departmentName = meta.departmentName;

    // Invalidate prior refresh tokens to force new token issuance with updated permissions claim
    for (const rec of this.refreshTokens.values()) {
      if (rec.userId === targetUserId) {
        rec.isRevoked = true;
      }
    }

    this.logAudit({
      action: 'ROLE_CHANGED',
      actorId: adminUserId,
      actorRole: 'ADMIN',
      targetUserId,
      threatLevel: 'ALERT',
      details: {
        oldRole,
        newRole,
        badgeNumber: targetUser.badgeNumber,
        department: targetUser.departmentName,
      },
    });

    return { success: true };
  }

  public unlockUserAccount(targetUserId: string): boolean {
    const user = Array.from(this.users.values()).find((u) => u.id === targetUserId);
    if (!user) return false;

    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;

    this.logAudit({
      action: 'ACCOUNT_ACTIVATED',
      threatLevel: 'INFO',
      targetUserId,
      details: { reason: 'Failed login lockout manually reset by administrator' },
    });

    return true;
  }

  public getUsersList(): User[] {
    return Array.from(this.users.values()).map(({ passwordHash: _, ...safe }) => safe);
  }

  public getUserByEmail(email: string): User | undefined {
    const u = this.users.get(email.toLowerCase());
    if (!u) return undefined;
    const { passwordHash: _, ...safe } = u;
    return safe;
  }
}

// Global Singleton Instance
export const authService = new AuthService();
