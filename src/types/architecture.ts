export type UserRole = 'CITIZEN' | 'AUTHORITY_OFFICER' | 'FIELD_WORKER' | 'ADMINISTRATOR';

export type IncidentState = 
  | 'REPORTED'
  | 'TRIAGED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WORK_REVIEW'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REJECTED'
  | 'MERGED_DUPLICATE';

export type PriorityLevel = 'P1_CRITICAL' | 'P2_HIGH' | 'P3_MEDIUM' | 'P4_LOW';

export interface ColumnDef {
  name: string;
  type: string;
  isPk?: boolean;
  isFk?: boolean;
  fkTarget?: string;
  isNullable?: boolean;
  isSpatial?: boolean;
  description: string;
}

export interface TableDef {
  id: string;
  name: string;
  domain: string;
  purpose: string;
  isAppendOnly?: boolean;
  hasSpatial?: boolean;
  columns: ColumnDef[];
  indexes: string[];
  constraints: string[];
}

export interface AgentSpec {
  id: string;
  name: string;
  role: string;
  model: string;
  confidenceThreshold: number;
  inputContext: string[];
  outputSchema: string[];
  deterministicGuardrail: string;
  hitlCondition: string;
}

export interface SimulatedIncident {
  id: string;
  trackingNumber: string;
  title: string;
  description: string;
  category: string;
  state: IncidentState;
  priority: PriorityLevel;
  department: string;
  lat: number;
  lng: number;
  distanceFromCandidate?: number;
  isDuplicate?: boolean;
  duplicateOf?: string;
  confidence: number;
  reasoning: string;
  assignedOfficer?: string;
  assignedWorker?: string;
  slaDeadline: string;
  slaStatus: 'ACTIVE' | 'WARNING' | 'BREACHED' | 'MET';
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  entityName: string;
  entityId: string;
  action: string;
  actorType: 'HUMAN_USER' | 'AGENT_SYSTEM' | 'CRON_SCHEDULER';
  actorName: string;
  preState: string;
  postState: string;
  reason: string;
}
