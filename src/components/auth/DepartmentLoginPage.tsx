import React, { useState } from 'react';
import { Eye, EyeOff, Lock, UserCheck, ArrowRight, Loader2, Building2, ArrowLeft, ShieldAlert, CheckCircle2, Shield, Wrench, Truck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CivicLogo } from '../CivicLogo';

interface DepartmentLoginPageProps {
  onSuccess?: () => void;
  onNavigateLanding?: () => void;
  onNavigateForgotPassword?: () => void;
  onNavigateCitizenLogin?: () => void;
}

export const DepartmentLoginPage: React.FC<DepartmentLoginPageProps> = ({
  onSuccess,
  onNavigateLanding,
  onNavigateForgotPassword,
  onNavigateCitizenLogin
}) => {
  const { departmentLogin } = useAuth();
  const [identifier, setIdentifier] = useState('officer.vance@civicconnect.gov');
  const [password, setPassword] = useState('CivicSecure#2026!');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setErrorMessage('Please enter both your Official Email / Employee ID and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await departmentLogin(identifier, password);
      if (res.success) {
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(res.error || 'Invalid official credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Department authentication error.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickCredentials = (demoId: string) => {
    setIdentifier(demoId);
    setPassword('CivicSecure#2026!');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#FFFFFF] text-[#111111] font-sans antialiased">
      {/* LEFT PANEL: Municipal Command & Operational Infrastructure */}
      <div className="relative w-full lg:w-1/2 min-h-[380px] lg:min-h-screen bg-[#0C0D0E] text-[#FFFFFF] flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden border-r border-[#18181B]">
        {/* Subtle Infrastructure Visual Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity filter contrast-150 brightness-75"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80')`
          }}
        />
        {/* Deep Municipal Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0C0D0E] via-[#0C0D0E]/80 to-[#0C0D0E]/95" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0C0D0E] via-[#0C0D0E]/70 to-transparent" />

        {/* Top Header & Portal Navigation */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-md bg-[#FFFFFF] text-[#111111] flex items-center justify-center font-black shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-base text-[#FFFFFF] tracking-tight">CivicConnect</div>
              <div className="text-[11px] text-[#A1A1AA] uppercase tracking-wider font-mono">Department Operations Portal</div>
            </div>
          </div>

          {onNavigateLanding && (
            <button
              onClick={onNavigateLanding}
              className="text-xs text-[#A1A1AA] hover:text-[#FFFFFF] flex items-center space-x-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Portal Selection</span>
            </button>
          )}
        </div>

        {/* Center Operational Statements */}
        <div className="relative z-10 my-auto py-12 max-w-lg space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-[#18181B] border border-[#27272A] text-xs font-mono text-[#E4E4E7]">
            <Shield className="w-3.5 h-3.5 text-[#16A34A]" />
            <span>Official Municipal Command Channel</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-[38px] font-bold text-[#FFFFFF] tracking-tight leading-[1.2]">
              Coordinate incidents.<br />
              Deploy teams.<br />
              Manage resources.<br />
              Resolve civic issues.
            </h1>
          </div>

          <p className="text-xs sm:text-sm text-[#A1A1AA] font-normal leading-relaxed max-w-md">
            Operational execution system for municipal department officers, dispatch supervisors, and field maintenance leads.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-[#18181B]/80 border border-[#27272A] rounded-lg">
              <div className="text-[10px] font-mono uppercase text-[#71717A]">Access Protocol</div>
              <div className="text-xs font-bold text-[#FFFFFF] mt-0.5">Role & Department Bound</div>
            </div>
            <div className="p-3 bg-[#18181B]/80 border border-[#27272A] rounded-lg">
              <div className="text-[10px] font-mono uppercase text-[#71717A]">SLA Clock Tracking</div>
              <div className="text-xs font-bold text-[#FFFFFF] mt-0.5">Automated Escalation</div>
            </div>
          </div>
        </div>

        {/* Bottom Tagline & Citizen Link */}
        <div className="relative z-10 pt-4 border-t border-[#222225] text-[11px] sm:text-xs text-[#71717A] font-mono flex items-center justify-between">
          <span>Authorized Municipal Personnel Only</span>
          {onNavigateCitizenLogin && (
            <button
              onClick={onNavigateCitizenLogin}
              className="text-[#E4E4E7] hover:underline font-semibold"
            >
              Citizen Portal Login &rarr;
            </button>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Enterprise Government Department Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-20 bg-[#FFFFFF]">
        <div className="w-full max-w-[440px] space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs font-mono text-[#71717A]">
              <span className="w-2 h-2 rounded-full bg-[#111111]" />
              <span>CivicConnect Secure Portal</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111]">
              Department Operations Portal
            </h2>
            <p className="text-xs sm:text-sm text-[#71717A] leading-relaxed">
              Secure access for authorized municipal department officers.
            </p>
          </div>

          {/* Security Notice Banner */}
          <div className="p-3 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg flex items-start space-x-3 text-xs text-[#52525B]">
            <ShieldAlert className="w-4 h-4 text-[#111111] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#18181B] font-semibold">Authorized municipal personnel only.</strong>
              <div className="text-[11px] text-[#71717A] mt-0.5">
                Department access is strictly audited and verified via server-side credentials.
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-[#FEF2F2] border border-[#F87171] rounded-lg text-xs text-[#DC2626] font-medium animate-in fade-in">
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs sm:text-[13px] font-semibold text-[#1F2937] block">
                Official Email / Employee ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
                  <UserCheck className="w-4 h-4" />
                </div>
                <input
                  id="dept-identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="officer.name@civicconnect.gov or OFF-7429"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg text-sm font-normal text-[#111827] placeholder:text-[#9CA3AF] focus:outline-hidden focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-[13px] font-semibold text-[#1F2937] block">
                  Password
                </label>
                {onNavigateForgotPassword && (
                  <button
                    type="button"
                    onClick={onNavigateForgotPassword}
                    className="text-xs text-[#6B7280] hover:text-[#111111] hover:underline transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="dept-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg text-sm font-normal text-[#111827] placeholder:text-[#9CA3AF] focus:outline-hidden focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6B7280] hover:text-[#111111]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Device Checkbox */}
            <div className="flex items-center space-x-2 pt-1">
              <input
                id="remember-device"
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="w-4 h-4 rounded border-[#D4D4D8] text-[#111111] focus:ring-[#111111]"
              />
              <label htmlFor="remember-device" className="text-xs text-[#4B5563] cursor-pointer">
                Remember this device for official session
              </label>
            </div>

            <button
              id="dept-signin-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[#111111] hover:bg-[#27272A] disabled:bg-[#A1A1AA] text-[#FFFFFF] font-semibold text-sm rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-2xs mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials & Department...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Department Command</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Department Officer Credentials */}
          <div className="pt-4 border-t border-[#E5E5E5] space-y-2">
            <div className="text-[11px] font-mono uppercase text-[#71717A] flex items-center justify-between">
              <span>Quick Demo Department Officers:</span>
              <span className="text-[10px] text-[#A1A1AA]">Auto-resolved by Server</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillQuickCredentials('officer.vance@civicconnect.gov')}
                className="p-2.5 border border-[#E5E5E5] hover:border-[#111111] rounded-md text-left text-xs bg-[#FAFAFA] hover:bg-[#FFFFFF] transition-colors"
              >
                <div className="font-bold text-[#18181B]">James Vance</div>
                <div className="text-[10px] text-[#71717A]">Roads & Infrastructure</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickCredentials('worker.chen@civicconnect.gov')}
                className="p-2.5 border border-[#E5E5E5] hover:border-[#111111] rounded-md text-left text-xs bg-[#FAFAFA] hover:bg-[#FFFFFF] transition-colors"
              >
                <div className="font-bold text-[#18181B]">Marcus Chen</div>
                <div className="text-[10px] text-[#71717A]">Field Operations Lead</div>
              </button>
            </div>
          </div>

          {/* Switch to Citizen Link */}
          {onNavigateCitizenLogin && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={onNavigateCitizenLogin}
                className="text-xs text-[#71717A] hover:text-[#111111] transition-colors"
              >
                Looking for resident services? <strong className="text-[#111111] underline font-semibold">Citizen Login</strong>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
