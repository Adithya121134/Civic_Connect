import React from 'react';
import { Building2, Users, ArrowRight, ShieldCheck, CheckCircle2, ChevronRight, Activity } from 'lucide-react';
import { CivicLogo } from '../CivicLogo';

interface PublicLandingPageProps {
  onSelectCitizen: () => void;
  onSelectDepartment: () => void;
}

export const PublicLandingPage: React.FC<PublicLandingPageProps> = ({
  onSelectCitizen,
  onSelectDepartment
}) => {
  return (
    <div className="min-h-screen w-full bg-[#FFFFFF] text-[#111111] flex flex-col justify-between font-sans selection:bg-[#111111] selection:text-[#FFFFFF]">
      {/* Top Navbar */}
      <header className="border-b border-[#E5E5E5] px-6 sm:px-12 py-4 flex items-center justify-between">
        <CivicLogo variant="dark" size="md" subtitle="Smart Civic Services" />
        <div className="flex items-center space-x-3 text-xs font-mono text-[#71717A]">
          <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
          <span>Municipal Operations Online</span>
        </div>
      </header>

      {/* Main Hero Container */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-4xl space-y-12">
          {/* Header Block */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#FAFAFA] border border-[#E5E5E5] text-xs font-mono text-[#52525B]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#111111]" />
              <span>Unified Municipal Management Platform</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#111111] leading-[1.1]">
              CivicConnect
            </h1>
            <p className="text-base sm:text-lg text-[#71717A] leading-relaxed">
              Smart Civic Services for citizens and dedicated operational command for municipal department officers.
            </p>
          </div>

          {/* Two Distinct Portal Entry Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Card 1: Citizen Login */}
            <div
              onClick={onSelectCitizen}
              className="group p-8 bg-[#FFFFFF] border border-[#E5E5E5] hover:border-[#111111] rounded-xl cursor-pointer transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between space-y-8"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5] text-[#111111] flex items-center justify-center group-hover:bg-[#111111] group-hover:text-[#FFFFFF] transition-colors">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#111111] tracking-tight">Citizen Login</h2>
                  <p className="text-sm text-[#71717A] mt-1">
                    For residents and citizens
                  </p>
                </div>
                <p className="text-xs text-[#52525B] leading-relaxed">
                  Report civic issues, track real-time resolution status, submit feedback, and improve neighborhood infrastructure.
                </p>
              </div>

              <button
                id="landing-btn-citizen-login"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCitizen();
                }}
                className="w-full py-3 px-4 bg-[#111111] hover:bg-[#27272A] text-[#FFFFFF] font-semibold text-xs rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <span>Access Citizen Portal</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Card 2: Department Login */}
            <div
              onClick={onSelectDepartment}
              className="group p-8 bg-[#FFFFFF] border border-[#E5E5E5] hover:border-[#111111] rounded-xl cursor-pointer transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between space-y-8"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5] text-[#111111] flex items-center justify-center group-hover:bg-[#111111] group-hover:text-[#FFFFFF] transition-colors">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#111111] tracking-tight">Department Login</h2>
                  <p className="text-sm text-[#71717A] mt-1">
                    For municipal department officers
                  </p>
                </div>
                <p className="text-xs text-[#52525B] leading-relaxed">
                  Operational incident command, field crew dispatch, SLA escalation monitoring, and material resource management.
                </p>
              </div>

              <button
                id="landing-btn-dept-login"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDepartment();
                }}
                className="w-full py-3 px-4 bg-[#111111] hover:bg-[#27272A] text-[#FFFFFF] font-semibold text-xs rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <span>Access Department Operations</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Security & Integrity Note */}
          <div className="pt-6 border-t border-[#F4F4F5] flex flex-col sm:flex-row items-center justify-between text-xs text-[#71717A] gap-2">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>Role-Based Municipal Access Enforcement Active</span>
            </div>
            <div className="font-mono text-[11px]">
              CivicConnect Operating System v2.6
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E5E5] px-6 sm:px-12 py-4 text-center text-xs text-[#A1A1AA]">
        &copy; {new Date().getFullYear()} CivicConnect Municipal Governance Platform. Authorized official use.
      </footer>
    </div>
  );
};
