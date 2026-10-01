import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { db, verifyPassword, hashPassword } from '../db';
import { generateTokens, determineAuthorizedPortal, getRolePermissions, authenticateToken } from '../auth';
import { emailService } from '../services/emailService';
import { smsService } from '../services/smsService';
import { notificationService } from '../services/notificationService';

export const authRouter = Router();

export function validateAndNormalizeIndianPhone(phoneInput: string): { valid: boolean; canonical: string; error?: string } {
  if (!phoneInput || typeof phoneInput !== 'string') {
    return { valid: false, canonical: '', error: 'Mobile number is required.' };
  }
  const cleaned = phoneInput.replace(/[\s\-\(\)]/g, '');
  let digits = '';
  if (cleaned.startsWith('+91')) {
    digits = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    digits = cleaned.slice(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    digits = cleaned.slice(1);
  } else {
    digits = cleaned;
  }

  if (!/^\d{10}$/.test(digits)) {
    return {
      valid: false,
      canonical: '',
      error: 'Please enter a valid 10-digit Indian mobile number (e.g. +91 98765 43210).'
    };
  }

  if (!/^[6-9]/.test(digits)) {
    return {
      valid: false,
      canonical: '',
      error: 'Indian mobile numbers must begin with 6, 7, 8, or 9.'
    };
  }

  return { valid: true, canonical: `+91${digits}` };
}

function maskPhoneNumber(phone: string): string {
  if (!phone) return '***-***-****';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return phone;
  const lastFour = digits.slice(-4);
  const prefix = phone.startsWith('+') ? phone.slice(0, 3) + ' ' : '';
  return `${prefix}XXXXX ${lastFour}`;
}

function hashOtpToken(otp: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(otp).digest('hex');
}

// Login Endpoint
authRouter.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'MISSING_CREDENTIALS', message: 'Email and password are required.' });
    return;
  }

  const user = db.prepare(`
    SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, u.full_name, u.role, u.department_id,
           u.badge_number, u.phone_number, u.is_active, u.email_verified, u.phone_verified, u.status, u.created_at,
           d.name as department_name, d.code as department_code
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.email = ? COLLATE NOCASE
  `).get(email) as any;

  if (!user) {
    res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email address or password.' });
    return;
  }

  if (!user.is_active) {
    res.status(403).json({ error: 'ACCOUNT_DEACTIVATED', message: 'This account has been deactivated.' });
    return;
  }

  const isValid = verifyPassword(password, user.password_hash);
  if (!isValid) {
    res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email address or password.' });
    return;
  }

  const tokens = generateTokens({
    id: user.id,
    email: user.email,
    role: user.role,
    department_id: user.department_id
  });

  const authorizedPortal = determineAuthorizedPortal(user.role);
  const permissions = getRolePermissions(user.role);

  // Record audit log
  const auditId = 'aud-' + crypto.randomUUID().slice(0, 8);
  db.prepare(`
    INSERT INTO audit_logs (id, incident_id, actor_id, actor_role, department_id, action, entity_type, entity_id, details, correlation_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    auditId,
    null,
    user.id,
    user.role,
    user.department_id || null,
    'USER_LOGIN',
    'USER',
    user.id,
    JSON.stringify({ email: user.email, authorizedPortal }),
    'corr-' + Date.now(),
    new Date().toISOString()
  );

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      fullName: user.full_name || `${user.first_name} ${user.last_name}`.trim(),
      role: user.role,
      departmentId: user.department_id,
      departmentName: user.department_name,
      departmentCode: user.department_code,
      badgeNumber: user.badge_number,
      phoneNumber: user.phone_number,
      emailVerified: Boolean(user.email_verified),
      phoneVerified: Boolean(user.phone_verified),
      status: user.status || 'ACTIVE',
      createdAt: user.created_at
    },
    tokens,
    authorizedPortal,
    authContext: {
      role: user.role,
      departmentId: user.department_id,
      departmentName: user.department_name,
      departmentCode: user.department_code,
      permissions
    }
  });
});

// Dedicated Department Officer Login Endpoint
authRouter.post('/department-login', (req: Request, res: Response) => {
  const { identifier, email, password } = req.body;
  const loginInput = (identifier || email || '').trim();

  if (!loginInput || !password) {
    res.status(400).json({ error: 'MISSING_CREDENTIALS', message: 'Official Email / Employee ID and password are required.' });
    return;
  }

  // Lookup by Email OR Badge Number / Employee ID
  const user = db.prepare(`
    SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, u.role, u.department_id,
           u.badge_number, u.phone_number, u.is_active,
           d.name as department_name, d.code as department_code
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE (u.email = ? COLLATE NOCASE OR u.badge_number = ? COLLATE NOCASE)
  `).get(loginInput, loginInput) as any;

  if (!user) {
    res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid official credentials or employee record.' });
    return;
  }

  // Enforce role check: RESIDENT accounts cannot log into the Department Operations Portal
  if (user.role === 'RESIDENT' || user.role === 'CITIZEN') {
    res.status(403).json({
      error: 'RESIDENT_ACCESS_DENIED',
      message: 'Access Denied: Resident accounts cannot access the Department Portal. Please use Citizen Login.'
    });
    return;
  }

  if (!user.is_active) {
    res.status(403).json({ error: 'ACCOUNT_DEACTIVATED', message: 'This official account has been suspended or deactivated.' });
    return;
  }

  const isValid = verifyPassword(password, user.password_hash);
  if (!isValid) {
    res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid official credentials or password.' });
    return;
  }

  const tokens = generateTokens({
    id: user.id,
    email: user.email,
    role: user.role,
    department_id: user.department_id
  });

  const authorizedPortal = determineAuthorizedPortal(user.role);
  const permissions = getRolePermissions(user.role);

  // Record audit log
  const auditId = 'aud-' + crypto.randomUUID().slice(0, 8);
  db.prepare(`
    INSERT INTO audit_logs (id, incident_id, actor_id, actor_role, department_id, action, entity_type, entity_id, details, correlation_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    auditId,
    null,
    user.id,
    user.role,
    user.department_id || null,
    'DEPARTMENT_OFFICER_LOGIN',
    'USER',
    user.id,
    JSON.stringify({ email: user.email, department: user.department_name, badge: user.badge_number }),
    'corr-' + Date.now(),
    new Date().toISOString()
  );

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      departmentId: user.department_id,
      departmentName: user.department_name || 'Municipal Operations',
      departmentCode: user.department_code || 'DEPT',
      badgeNumber: user.badge_number,
      phoneNumber: user.phone_number,
    },
    tokens,
    authorizedPortal: '/department',
    authContext: {
      role: user.role,
      departmentId: user.department_id,
      departmentName: user.department_name,
      departmentCode: user.department_code,
      permissions
    }
  });
});

