import React, { useState, useEffect, useRef } from 'react';
import {
  User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight, ArrowLeft,
  CheckCircle2, ShieldCheck, Loader2, RefreshCw, Check, AlertCircle, Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CivicLogo } from '../CivicLogo';

interface CitizenRegistrationFlowProps {
  onBackToLogin: () => void;
  onSuccess: () => void;
}

type RegistrationStep = 'ENTER_DETAILS' | 'VERIFY_EMAIL' | 'VERIFY_PHONE' | 'ACCOUNT_CREATED';

export const CitizenRegistrationFlow: React.FC<CitizenRegistrationFlowProps> = ({
  onBackToLogin,
  onSuccess
}) => {
  const {
    startCitizenRegistration,
    resendEmailOtp,
    verifyEmailOtp,
    resendPhoneOtp,
    verifyPhoneAndCreateAccount
  } = useAuth();

  // Step state
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('ENTER_DETAILS');
  const [sessionId, setSessionId] = useState<string>('');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP Fields
  const [emailOtp, setEmailOtp] = useState(['', '', '', '', '', '']);
  const [phoneOtp, setPhoneOtp] = useState(['', '', '', '', '', '']);
  const [maskedPhone, setMaskedPhone] = useState('');

  // Timers & Cooldowns
  const [resendCooldown, setResendCooldown] = useState(0);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Created Account Info
  const [createdUser, setCreatedUser] = useState<any>(null);

  // Input refs for 6-digit OTP fields
  const emailInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const phoneInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle OTP 6-box input
  const handleOtpBoxChange = (
    index: number,
    value: string,
    isPhone: boolean
  ) => {
    const cleanValue = value.replace(/\D/g, '').slice(-1);
    const otpArray = isPhone ? [...phoneOtp] : [...emailOtp];
    const setOtpArray = isPhone ? setPhoneOtp : setEmailOtp;
    const refs = isPhone ? phoneInputRefs : emailInputRefs;

    otpArray[index] = cleanValue;
    setOtpArray(otpArray);

    if (cleanValue && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
    isPhone: boolean
  ) => {
    const otpArray = isPhone ? phoneOtp : emailOtp;
    const refs = isPhone ? phoneInputRefs : emailInputRefs;

    if (e.key === 'Backspace' && !otpArray[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePasteOtp = (
    e: React.ClipboardEvent,
    isPhone: boolean
  ) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const setOtpArray = isPhone ? setPhoneOtp : setEmailOtp;
    const newOtp = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtpArray(newOtp);

    const refs = isPhone ? phoneInputRefs : emailInputRefs;
    const nextIndex = Math.min(pasted.length, 5);
    refs.current[nextIndex]?.focus();
  };

  // STEP 1: Submit Details & Request Email OTP
  const handleStartRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    if (!fullName.trim() || !email.trim() || !phoneNumber.trim() || !password) {
      setErrorMessage('All registration fields are required.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await startCitizenRegistration({
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        password,
        confirmPassword
      });

      if (res.success && res.sessionId) {
        setSessionId(res.sessionId);
        setMaskedPhone(res.maskedPhone || phoneNumber);
        setResendCooldown(res.resendCooldownSeconds || 45);
        setCurrentStep('VERIFY_EMAIL');
        setEmailOtp(['', '', '', '', '', '']);
        setSuccessNotice('A 6-digit verification code has been dispatched to your email.');
        // Focus first box
        setTimeout(() => emailInputRefs.current[0]?.focus(), 150);
      } else {
        setErrorMessage(res.error || 'Failed to start registration.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error initiating registration.');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 1b: Resend Email OTP
  const handleResendEmailOtp = async () => {
    if (resendCooldown > 0 || !sessionId) return;
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await resendEmailOtp(sessionId);
      if (res.success) {
        setResendCooldown(res.resendCooldownSeconds || 45);
        setSuccessNotice('A new 6-digit verification code has been dispatched to your email.');
      } else {
        setErrorMessage(res.error || 'Failed to resend email code.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Verify Email OTP & Receive Phone OTP
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    const fullCode = emailOtp.join('');
    if (fullCode.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code sent to your email.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await verifyEmailOtp(sessionId, fullCode);
      if (res.success) {
        if (res.maskedPhone) setMaskedPhone(res.maskedPhone);
        setResendCooldown(45);
        setCurrentStep('VERIFY_PHONE');
        setPhoneOtp(['', '', '', '', '', '']);
        setSuccessNotice('Email verified! A 6-digit SMS verification code has been sent to your mobile phone.');
        setTimeout(() => phoneInputRefs.current[0]?.focus(), 150);
      } else {
        setErrorMessage(res.error || 'Invalid verification code.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error verifying code.');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2b: Resend Phone OTP
  const handleResendPhoneOtp = async () => {
    if (resendCooldown > 0 || !sessionId) return;
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await resendPhoneOtp(sessionId);
      if (res.success) {
        setResendCooldown(45);
        setSuccessNotice('A new verification code has been dispatched to your mobile number.');
      } else {
        setErrorMessage(res.error || 'Failed to resend phone code.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 3: Verify Phone OTP & Finalize Registration
  const handleVerifyPhoneAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    const fullCode = phoneOtp.join('');
    if (fullCode.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code sent to your mobile phone.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await verifyPhoneAndCreateAccount(sessionId, fullCode);
      if (res.success && res.user) {
        setCreatedUser(res.user);
        setCurrentStep('ACCOUNT_CREATED');
      } else {
        setErrorMessage(res.error || 'Failed to finalize account creation.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration completion error.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#FFFFFF] text-[#111111] font-sans antialiased">
      {/* LEFT PANEL: Citizen Branding & Community Mission */}
      <div className="relative w-full lg:w-1/2 min-h-[360px] lg:min-h-screen bg-[#0A0A0A] flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity filter contrast-125 brightness-90"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1600&q=80')`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/70 to-[#0A0A0A]/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/95 via-[#0A0A0A]/60 to-transparent" />

        {/* Top Logo & Back Button */}
        <div className="relative z-10 flex items-center justify-between">
          <CivicLogo variant="light" size="lg" subtitle="Citizen Portal" />
          <button
            onClick={onBackToLogin}
            className="text-xs text-[#A1A1AA] hover:text-[#FFFFFF] flex items-center space-x-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </button>
        </div>

        {/* Center / Hero Copy */}
        <div className="relative z-10 my-auto py-12 max-w-lg space-y-4">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-[#27272A]/80 border border-[#3F3F46] text-[11px] font-mono text-[#D4D4D8]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
            <span>Citizen Registration Gateway</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-[#FFFFFF] tracking-tight leading-[1.15]">
            Join thousands of active citizens shaping our municipality.
          </h1>

          <p className="text-sm sm:text-base text-[#D4D4D8] font-normal leading-relaxed">
            Report local infrastructure defects, track municipal resolution in real time, and verify service delivery on our secure civic network.
          </p>

          {/* Privacy Trust Guarantee Badge */}
          <div className="pt-4 border-t border-[#27272A]/80 flex items-start space-x-3 text-xs text-[#A1A1AA]">
            <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
            <p>
              <strong className="text-[#FFFFFF]">Zero-Aadhaar Registration:</strong> CivicConnect uses email and mobile phone two-step OTP verification. National biometric identity is strictly not requested or required.
            </p>
          </div>
        </div>

        {/* Step Progression Pills */}
        <div className="relative z-10 pt-4 border-t border-[#27272A]/70 text-[11px] sm:text-xs text-[#A1A1AA] font-mono flex items-center space-x-4">
          <span className={currentStep === 'ENTER_DETAILS' ? 'text-[#FFFFFF] font-bold' : ''}>
            1. Details
          </span>
          <span>&rarr;</span>
          <span className={currentStep === 'VERIFY_EMAIL' ? 'text-[#FFFFFF] font-bold' : ''}>
            2. Email OTP
          </span>
          <span>&rarr;</span>
          <span className={currentStep === 'VERIFY_PHONE' ? 'text-[#FFFFFF] font-bold' : ''}>
            3. Phone OTP
          </span>
          <span>&rarr;</span>
          <span className={currentStep === 'ACCOUNT_CREATED' ? 'text-[#22C55E] font-bold' : ''}>
            4. Ready
          </span>
        </div>
      </div>

      {/* RIGHT PANEL: Dynamic Multi-Step Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-20 bg-[#FFFFFF]">
        <div className="w-full max-w-[440px] space-y-6">

          {/* Step 1: ENTER CITIZEN DETAILS */}
          {currentStep === 'ENTER_DETAILS' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="space-y-1.5">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111]">
                  Create Citizen Account
                </h2>
                <p className="text-sm text-[#71717A]">
                  Register as a resident to submit and track civic reports in your ward.
                </p>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="p-3 bg-[#FEF2F2] border border-[#F87171] rounded-lg text-xs text-[#DC2626] font-medium flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleStartRegistration} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-[13px] font-semibold text-[#1F2937] block">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-fullname"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-hidden focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-all"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-[13px] font-semibold text-[#1F2937] block">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-hidden focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-all"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-[13px] font-semibold text-[#1F2937] block">
                    Mobile Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-phone"
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-hidden focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-all"
                    />
                  </div>
                  <span className="text-[11px] text-[#6B7280]">
                    Used for SMS OTP status updates on your reported issues.
                  </span>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-[13px] font-semibold text-[#1F2937] block">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full pl-10 pr-10 py-2.5 bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-hidden focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-all"
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

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-[13px] font-semibold text-[#1F2937] block">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type your password"
                      className="w-full pl-10 pr-10 py-2.5 bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-hidden focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6B7280] hover:text-[#111111]"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  id="reg-submit-btn"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-[#111111] hover:bg-[#27272A] disabled:bg-[#A1A1AA] text-[#FFFFFF] font-semibold text-sm rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-2xs mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Validating Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue to Verification</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Already have an account */}
              <div className="text-center pt-2 border-t border-[#E5E5E5]">
                <p className="text-xs text-[#71717A]">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={onBackToLogin}
                    className="text-[#111111] hover:underline font-semibold"
                  >
                    Log In
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* Step 2: VERIFY EMAIL OTP */}
          {currentStep === 'VERIFY_EMAIL' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentStep('ENTER_DETAILS')}
                  className="text-xs text-[#6B7280] hover:text-[#111111] inline-flex items-center space-x-1 mb-1 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111]">
                  Verify Your Email
                </h2>
                <p className="text-sm text-[#71717A]">
                  We sent a 6-digit verification code to <strong className="text-[#111111]">{email}</strong>.
                </p>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="p-3 bg-[#FEF2F2] border border-[#F87171] rounded-lg text-xs text-[#DC2626] font-medium flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Success Notice */}
              {successNotice && (
                <div className="p-3 bg-[#F0FDF4] border border-[#86EFAC] rounded-lg text-xs text-[#16A34A] font-medium">
                  {successNotice}
                </div>
              )}

              {/* 6-Box OTP Form */}
              <form onSubmit={handleVerifyEmail} className="space-y-6">
                <div>
                  <label className="text-xs font-semibold text-[#1F2937] block mb-2 text-center">
                    Enter 6-Digit Email Code
                  </label>
                  <div
                    className="flex justify-center space-x-2 sm:space-x-3"
                    onPaste={(e) => handlePasteOtp(e, false)}
                  >
                    {emailOtp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => { emailInputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpBoxChange(index, e.target.value, false)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e, false)}
                        className="w-11 h-12 sm:w-12 sm:h-14 text-center font-mono text-xl font-bold bg-[#FFFFFF] border-2 border-[#E5E5E5] focus:border-[#111111] focus:ring-0 rounded-lg text-[#111827] outline-hidden transition-all"
                      />
                    ))}
                  </div>
                </div>

                {/* Resend Cooldown Countdown */}
                <div className="flex items-center justify-between text-xs text-[#6B7280]">
                  <span>Didn&apos;t receive the email code?</span>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isLoading}
                    onClick={handleResendEmailOtp}
                    className="font-semibold text-[#111111] hover:underline disabled:text-[#9CA3AF] disabled:no-underline flex items-center space-x-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>
                      {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                    </span>
                  </button>
                </div>

                <button
                  id="reg-verify-email-btn"
                  type="submit"
                  disabled={isLoading || emailOtp.join('').length !== 6}
                  className="w-full py-2.5 px-4 bg-[#111111] hover:bg-[#27272A] disabled:bg-[#A1A1AA] text-[#FFFFFF] font-semibold text-sm rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-2xs"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Email...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Email &amp; Proceed</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Step 3: VERIFY PHONE OTP */}
          {currentStep === 'VERIFY_PHONE' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="space-y-1.5">
                <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded bg-[#DCFCE7] text-[#15803D] text-[11px] font-semibold mb-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Email Verified</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111]">
                  Verify Mobile Phone
                </h2>
                <p className="text-sm text-[#71717A]">
                  Enter the 6-digit SMS code sent to <strong className="text-[#111111]">{maskedPhone || phoneNumber}</strong>.
                </p>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="p-3 bg-[#FEF2F2] border border-[#F87171] rounded-lg text-xs text-[#DC2626] font-medium flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Success Notice */}
              {successNotice && (
                <div className="p-3 bg-[#F0FDF4] border border-[#86EFAC] rounded-lg text-xs text-[#16A34A] font-medium">
                  {successNotice}
                </div>
              )}

              {/* 6-Box Phone OTP Form */}
              <form onSubmit={handleVerifyPhoneAndCreate} className="space-y-6">
                <div>
                  <label className="text-xs font-semibold text-[#1F2937] block mb-2 text-center">
                    Enter 6-Digit SMS Code
                  </label>
                  <div
                    className="flex justify-center space-x-2 sm:space-x-3"
                    onPaste={(e) => handlePasteOtp(e, true)}
                  >
                    {phoneOtp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => { phoneInputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpBoxChange(index, e.target.value, true)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e, true)}
                        className="w-11 h-12 sm:w-12 sm:h-14 text-center font-mono text-xl font-bold bg-[#FFFFFF] border-2 border-[#E5E5E5] focus:border-[#111111] focus:ring-0 rounded-lg text-[#111827] outline-hidden transition-all"
                      />
                    ))}
                  </div>
                </div>

                {/* Resend Cooldown Countdown */}
                <div className="flex items-center justify-between text-xs text-[#6B7280]">
                  <span>Didn&apos;t receive the SMS code?</span>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isLoading}
                    onClick={handleResendPhoneOtp}
                    className="font-semibold text-[#111111] hover:underline disabled:text-[#9CA3AF] disabled:no-underline flex items-center space-x-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>
                      {resendCooldown > 0 ? `Resend SMS in ${resendCooldown}s` : 'Resend SMS'}
                    </span>
                  </button>
                </div>

                <button
                  id="reg-verify-phone-btn"
                  type="submit"
                  disabled={isLoading || phoneOtp.join('').length !== 6}
                  className="w-full py-2.5 px-4 bg-[#111111] hover:bg-[#27272A] disabled:bg-[#A1A1AA] text-[#FFFFFF] font-semibold text-sm rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-2xs"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Citizen Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Account Creation</span>
                      <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Step 4: ACCOUNT CREATED CELEBRATION */}
          {currentStep === 'ACCOUNT_CREATED' && (
            <div className="space-y-6 text-center animate-in zoom-in-95">
              <div className="w-16 h-16 bg-[#DCFCE7] border border-[#86EFAC] text-[#16A34A] rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-[#F4F4F5] border border-[#E4E4E7] rounded text-[11px] font-mono font-semibold text-[#52525B]">
                  <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>Verification Complete</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111]">
                  Account Created Successfully!
                </h2>
                <p className="text-sm text-[#71717A] max-w-sm mx-auto">
                  Your CivicConnect resident profile is verified and active. You can now submit and track civic issues in your municipality.
                </p>
              </div>

              {/* Profile Confirmation Card */}
              <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl text-left space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
                  <span className="font-semibold text-[#111111]">Citizen Profile Record</span>
                  <span className="px-2 py-0.5 bg-[#DCFCE7] text-[#15803D] font-mono text-[10px] font-bold rounded">
                    ACTIVE &bull; VERIFIED
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[#4B5563]">
                  <div>
                    <div className="text-[10px] text-[#9CA3AF] uppercase font-mono">Full Name</div>
                    <div className="font-semibold text-[#111827] mt-0.5">
                      {createdUser?.fullName || fullName}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#9CA3AF] uppercase font-mono">Role</div>
                    <div className="font-semibold text-[#111827] mt-0.5">
                      Resident &bull; Citizen
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#9CA3AF] uppercase font-mono">Email Status</div>
                    <div className="font-semibold text-[#15803D] flex items-center space-x-1 mt-0.5">
                      <Check className="w-3 h-3" />
                      <span className="truncate">{createdUser?.email || email}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#9CA3AF] uppercase font-mono">Phone Status</div>
                    <div className="font-semibold text-[#15803D] flex items-center space-x-1 mt-0.5">
                      <Check className="w-3 h-3" />
                      <span>{maskedPhone || phoneNumber}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Portal Entry Button */}
              <button
                id="reg-goto-portal-btn"
                type="button"
                onClick={onSuccess}
                className="w-full py-3 px-4 bg-[#111111] hover:bg-[#27272A] text-[#FFFFFF] font-bold text-sm rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-sm"
              >
                <span>Go to Citizen Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
