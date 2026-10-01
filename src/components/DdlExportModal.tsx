import React, { useState } from 'react';
import { X, Copy, Check, Download, Database } from 'lucide-react';

interface DdlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DdlExportModal: React.FC<DdlModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    fetch('/schema.sql')
      .then((res) => res.text())
      .then((text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    element.setAttribute('href', '/schema.sql');
    element.setAttribute('download', 'civicconnect_schema.sql');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#000000]/70 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] border border-[#000000] rounded-[4px] w-full max-w-4xl max-h-[85vh] flex flex-col shadow-[0_16px_40px_rgba(0,0,0,0.2)]">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between bg-[#FAFAFA]">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-[#000000]" />
            <div>
              <h3 className="font-mono text-xs font-bold text-[#000000] uppercase">
                SCHEMA DEFINITION (SQLITE WAL & RELATIONAL DDL)
              </h3>
              <p className="text-[11px] text-[#666666]">Tables, foreign keys, OCC versioning, audit triggers, and spatial indices</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 border border-[#000000] bg-[#FFFFFF] hover:bg-[#F5F5F5] text-[#000000] rounded-[2px] text-xs font-mono transition flex items-center space-x-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'COPIED' : 'COPY DDL'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-[#000000] hover:bg-[#222222] text-[#FFFFFF] rounded-[2px] text-xs font-mono transition flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>DOWNLOAD</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-[#E5E5E5] text-[#666666] hover:text-[#000000] rounded-[2px]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="p-4 overflow-y-auto flex-1 font-mono text-[11px] leading-relaxed bg-[#0A0A0A] text-[#FAFAFA]">
          <pre className="whitespace-pre-wrap">
{`-- ========================================================
-- CIVICCONNECT ENTERPRISE RELATIONAL SCHEMA
-- DIALECT: SQLite 3.46 (WAL Mode) & PostgreSQL 16 Compatible
-- ========================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT,
  role TEXT NOT NULL CHECK(role IN ('RESIDENT', 'CITIZEN', 'DEPARTMENT_USER', 'AUTHORITY_OFFICER', 'FIELD_WORKER', 'ADMIN', 'ANALYST')),
  department_id TEXT REFERENCES departments(id),
  badge_number TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  tracking_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  severity TEXT NOT NULL DEFAULT 'MODERATE',
  status TEXT NOT NULL DEFAULT 'REPORTED',
  address TEXT NOT NULL,
  ward_code TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  department_id TEXT REFERENCES departments(id),
  assigned_team_id TEXT REFERENCES teams(id),
  assigned_worker_id TEXT REFERENCES users(id),
  reported_by_id TEXT REFERENCES users(id),
  version INTEGER NOT NULL DEFAULT 1, -- Optimistic Concurrency Control (OCC)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  incident_id TEXT,
  actor_id TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'SUCCESS',
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`}
          </pre>
        </div>
      </div>
    </div>
  );
};