// Password Recovery Endpoints
authRouter.post('/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  // Security standard: Never reveal if an account exists
  res.json({
    success: true,
    message: 'If an account is associated with this email address, password recovery instructions have been sent.'
  });
});

authRouter.post('/department-forgot-password', (req: Request, res: Response) => {
  const { identifier } = req.body;
  res.json({
    success: true,
    message: 'If an official account matches this identifier, password recovery has been initiated via Municipal IT Services.'
  });
});

// ==========================================
// CITIZEN MULTI-STEP OTP REGISTRATION FLOW
// ==========================================

// Step 1: Initialize Registration & Send Email OTP
authRouter.post('/register/start-verification', async (req: Request, res: Response) => {
  const { fullName, email, phoneNumber, password, confirmPassword } = req.body;

  if (!fullName || !email || !phoneNumber || !password) {
    res.status(400).json({
      error: 'MISSING_FIELDS',
      message: 'Full Name, Email Address, Mobile Number, and Password are all required.'
    });
    return;
  }

  const trimmedName = String(fullName).trim();
  const trimmedEmail = String(email).trim().toLowerCase();

  if (trimmedName.length < 2) {
    res.status(400).json({ error: 'INVALID_NAME', message: 'Please provide a valid full name.' });
    return;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    res.status(400).json({ error: 'INVALID_EMAIL', message: 'Please provide a valid email address.' });
    return;
  }

  // Validate & Normalize Indian Mobile Number
  const phoneValidation = validateAndNormalizeIndianPhone(phoneNumber);
  if (!phoneValidation.valid) {
    res.status(400).json({
      error: 'INVALID_PHONE',
      message: phoneValidation.error || 'Please provide a valid Indian mobile number.'
    });
    return;
  }
  const canonicalPhone = phoneValidation.canonical;

  // Validate password length
  if (password.length < 8) {
    res.status(400).json({ error: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters long.' });
    return;
  }

  if (confirmPassword && password !== confirmPassword) {
    res.status(400).json({ error: 'PASSWORD_MISMATCH', message: 'Passwords do not match.' });
    return;
  }

  // Duplicate checks
  const existingEmail = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(trimmedEmail);
  if (existingEmail) {
    res.status(409).json({
      error: 'EMAIL_ALREADY_EXISTS',
      message: 'This email is already registered. Please log in.'
    });
    return;
  }

  const existingPhone = db.prepare('SELECT id FROM users WHERE phone_number = ?').get(canonicalPhone);
  if (existingPhone) {
    res.status(409).json({
      error: 'PHONE_ALREADY_EXISTS',
      message: 'This mobile number is already registered. Please use another number or recover your account.'
    });
    return;
  }

  // Rate-limiting check on uncompleted sessions (max 8 sessions per 15 min)
  const recentSessions = db.prepare(`
    SELECT COUNT(*) as count FROM registration_sessions
    WHERE (email = ? COLLATE NOCASE OR phone_number = ?)
      AND created_at > datetime('now', '-15 minutes')
  `).get(trimmedEmail, canonicalPhone) as { count: number };

  if (recentSessions && recentSessions.count >= 8) {
    res.status(429).json({
      error: 'TOO_MANY_REQUESTS',
      message: 'Too many registration requests. Please wait 15 minutes before trying again.'
    });
    return;
  }

  // Generate random 6-digit Email OTP
  const emailOtp = crypto.randomInt(100000, 999999).toString();
  const sessionId = 'reg-' + crypto.randomUUID();
  const emailOtpHashed = hashOtpToken(emailOtp, sessionId);
  const now = new Date();
  const emailExpiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // 5 minutes
  const resendAvailableAt = new Date(now.getTime() + 45 * 1000).toISOString(); // 45 seconds cooldown
  const nowIso = now.toISOString();
  const passwordHash = hashPassword(password);

  // Dispatch Email OTP via configured Email Service
  const emailResult = await emailService.sendOtpEmail(trimmedEmail, emailOtp, trimmedName);
  if (!emailResult.success) {
    res.status(503).json({
      error: 'SERVICE_UNAVAILABLE',
      message: emailResult.error || 'Verification service is temporarily unavailable. Please try again later.'
    });
    return;
  }

  db.prepare(`
    INSERT INTO registration_sessions (
      id, full_name, email, phone_number, password_hash,
      email_otp_hash, email_otp_raw, email_otp_expires_at, email_verified, email_attempts,
      phone_otp_hash, phone_otp_raw, phone_otp_expires_at, phone_verified, phone_attempts,
      resend_available_at, completed, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 0, 0, NULL, NULL, NULL, 0, 0, ?, 0, ?, ?)
  `).run(
    sessionId,
    trimmedName,
    trimmedEmail,
    canonicalPhone,
    passwordHash,
    emailOtpHashed,
    emailExpiresAt,
    resendAvailableAt,
    nowIso,
    nowIso
  );

  res.json({
    success: true,
    sessionId,
    email: trimmedEmail,
    phone: canonicalPhone,
    maskedPhone: maskPhoneNumber(canonicalPhone),
    step: 'VERIFY_EMAIL',
    resendCooldownSeconds: 45,
    expiresInSeconds: 300,
    message: 'Verification code has been sent to your email address.'
  });
});

// Step 1b: Resend Email OTP
authRouter.post('/register/resend-email-otp', async (req: Request, res: Response) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    res.status(400).json({ error: 'MISSING_SESSION', message: 'Session ID is required.' });
    return;
  }

  const session = db.prepare(`
    SELECT * FROM registration_sessions WHERE id = ? AND completed = 0
  `).get(sessionId) as any;

  if (!session) {
    res.status(404).json({ error: 'SESSION_NOT_FOUND', message: 'Registration session expired or not found. Please restart.' });
    return;
  }

  if (session.email_verified) {
    res.status(400).json({ error: 'ALREADY_VERIFIED', message: 'Email has already been verified.' });
    return;
  }

  const nowTime = Date.now();
  const resendAvailTime = new Date(session.resend_available_at).getTime();
  if (resendAvailTime > nowTime) {
    const waitSeconds = Math.ceil((resendAvailTime - nowTime) / 1000);
    res.status(429).json({
      error: 'COOLDOWN_ACTIVE',
      message: `Please wait ${waitSeconds} seconds before requesting a new code.`,
      retryAfterSeconds: waitSeconds
    });
    return;
  }

  const newEmailOtp = crypto.randomInt(100000, 999999).toString();
  const newEmailOtpHashed = hashOtpToken(newEmailOtp, session.id);
  const newExpiresAt = new Date(nowTime + 5 * 60 * 1000).toISOString();
  const newResendAt = new Date(nowTime + 45 * 1000).toISOString();
  const nowIso = new Date().toISOString();

  // Dispatch Email OTP
  const emailResult = await emailService.sendOtpEmail(session.email, newEmailOtp, session.full_name);
  if (!emailResult.success) {
    res.status(503).json({
      error: 'SERVICE_UNAVAILABLE',
      message: emailResult.error || 'Verification service is temporarily unavailable. Please try again later.'
    });
    return;
  }

  db.prepare(`
    UPDATE registration_sessions
    SET email_otp_hash = ?, email_otp_raw = NULL, email_otp_expires_at = ?,
        resend_available_at = ?, email_attempts = 0, updated_at = ?
    WHERE id = ?
  `).run(newEmailOtpHashed, newExpiresAt, newResendAt, nowIso, session.id);

  res.json({
    success: true,
    sessionId: session.id,
    resendCooldownSeconds: 45,
    expiresInSeconds: 300,
    message: 'A new verification code has been sent to your email address.'
  });
});

