import { UserRole } from './auth';

export type ControlledIncidentStatus =
  | 'REPORTED'
  | 'PROCESSING'
  | 'VALIDATING'
  | 'VALIDATION_FAILED'
  | 'CLASSIFIED'
  | 'INVESTIGATING'
  | 'ROUTED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'ESCALATED'
  | 'RESOLUTION_SUBMITTED'
  | 'VERIFYING'
  | 'VERIFIED'
  | 'CLOSED'
  | 'REJECTED'
  | 'REOPENED'
  | 'DUPLICATE';

export type IncidentPriority = 'P1_CRITICAL' | 'P2_HIGH' | 'P3_MEDIUM' | 'P4_LOW';

export type IncidentSeverity = 'CATASTROPHIC' | 'SEVERE' | 'MODERATE' | 'MINOR' | 'NEGLIGIBLE';

export type IncidentRelationshipType =
  | 'DUPLICATE_OF'
  | 'PARENT_OF'
  | 'CHILD_OF'
  | 'CAUSED_BY'
  | 'CO_LOCATED_WITH';

export type ActorType = 'CITIZEN' | 'AUTHORITY_OFFICER' | 'FIELD_WORKER' | 'ADMINISTRATOR' | 'AI_AGENT' | 'SYSTEM_CRON';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  address?: string;
  postalCode?: string;
  wardCode?: string;
  confidenceRadiusMeters?: number;
}

export interface IncidentEvidence {
  id: string;
  incidentId: string;
  uploaderId: string;
  uploaderRole: UserRole | 'SYSTEM';
  fileType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'SENSOR_DATA' | 'DOCUMENT';
  mediaUrl: string;
  caption?: string;
  capturedAt: string;
  gpsCoordinates?: { lat: number; lng: number };
  hashSha256: string;
  isVerifiedAuthentic: boolean;
  uploadedAt: string;
}

export interface IncidentRelationship {
  id: string;
  sourceIncidentId: string;
  targetIncidentId: string;
  relationshipType: IncidentRelationshipType;
  confidenceScore: number; // 0.00 to 1.00
  establishedBy: ActorType;
  establishedById?: string;
  notes?: string;
  createdAt: string;
}

export interface SlaInformation {
  policyId: string;
  policyName: string;
  targetAckMinutes: number;
  targetTriageMinutes: number;
  targetResolutionHours: number;
  ackDeadline: string;
  triageDeadline: string;
  resolutionDeadline: string;
  acknowledgedAt?: string | null;
  triagedAt?: string | null;
  resolvedAt?: string | null;
  isBreached: boolean;
  breachReason?: string | null;
}

export interface IncidentHistoryRecord {
  id: string;
  incidentId: string;
  timestamp: string;
  correlationId: string;
  actorType: ActorType;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  source: 'WEB_UI' | 'REST_API' | 'AGENT_WORKFLOW' | 'BACKGROUND_CRON' | 'CITIZEN_PORTAL';
  action: 'CREATED' | 'STATUS_TRANSITION' | 'ATTRIBUTE_UPDATED' | 'EVIDENCE_ATTACHED' | 'RELATIONSHIP_ESTABLISHED' | 'SLA_BREACH_TRIGGERED';
  fieldName?: string;
  previousValue: unknown;
  newValue: unknown;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentStructuredRecommendation {
  recommendationId: string;
  agentName: string;
  agentRole: 'TRIAGE_SPECIALIST' | 'DEDUPLICATION_ENGINE' | 'PRIORITY_ANALYZER' | 'DISPATCH_COORDINATOR' | 'RESOLUTION_VERIFIER';
  modelId: string;
  confidence: number; // 0.0 - 1.0
  proposedStatusTransition?: ControlledIncidentStatus;
  proposedCategory?: string;
  proposedDepartmentId?: string;
  proposedDepartmentName?: string;
  proposedPriority?: IncidentPriority;
  proposedSeverity?: IncidentSeverity;
  duplicateCandidateId?: string;
  duplicateSimilarityScore?: number;
  reasoning: string;
  generatedAt: string;
}

export interface CivicIncident {
  id: string;
  trackingNumber: string;
  title: string;
  description: string;
  observedProblem?: string;
  objectType?: string;
  context?: string;
  visibleRisk?: string;
  potentialImpact?: string;
  routingConfidence?: number;
  requiresAdminReview?: boolean;
  aiObservationJson?: string;
  status: ControlledIncidentStatus;
  category: string;
  priority: IncidentPriority;
  severity: IncidentSeverity;
  confidenceScore: number; // Cognitive layer confidence 0.00 - 1.00
  location: GeoLocation;
  
  // Ownership & Identity
  citizenAuthorId: string;
  citizenAuthorEmail: string;
  citizenAuthorName: string;
  isCitizenVerified: boolean;

  // Department & Team Assignment
  departmentId?: string | null;
  departmentName?: string | null;
  assignedTeamId?: string | null;
  assignedTeamName?: string | null;
  assignedWorkerId?: string | null;
  assignedWorkerName?: string | null;

  // Hierarchical & Duplicate Relationships
  parentIncidentId?: string | null;
  duplicateOfIncidentId?: string | null;
  childIncidentIds: string[];
  duplicateIncidentIds: string[];

  // SLA
  sla: SlaInformation;

  // Evidence
  evidence: IncidentEvidence[];

  // Resolution Details
  resolutionSummary?: string | null;
  resolutionEvidenceUrl?: string | null;
  resolutionSubmittedAt?: string | null;
  citizenVerifiedAt?: string | null;
  reopenReason?: string | null;
  reopenCount: number;
  escalationCount: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
}

export interface TransitionValidationResult {
  isValid: boolean;
  errorCode?: string;
  errorMessage?: string;
  allowedRoles: ActorType[];
  preconditionsSatisfied: boolean;
  missingRequirements?: string[];
}
