import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowRight, Loader2, Users, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CivicLogo } from '../CivicLogo';

interface CitizenLoginPageProps {
  onSuccess?: () => void;
  onNavigateLanding?: () => void;
  onNavigateForgotPassword?: () => void;
  onNavigateRegister?: () => void;
}

export const CitizenLoginPage: React.FC<CitizenLoginPageProps> = ({
  onSuccess,
  onNavigateLanding,
  onNavigateForgotPassword,
  onNavigateRegister
}) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('citizen.priya@example.com');
  const [password, setPassword] = useState('CivicSecure#2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email/username and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await login(email, password);
      if (res.success) {
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(res.error || 'Invalid credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickCredentials = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('CivicSecure#2026!');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#FFFFFF] text-[#111111] font-sans antialiased">
      {/* LEFT PANEL: Citizen Branding & Community Atmosphere */}
      <div className="relative w-full lg:w-1/2 min-h-[360px] lg:min-h-screen bg-[#0A0A0A] flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden">
        {/* Background Urban Community Image */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity filter contrast-125 brightness-90"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80')`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/70 to-[#0A0A0A]/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/95 via-[#0A0A0A]/60 to-transparent" />

        {/* Top Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <CivicLogo variant="light" size="lg" subtitle="Smart Civic Services" />
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

        {/* Center / Hero Copy */}
        <div className="relative z-10 my-auto py-12 max-w-lg space-y-4">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-[#27272A]/80 border border-[#3F3F46] text-[11px] font-mono text-[#D4D4D8]">
            <Users className="w-3.5 h-3.5 text-[#FFFFFF]" />
            <span>Resident & Citizen Portal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-[#FFFFFF] tracking-tight leading-[1.15]">
            Cleaner cities.<br />
            Safer neighbourhoods.<br />
            Stronger communities.
          </h1>
          <p className="text-sm sm:text-base text-[#D4D4D8] font-normal leading-relaxed">
            Report issues, track resolution progress in real time, and help shape your local municipality.
          </p>
        </div>

        {/* Bottom Tagline */}
        <div className="relative z-10 pt-4 border-t border-[#27272A]/70 text-[11px] sm:text-xs text-[#A1A1AA] font-mono flex items-center justify-between">
          <span>CivicConnect Resident Gateway</span>
          <span className="text-[#A1A1AA]">Empowering Citizen Participation</span>
        </div>
      </div>

      {/* RIGHT PANEL: Citizen Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-20 bg-[#FFFFFF]">
        <div className="w-full max-w-[420px] space-y-8">
          {/* Header */}
          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111]">
              Welcome to CivicConnect
            </h2>
            <p className="text-sm text-[#71717A]">
              Report civic issues, track progress, and help improve your community.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-[#FEF2F2] border border-[#F87171] rounded-lg text-xs text-[#DC2626] font-medium animate-in fade-in">
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs sm:text-[13px] font-semibold text-[#1F2937] block">
                Email / Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="citizen-email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
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
                  id="citizen-password"
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

            <button
              id="citizen-signin-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[#111111] hover:bg-[#27272A] disabled:bg-[#A1A1AA] text-[#FFFFFF] font-semibold text-sm rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-2xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* CREATE NEW ACCOUNT (User Specification Section 1) */}
          <div className="pt-4 border-t border-[#E5E5E5] space-y-2.5 text-center">
            <div className="text-xs sm:text-[13px] text-[#71717A]">
              Don&apos;t have an account?
            </div>
            <button
              id="citizen-create-new-account-btn"
              type="button"
              onClick={onNavigateRegister}
              className="w-full py-2.5 px-4 bg-[#FFFFFF] hover:bg-[#F4F4F5] border-2 border-[#111111] text-[#111111] font-bold text-xs sm:text-sm rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-2xs"
            >
              <span>CREATE NEW ACCOUNT</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Demo Citizen Login Shortcuts */}
          <div className="pt-4 border-t border-[#E5E5E5] space-y-2">
            <div className="text-[11px] font-mono uppercase text-[#71717A]">
              Quick Demo Resident Profiles:
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillQuickCredentials('citizen.priya@example.com')}
                className="p-2 border border-[#E5E5E5] hover:border-[#111111] rounded-md text-left text-xs bg-[#FAFAFA] hover:bg-[#FFFFFF] transition-colors"
              >
                <div className="font-bold text-[#18181B]">Priya Sharma</div>
                <div className="text-[10px] text-[#71717A]">Resident &bull; Ward 04</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickCredentials('resident.kumar@example.com')}
                className="p-2 border border-[#E5E5E5] hover:border-[#111111] rounded-md text-left text-xs bg-[#FAFAFA] hover:bg-[#FFFFFF] transition-colors"
              >
                <div className="font-bold text-[#18181B]">R. Kumar</div>
                <div className="text-[10px] text-[#71717A]">Resident &bull; Ward 07</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