// Step 2: Verify Email OTP & Send Phone OTP
authRouter.post('/register/verify-email', async (req: Request, res: Response) => {
  const { sessionId, otp } = req.body;

  if (!sessionId || !otp) {
    res.status(400).json({ error: 'MISSING_FIELDS', message: 'Session ID and verification code are required.' });
    return;
  }

  const session = db.prepare(`
    SELECT * FROM registration_sessions WHERE id = ? AND completed = 0
  `).get(sessionId) as any;

  if (!session) {
    res.status(404).json({ error: 'SESSION_NOT_FOUND', message: 'Registration session expired or not found. Please restart.' });
    return;
  }

  if (session.email_verified) {
    res.json({
      success: true,
      sessionId: session.id,
      emailVerified: true,
      step: 'VERIFY_PHONE',
      phone: session.phone_number,
      maskedPhone: maskPhoneNumber(session.phone_number),
      message: 'Email already verified.'
    });
    return;
  }

  if (new Date(session.email_otp_expires_at).getTime() < Date.now()) {
    res.status(400).json({ error: 'OTP_EXPIRED', message: 'The email verification code has expired. Please request a new OTP.' });
    return;
  }

  if (session.email_attempts >= 5) {
    res.status(429).json({ error: 'MAX_ATTEMPTS_EXCEEDED', message: 'Too many incorrect attempts. Please request a new OTP.' });
    return;
  }

  const cleanedOtp = String(otp || '').trim();
  const expectedHash = hashOtpToken(cleanedOtp, session.id);
  const isMatch = expectedHash === session.email_otp_hash;

  if (!isMatch) {
    db.prepare(`
      UPDATE registration_sessions
      SET email_attempts = email_attempts + 1, updated_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), session.id);

    const remaining = Math.max(0, 4 - session.email_attempts);
    res.status(400).json({
      error: 'INVALID_OTP',
      message: `Invalid email verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Please request a new OTP.'}`
    });
    return;
  }

  // Email verified! Generate Phone OTP
  const phoneOtp = crypto.randomInt(100000, 999999).toString();
  const phoneOtpHashed = hashOtpToken(phoneOtp, session.id);
  const phoneExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const phoneResendAt = new Date(Date.now() + 45 * 1000).toISOString();
  const nowIso = new Date().toISOString();

  // Dispatch SMS OTP via configured SMS service
  const smsResult = await smsService.sendOtpSms(session.phone_number, phoneOtp);
  if (!smsResult.success) {
    res.status(503).json({
      error: 'SERVICE_UNAVAILABLE',
      message: smsResult.error || 'Verification service is temporarily unavailable. Please try again later.'
    });
    return;
  }

  db.prepare(`
    UPDATE registration_sessions
    SET email_verified = 1,
        phone_otp_hash = ?,
        phone_otp_raw = NULL,
        phone_otp_expires_at = ?,
        phone_attempts = 0,
        resend_available_at = ?,
        updated_at = ?
    WHERE id = ?
  `).run(phoneOtpHashed, phoneExpiresAt, phoneResendAt, nowIso, session.id);

  res.json({
    success: true,
    sessionId: session.id,
    emailVerified: true,
    step: 'VERIFY_PHONE',
    phone: session.phone_number,
    maskedPhone: maskPhoneNumber(session.phone_number),
    resendCooldownSeconds: 45,
    expiresInSeconds: 300,
    message: 'Email verified successfully. A 6-digit verification code has been sent to your mobile phone.'
  });
});

