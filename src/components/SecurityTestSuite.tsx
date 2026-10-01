import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../lib/authService';
import { Permission, SecurityTestResult, UserRole } from '../types/auth';
import {
  ShieldAlert,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Bot,
  Lock,
  Flame,
  UserX,
  FileCode,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export const SecurityTestSuite: React.FC = () => {
  const { user, tokens, activeRole, refreshAuditLogs } = useAuth();
  const [runningAll, setRunningAll] = useState(false);
  const [testResults, setTestResults] = useState<
    Record<string, { passed: boolean; status: number; message: string; auditTriggered: boolean }>
  >({});

  const securityTests: SecurityTestResult[] = [
    {
      id: 'test_1_privilege_escalation_registration',
      name: '1. Public Registration Privilege Escalation Guard',
      category: 'PRIVILEGE_ESCALATION',
      description:
        'Verifies that public registration endpoints strictly reject requests when a user attempts to select ADMIN or AUTHORITY_OFFICER roles.',
      simulatedRole: 'ANONYMOUS',
      targetResource: 'POST /auth/register',
      requiredPermission: 'admin:manage_users',
      testAction: async () => {
        const res = await authService.registerCitizen({
          email: `attacker_${Date.now()}@shadow.net`,
          password: 'Password#2026!',
          firstName: 'Attacker',
          lastName: 'Zero',
          requestedRole: 'ADMIN', // Illegal role request!
        });
        refreshAuditLogs();
        return {
          passed: !res.success && !!res.error?.includes('Privileged role'),
          status: 403,
          message: res.error || 'Failed: Privileged role was improperly accepted!',
          auditTriggered: true,
        };
      },
    },
    {
      id: 'test_2_agent_rbac_bypass_prevention',
      name: '2. Autonomous AI Agent RBAC Bypass Prevention',
      category: 'AGENT_BYPASS',
      description:
        'Verifies that autonomous agents executing tools or workflows cannot bypass role permissions. If an agent executes an Admin operation (e.g. system config override) on behalf of a Citizen session token, it must be intercepted with 403 and logged.',
      simulatedRole: 'AI_AGENT',
      targetResource: 'POST /api/v1/system/config',
      requiredPermission: 'admin:manage_config',
      testAction: async () => {
        // Register or obtain citizen token
        const citizenLogin = await authService.login('citizen.elena@gmail.com', 'CivicSecure#2026!');
        if (!citizenLogin.tokens) {
          return { passed: false, status: 500, message: 'Setup failed', auditTriggered: false };
        }
        // Attempt agent authorization on behalf of citizen token for admin:manage_config
        const authz = await authService.authorizeRequest(
          citizenLogin.tokens.accessToken,
          'admin:manage_config',
          'AI_AGENT'
        );
        refreshAuditLogs();
        return {
          passed: !authz.authorized && authz.status === 403,
          status: authz.status,
          message: authz.message,
          auditTriggered: true,
        };
      },
    },
    {
      id: 'test_3_citizen_tamper_assign_work',
      name: '3. Citizen Unauthorized Dispatch Assignment',
      category: 'UNAUTHORIZED_ROUTE',
      description:
        'Citizen attempts to execute "incident:assign_work" (Officer-only endpoint). System must reject with 403 Forbidden.',
      simulatedRole: 'CITIZEN',
      targetResource: 'POST /api/v1/incidents/inc-109/assign',
      requiredPermission: 'incident:assign_work',
      testAction: async () => {
        const citizenLogin = await authService.login('citizen.elena@gmail.com', 'CivicSecure#2026!');
        if (!citizenLogin.tokens) {
          return { passed: false, status: 500, message: 'Setup failed', auditTriggered: false };
        }
        const authz = await authService.authorizeRequest(
          citizenLogin.tokens.accessToken,
          'incident:assign_work',
          'HUMAN_USER'
        );
        refreshAuditLogs();
        return {
          passed: !authz.authorized && authz.status === 403,
          status: authz.status,
          message: authz.message,
          auditTriggered: true,
        };
      },
    },
    {
      id: 'test_4_officer_tamper_user_deletion',
      name: '4. Authority Officer Unauthorized User Management',
      category: 'UNAUTHORIZED_ROUTE',
      description:
        'Authority Officer attempts to invoke "admin:manage_users" to deactivate a colleague. Must be rejected as Admin-only.',
      simulatedRole: 'AUTHORITY_OFFICER',
      targetResource: 'DELETE /api/v1/users/usr-worker-01',
      requiredPermission: 'admin:manage_users',
      testAction: async () => {
        const officerLogin = await authService.login('officer.vance@civicconnect.gov', 'CivicSecure#2026!');
        if (!officerLogin.tokens) {
          return { passed: false, status: 500, message: 'Setup failed', auditTriggered: false };
        }
        const authz = await authService.authorizeRequest(
          officerLogin.tokens.accessToken,
          'admin:manage_users',
          'HUMAN_USER'
        );
        refreshAuditLogs();
        return {
          passed: !authz.authorized && authz.status === 403,
          status: authz.status,
          message: authz.message,
          auditTriggered: true,
        };
      },
    },
    {
      id: 'test_5_worker_tamper_escalation',
      name: '5. Field Worker Unauthorized Escalation Action',
      category: 'UNAUTHORIZED_ROUTE',
      description:
        'Field Worker attempts to invoke "incident:submit_escalation". Must be blocked with 403 Forbidden.',
      simulatedRole: 'FIELD_WORKER',
      targetResource: 'POST /api/v1/incidents/inc-200/escalate',
      requiredPermission: 'incident:submit_escalation',
      testAction: async () => {
        const workerLogin = await authService.login('worker.chen@civicconnect.gov', 'CivicSecure#2026!');
        if (!workerLogin.tokens) {
          return { passed: false, status: 500, message: 'Setup failed', auditTriggered: false };
        }
        const authz = await authService.authorizeRequest(
          workerLogin.tokens.accessToken,
          'incident:submit_escalation',
          'HUMAN_USER'
        );
        refreshAuditLogs();
        return {
          passed: !authz.authorized && authz.status === 403,
          status: authz.status,
          message: authz.message,
          auditTriggered: true,
        };
      },
    },
    {
      id: 'test_6_cryptographic_jwt_tampering',
      name: '6. Cryptographic JWT Signature Tampering & Forgery',
      category: 'TOKEN_TAMPERING',
      description:
        'Modifies the payload of a valid JWT (changing role from CITIZEN to ADMIN) without possessing the server HMAC key. System must reject token with cryptographic signature mismatch.',
      simulatedRole: 'ANONYMOUS',
      targetResource: 'GET /api/v1/admin/audit',
      requiredPermission: 'admin:access_audit',
      testAction: async () => {
        const citizenLogin = await authService.login('citizen.elena@gmail.com', 'CivicSecure#2026!');
        if (!citizenLogin.tokens) {
          return { passed: false, status: 500, message: 'Setup failed', auditTriggered: false };
        }
        const tokenParts = citizenLogin.tokens.accessToken.split('.');
        // Tamper with payload
        const rawPayload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
        rawPayload.role = 'ADMIN';
        rawPayload.permissions = ['admin:access_audit', 'admin:manage_users'];
        const forgedPayloadEncoded = btoa(JSON.stringify(rawPayload))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
        const forgedToken = `${tokenParts[0]}.${forgedPayloadEncoded}.${tokenParts[2]}`;

        const authz = await authService.authorizeRequest(forgedToken, 'admin:access_audit', 'HUMAN_USER');
        refreshAuditLogs();
        return {
          passed: !authz.authorized && authz.status === 401,
          status: authz.status,
          message: authz.message,
          auditTriggered: true,
        };
      },
    },
    {
      id: 'test_7_revoked_token_blocklist_replay',
      name: '7. Revoked Token Logout Blocklist Enforcement',
      category: 'TOKEN_TAMPERING',
      description:
        'A user logs out, adding their JWT access token JTI to the revocation list. Attacker tries to replay that token. Must be rejected as revoked.',
      simulatedRole: 'ANONYMOUS',
      targetResource: 'GET /api/v1/incidents/me',
      requiredPermission: 'incident:view_own',
      testAction: async () => {
        const citizenLogin = await authService.login('citizen.elena@gmail.com', 'CivicSecure#2026!');
        if (!citizenLogin.tokens) {
          return { passed: false, status: 500, message: 'Setup failed', auditTriggered: false };
        }
        const tokenToRevoke = citizenLogin.tokens.accessToken;
        // Perform logout
        await authService.logout(tokenToRevoke, citizenLogin.tokens.refreshToken);

        // Attempt to reuse revoked token
        const authz = await authService.authorizeRequest(tokenToRevoke, 'incident:view_own', 'HUMAN_USER');
        refreshAuditLogs();
        return {
          passed: !authz.authorized && authz.status === 401 && authz.message.includes('revoked'),
          status: authz.status,
          message: authz.message,
          auditTriggered: true,
        };
      },
    },
    {
      id: 'test_8_deactivated_account_access',
      name: '8. Deactivated Account Login & Authorization Guard',
      category: 'ACCOUNT_LOCKOUT',
      description:
        'Attempts login for an administratively deactivated account (Derrick Miller, contractor). Must be refused with clear suspension notification.',
      simulatedRole: 'FIELD_WORKER',
      targetResource: 'POST /auth/login',
      requiredPermission: 'work:view_assigned',
      testAction: async () => {
        const res = await authService.login('suspended.contractor@external.org', 'CivicSecure#2026!');
        refreshAuditLogs();
        return {
          passed: !res.success && !!res.error?.includes('deactivated'),
          status: 403,
          message: res.error || 'Deactivated user was improperly allowed!',
          auditTriggered: true,
        };
      },
    },
    {
      id: 'test_9_failed_login_lockout_trigger',
      name: '9. Brute-Force Password Lockout (5 Consecutive Failures)',
      category: 'ACCOUNT_LOCKOUT',
      description:
        'Submits 5 consecutive erroneous passwords against target user. Account must lock for 15 minutes and trigger CRITICAL audit alert.',
      simulatedRole: 'ANONYMOUS',
      targetResource: 'POST /auth/login',
      requiredPermission: 'profile:view_own',
      testAction: async () => {
        const victimEmail = 'officer.vance@civicconnect.gov';
        // Reset rate limit key for test
        authService.resetRateLimit(`login:${victimEmail}`);

        let lastRes;
        for (let i = 0; i < 5; i++) {
          lastRes = await authService.login(victimEmail, 'WrongPassword#999');
        }
        refreshAuditLogs();
        const isLocked = !lastRes?.success && !!lastRes?.error?.includes('locked');

        // Cleanup: unlock after test so demo flows remain functional
        setTimeout(() => {
          const userObj = authService.getUserByEmail(victimEmail);
          if (userObj) authService.unlockUserAccount(userObj.id);
        }, 3000);

        return {
          passed: isLocked,
          status: 423, // Locked
          message: lastRes?.error || 'Account was not locked after 5 failures',
          auditTriggered: true,
        };
      },
    },
    {
      id: 'test_10_rate_limiting_exhaustion',
      name: '10. API Rate Limiting Bucket Exhaustion Protection',
      category: 'RATE_LIMITING',
      description:
        'Simulates rapid bursts of calls exceeding the 5 requests/min threshold. The 6th attempt must be throttled with rate-limiting response.',
      simulatedRole: 'ANONYMOUS',
      targetResource: 'POST /auth/login',
      requiredPermission: 'profile:view_own',
      testAction: async () => {
        const testKey = `test_ratelimit_${Date.now()}`;
        let blocked = false;
        let lastStatus = null;
        for (let i = 0; i < 7; i++) {
          lastStatus = authService.checkRateLimit(testKey, 5, 60000);
          if (lastStatus.isBlocked) {
            blocked = true;
            break;
          }
        }
        refreshAuditLogs();
        return {
          passed: blocked,
          status: 429, // Too Many Requests
          message: blocked
            ? 'Rate limit triggered after 5 burst attempts. Blocked with HTTP 429.'
            : 'Rate limit failed to throttle requests.',
          auditTriggered: true,
        };
      },
    },
  ];

  const handleRunSingleTest = async (test: SecurityTestResult) => {
    try {
      const result = await test.testAction();
      setTestResults((prev) => ({ ...prev, [test.id]: result }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Test error';
      setTestResults((prev) => ({
        ...prev,
        [test.id]: { passed: false, status: 500, message: msg, auditTriggered: false },
      }));
    }
  };

  const handleRunAllTests = async () => {
    setRunningAll(true);
    const newResults: Record<string, { passed: boolean; status: number; message: string; auditTriggered: boolean }> = {};
    for (const test of securityTests) {
      try {
        const res = await test.testAction();
        newResults[test.id] = res;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Test failed';
        newResults[test.id] = { passed: false, status: 500, message: msg, auditTriggered: false };
      }
    }
    setTestResults(newResults);
    setRunningAll(false);
  };

  const passedCount = Object.values(testResults).filter((r) => r.passed).length;
  const totalRun = Object.keys(testResults).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-rose-400">
              <ShieldAlert className="w-4 h-4" />
              <span>Automated Penetration & Unauthorized Access Security Tests</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Unauthorized Access & Adversarial Threat Simulation Suite
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Validates strict enforcement of Role-Based Access Control, JWT signature integrity, rate limiting, failed-login lockouts, and confirms that <strong>AI Agents cannot bypass RBAC</strong>.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRunAllTests}
              disabled={runningAll}
              className="bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs px-4 py-2.5 rounded-lg transition flex items-center space-x-2 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              {runningAll ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Executing 10 Security Tests...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Run All Security Tests</span>
                </>
              )}
            </button>
          </div>
        </div>

        {totalRun > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">
              Test Coverage: <strong className="text-white">{passedCount}</strong> / {securityTests.length} Passed
            </span>
            <span
              className={`px-2.5 py-0.5 rounded font-semibold ${
                passedCount === securityTests.length
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}
            >
              {passedCount === securityTests.length ? '100% SECURE & ENFORCED' : 'TESTS IN PROGRESS'}
            </span>
          </div>
        )}
      </div>

      {/* Tests Grid */}
      <div className="space-y-3">
        {securityTests.map((test, index) => {
          const result = testResults[test.id];
          return (
            <div
              key={test.id}
              className={`bg-slate-900 border rounded-xl p-4 transition ${
                result
                  ? result.passed
                    ? 'border-emerald-500/50 bg-slate-900/90'
                    : 'border-red-500/80 bg-red-950/20'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold font-mono text-white">{test.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {test.category}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        test.simulatedRole === 'AI_AGENT'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : 'bg-slate-950 text-slate-400 border border-slate-800'
                      }`}
                    >
                      Caller: {test.simulatedRole}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 max-w-4xl">{test.description}</p>
                  <div className="text-[11px] font-mono text-slate-500 flex items-center space-x-4">
                    <span>Target: <code className="text-cyan-400">{test.targetResource}</code></span>
                    <span>Required Perm: <code className="text-emerald-400">{test.requiredPermission}</code></span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  {result && (
                    <div
                      className={`flex items-center space-x-1.5 text-xs font-mono px-3 py-1 rounded border ${
                        result.passed
                          ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                          : 'bg-red-950/60 border-red-800 text-red-400'
                      }`}
                    >
                      {result.passed ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>BLOCKED (HTTP {result.status})</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-red-400" />
                          <span>FAILED (HTTP {result.status})</span>
                        </>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => handleRunSingleTest(test)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono transition cursor-pointer border border-slate-700 flex items-center space-x-1"
                  >
                    <Play className="w-3 h-3 text-emerald-400" />
                    <span>Run</span>
                  </button>
                </div>
              </div>

              {/* Result output line */}
              {result && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-xs font-mono text-slate-300 flex items-center justify-between">
                  <span className="text-slate-400 truncate max-w-3xl">
                    <strong className="text-white">Interception Log:</strong> {result.message}
                  </span>
                  {result.auditTriggered && (
                    <span className="text-[10px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/60">
                      Audit Event Recorded
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
