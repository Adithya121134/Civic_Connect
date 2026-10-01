import { IncidentPriority, ControlledIncidentStatus } from '../types/incident';
import {
  EscalationAuditEntry,
  EscalationLevel,
  IncidentSlaRecord,
  SlaDepartmentPolicy,
  SlaMonitoringCycleReport,
  SlaNotificationPayload,
  SlaTrackingState,
} from '../types/slaAndEscalation';

/**
 * Authoritative Department-based SLA Configurations.
 * Evaluated deterministically with mathematical thresholds.
 */
export const DEPARTMENT_SLA_POLICIES: Record<string, SlaDepartmentPolicy> = {
  'dept-transport': {
    departmentId: 'dept-transport',
    departmentCode: 'DOT_ROADS',
    priorityTargetsHours: {
      P1_CRITICAL: 4,
      P2_HIGH: 24,
      P3_MEDIUM: 72,
      P4_LOW: 168,
    },
    warningThresholdPercent: 0.75, // Alert at 75% elapsed duration
    businessHoursOnly: false,
    escalationRecipients: {
      level1Role: 'DOT Roadway Field Supervisor',
      level2Role: 'DOT Division Operations Chief',
      level3Role: 'DOT Managing Director & City Transport Head',
    },
  },
  'dept-water': {
    departmentId: 'dept-water',
    departmentCode: 'DWaterP',
    priorityTargetsHours: {
      P1_CRITICAL: 2,
      P2_HIGH: 12,
      P3_MEDIUM: 48,
      P4_LOW: 120,
    },
    warningThresholdPercent: 0.70, // 70% threshold for critical hydraulic assets
    businessHoursOnly: false,
    escalationRecipients: {
      level1Role: 'Water Emergency Response Superintendent',
      level2Role: 'Bureau of Water Utilities Operations Director',
      level3Role: 'Municipal Power & Water Commissioner',
    },
  },
  'dept-lighting': {
    departmentId: 'dept-lighting',
    departmentCode: 'BSL_LIGHTING',
    priorityTargetsHours: {
      P1_CRITICAL: 6,
      P2_HIGH: 24,
      P3_MEDIUM: 96,
      P4_LOW: 240,
    },
    warningThresholdPercent: 0.80,
    businessHoursOnly: false,
    escalationRecipients: {
      level1Role: 'Electrical Safety Watch Officer',
      level2Role: 'Street Lighting Grid Supervisor',
      level3Role: 'Public Lighting Bureau Chief',
    },
  },
  'dept-sanitation': {
    departmentId: 'dept-sanitation',
    departmentCode: 'DEPT_SAN',
    priorityTargetsHours: {
      P1_CRITICAL: 8,
      P2_HIGH: 24,
      P3_MEDIUM: 72,
      P4_LOW: 144,
    },
    warningThresholdPercent: 0.75,
    businessHoursOnly: false,
    escalationRecipients: {
      level1Role: 'Sanitation Dispatch Coordinator',
      level2Role: 'District Refuse Superintendent',
      level3Role: 'Director of Waste Management Operations',
    },
  },
  'dept-public-works': {
    departmentId: 'dept-public-works',
    departmentCode: 'DPW_GENERAL',
    priorityTargetsHours: {
      P1_CRITICAL: 12,
      P2_HIGH: 48,
      P3_MEDIUM: 120,
      P4_LOW: 336,
    },
    warningThresholdPercent: 0.80,
    businessHoursOnly: false,
    escalationRecipients: {
      level1Role: 'Civil Infrastructure Field Inspector',
      level2Role: 'Public Works Division Superintendent',
      level3Role: 'Director of Civic Infrastructure Operations',
    },
  },
};

export const DEFAULT_SLA_POLICY: SlaDepartmentPolicy = {
  departmentId: 'default',
  departmentCode: 'MUNICIPAL_STANDARD',
  priorityTargetsHours: {
    P1_CRITICAL: 4,
    P2_HIGH: 24,
    P3_MEDIUM: 72,
    P4_LOW: 168,
  },
  warningThresholdPercent: 0.75,
  businessHoursOnly: false,
  escalationRecipients: {
    level1Role: 'Municipal Watch Supervisor',
    level2Role: 'Division Operations Chief',
    level3Role: 'City Services Director',
  },
};