// Step 2b: Resend Phone OTP
authRouter.post('/register/resend-phone-otp', async (req: Request, res: Response) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    res.status(400).json({ error: 'MISSING_SESSION', message: 'Session ID is required.' });
    return;
  }

  const session = db.prepare(`
    SELECT * FROM registration_sessions WHERE id = ? AND completed = 0 AND email_verified = 1
  `).get(sessionId) as any;

  if (!session) {
    res.status(404).json({ error: 'SESSION_NOT_FOUND', message: 'Registration session not found or email not yet verified.' });
    return;
  }

  if (session.phone_verified) {
    res.status(400).json({ error: 'ALREADY_VERIFIED', message: 'Mobile phone number has already been verified.' });
    return;
  }

  const nowTime = Date.now();
  const resendAvailTime = new Date(session.resend_available_at).getTime();
  if (resendAvailTime > nowTime) {
    const waitSeconds = Math.ceil((resendAvailTime - nowTime) / 1000);
    res.status(429).json({
      error: 'COOLDOWN_ACTIVE',
      message: `Please wait ${waitSeconds} seconds before requesting a new code.`,
      retryAfterSeconds: waitSeconds
    });
    return;
  }

  const newPhoneOtp = crypto.randomInt(100000, 999999).toString();
  const newPhoneOtpHashed = hashOtpToken(newPhoneOtp, session.id);
  const newExpiresAt = new Date(nowTime + 5 * 60 * 1000).toISOString();
  const newResendAt = new Date(nowTime + 45 * 1000).toISOString();
  const nowIso = new Date().toISOString();

  // Dispatch SMS OTP
  const smsResult = await smsService.sendOtpSms(session.phone_number, newPhoneOtp);
  if (!smsResult.success) {
    res.status(503).json({
      error: 'SERVICE_UNAVAILABLE',
      message: smsResult.error || 'Verification service is temporarily unavailable. Please try again later.'
    });
    return;
  }

  db.prepare(`
    UPDATE registration_sessions
    SET phone_otp_hash = ?, phone_otp_raw = NULL, phone_otp_expires_at = ?,
        resend_available_at = ?, phone_attempts = 0, updated_at = ?
    WHERE id = ?
  `).run(newPhoneOtpHashed, newExpiresAt, newResendAt, nowIso, session.id);

  res.json({
    success: true,
    sessionId: session.id,
    resendCooldownSeconds: 45,
    expiresInSeconds: 300,
    message: 'A new verification code has been sent to your mobile phone.'
  });
});

