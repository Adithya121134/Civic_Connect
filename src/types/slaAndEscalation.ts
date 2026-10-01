import { IncidentPriority, ControlledIncidentStatus } from './incident';

export type SlaTrackingState =
  | 'HEALTHY'          // Normal operating range (< warningThresholdPercent)
  | 'WARNING_APPROACHING' // Between warning threshold (e.g. 75%) and deadline
  | 'BREACHED'         // Deadline exceeded, active ticket unresolved
  | 'FULFILLED'        // Resolved prior to deadline
  | 'RESOLVED_LATE';   // Resolved after SLA deadline had passed

export type EscalationLevel =
  | 'LEVEL_0_STANDARD'
  | 'LEVEL_1_SUPERVISOR_ALERT'
  | 'LEVEL_2_DIVISION_CHIEF'
  | 'LEVEL_3_DIRECTOR_INTERVENTION';

export interface SlaDepartmentPolicy {
  departmentId: string;
  departmentCode: string;
  priorityTargetsHours: Record<IncidentPriority, number>;
  warningThresholdPercent: number; // e.g., 0.75 (75% elapsed)
  businessHoursOnly: boolean; // 24/7 emergency vs municipal business calendar
  escalationRecipients: {
    level1Role: string;
    level2Role: string;
    level3Role: string;
  };
}

export interface IncidentSlaRecord {
  id: string;
  incidentId: string;
  trackingNumber: string;
  departmentId: string;
  priority: IncidentPriority;
  status: ControlledIncidentStatus;
  
  // Timing parameters (epoch ms for high-precision deterministic comparisons)
  startTimeMs: number;
  deadlineMs: number;
  totalDurationMs: number;
  warningTimeMs: number;
  
  // Evaluation snapshot
  trackingState: SlaTrackingState;
  elapsedMs: number;
  elapsedPercent: number; // 0.0 to 100.0+
  remainingMs: number;
  
  // Breach & Escalation parameters
  isBreached: boolean;
  breachRecordedAtMs?: number;
  currentEscalationLevel: EscalationLevel;
  lastEscalatedAtMs?: number;
  lastEvaluationTimestampMs: number;
  
  // Resolution details
  resolvedAtMs?: number;
}

export interface EscalationAuditEntry {
  id: string;
  slaRecordId: string;
  incidentId: string;
  trackingNumber: string;
  fromLevel: EscalationLevel;
  toLevel: EscalationLevel;
  triggerReason: 'WARNING_THRESHOLD_EXCEEDED' | 'DEADLINE_BREACH_DETECTED' | 'UNRESOLVED_CRITICAL_TIME_MULTIPLE';
  escalatedAt: string;
  elapsedPercent: number;
  notifiedRole: string;
  notificationSubject: string;
  notificationBody: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface SlaNotificationPayload {
  id: string;
  incidentId: string;
  trackingNumber: string;
  recipientRole: string;
  notificationType: 'SLA_WARNING' | 'SLA_BREACH' | 'ESCALATION_DISPATCH';
  title: string;
  message: string;
  sentAt: string;
  isRead: boolean;
}

export interface SlaMonitoringCycleReport {
  cycleId: string;
  executedAt: string;
  totalTracked: number;
  healthyCount: number;
  warningCount: number;
  breachedCount: number;
  fulfilledCount: number;
  escalationsTriggered: number;
  notificationsDispatched: number;
  durationMs: number;
}