/**
 * Terminal statuses where SLA clock halts deterministically.
 */
export const TERMINAL_STATUSES: ControlledIncidentStatus[] = ['VERIFIED', 'CLOSED', 'DUPLICATE', 'REJECTED'];

/**
 * Deterministic SLA & Escalation Engine.
 * 
 * Strict Invariants:
 * 1. Timestamps and deadlines are compared mathematically using epoch milliseconds (nowMs >= deadlineMs).
 * 2. Idempotent escalations: Repeated background sweeps will NEVER trigger duplicate escalations for the same level.
 * 3. Exact tracking states: HEALTHY -> WARNING_APPROACHING -> BREACHED -> FULFILLED / RESOLVED_LATE.
 */
class SlaAndEscalationEngine {
  private slaRecords: Map<string, IncidentSlaRecord> = new Map();
  private escalationHistory: EscalationAuditEntry[] = [];
  private notifications: SlaNotificationPayload[] = [];
  private monitoringReports: SlaMonitoringCycleReport[] = [];
  private simulatedTimeOffsetMs: number = 0; // Allows manual or fast-forward simulation testing
  private backgroundIntervalId: any = null;
  private isMonitoringRunning: boolean = false;
  private listeners: Array<() => void> = [];

  constructor() {
    this.seedInitialSlaRecords();
    this.startBackgroundWorker(10000); // 10-second automatic sweep cycle
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('SLA listener error:', err);
      }
    }
  }

  /**
   * Deterministic Time Anchor: current system epoch time + optional simulation offset.
   * Ensures testability of warning thresholds, breaches, and multiday escalations.
   */
  public getCurrentTimeMs(): number {
    return Date.now() + this.simulatedTimeOffsetMs;
  }

  public getSimulatedOffsetHours(): number {
    return this.simulatedTimeOffsetMs / (1000 * 60 * 60);
  }

  public setTimeOffsetHours(hours: number): void {
    this.simulatedTimeOffsetMs = hours * 60 * 60 * 1000;
    this.evaluateAllRecords();
    this.notifyListeners();
  }

  public advanceTimeHours(hours: number): void {
    this.simulatedTimeOffsetMs += hours * 60 * 60 * 1000;
    this.evaluateAllRecords();
    this.notifyListeners();
  }

  public resetTimeOffset(): void {
    this.simulatedTimeOffsetMs = 0;
    this.evaluateAllRecords();
    this.notifyListeners();
  }

  /**
   * Assigns or updates an SLA policy for an incident.
   * Completely backend deterministic calculation based on configured hours.
   */
  public assignSlaPolicy(params: {
    incidentId: string;
    trackingNumber: string;
    departmentId?: string;
    priority: IncidentPriority;
    status: ControlledIncidentStatus;
    startTimeMs?: number;
  }): IncidentSlaRecord {
    const deptId = params.departmentId || 'dept-transport';
    const policy = DEPARTMENT_SLA_POLICIES[deptId] || DEFAULT_SLA_POLICY;
    const targetHours = policy.priorityTargetsHours[params.priority] || 72;
    const totalDurationMs = targetHours * 60 * 60 * 1000;
    
    const startMs = params.startTimeMs || this.getCurrentTimeMs();
    const deadlineMs = startMs + totalDurationMs;
    const warningTimeMs = startMs + Math.floor(totalDurationMs * policy.warningThresholdPercent);

    const recordId = `sla-${params.incidentId}`;
    const existing = this.slaRecords.get(recordId);

    const record: IncidentSlaRecord = {
      id: recordId,
      incidentId: params.incidentId,
      trackingNumber: params.trackingNumber,
      departmentId: deptId,
      priority: params.priority,
      status: params.status,
      startTimeMs: existing ? existing.startTimeMs : startMs,
      deadlineMs,
      totalDurationMs,
      warningTimeMs,
      trackingState: 'HEALTHY',
      elapsedMs: 0,
      elapsedPercent: 0,
      remainingMs: totalDurationMs,
      isBreached: false,
      currentEscalationLevel: existing ? existing.currentEscalationLevel : 'LEVEL_0_STANDARD',
      lastEvaluationTimestampMs: this.getCurrentTimeMs(),
    };

    this.slaRecords.set(recordId, record);
    this.evaluateSingleRecord(record, this.getCurrentTimeMs());
    this.notifyListeners();
    return record;
  }

  /**
   * Updates incident status (e.g. when completed or resolved).
   */
  public updateIncidentStatus(incidentId: string, status: ControlledIncidentStatus): void {
    const record = this.slaRecords.get(`sla-${incidentId}`);
    if (!record) return;

    record.status = status;
    const nowMs = this.getCurrentTimeMs();

    if (TERMINAL_STATUSES.includes(status)) {
      if (!record.resolvedAtMs) {
        record.resolvedAtMs = nowMs;
      }
      if (record.resolvedAtMs <= record.deadlineMs) {
        record.trackingState = 'FULFILLED';
        record.isBreached = false;
      } else {
        record.trackingState = 'RESOLVED_LATE';
        record.isBreached = true;
      }
    }

    this.evaluateSingleRecord(record, nowMs);
    this.notifyListeners();
  }

  /**
   * Deterministic Single-Record Evaluation.
   * Computes elapsed %, verifies warning threshold, detects breaches, and applies idempotent escalation.
   */
  public evaluateSingleRecord(record: IncidentSlaRecord, nowMs: number): {
    escalationTriggered: boolean;
    notificationDispatched: boolean;
  } {
    let escalationTriggered = false;
    let notificationDispatched = false;

    record.lastEvaluationTimestampMs = nowMs;
    const isTerminal = TERMINAL_STATUSES.includes(record.status);

    const effectiveEndMs = isTerminal && record.resolvedAtMs ? record.resolvedAtMs : nowMs;
    record.elapsedMs = Math.max(0, effectiveEndMs - record.startTimeMs);
    record.elapsedPercent = Number(((record.elapsedMs / record.totalDurationMs) * 100).toFixed(1));
    record.remainingMs = Math.max(0, record.deadlineMs - effectiveEndMs);

    const policy = DEPARTMENT_SLA_POLICIES[record.departmentId] || DEFAULT_SLA_POLICY;

    // Terminal statuses freeze the clock
    if (isTerminal) {
      if (effectiveEndMs <= record.deadlineMs) {
        record.trackingState = 'FULFILLED';
        record.isBreached = false;
      } else {
        record.trackingState = 'RESOLVED_LATE';
        record.isBreached = true;
      }
      return { escalationTriggered, notificationDispatched };
    }

    // Active ticket deterministic status evaluation
    if (nowMs >= record.deadlineMs) {
      record.isBreached = true;
      record.trackingState = 'BREACHED';
      if (!record.breachRecordedAtMs) {
        record.breachRecordedAtMs = nowMs;
      }

      // Idempotent Escalation Ladder
      // Calculate how long past the deadline (e.g. 1x, 2x duration)
      const overdueMs = nowMs - record.deadlineMs;
      let targetEscalation: EscalationLevel = 'LEVEL_1_SUPERVISOR_ALERT';
      let triggerReason: EscalationAuditEntry['triggerReason'] = 'DEADLINE_BREACH_DETECTED';

      if (overdueMs > record.totalDurationMs * 0.5) {
        targetEscalation = 'LEVEL_3_DIRECTOR_INTERVENTION';
        triggerReason = 'UNRESOLVED_CRITICAL_TIME_MULTIPLE';
      } else if (overdueMs > 0) {
        targetEscalation = 'LEVEL_2_DIVISION_CHIEF';
        triggerReason = 'DEADLINE_BREACH_DETECTED';
      }

      // STRICT IDEMPOTENCY CHECK:
      // Only escalate if target level is higher than current level
      if (this.isEscalationHigher(targetEscalation, record.currentEscalationLevel)) {
        const fromLevel = record.currentEscalationLevel;
        record.currentEscalationLevel = targetEscalation;
        record.lastEscalatedAtMs = nowMs;

        const recipient =
          targetEscalation === 'LEVEL_3_DIRECTOR_INTERVENTION'
            ? policy.escalationRecipients.level3Role
            : policy.escalationRecipients.level2Role;

        const entry: EscalationAuditEntry = {
          id: `esc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          slaRecordId: record.id,
          incidentId: record.incidentId,
          trackingNumber: record.trackingNumber,
          fromLevel,
          toLevel: targetEscalation,
          triggerReason,
          escalatedAt: new Date(nowMs).toISOString(),
          elapsedPercent: record.elapsedPercent,
          notifiedRole: recipient,
          notificationSubject: `[SLA BREACH ESCALATION] ${record.trackingNumber} - ${targetEscalation}`,
          notificationBody: `Incident ${record.trackingNumber} exceeded its ${policy.priorityTargetsHours[record.priority]}h SLA deadline by ${(overdueMs / (1000 * 3600)).toFixed(1)} hours (${record.elapsedPercent}% of allowable window). Escalated to ${recipient}.`,
        };

        this.escalationHistory.unshift(entry);
        escalationTriggered = true;

        this.dispatchNotification({
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          incidentId: record.incidentId,
          trackingNumber: record.trackingNumber,
          recipientRole: recipient,
          notificationType: 'SLA_BREACH',
          title: `SLA Breached: ${record.trackingNumber}`,
          message: `Incident has exceeded target deadline. Escalated to ${targetEscalation} (${recipient}).`,
          sentAt: new Date(nowMs).toISOString(),
          isRead: false,
        });
        notificationDispatched = true;
      }
    } else if (nowMs >= record.warningTimeMs) {
      record.isBreached = false;
      record.trackingState = 'WARNING_APPROACHING';

      // Idempotent Warning Level 1 Escalation
      if (record.currentEscalationLevel === 'LEVEL_0_STANDARD') {
        record.currentEscalationLevel = 'LEVEL_1_SUPERVISOR_ALERT';
        record.lastEscalatedAtMs = nowMs;

        const recipient = policy.escalationRecipients.level1Role;
        const entry: EscalationAuditEntry = {
          id: `esc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          slaRecordId: record.id,
          incidentId: record.incidentId,
          trackingNumber: record.trackingNumber,
          fromLevel: 'LEVEL_0_STANDARD',
          toLevel: 'LEVEL_1_SUPERVISOR_ALERT',
          triggerReason: 'WARNING_THRESHOLD_EXCEEDED',
          escalatedAt: new Date(nowMs).toISOString(),
          elapsedPercent: record.elapsedPercent,
          notifiedRole: recipient,
          notificationSubject: `[SLA WARNING] ${record.trackingNumber} approaching deadline (${record.elapsedPercent}%)`,
          notificationBody: `Incident ${record.trackingNumber} has consumed ${(record.elapsedPercent).toFixed(1)}% of allowable resolution window. Immediate field dispatch supervisor alert issued to ${recipient}.`,
        };

        this.escalationHistory.unshift(entry);
        escalationTriggered = true;

        this.dispatchNotification({
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          incidentId: record.incidentId,
          trackingNumber: record.trackingNumber,
          recipientRole: recipient,
          notificationType: 'SLA_WARNING',
          title: `SLA Warning Threshold: ${record.trackingNumber}`,
          message: `${record.elapsedPercent}% duration reached. Remaining: ${(record.remainingMs / 3600000).toFixed(1)}h.`,
          sentAt: new Date(nowMs).toISOString(),
          isRead: false,
        });
        notificationDispatched = true;
      }
    } else {
      record.trackingState = 'HEALTHY';
      record.isBreached = false;
    }

    return { escalationTriggered, notificationDispatched };
  }

  private isEscalationHigher(target: EscalationLevel, current: EscalationLevel): boolean {
    const ranks: Record<EscalationLevel, number> = {
      LEVEL_0_STANDARD: 0,
      LEVEL_1_SUPERVISOR_ALERT: 1,
      LEVEL_2_DIVISION_CHIEF: 2,
      LEVEL_3_DIRECTOR_INTERVENTION: 3,
    };
    return ranks[target] > ranks[current];
  }

  private dispatchNotification(notif: SlaNotificationPayload) {
    this.notifications.unshift(notif);
    if (this.notifications.length > 100) {
      this.notifications.pop();
    }
  }

  /**
   * Full Sweep Evaluation across all tracked records.
   * Invoked by background daemon or explicit trigger.
   */
  public evaluateAllRecords(): SlaMonitoringCycleReport {
    const cycleStart = Date.now();
    const nowMs = this.getCurrentTimeMs();

    let healthyCount = 0;
    let warningCount = 0;
    let breachedCount = 0;
    let fulfilledCount = 0;
    let escalationsTriggered = 0;
    let notificationsDispatched = 0;

    for (const record of this.slaRecords.values()) {
      const { escalationTriggered, notificationDispatched } = this.evaluateSingleRecord(record, nowMs);
      if (escalationTriggered) escalationsTriggered++;
      if (notificationDispatched) notificationsDispatched++;

      switch (record.trackingState) {
        case 'HEALTHY':
          healthyCount++;
          break;
        case 'WARNING_APPROACHING':
          warningCount++;
          break;
        case 'BREACHED':
          breachedCount++;
          break;
        case 'FULFILLED':
        case 'RESOLVED_LATE':
          fulfilledCount++;
          break;
      }
    }

    const report: SlaMonitoringCycleReport = {
      cycleId: `cycle-${Date.now()}`,
      executedAt: new Date(nowMs).toISOString(),
      totalTracked: this.slaRecords.size,
      healthyCount,
      warningCount,
      breachedCount,
      fulfilledCount,
      escalationsTriggered,
      notificationsDispatched,
      durationMs: Date.now() - cycleStart,
    };

    this.monitoringReports.unshift(report);
    if (this.monitoringReports.length > 50) {
      this.monitoringReports.pop();
    }

    return report;
  }

  /**
   * Background Worker Management.
   */
  public startBackgroundWorker(intervalMs: number = 10000): void {
    if (this.backgroundIntervalId) {
      clearInterval(this.backgroundIntervalId);
    }
    this.isMonitoringRunning = true;
    this.backgroundIntervalId = setInterval(() => {
      this.evaluateAllRecords();
      this.notifyListeners();
    }, intervalMs);
  }

  public stopBackgroundWorker(): void {
    if (this.backgroundIntervalId) {
      clearInterval(this.backgroundIntervalId);
      this.backgroundIntervalId = null;
    }
    this.isMonitoringRunning = false;
    this.notifyListeners();
  }

  public isBackgroundWorkerActive(): boolean {
    return this.isMonitoringRunning;
  }

  /**
   * Getters
   */
  public getAllSlaRecords(): IncidentSlaRecord[] {
    return Array.from(this.slaRecords.values());
  }

  public getRecordByIncidentId(incidentId: string): IncidentSlaRecord | undefined {
    return this.slaRecords.get(`sla-${incidentId}`);
  }

  public getEscalationHistory(): EscalationAuditEntry[] {
    return [...this.escalationHistory];
  }

  public getNotifications(): SlaNotificationPayload[] {
    return [...this.notifications];
  }

  public getMonitoringReports(): SlaMonitoringCycleReport[] {
    return [...this.monitoringReports];
  }

  public acknowledgeNotification(id: string): void {
    const notif = this.notifications.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      this.notifyListeners();
    }
  }

  /**
   * Pre-seed realistic municipal dataset to showcase:
   * 1. Healthy P1 emergency just reported (0% elapsed)
   * 2. P2 arterial hazard approaching warning threshold (78% elapsed)
   * 3. P3 water leakage in breach state (135% elapsed, Level 2 escalation)
   * 4. P1 resolved in 1.8 hours (Fulfilled)
   */
  private seedInitialSlaRecords() {
    const now = Date.now();
    const oneHour = 3600000;

    // Record 1: Near-Warning P2 (24h SLA, 18h elapsed = 75%)
    this.slaRecords.set('sla-inc-pothole-101', {
      id: 'sla-inc-pothole-101',
      incidentId: 'inc-pothole-101',
      trackingNumber: 'CNC-2026-08912',
      departmentId: 'dept-transport',
      priority: 'P2_HIGH',
      status: 'INVESTIGATING',
      startTimeMs: now - 18.5 * oneHour,
      deadlineMs: now - 18.5 * oneHour + 24 * oneHour,
      totalDurationMs: 24 * oneHour,
      warningTimeMs: now - 18.5 * oneHour + 18 * oneHour,
      trackingState: 'WARNING_APPROACHING',
      elapsedMs: 18.5 * oneHour,
      elapsedPercent: 77.1,
      remainingMs: 5.5 * oneHour,
      isBreached: false,
      currentEscalationLevel: 'LEVEL_1_SUPERVISOR_ALERT',
      lastEscalatedAtMs: now - 0.5 * oneHour,
      lastEvaluationTimestampMs: now,
    });

    // Record 2: Active Breach P3 (48h SLA, 65h elapsed = 135%)
    this.slaRecords.set('sla-inc-water-102', {
      id: 'sla-inc-water-102',
      incidentId: 'inc-water-102',
      trackingNumber: 'CNC-2026-08913',
      departmentId: 'dept-water',
      priority: 'P3_MEDIUM',
      status: 'IN_PROGRESS',
      startTimeMs: now - 65 * oneHour,
      deadlineMs: now - 65 * oneHour + 48 * oneHour,
      totalDurationMs: 48 * oneHour,
      warningTimeMs: now - 65 * oneHour + 33.6 * oneHour,
      trackingState: 'BREACHED',
      elapsedMs: 65 * oneHour,
      elapsedPercent: 135.4,
      remainingMs: 0,
      isBreached: true,
      breachRecordedAtMs: now - 17 * oneHour,
      currentEscalationLevel: 'LEVEL_2_DIVISION_CHIEF',
      lastEscalatedAtMs: now - 17 * oneHour,
      lastEvaluationTimestampMs: now,
    });

    // Record 3: Fresh P1 Critical (4h SLA, 0.4h elapsed = 10%)
    this.slaRecords.set('sla-inc-light-103', {
      id: 'sla-inc-light-103',
      incidentId: 'inc-light-103',
      trackingNumber: 'CNC-2026-08914',
      departmentId: 'dept-lighting',
      priority: 'P1_CRITICAL',
      status: 'REPORTED',
      startTimeMs: now - 0.4 * oneHour,
      deadlineMs: now - 0.4 * oneHour + 4 * oneHour,
      totalDurationMs: 4 * oneHour,
      warningTimeMs: now - 0.4 * oneHour + 3.2 * oneHour,
      trackingState: 'HEALTHY',
      elapsedMs: 0.4 * oneHour,
      elapsedPercent: 10.0,
      remainingMs: 3.6 * oneHour,
      isBreached: false,
      currentEscalationLevel: 'LEVEL_0_STANDARD',
      lastEvaluationTimestampMs: now,
    });

    // Initial audit log
    this.escalationHistory.push({
      id: 'esc-seed-1',
      slaRecordId: 'sla-inc-water-102',
      incidentId: 'inc-water-102',
      trackingNumber: 'CNC-2026-08913',
      fromLevel: 'LEVEL_1_SUPERVISOR_ALERT',
      toLevel: 'LEVEL_2_DIVISION_CHIEF',
      triggerReason: 'DEADLINE_BREACH_DETECTED',
      escalatedAt: new Date(now - 17 * oneHour).toISOString(),
      elapsedPercent: 100.0,
      notifiedRole: 'Bureau of Water Utilities Operations Director',
      notificationSubject: '[SLA BREACH ESCALATION] CNC-2026-08913 - LEVEL_2_DIVISION_CHIEF',
      notificationBody: 'Incident CNC-2026-08913 exceeded its 48h SLA deadline. Escalated to Bureau of Water Utilities Operations Director.',
    });

    this.notifications.push({
      id: 'notif-seed-1',
      incidentId: 'inc-water-102',
      trackingNumber: 'CNC-2026-08913',
      recipientRole: 'Bureau of Water Utilities Operations Director',
      notificationType: 'SLA_BREACH',
      title: 'SLA Breached: CNC-2026-08913',
      message: 'Deadline exceeded by 17.0 hours. Escalated to Division Chief.',
      sentAt: new Date(now - 17 * oneHour).toISOString(),
      isRead: false,
    });

    this.notifications.push({
      id: 'notif-seed-2',
      incidentId: 'inc-pothole-101',
      trackingNumber: 'CNC-2026-08912',
      recipientRole: 'DOT Roadway Field Supervisor',
      notificationType: 'SLA_WARNING',
      title: 'SLA Warning Threshold: CNC-2026-08912',
      message: '77.1% duration reached. Remaining: 5.5 hours.',
      sentAt: new Date(now - 0.5 * oneHour).toISOString(),
      isRead: false,
    });
  }
}

export const slaEngine = new SlaAndEscalationEngine();