// Step 3: Verify Phone OTP & Finalize Account Creation
authRouter.post('/register/verify-phone-and-create', (req: Request, res: Response) => {
  const { sessionId, otp } = req.body;

  if (!sessionId || !otp) {
    res.status(400).json({ error: 'MISSING_FIELDS', message: 'Session ID and verification code are required.' });
    return;
  }

  const session = db.prepare(`
    SELECT * FROM registration_sessions WHERE id = ? AND completed = 0
  `).get(sessionId) as any;

  if (!session) {
    res.status(404).json({ error: 'SESSION_NOT_FOUND', message: 'Registration session expired or not found. Please restart.' });
    return;
  }

  if (!session.email_verified) {
    res.status(400).json({ error: 'EMAIL_NOT_VERIFIED', message: 'Email address must be verified before verifying phone number.' });
    return;
  }

  if (!session.phone_otp_expires_at || new Date(session.phone_otp_expires_at).getTime() < Date.now()) {
    res.status(400).json({ error: 'OTP_EXPIRED', message: 'The phone verification code has expired. Please request a new OTP.' });
    return;
  }

  if (session.phone_attempts >= 5) {
    res.status(429).json({ error: 'MAX_ATTEMPTS_EXCEEDED', message: 'Too many incorrect attempts. Please request a new OTP.' });
    return;
  }

  const cleanedOtp = String(otp || '').trim();
  const expectedHash = hashOtpToken(cleanedOtp, session.id);
  const isMatch = expectedHash === session.phone_otp_hash;

  if (!isMatch) {
    db.prepare(`
      UPDATE registration_sessions
      SET phone_attempts = phone_attempts + 1, updated_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), session.id);

    const remaining = Math.max(0, 4 - session.phone_attempts);
    res.status(400).json({
      error: 'INVALID_OTP',
      message: `Invalid phone verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Please request a new OTP.'}`
    });
    return;
  }

  // Both Email & Phone are verified!
  // Final check for duplicates
  const dupUser = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE OR phone_number = ?').get(session.email, session.phone_number);
  if (dupUser) {
    res.status(409).json({
      error: 'ACCOUNT_EXISTS',
      message: 'An account with this email or mobile number was already created. Please log in.'
    });
    return;
  }

  const userId = 'usr-res-' + crypto.randomUUID().slice(0, 8);
  const nameParts = session.full_name.trim().split(/\s+/);
  const firstName = nameParts[0] || 'Citizen';
  const lastName = nameParts.slice(1).join(' ') || '';
  const nowIso = new Date().toISOString();

  db.exec('BEGIN');
  try {
    db.prepare(`
      INSERT INTO users (
        id, email, password_hash, first_name, last_name, full_name,
        role, department_id, team_id, badge_number, phone_number,
        is_active, is_verified, email_verified, phone_verified, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'RESIDENT', NULL, NULL, NULL, ?, 1, 1, 1, 1, 'ACTIVE', ?)
    `).run(
      userId,
      session.email,
      session.password_hash,
      firstName,
      lastName,
      session.full_name,
      session.phone_number,
      nowIso
    );

    db.prepare(`
      UPDATE registration_sessions
      SET phone_verified = 1, completed = 1, updated_at = ?
      WHERE id = ?
    `).run(nowIso, session.id);

    db.prepare(`
      INSERT INTO audit_logs (id, incident_id, actor_id, actor_role, department_id, action, entity_type, entity_id, details, correlation_id, created_at)
      VALUES (?, NULL, ?, 'RESIDENT', NULL, 'CITIZEN_REGISTRATION_COMPLETED', 'USER', ?, ?, ?, ?)
    `).run(
      'aud-' + crypto.randomUUID().slice(0, 8),
      userId,
      userId,
      JSON.stringify({ email: session.email, phone: session.phone_number, fullName: session.full_name }),
      'reg-' + Date.now(),
      nowIso
    );

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  // Create personal welcome notification for new citizen
  notificationService.createNotification({
    recipient_user_id: userId,
    recipient_role: 'RESIDENT',
    notification_type: 'SYSTEM_ALERT',
    title: 'Welcome to CivicConnect',
    message: 'Your citizen account has been successfully verified and activated. You can now submit and track civic reports in your ward.',
    priority: 'LOW'
  });

  const tokens = generateTokens({ id: userId, email: session.email, role: 'RESIDENT', department_id: null });

  res.status(201).json({
    success: true,
    message: 'Citizen account successfully created and activated.',
    user: {
      id: userId,
      fullName: session.full_name,
      firstName,
      lastName,
      email: session.email,
      phoneNumber: session.phone_number,
      role: 'RESIDENT',
      emailVerified: true,
      phoneVerified: true,
      status: 'ACTIVE',
      createdAt: nowIso
    },
    tokens,
    authorizedPortal: '/resident',
    authContext: {
      role: 'RESIDENT',
      departmentId: null,
      permissions: getRolePermissions('RESIDENT')
    }
  });
});

