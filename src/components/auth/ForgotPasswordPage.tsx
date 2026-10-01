import React, { useState } from 'react';
import { Mail, ArrowLeft, ArrowRight, Loader2, CheckCircle2, ShieldCheck, Building2, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CivicLogo } from '../CivicLogo';

interface ForgotPasswordPageProps {
  isDepartment?: boolean;
  onBackToLogin: () => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  isDepartment = false,
  onBackToLogin
}) => {
  const { requestPasswordReset } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) return;

    setIsLoading(true);
    try {
      const res = await requestPasswordReset(identifier, isDepartment);
      setStatusMessage(res.message);
      setIsSubmitted(true);
    } catch {
      setStatusMessage(
        isDepartment
          ? 'If an official account matches this record, recovery instructions have been sent via Municipal IT.'
          : 'If an account is associated with this email, recovery instructions have been sent.'
      );
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-[#FAFAFA] text-[#111111] font-sans">
      <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-8 sm:p-10 shadow-sm space-y-6">
        {/* Top Logo & Back Action */}
        <div className="flex items-center justify-between">
          <CivicLogo variant="dark" size="sm" />
          <button
            onClick={onBackToLogin}
            className="text-xs text-[#71717A] hover:text-[#111111] flex items-center space-x-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </button>
        </div>

        {/* Header */}
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2 text-xs font-mono text-[#71717A]">
            {isDepartment ? (
              <>
                <Building2 className="w-3.5 h-3.5 text-[#111111]" />
                <span>Department Portal Security</span>
              </>
            ) : (
              <>
                <Users className="w-3.5 h-3.5 text-[#111111]" />
                <span>Citizen Portal Security</span>
              </>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111]">
            {isDepartment ? 'Department Password Recovery' : 'Reset Citizen Password'}
          </h2>
          <p className="text-xs sm:text-sm text-[#71717A] leading-relaxed">
            {isDepartment
              ? 'Enter your official municipal email address or Employee ID to request an authorized credential reset.'
              : 'Enter your registered email address to receive password recovery instructions.'}
          </p>
        </div>

        {isSubmitted ? (
          <div className="space-y-6 py-2">
            <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg flex items-start space-x-3 text-xs text-[#166534]">
              <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block text-sm">Recovery Request Dispatched</strong>
                <p className="mt-1 leading-relaxed text-[#15803D]">{statusMessage}</p>
              </div>
            </div>

            <button
              onClick={onBackToLogin}
              className="w-full py-2.5 px-4 bg-[#111111] hover:bg-[#27272A] text-[#FFFFFF] font-semibold text-xs rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <span>Return to Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#18181B] block">
                {isDepartment ? 'Official Email / Employee ID' : 'Registered Email Address'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#71717A]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="forgot-identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={isDepartment ? 'officer.name@civicconnect.gov' : 'name@example.com'}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg text-xs font-medium text-[#111111] placeholder:text-[#A1A1AA] focus:outline-hidden focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-all"
                />
              </div>
            </div>

            <button
              id="request-reset-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[#111111] hover:bg-[#27272A] disabled:bg-[#A1A1AA] text-[#FFFFFF] font-semibold text-xs rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-2xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Request...</span>
                </>
              ) : (
                <>
                  <span>Request Password Reset</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-[#F4F4F5] text-center text-[11px] text-[#A1A1AA]">
          {isDepartment
            ? 'Department credential requests are routed via the Municipal IT Security Directorate.'
            : 'Check your inbox and spam folders for the recovery link.'}
        </div>
      </div>
    </div>
  );
};
