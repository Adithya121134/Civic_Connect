import { UserRole, Permission } from '../types/auth';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  RESIDENT: [
    'incident:create',
    'incident:view_own',
    'incident:upload_evidence',
    'incident:confirm_resolution',
    'incident:request_reopen',
    'profile:view_own',
    'profile:update_own',
  ],
  CITIZEN: [
    'incident:create',
    'incident:view_own',
    'incident:upload_evidence',
    'incident:confirm_resolution',
    'incident:request_reopen',
    'profile:view_own',
    'profile:update_own',
  ],
  DEPARTMENT_USER: [
    'incident:view_department',
    'incident:assign_work',
    'incident:update_workflow',
    'incident:approve_recommendations',
    'incident:submit_escalation',
    'profile:view_own',
    'profile:update_own',
  ],
  AUTHORITY_OFFICER: [
    'incident:view_department',
    'incident:assign_work',
    'incident:update_workflow',
    'incident:approve_recommendations',
    'incident:submit_escalation',
    'profile:view_own',
    'profile:update_own',
  ],
  FIELD_WORKER: [
    'work:view_assigned',
    'work:update_progress',
    'work:submit_evidence',
    'profile:view_own',
    'profile:update_own',
  ],
  ADMIN: [
    'admin:manage_users',
    'admin:manage_departments',
    'admin:manage_teams',
    'admin:manage_config',
    'admin:access_audit',
    // Admins have systemic management capabilities
    'incident:view_department',
    'profile:view_own',
    'profile:update_own',
  ],
};

export const PERMISSION_DESCRIPTIONS: Record<Permission, { label: string; description: string; domain: string }> = {
  'incident:create': {
    label: 'Create Incident',
    description: 'Submit new civic observations and hazards into the system',
    domain: 'Citizen Operations',
  },
  'incident:view_own': {
    label: 'View Own Incidents',
    description: 'Track the status and progress of incidents reported by the logged-in citizen',
    domain: 'Citizen Operations',
  },
  'incident:upload_evidence': {
    label: 'Upload Evidence',
    description: 'Attach photos and metadata to citizen reports',
    domain: 'Citizen Operations',
  },
  'incident:confirm_resolution': {
    label: 'Confirm Resolution',
    description: 'Participate in citizen reverification voting to validate completed work',
    domain: 'Citizen Operations',
  },
  'incident:request_reopen': {
    label: 'Request Reopening',
    description: 'Contest an inadequate resolution within the 7-day grace window',
    domain: 'Citizen Operations',
  },
  'incident:view_department': {
    label: 'View Assigned Department Incidents',
    description: 'Access triage queue and live incidents within jurisdictional department boundary',
    domain: 'Officer Authority',
  },
  'incident:assign_work': {
    label: 'Assign Work',
    description: 'Allocate incidents to response teams and field workers',
    domain: 'Officer Authority',
  },
  'incident:update_workflow': {
    label: 'Update Workflow',
    description: 'Transition incident states through the deterministic lifecycle',
    domain: 'Officer Authority',
  },
  'incident:approve_recommendations': {
    label: 'Approve AI Recommendations',
    description: 'Review and sign off on cognitive triage, deduplication, and priority suggestions',
    domain: 'Officer Authority',
  },
  'incident:submit_escalation': {
    label: 'Submit Escalation Decisions',
    description: 'Escalate stagnant or SLA-critical incidents to director level',
    domain: 'Officer Authority',
  },
  'work:view_assigned': {
    label: 'View Assigned Work',
    description: 'Access field worker dispatched work order queue and location route',
    domain: 'Field Operations',
  },
  'work:update_progress': {
    label: 'Update Work Progress',
    description: 'Acknowledge dispatch, mark on-site arrival, and update labor status',
    domain: 'Field Operations',
  },
  'work:submit_evidence': {
    label: 'Submit Resolution Evidence',
    description: 'Upload post-repair before/after verification photos and materials checklist',
    domain: 'Field Operations',
  },
  'admin:manage_users': {
    label: 'Manage Users',
    description: 'Activate, deactivate, invite, and assign privileged roles (Officer/Worker/Admin)',
    domain: 'Administration',
  },
  'admin:manage_departments': {
    label: 'Manage Departments',
    description: 'Configure municipal agencies, codes, and PostGIS jurisdiction boundaries',
    domain: 'Administration',
  },
  'admin:manage_teams': {
    label: 'Manage Teams',
    description: 'Create and assign operational units within departments',
    domain: 'Administration',
  },
  'admin:manage_config': {
    label: 'Manage System Configuration',
    description: 'Configure SLA policies, rate limits, and password complexity parameters',
    domain: 'Administration',
  },
  'admin:access_audit': {
    label: 'Access Audit Information',
    description: 'Inspect immutable append-only audit ledgers, security telemetry, and token revocations',
    domain: 'Administration',
  },
  'profile:view_own': {
    label: 'View Own Profile',
    description: 'Inspect personal identity, contact details, and active session tokens',
    domain: 'General',
  },
  'profile:update_own': {
    label: 'Update Own Profile',
    description: 'Update phone number and notification preferences',
    domain: 'General',
  },
};

export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
}

export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.some((perm) => hasPermission(userRole, perm));
}

export function hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.every((perm) => hasPermission(userRole, perm));
}