// Single-step fallback registration endpoint (maintains backwards compatibility)
authRouter.post('/register', (req: Request, res: Response) => {
  const { email, password, firstName, lastName, fullName, phoneNumber } = req.body;

  if (!email || !password || (!firstName && !fullName)) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Email, password, and name are required.' });
    return;
  }

  const trimmedEmail = String(email).trim().toLowerCase();
  const trimmedPhone = phoneNumber ? String(phoneNumber).trim() : null;

  const existingEmail = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(trimmedEmail);
  if (existingEmail) {
    res.status(409).json({ error: 'EMAIL_ALREADY_EXISTS', message: 'This email is already registered. Please log in.' });
    return;
  }

  if (trimmedPhone) {
    const existingPhone = db.prepare('SELECT id FROM users WHERE phone_number = ?').get(trimmedPhone);
    if (existingPhone) {
      res.status(409).json({ error: 'PHONE_ALREADY_EXISTS', message: 'This phone number is already registered.' });
      return;
    }
  }

  const userId = 'usr-res-' + crypto.randomUUID().slice(0, 8);
  const passwordHash = hashPassword(password);
  const now = new Date().toISOString();
  const calculatedFullName = fullName || `${firstName || ''} ${lastName || ''}`.trim() || 'Citizen';
  const nameParts = calculatedFullName.split(/\s+/);
  const fName = firstName || nameParts[0] || 'Citizen';
  const lName = lastName || nameParts.slice(1).join(' ') || '';

  db.prepare(`
    INSERT INTO users (
      id, email, password_hash, first_name, last_name, full_name,
      role, department_id, team_id, badge_number, phone_number,
      is_active, is_verified, email_verified, phone_verified, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'RESIDENT', NULL, NULL, NULL, ?, 1, 1, 1, 1, 'ACTIVE', ?)
  `).run(userId, trimmedEmail, passwordHash, fName, lName, calculatedFullName, trimmedPhone, now);

  const tokens = generateTokens({ id: userId, email: trimmedEmail, role: 'RESIDENT', department_id: null });

  res.status(201).json({
    success: true,
    user: {
      id: userId,
      email: trimmedEmail,
      firstName: fName,
      lastName: lName,
      fullName: calculatedFullName,
      role: 'RESIDENT',
      phoneNumber: trimmedPhone,
      emailVerified: true,
      phoneVerified: true,
      status: 'ACTIVE',
      createdAt: now
    },
    tokens,
    authorizedPortal: '/resident',
    authContext: {
      role: 'RESIDENT',
      departmentId: null,
      permissions: getRolePermissions('RESIDENT')
    }
  });
});

