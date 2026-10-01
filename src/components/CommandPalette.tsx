import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, ArrowRight, Shield, Layers, Users, Zap, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tabId: string) => void;
  onOpenDdl: () => void;
}

interface CommandItem {
  id: string;
  category: 'NAVIGATION' | 'PERSONA' | 'ACTION';
  label: string;
  subtitle: string;
  badge?: string;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenDdl
}) => {
  const { switchMockPersona, user } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const commands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-dept',
      category: 'NAVIGATION',
      label: 'Department Command Center',
      subtitle: 'Real-time municipal triage, priority queue, map and assignments',
      badge: 'DEPT',
      action: () => { onNavigate('portal_department'); onClose(); }
    },
    {
      id: 'nav-resident',
      category: 'NAVIGATION',
      label: 'Resident Civic Portal',
      subtitle: 'Report civic issues, track own reports, neighborhood map',
      badge: 'RESIDENT',
      action: () => { onNavigate('portal_resident'); onClose(); }
    },
    {
      id: 'nav-admin',
      category: 'NAVIGATION',
      label: 'Admin Control Plane',
      subtitle: 'User provisioning, department configurations, SLA policies',
      badge: 'ADMIN',
      action: () => { onNavigate('portal_admin'); onClose(); }
    },
    {
      id: 'nav-security-tests',
      category: 'NAVIGATION',
      label: 'Security & Isolation Test Suite',
      subtitle: 'Execute live 6-point server isolation and OCC conflict assertions',
      badge: 'TEST',
      action: () => { onNavigate('portal_security_tests'); onClose(); }
    },
    {
      id: 'nav-recurring',
      category: 'NAVIGATION',
      label: 'Recurring Problem Intelligence',
      subtitle: 'Geographic clustering and repeated municipal failure patterns',
      badge: 'INTEL',
      action: () => { onNavigate('recurring_problems'); onClose(); }
    },
    {
      id: 'nav-sla',
      category: 'NAVIGATION',
      label: 'SLA & Escalation Engine',
      subtitle: 'Response and resolution countdown timers with automated warnings',
      badge: 'OPS',
      action: () => { onNavigate('sla_engine'); onClose(); }
    },

    // Persona Quick-Switch
    {
      id: 'persona-thorne',
      category: 'PERSONA',
      label: 'Switch to Officer Marcus Thorne (Public Works)',
      subtitle: 'Public Works triage officer • DPW queue and priority routing',
      badge: 'DPW',
      action: async () => {
        await switchMockPersona('officer.thorne@civicconnect.gov');
        onNavigate('portal_department');
        onClose();
      }
    },
    {
      id: 'persona-vance',
      category: 'PERSONA',
      label: 'Switch to Officer James Vance (Transportation)',
      subtitle: 'Transportation department officer • DOT queue and road repairs',
      badge: 'DOT',
      action: async () => {
        await switchMockPersona('officer.vance@civicconnect.gov');
        onNavigate('portal_department');
        onClose();
      }
    },
    {
      id: 'persona-patel',
      category: 'PERSONA',
      label: 'Switch to Officer Priya Patel (Waste Management)',
      subtitle: 'Waste management officer • DSWM sanitation and illegal dumping',
      badge: 'DSWM',
      action: async () => {
        await switchMockPersona('officer.patel@civicconnect.gov');
        onNavigate('portal_department');
        onClose();
      }
    },
    {
      id: 'persona-elena',
      category: 'PERSONA',
      label: 'Switch to Elena Rostova (Citizen / Resident)',
      subtitle: 'Civic resident persona • Restricted to resident portal',
      badge: 'CITIZEN',
      action: async () => {
        await switchMockPersona('citizen.elena@gmail.com');
        onNavigate('portal_resident');
        onClose();
      }
    },
    {
      id: 'persona-admin',
      category: 'PERSONA',
      label: 'Switch to Sarah Jenkins (City Administrator)',
      subtitle: 'Full administrative access across all municipal operations',
      badge: 'ADMIN',
      action: async () => {
        await switchMockPersona('admin@civicconnect.gov');
        onNavigate('portal_admin');
        onClose();
      }
    },

    // Actions
    {
      id: 'action-ddl',
      category: 'ACTION',
      label: 'Export Relational Schema (PostgreSQL / SQLite DDL)',
      subtitle: 'View raw database definitions with constraints and triggers',
      badge: 'SQL',
      action: () => { onOpenDdl(); onClose(); }
    }
  ];

  const filtered = commands.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.subtitle.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#000000]/60 backdrop-blur-[2px] flex items-start justify-center pt-24 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#FFFFFF] border border-[#000000] shadow-[0_12px_40px_rgba(0,0,0,0.15)] rounded-[4px] overflow-hidden"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Command Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#E5E5E5] bg-[#FAFAFA]">
          <Search className="w-4 h-4 text-[#666666] mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Type a command, portal, persona, or action..."
            className="w-full bg-transparent text-[#000000] placeholder-[#8A8A8A] text-sm focus:outline-none font-sans"
          />
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <span className="px-1.5 py-0.5 text-[10px] font-mono border border-[#D4D4D4] bg-[#FFFFFF] text-[#666666] rounded-[2px]">
              ESC
            </span>
            <button onClick={onClose} className="p-1 hover:text-[#000000] text-[#8A8A8A]">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Command List */}
        <div className="max-h-[380px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center text-[#666666] text-xs">
              No operational commands found matching &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-4 py-2.5 mx-2 cursor-pointer flex items-center justify-between rounded-[2px] transition-colors duration-100 ${
                    isSelected ? 'bg-[#000000] text-[#FFFFFF]' : 'text-[#000000] hover:bg-[#F5F5F5]'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] border ${
                      isSelected
                        ? 'border-[#404040] bg-[#171717] text-[#FFFFFF]'
                        : 'border-[#E5E5E5] bg-[#F5F5F5] text-[#666666]'
                    }`}>
                      {item.badge}
                    </span>
                    <div className="truncate">
                      <div className="text-xs font-medium tracking-tight truncate">{item.label}</div>
                      <div className={`text-[11px] truncate ${isSelected ? 'text-[#BDBDBD]' : 'text-[#666666]'}`}>
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className={`w-3.5 h-3.5 shrink-0 ml-3 ${isSelected ? 'text-[#FFFFFF]' : 'text-[#BDBDBD]'}`} />
                </div>
              );
            })
          )}
        </div>

        {/* Command Footer */}
        <div className="px-4 py-2 bg-[#F5F5F5] border-t border-[#E5E5E5] flex items-center justify-between text-[11px] text-[#666666] font-mono">
          <div className="flex items-center gap-3">
            <span>&uarr;&darr; Navigate</span>
            <span>&crarr; Execute</span>
            <span>ESC Close</span>
          </div>
          <div>
            Current Actor: <strong className="text-[#000000]">{user?.email || 'Anonymous'}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
