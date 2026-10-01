import React, { useState, useEffect } from 'react';
import { PublicLandingPage } from './PublicLandingPage';
import { CitizenLoginPage } from './CitizenLoginPage';
import { DepartmentLoginPage } from './DepartmentLoginPage';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { CitizenRegistrationFlow } from './CitizenRegistrationFlow';

export type AuthView =
  | 'landing'
  | 'citizen_login'
  | 'citizen_register'
  | 'department_login'
  | 'citizen_forgot_password'
  | 'department_forgot_password';

interface LoginPageProps {
  initialView?: AuthView;
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  initialView = 'landing',
  onSuccess
}) => {
  const [currentView, setCurrentView] = useState<AuthView>(initialView);

  // Sync with initialView prop changes
  useEffect(() => {
    if (initialView) {
      setCurrentView(initialView);
    }
  }, [initialView]);

  return (
    <>
      {/* 1. Main CivicConnect Landing / Public Entry Page */}
      {currentView === 'landing' && (
        <PublicLandingPage
          onSelectCitizen={() => setCurrentView('citizen_login')}
          onSelectDepartment={() => setCurrentView('department_login')}
        />
      )}

      {/* 2. Citizen Login (Route: /login) */}
      {currentView === 'citizen_login' && (
        <CitizenLoginPage
          onSuccess={onSuccess}
          onNavigateLanding={() => setCurrentView('landing')}
          onNavigateForgotPassword={() => setCurrentView('citizen_forgot_password')}
          onNavigateRegister={() => setCurrentView('citizen_register')}
        />
      )}

      {/* 2b. Citizen Registration Flow */}
      {currentView === 'citizen_register' && (
        <CitizenRegistrationFlow
          onBackToLogin={() => setCurrentView('citizen_login')}
          onSuccess={() => {
            if (onSuccess) onSuccess();
          }}
        />
      )}

      {/* 3. Department Operations Portal Login (Route: /department/login) */}
      {currentView === 'department_login' && (
        <DepartmentLoginPage
          onSuccess={onSuccess}
          onNavigateLanding={() => setCurrentView('landing')}
          onNavigateForgotPassword={() => setCurrentView('department_forgot_password')}
          onNavigateCitizenLogin={() => setCurrentView('citizen_login')}
        />
      )}

      {/* 4. Citizen Forgot Password (Route: /forgot-password) */}
      {currentView === 'citizen_forgot_password' && (
        <ForgotPasswordPage
          isDepartment={false}
          onBackToLogin={() => setCurrentView('citizen_login')}
        />
      )}

      {/* 5. Department Forgot Password (Route: /department/forgot-password) */}
      {currentView === 'department_forgot_password' && (
        <ForgotPasswordPage
          isDepartment={true}
          onBackToLogin={() => setCurrentView('department_login')}
        />
      )}
    </>
  );
};