// Current User Profile Endpoint
authRouter.get('/me', authenticateToken, (req: Request, res: Response) => {
  res.json({
    user: req.user,
    authorizedPortal: determineAuthorizedPortal(req.user!.role),
    authContext: {
      role: req.user!.role,
      departmentId: req.user!.departmentId,
      departmentName: req.user!.departmentName,
      departmentCode: req.user!.departmentCode,
      permissions: req.user!.permissions
    }
  });
});

// List Available Personas for Demo/Testing
authRouter.get('/personas', (req: Request, res: Response) => {
  const users = db.prepare(`
    SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.department_id, u.badge_number,
           d.name as department_name, d.code as department_code
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.is_active = 1
    ORDER BY u.role, u.first_name
  `).all();

  res.json({
    personas: users.map((u: any) => ({
      id: u.id,
      email: u.email,
      name: `${u.first_name} ${u.last_name}`,
      role: u.role,
      departmentId: u.department_id,
      departmentName: u.department_name,
      departmentCode: u.department_code,
      badgeNumber: u.badge_number,
      targetPortal: determineAuthorizedPortal(u.role)
    }))
  });
});

// Switch Persona Endpoint
authRouter.post('/switch-persona', (req: Request, res: Response) => {
  const { email } = req.body;
  const user = db.prepare(`
    SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.department_id,
           u.badge_number, u.phone_number,
           d.name as department_name, d.code as department_code
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.email = ? COLLATE NOCASE
  `).get(email) as any;

  if (!user) {
    res.status(404).json({ error: 'PERSONA_NOT_FOUND', message: 'Target persona user not found.' });
    return;
  }

  const tokens = generateTokens({
    id: user.id,
    email: user.email,
    role: user.role,
    department_id: user.department_id
  });

  const authorizedPortal = determineAuthorizedPortal(user.role);

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      departmentId: user.department_id,
      departmentName: user.department_name,
      departmentCode: user.department_code,
      badgeNumber: user.badge_number,
      phoneNumber: user.phone_number,
    },
    tokens,
    authorizedPortal,
    authContext: {
      role: user.role,
      departmentId: user.department_id,
      departmentName: user.department_name,
      departmentCode: user.department_code,
      permissions: getRolePermissions(user.role)
    }
  });
});
