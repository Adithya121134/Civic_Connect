import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { validatePasswordSecurity } from '../lib/cryptoAuth';
import { UserRole } from '../types/auth';
import {
  Shield,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultMode = 'login' }) => {
  const { login, register, switchMockPersona } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  // Attempt to select role in UI (must demonstrate that selecting ADMIN or OFFICER is blocked!)
  const [attemptedRole, setAttemptedRole] = useState<string>('CITIZEN');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const pwCheck = validatePasswordSecurity(regPassword);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await login(loginEmail, loginPassword);
    setLoading(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMessage(res.error || 'Authentication failed');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await register({
      email: regEmail,
      password: regPassword,
      firstName: regFirstName,
      lastName: regLastName,
      phoneNumber: regPhone || undefined,
      requestedRole: attemptedRole,
    });
    setLoading(false);

    if (res.success) {
      setSuccessMessage('Registration successful! Logged in as Citizen.');
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setErrorMessage(res.error || 'Registration failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white transition"
        >
          ✕
        </button>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-800 mb-5">
          <button
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
            className={`pb-3 font-semibold text-xs uppercase tracking-wider transition border-b-2 mr-6 ${
              mode === 'login'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Authenticate / Login
          </button>
          <button
            onClick={() => {
              setMode('register');
              setErrorMessage(null);
            }}
            className={`pb-3 font-semibold text-xs uppercase tracking-wider transition border-b-2 ${
              mode === 'register'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Citizen Registration
          </button>
        </div>

        {/* Error / Success alert */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-lg text-xs flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-lg text-xs flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Municipal / Citizen Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="e.g., officer.vance@civicconnect.gov"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Account Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Seed accounts default password: <code className="text-emerald-400">CivicSecure#2026!</code>
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Sign In & Generate JWT</span>
                </>
              )}
            </button>

            {/* Quick Persona Selector for Testing */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-2">
                Quick Test Persona Switches (Pre-Seeded Accounts):
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => switchMockPersona('admin@civicconnect.gov').then(onClose)}
                  className="p-1.5 text-left bg-slate-950 hover:bg-slate-800 rounded border border-slate-800 text-purple-300 transition"
                >
                  👑 Sarah Connor (Admin)
                </button>
                <button
                  type="button"
                  onClick={() => switchMockPersona('officer.vance@civicconnect.gov').then(onClose)}
                  className="p-1.5 text-left bg-slate-950 hover:bg-slate-800 rounded border border-slate-800 text-blue-300 transition"
                >
                  🛡️ James Vance (Officer)
                </button>
                <button
                  type="button"
                  onClick={() => switchMockPersona('worker.chen@civicconnect.gov').then(onClose)}
                  className="p-1.5 text-left bg-slate-950 hover:bg-slate-800 rounded border border-slate-800 text-amber-300 transition"
                >
                  🔧 Marcus Chen (Worker)
                </button>
                <button
                  type="button"
                  onClick={() => switchMockPersona('citizen.elena@gmail.com').then(onClose)}
                  className="p-1.5 text-left bg-slate-950 hover:bg-slate-800 rounded border border-slate-800 text-emerald-300 transition"
                >
                  👤 Elena Rostova (Citizen)
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* REGISTRATION FORM */
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">First Name</label>
                <input
                  type="text"
                  required
                  placeholder="First name"
                  value={regFirstName}
                  onChange={(e) => setRegFirstName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  placeholder="Last name"
                  value={regLastName}
                  onChange={(e) => setRegLastName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="citizen.name@example.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number (Optional)</label>
              <input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Privileged Role Rejection Demonstration Selector */}
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Requested Account Role:
              </label>
              <select
                value={attemptedRole}
                onChange={(e) => setAttemptedRole(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
              >
                <option value="CITIZEN">CITIZEN (Standard public citizen)</option>
                <option value="AUTHORITY_OFFICER">AUTHORITY_OFFICER (Privileged — should be rejected)</option>
                <option value="ADMIN">ADMIN (Privileged — should be rejected)</option>
                <option value="FIELD_WORKER">FIELD_WORKER (Privileged — should be rejected)</option>
              </select>
              {attemptedRole !== 'CITIZEN' && (
                <div className="mt-1.5 text-[10px] text-amber-400 flex items-center space-x-1">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>Submitting with a privileged role will be intercepted & logged to security audit.</span>
                </div>
              )}
            </div>

            {/* Password with Live Strength Evaluation */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Create Secure Password</label>
              <input
                type="password"
                required
                placeholder="At least 10 chars, uppercase, symbol, number"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              />

              {/* Password Requirement Checklist */}
              {regPassword.length > 0 && (
                <div className="mt-2 p-2 bg-slate-950 rounded border border-slate-800 text-[11px] space-y-1 font-mono">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400">Policy Strength:</span>
                    <span
                      className={`font-semibold ${
                        pwCheck.isValid ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {pwCheck.feedback}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <span className={regPassword.length >= 10 ? 'text-emerald-400' : 'text-slate-500'}>
                      &bull; 10+ Characters
                    </span>
                    <span className={/[A-Z]/.test(regPassword) ? 'text-emerald-400' : 'text-slate-500'}>
                      &bull; Uppercase (A-Z)
                    </span>
                    <span className={/[0-9]/.test(regPassword) ? 'text-emerald-400' : 'text-slate-500'}>
                      &bull; Numeric Digit (0-9)
                    </span>
                    <span
                      className={
                        /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(regPassword)
                          ? 'text-emerald-400'
                          : 'text-slate-500'
                      }
                    >
                      &bull; Symbol (!@#$)
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5" />
                  <span>Create Citizen Account</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
