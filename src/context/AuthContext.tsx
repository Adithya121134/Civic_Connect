import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthTokens, UserRole, Permission, SecurityAuditRecord } from '../types/auth';
import { authService } from '../lib/authService';
import { hasPermission as checkPermissionHelper } from '../lib/permissions';

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authorizedPortal: '/resident' | '/department' | '/admin';
  activePortal: '/resident' | '/department' | '/admin';
  setActivePortal: (portal: '/resident' | '/department' | '/admin') => void;
  departmentId: string | null;
  departmentName: string | null;
  departmentCode: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; authorizedPortal?: string; user?: any }>;
  departmentLogin: (identifier: string, password: string) => Promise<{ success: boolean; error?: string; authorizedPortal?: string; user?: any }>;
  requestPasswordReset: (identifier: string, isDepartment?: boolean) => Promise<{ success: boolean; message: string }>;
  logout: (redirectPortal?: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string; phoneNumber?: string; requestedRole?: string }) => Promise<{ success: boolean; error?: string }>;
  startCitizenRegistration: (data: {
    fullName: string;
    email: string;
    phoneNumber: string;
    password: string;
    confirmPassword?: string;
  }) => Promise<{
    success: boolean;
    sessionId?: string;
    step?: string;
    maskedPhone?: string;
    resendCooldownSeconds?: number;
    expiresInSeconds?: number;
    isDevelopmentMode?: boolean;
    devOtp?: string;
    error?: string;
    message?: string;
  }>;
  resendEmailOtp: (sessionId: string) => Promise<{
    success: boolean;
    resendCooldownSeconds?: number;
    isDevelopmentMode?: boolean;
    devOtp?: string;
    error?: string;
    message?: string;
  }>;
  verifyEmailOtp: (sessionId: string, otp: string) => Promise<{
    success: boolean;
    sessionId?: string;
    step?: string;
    phone?: string;
    maskedPhone?: string;
    isDevelopmentMode?: boolean;
    devOtp?: string;
    error?: string;
    message?: string;
  }>;
  resendPhoneOtp: (sessionId: string) => Promise<{
    success: boolean;
    resendCooldownSeconds?: number;
    isDevelopmentMode?: boolean;
    devOtp?: string;
    error?: string;
    message?: string;
  }>;
  verifyPhoneAndCreateAccount: (sessionId: string, otp: string) => Promise<{
    success: boolean;
    user?: any;
    authorizedPortal?: string;
    error?: string;
    message?: string;
  }>;
  refreshToken: () => Promise<boolean>;
  hasPermission: (perm: Permission) => boolean;
  activeRole: UserRole | 'ANONYMOUS';
  switchMockPersona: (email: string) => Promise<boolean>;
  refreshUserData: () => void;
  auditLogs: SecurityAuditRecord[];
  refreshAuditLogs: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authorizedPortal, setAuthorizedPortal] = useState<'/resident' | '/department' | '/admin'>('/department');
  const [activePortal, setActivePortal] = useState<'/resident' | '/department' | '/admin'>('/department');
  const [auditLogs, setAuditLogs] = useState<SecurityAuditRecord[]>([]);

  const refreshAuditLogs = () => {
    setAuditLogs(authService.getAuditLogs());
  };

  const refreshUserData = () => {
    if (user) {
      const updated = authService.getUserByEmail(user.email);
      if (updated) {
        setUser(updated);
      }
    }
    refreshAuditLogs();
  };

  // Helper to sync server auth response
  const applyAuthResponse = (data: any) => {
    if (data.user && data.tokens) {
      const portal = data.authorizedPortal || (data.user.role === 'ADMIN' ? '/admin' : (data.user.role === 'RESIDENT' || data.user.role === 'CITIZEN' ? '/resident' : '/department'));
      setUser({
        ...data.user,
        departmentCode: data.user.departmentCode || data.authContext?.departmentCode,
        authorizedPortal: portal
      });
      setTokens(data.tokens);
      setAuthorizedPortal(portal);
      setActivePortal(portal);
    }
  };

  // Initialize with Transportation Officer James Vance
  useEffect(() => {
    const init = async () => {
      try {
        const resp = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'officer.vance@civicconnect.gov', password: 'CivicSecure#2026!' })
        });
        if (resp.ok) {
          const data = await resp.json();
          applyAuthResponse(data);
        } else {
          // Fallback to client service if offline
          const res = await authService.login('officer.vance@civicconnect.gov', 'CivicSecure#2026!');
          if (res.success && res.user && res.tokens) {
            setUser(res.user);
            setTokens(res.tokens);
            setAuthorizedPortal('/department');
            setActivePortal('/department');
          }
        }
      } catch (err) {
        console.error('Failed to init server session', err);
      } finally {
        setIsLoading(false);
        refreshAuditLogs();
      }
    };
    init();
  }, []);

  // 1. Citizen / Resident Login
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const resp = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await resp.json();
      setIsLoading(false);

      if (resp.ok && data.success) {
        applyAuthResponse(data);
        return { success: true, authorizedPortal: data.authorizedPortal, user: data.user };
      }
      return { success: false, error: data.message || 'Invalid email address or password.' };
    } catch (err: any) {
      // Fallback
      const res = await authService.login(email, password);
      setIsLoading(false);
      refreshAuditLogs();
      if (res.success && res.user && res.tokens) {
        setUser(res.user);
        setTokens(res.tokens);
        const p = res.user.role === 'ADMIN' ? '/admin' : (res.user.role === 'CITIZEN' || res.user.role === 'RESIDENT' ? '/resident' : '/department');
        setAuthorizedPortal(p);
        setActivePortal(p);
        return { success: true, authorizedPortal: p, user: res.user };
      }
      return { success: false, error: res.error || err.message };
    }
  };

  // 2. Separate Department Officer Login (Enforces server-side department role)
  const departmentLogin = async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      const resp = await fetch('/api/v1/auth/department-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      const data = await resp.json();
      setIsLoading(false);

      if (resp.ok && data.success) {
        applyAuthResponse(data);
        return { success: true, authorizedPortal: '/department', user: data.user };
      }
      return { success: false, error: data.message || 'Department authentication failed.' };
    } catch (err: any) {
      // Fallback
      const res = await authService.login(identifier, password);
      setIsLoading(false);
      refreshAuditLogs();
      if (res.success && res.user && res.tokens) {
        if (res.user.role === 'RESIDENT' || res.user.role === 'CITIZEN') {
          return {
            success: false,
            error: 'Access Denied: Resident accounts cannot access the Department Portal. Please use Citizen Login.'
          };
        }
        setUser(res.user);
        setTokens(res.tokens);
        setAuthorizedPortal('/department');
        setActivePortal('/department');
        return { success: true, authorizedPortal: '/department', user: res.user };
      }
      return { success: false, error: res.error || err.message };
    }
  };

  // Password Recovery Flow
  const requestPasswordReset = async (identifier: string, isDepartment: boolean = false) => {
    const endpoint = isDepartment ? '/api/v1/auth/department-forgot-password' : '/api/v1/auth/forgot-password';
    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier, identifier })
      });
      const data = await resp.json();
      return {
        success: true,
        message: data.message || (isDepartment
          ? 'If an official account matches this record, recovery instructions have been sent via Municipal IT.'
          : 'If an account is associated with this email, recovery instructions have been sent.')
      };
    } catch {
      return {
        success: true,
        message: isDepartment
          ? 'If an official account matches this record, recovery instructions have been sent via Municipal IT.'
          : 'If an account is associated with this email, recovery instructions have been sent.'
      };
    }
  };

  const logout = async (redirectPortal?: string) => {
    setUser(null);
    setTokens(null);
    const target = (redirectPortal === '/department' || redirectPortal === 'portal_dept_login')
      ? '/department'
      : '/resident';
    setAuthorizedPortal(target as any);
    setActivePortal(target as any);
    refreshAuditLogs();
  };

  const register = async (data: { email: string; password: string; firstName: string; lastName: string; phoneNumber?: string; requestedRole?: string }) => {
    setIsLoading(true);
    try {
      const resp = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resData = await resp.json();
      setIsLoading(false);

      if (resp.ok && resData.success) {
        applyAuthResponse(resData);
        return { success: true };
      }
      return { success: false, error: resData.message || 'Registration failed' };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message };
    }
  };

  // Multi-Step Registration Methods
  const startCitizenRegistration = async (data: {
    fullName: string;
    email: string;
    phoneNumber: string;
    password: string;
    confirmPassword?: string;
  }) => {
    setIsLoading(true);
    try {
      const resp = await fetch('/api/v1/auth/register/start-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resData = await resp.json();
      setIsLoading(false);

      if (resp.ok && resData.success) {
        return {
          success: true,
          sessionId: resData.sessionId,
          step: resData.step,
          maskedPhone: resData.maskedPhone,
          resendCooldownSeconds: resData.resendCooldownSeconds,
          expiresInSeconds: resData.expiresInSeconds,
          isDevelopmentMode: resData.isDevelopmentMode,
          devOtp: resData.devOtp,
          message: resData.message
        };
      }
      return { success: false, error: resData.message || 'Failed to start registration' };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Network error during registration initialization' };
    }
  };

  const resendEmailOtp = async (sessionId: string) => {
    try {
      const resp = await fetch('/api/v1/auth/register/resend-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      const resData = await resp.json();
      if (resp.ok && resData.success) {
        return {
          success: true,
          resendCooldownSeconds: resData.resendCooldownSeconds,
          isDevelopmentMode: resData.isDevelopmentMode,
          devOtp: resData.devOtp,
          message: resData.message
        };
      }
      return { success: false, error: resData.message || 'Failed to resend email code' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const verifyEmailOtp = async (sessionId: string, otp: string) => {
    setIsLoading(true);
    try {
      const resp = await fetch('/api/v1/auth/register/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, otp })
      });
      const resData = await resp.json();
      setIsLoading(false);

      if (resp.ok && resData.success) {
        return {
          success: true,
          sessionId: resData.sessionId,
          step: resData.step,
          phone: resData.phone,
          maskedPhone: resData.maskedPhone,
          isDevelopmentMode: resData.isDevelopmentMode,
          devOtp: resData.devOtp,
          message: resData.message
        };
      }
      return { success: false, error: resData.message || 'Invalid email verification code' };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Verification error' };
    }
  };

  const resendPhoneOtp = async (sessionId: string) => {
    try {
      const resp = await fetch('/api/v1/auth/register/resend-phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      const resData = await resp.json();
      if (resp.ok && resData.success) {
        return {
          success: true,
          resendCooldownSeconds: resData.resendCooldownSeconds,
          isDevelopmentMode: resData.isDevelopmentMode,
          devOtp: resData.devOtp,
          message: resData.message
        };
      }
      return { success: false, error: resData.message || 'Failed to resend phone code' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const verifyPhoneAndCreateAccount = async (sessionId: string, otp: string) => {
    setIsLoading(true);
    try {
      const resp = await fetch('/api/v1/auth/register/verify-phone-and-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, otp })
      });
      const resData = await resp.json();
      setIsLoading(false);

      if (resp.ok && resData.success) {
        applyAuthResponse(resData);
        return {
          success: true,
          user: resData.user,
          authorizedPortal: resData.authorizedPortal || '/resident',
          message: resData.message
        };
      }
      return { success: false, error: resData.message || 'Failed to finalize account creation' };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Verification error' };
    }
  };

  const refreshToken = async () => {
    return true;
  };

  const hasPermission = (perm: Permission): boolean => {
    if (!user) return false;
    return checkPermissionHelper(user.role, perm);
  };

  const switchMockPersona = async (email: string) => {
    setIsLoading(true);
    try {
      const resp = await fetch('/api/v1/auth/switch-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await resp.json();
      setIsLoading(false);

      if (resp.ok && data.success) {
        applyAuthResponse(data);
        return true;
      }
      return false;
    } catch (err) {
      setIsLoading(false);
      return false;
    }
  };

  const departmentId = user?.departmentId || null;
  const departmentName = user?.departmentName || null;
  const departmentCode = user?.departmentCode || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        isAuthenticated: !!user,
        isLoading,
        authorizedPortal,
        activePortal,
        setActivePortal,
        departmentId,
        departmentName,
        departmentCode,
        login,
        departmentLogin,
        requestPasswordReset,
        logout,
        register,
        startCitizenRegistration,
        resendEmailOtp,
        verifyEmailOtp,
        resendPhoneOtp,
        verifyPhoneAndCreateAccount,
        refreshToken,
        hasPermission,
        activeRole: user ? user.role : 'ANONYMOUS',
        switchMockPersona,
        refreshUserData,
        auditLogs,
        refreshAuditLogs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
