import {
  CivicIncident,
  ControlledIncidentStatus,
  IncidentPriority,
  IncidentSeverity,
  IncidentEvidence,
  IncidentRelationship,
  IncidentRelationshipType,
  IncidentHistoryRecord,
  ActorType,
  AgentStructuredRecommendation,
  GeoLocation,
  SlaInformation,
} from '../types/incident';
import { validateStateTransition } from './incidentStateMachine';
import { slaEngine } from './slaAndEscalationEngine';

function generateTrackingNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CIV-${year}-${rand}`;
}

function calculateSlaDeadlines(priority: IncidentPriority): SlaInformation {
  const now = new Date();
  let ackMins = 60;
  let triageMins = 120;
  let resHours = 72;
  let policyName = 'Standard Urban Resolution Policy';

  if (priority === 'P1_CRITICAL') {
    ackMins = 15;
    triageMins = 30;
    resHours = 4;
    policyName = 'Emergency High-Hazard Life Safety SLA';
  } else if (priority === 'P2_HIGH') {
    ackMins = 30;
    triageMins = 60;
    resHours = 24;
    policyName = 'Priority Public Transit & Arterial Road SLA';
  } else if (priority === 'P4_LOW') {
    ackMins = 120;
    triageMins = 240;
    resHours = 168; // 7 days
    policyName = 'Routine Minor Municipal Defect SLA';
  }

  const ackDeadline = new Date(now.getTime() + ackMins * 60 * 1000).toISOString();
  const triageDeadline = new Date(now.getTime() + triageMins * 60 * 1000).toISOString();
  const resolutionDeadline = new Date(now.getTime() + resHours * 3600 * 1000).toISOString();

  return {
    policyId: `sla-pol-${priority.toLowerCase()}`,
    policyName,
    targetAckMinutes: ackMins,
    targetTriageMinutes: triageMins,
    targetResolutionHours: resHours,
    ackDeadline,
    triageDeadline,
    resolutionDeadline,
    isBreached: false,
  };
}

export class IncidentManagementEngine {
  private incidents: Map<string, CivicIncident> = new Map();
  private history: IncidentHistoryRecord[] = [];
  private relationships: IncidentRelationship[] = [];
  private isSeeded = false;

  constructor() {
    this.seedInitialIncidents();
  }

  private seedInitialIncidents() {
    if (this.isSeeded) return;

    const baseNow = new Date();

    const initialList: CivicIncident[] = [
      {
        id: 'inc-pothole-101',
        trackingNumber: 'CIV-2026-1049',
        title: 'Deep arterial pothole damaging rims and tires',
        description: 'Large fissure in the eastbound roadway measuring 40cm wide and 15cm deep.',
        status: 'ROUTED',
        category: 'ROADS_HAZARD',
        priority: 'P2_HIGH',
        severity: 'SEVERE',
        confidenceScore: 0.94,
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
          address: 'Market St & 4th St, Downtown Ward',
          postalCode: '94103',
          wardCode: 'WARD-CENTRAL-04',
          confidenceRadiusMeters: 5,
        },
        citizenAuthorId: 'usr-citizen-01',
        citizenAuthorEmail: 'citizen.elena@gmail.com',
        citizenAuthorName: 'Elena Rostova',
        isCitizenVerified: true,
        departmentId: 'dept-roads',
        departmentName: 'Department of Transportation & Roads',
        assignedTeamId: 'team-rapid-roads',
        assignedTeamName: 'Rapid Asphalt Response Unit 2',
        parentIncidentId: null,
        duplicateOfIncidentId: null,
        childIncidentIds: [],
        duplicateIncidentIds: [],
        sla: calculateSlaDeadlines('P2_HIGH'),
        evidence: [
          {
            id: 'ev-101',
            incidentId: 'inc-pothole-101',
            uploaderId: 'usr-citizen-01',
            uploaderRole: 'CITIZEN',
            fileType: 'IMAGE',
            mediaUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
            caption: 'Pothole on Market St facing east',
            capturedAt: new Date(baseNow.getTime() - 4 * 3600000).toISOString(),
            hashSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            isVerifiedAuthentic: true,
            uploadedAt: new Date(baseNow.getTime() - 4 * 3600000).toISOString(),
          },
        ],
        reopenCount: 0,
        escalationCount: 0,
        createdAt: new Date(baseNow.getTime() - 4 * 3600000).toISOString(),
        updatedAt: new Date(baseNow.getTime() - 1 * 3600000).toISOString(),
      },
      {
        id: 'inc-water-102',
        trackingNumber: 'CIV-2026-1050',
        title: 'High pressure water pipe burst flooding road',
        description: 'Potable water main severed beneath sidewalk. Significant flooding near school crosswalk.',
        status: 'IN_PROGRESS',
        category: 'WATER_UTILITY',
        priority: 'P1_CRITICAL',
        severity: 'CATASTROPHIC',
        confidenceScore: 0.98,
        location: {
          latitude: 37.7833,
          longitude: -122.4167,
          address: '850 Bryant St, Civic Center Ward',
          postalCode: '94103',
          wardCode: 'WARD-CENTRAL-02',
          confidenceRadiusMeters: 3,
        },
        citizenAuthorId: 'usr-citizen-01',
        citizenAuthorEmail: 'citizen.elena@gmail.com',
        citizenAuthorName: 'Elena Rostova',
        isCitizenVerified: true,
        departmentId: 'dept-water',
        departmentName: 'Department of Water & Power',
        assignedTeamId: 'team-water-burst',
        assignedTeamName: 'Emergency Mains Isolation Crew',
        assignedWorkerId: 'usr-worker-01',
        assignedWorkerName: 'Marcus Chen',
        parentIncidentId: null,
        duplicateOfIncidentId: null,
        childIncidentIds: [],
        duplicateIncidentIds: [],
        sla: calculateSlaDeadlines('P1_CRITICAL'),
        evidence: [],
        reopenCount: 0,
        escalationCount: 0,
        createdAt: new Date(baseNow.getTime() - 2 * 3600000).toISOString(),
        updatedAt: new Date(baseNow.getTime() - 30 * 60000).toISOString(),
      },
      {
        id: 'inc-light-103',
        trackingNumber: 'CIV-2026-1051',
        title: 'Flickering street lamp at pedestrian tunnel',
        description: 'Underpass illumination cutting out intermittently, causing night visibility hazard.',
        status: 'RESOLUTION_SUBMITTED',
        category: 'POWER_LIGHTING',
        priority: 'P3_MEDIUM',
        severity: 'MODERATE',
        confidenceScore: 0.89,
        location: {
          latitude: 37.7699,
          longitude: -122.4467,
          address: 'Buena Vista Tunnel Walkway',
          postalCode: '94117',
          wardCode: 'WARD-WEST-01',
          confidenceRadiusMeters: 8,
        },
        citizenAuthorId: 'usr-citizen-01',
        citizenAuthorEmail: 'citizen.elena@gmail.com',
        citizenAuthorName: 'Elena Rostova',
        isCitizenVerified: true,
        departmentId: 'dept-transport',
        departmentName: 'Department of Transportation & Roads',
        assignedWorkerName: 'Marcus Chen',
        parentIncidentId: null,
        duplicateOfIncidentId: null,
        childIncidentIds: [],
        duplicateIncidentIds: [],
        sla: calculateSlaDeadlines('P3_MEDIUM'),
        resolutionSummary: 'Replaced ballast capacitor and upgraded to 80W LED luminaire.',
        resolutionEvidenceUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=600&q=80',
        resolutionSubmittedAt: new Date(baseNow.getTime() - 15 * 60000).toISOString(),
        evidence: [],
        reopenCount: 0,
        escalationCount: 0,
        createdAt: new Date(baseNow.getTime() - 24 * 3600000).toISOString(),
        updatedAt: new Date(baseNow.getTime() - 15 * 60000).toISOString(),
      },
    ];

    for (const inc of initialList) {
      this.incidents.set(inc.id, inc);
      this.recordHistory({
        incidentId: inc.id,
        correlationId: `corr-init-${inc.id}`,
        actorType: 'SYSTEM_CRON',
        source: 'REST_API',
        action: 'CREATED',
        previousValue: null,
        newValue: inc.status,
        reason: 'Initial system baseline database seed',
      });
    }

    this.isSeeded = true;
  }

  // ==========================================
  // AUDIT & HISTORY RECORDING
  // ==========================================
  public recordHistory(entry: Omit<IncidentHistoryRecord, 'id' | 'timestamp'>): IncidentHistoryRecord {
    const record: IncidentHistoryRecord = {
      id: 'hist-' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.history.unshift(record);
    if (this.history.length > 500) {
      this.history.pop();
    }
    return record;
  }

  public getIncidentHistory(incidentId: string): IncidentHistoryRecord[] {
    return this.history.filter((h) => h.incidentId === incidentId);
  }

  public getAllHistory(): IncidentHistoryRecord[] {
    return [...this.history];
  }

  // ==========================================
  // 1. INCIDENT CREATION
  // ==========================================
  public createIncident(params: {
    title: string;
    description: string;
    category?: string;
    priority?: IncidentPriority;
    severity?: IncidentSeverity;
    latitude: number;
    longitude: number;
    address?: string;
    citizenAuthorId: string;
    citizenAuthorEmail: string;
    citizenAuthorName: string;
    evidencePhotos?: string[];
    actorType: ActorType;
    correlationId?: string;
  }): { success: boolean; incident?: CivicIncident; error?: string } {
    if (!params.title || params.title.trim().length < 5) {
      return { success: false, error: 'Incident title must be at least 5 characters long.' };
    }
    if (!params.description || params.description.trim().length < 10) {
      return { success: false, error: 'Incident description must provide sufficient detail (minimum 10 characters).' };
    }
    if (typeof params.latitude !== 'number' || typeof params.longitude !== 'number') {
      return { success: false, error: 'Geographic coordinate point (latitude/longitude) is mandatory.' };
    }

    const id = 'inc-' + Math.random().toString(36).substring(2, 9);
    const trackingNumber = generateTrackingNumber();
    const correlationId = params.correlationId || `corr-create-${id}`;
    const priority = params.priority || 'P3_MEDIUM';
    const severity = params.severity || 'MODERATE';
    const category = params.category || 'UNCATEGORIZED';
    const now = new Date().toISOString();

    const evidenceList: IncidentEvidence[] = (params.evidencePhotos || []).map((url, idx) => ({
      id: `ev-${id}-${idx}`,
      incidentId: id,
      uploaderId: params.citizenAuthorId,
      uploaderRole: 'CITIZEN',
      fileType: 'IMAGE',
      mediaUrl: url,
      capturedAt: now,
      hashSha256: 'sha256_' + Math.random().toString(36).substring(2, 12),
      isVerifiedAuthentic: true,
      uploadedAt: now,
    }));

    const newIncident: CivicIncident = {
      id,
      trackingNumber,
      title: params.title.trim(),
      description: params.description.trim(),
      status: 'REPORTED', // Always starts in controlled initial state
      category,
      priority,
      severity,
      confidenceScore: 0.75,
      location: {
        latitude: params.latitude,
        longitude: params.longitude,
        address: params.address || 'Geo-located municipal coordinate',
        confidenceRadiusMeters: 5,
      },
      citizenAuthorId: params.citizenAuthorId,
      citizenAuthorEmail: params.citizenAuthorEmail,
      citizenAuthorName: params.citizenAuthorName,
      isCitizenVerified: true,
      childIncidentIds: [],
      duplicateIncidentIds: [],
      sla: calculateSlaDeadlines(priority),
      evidence: evidenceList,
      reopenCount: 0,
      escalationCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.incidents.set(id, newIncident);

    // Register SLA record in deterministic SLA engine
    slaEngine.assignSlaPolicy({
      incidentId: id,
      trackingNumber,
      priority,
      status: 'REPORTED',
      startTimeMs: Date.now(),
    });

    this.recordHistory({
      incidentId: id,
      correlationId,
      actorType: params.actorType,
      actorId: params.citizenAuthorId,
      actorName: params.citizenAuthorName,
      source: 'CITIZEN_PORTAL',
      action: 'CREATED',
      previousValue: null,
      newValue: 'REPORTED',
      reason: 'Citizen observation submitted and ingested into intake pipeline.',
    });

    return { success: true, incident: newIncident };
  }

  // ==========================================
  // 2. INCIDENT RETRIEVAL
  // ==========================================
  public getIncidentById(id: string): CivicIncident | undefined {
    return this.incidents.get(id);
  }

  public getAllIncidents(): CivicIncident[] {
    return Array.from(this.incidents.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getIncidentsByCitizen(citizenEmail: string): CivicIncident[] {
    return this.getAllIncidents().filter(
      (inc) => inc.citizenAuthorEmail.toLowerCase() === citizenEmail.toLowerCase()
    );
  }

  public getIncidentsByDepartment(departmentId: string): CivicIncident[] {
    return this.getAllIncidents().filter((inc) => inc.departmentId === departmentId);
  }

  // ==========================================
  // 3. MUTABLE ATTRIBUTE UPDATES (Deterministic)
  // ==========================================
  public updateIncidentAttributes(
    incidentId: string,
    updates: {
      category?: string;
      priority?: IncidentPriority;
      severity?: IncidentSeverity;
      departmentId?: string;
      departmentName?: string;
      assignedTeamId?: string;
      assignedTeamName?: string;
      assignedWorkerId?: string;
      assignedWorkerName?: string;
      confidenceScore?: number;
    },
    meta: {
      actorType: ActorType;
      actorId?: string;
      actorName?: string;
      correlationId: string;
      source: 'REST_API' | 'WEB_UI' | 'AGENT_WORKFLOW';
      reason?: string;
    }
  ): { success: boolean; incident?: CivicIncident; error?: string } {
    const inc = this.incidents.get(incidentId);
    if (!inc) {
      return { success: false, error: `Incident ${incidentId} not found.` };
    }

    const changedKeys: string[] = [];

    if (updates.category && updates.category !== inc.category) {
      this.recordHistory({
        incidentId,
        correlationId: meta.correlationId,
        actorType: meta.actorType,
        actorId: meta.actorId,
        actorName: meta.actorName,
        source: meta.source,
        action: 'ATTRIBUTE_UPDATED',
        fieldName: 'category',
        previousValue: inc.category,
        newValue: updates.category,
        reason: meta.reason,
      });
      inc.category = updates.category;
      changedKeys.push('category');
    }

    if (updates.priority && updates.priority !== inc.priority) {
      this.recordHistory({
        incidentId,
        correlationId: meta.correlationId,
        actorType: meta.actorType,
        actorId: meta.actorId,
        actorName: meta.actorName,
        source: meta.source,
        action: 'ATTRIBUTE_UPDATED',
        fieldName: 'priority',
        previousValue: inc.priority,
        newValue: updates.priority,
        reason: meta.reason,
      });
      inc.priority = updates.priority;
      inc.sla = calculateSlaDeadlines(updates.priority);
      slaEngine.assignSlaPolicy({
        incidentId: inc.id,
        trackingNumber: inc.trackingNumber,
        departmentId: inc.departmentId || undefined,
        priority: updates.priority,
        status: inc.status,
      });
      changedKeys.push('priority');
    }

    if (updates.severity && updates.severity !== inc.severity) {
      this.recordHistory({
        incidentId,
        correlationId: meta.correlationId,
        actorType: meta.actorType,
        actorId: meta.actorId,
        actorName: meta.actorName,
        source: meta.source,
        action: 'ATTRIBUTE_UPDATED',
        fieldName: 'severity',
        previousValue: inc.severity,
        newValue: updates.severity,
        reason: meta.reason,
      });
      inc.severity = updates.severity;
      changedKeys.push('severity');
    }

    if (updates.departmentName && updates.departmentName !== inc.departmentName) {
      this.recordHistory({
        incidentId,
        correlationId: meta.correlationId,
        actorType: meta.actorType,
        actorId: meta.actorId,
        actorName: meta.actorName,
        source: meta.source,
        action: 'ATTRIBUTE_UPDATED',
        fieldName: 'departmentName',
        previousValue: inc.departmentName,
        newValue: updates.departmentName,
        reason: meta.reason,
      });
      inc.departmentId = updates.departmentId || inc.departmentId;
      inc.departmentName = updates.departmentName;
      changedKeys.push('department');
    }

    if (updates.assignedWorkerName) {
      inc.assignedWorkerId = updates.assignedWorkerId;
      inc.assignedWorkerName = updates.assignedWorkerName;
      changedKeys.push('assignedWorker');
    }

    if (typeof updates.confidenceScore === 'number') {
      inc.confidenceScore = updates.confidenceScore;
    }

    inc.updatedAt = new Date().toISOString();
    return { success: true, incident: inc };
  }

  // ==========================================
  // 4 & 5. STATUS TRANSITIONS & VALIDATION
  // ==========================================
  public transitionStatus(params: {
    incidentId: string;
    targetStatus: ControlledIncidentStatus;
    actorType: ActorType;
    actorId?: string;
    actorName?: string;
    correlationId: string;
    source: 'WEB_UI' | 'REST_API' | 'AGENT_WORKFLOW' | 'BACKGROUND_CRON' | 'CITIZEN_PORTAL';
    reason?: string;
    resolutionSummary?: string;
    resolutionEvidenceUrl?: string;
    reopenReason?: string;
    duplicateOfId?: string;
  }): { success: boolean; incident?: CivicIncident; error?: string; validationErrorCode?: string } {
    const inc = this.incidents.get(params.incidentId);
    if (!inc) {
      return { success: false, error: `Incident ${params.incidentId} not found.` };
    }

    // Apply any transition-specific sidecar payload attributes before validation check
    if (params.resolutionSummary) inc.resolutionSummary = params.resolutionSummary;
    if (params.resolutionEvidenceUrl) inc.resolutionEvidenceUrl = params.resolutionEvidenceUrl;
    if (params.reopenReason) inc.reopenReason = params.reopenReason;
    if (params.duplicateOfId) inc.duplicateOfIncidentId = params.duplicateOfId;

    // STATE MACHINE VALIDATION CHECK
    const validation = validateStateTransition(inc, params.targetStatus, params.actorType);
    if (!validation.isValid) {
      // Record rejected transition attempt in history
      this.recordHistory({
        incidentId: params.incidentId,
        correlationId: params.correlationId,
        actorType: params.actorType,
        actorId: params.actorId,
        actorName: params.actorName,
        source: params.source,
        action: 'STATUS_TRANSITION',
        previousValue: inc.status,
        newValue: params.targetStatus,
        reason: `REJECTED ILLEGAL TRANSITION: ${validation.errorMessage}`,
        metadata: { validationErrorCode: validation.errorCode, attemptedState: params.targetStatus },
      });

      return {
        success: false,
        error: validation.errorMessage,
        validationErrorCode: validation.errorCode,
      };
    }

    const previousStatus = inc.status;
    inc.status = params.targetStatus;
    inc.updatedAt = new Date().toISOString();

    if (params.targetStatus === 'CLOSED') {
      inc.closedAt = new Date().toISOString();
    } else if (params.targetStatus === 'REOPENED') {
      inc.reopenCount += 1;
      inc.closedAt = null;
    } else if (params.targetStatus === 'ESCALATED') {
      inc.escalationCount += 1;
    } else if (params.targetStatus === 'VERIFIED') {
      inc.citizenVerifiedAt = new Date().toISOString();
    }

    // Record Validated History Audit
    this.recordHistory({
      incidentId: params.incidentId,
      correlationId: params.correlationId,
      actorType: params.actorType,
      actorId: params.actorId,
      actorName: params.actorName,
      source: params.source,
      action: 'STATUS_TRANSITION',
      previousValue: previousStatus,
      newValue: params.targetStatus,
      reason: params.reason || `Status advanced from ${previousStatus} to ${params.targetStatus}`,
      metadata: {
        reopenCount: inc.reopenCount,
        escalationCount: inc.escalationCount,
      },
    });

    // Notify deterministic SLA engine of status transition
    slaEngine.updateIncidentStatus(params.incidentId, params.targetStatus);

    return { success: true, incident: inc };
  }

  // ==========================================
  // 8, 9, 10. INCIDENT RELATIONSHIPS (Duplicate & Hierarchical)
  // ==========================================
  public establishRelationship(params: {
    sourceIncidentId: string;
    targetIncidentId: string;
    relationshipType: IncidentRelationshipType;
    confidenceScore?: number;
    establishedBy: ActorType;
    establishedById?: string;
    notes?: string;
    correlationId: string;
  }): { success: boolean; relationship?: IncidentRelationship; error?: string } {
    if (params.sourceIncidentId === params.targetIncidentId) {
      return { success: false, error: 'Cannot establish self-referential incident relationship.' };
    }

    const source = this.incidents.get(params.sourceIncidentId);
    const target = this.incidents.get(params.targetIncidentId);

    if (!source || !target) {
      return { success: false, error: 'One or both incidents in relationship do not exist.' };
    }

    const relId = 'rel-' + Math.random().toString(36).substring(2, 9);
    const relationship: IncidentRelationship = {
      id: relId,
      sourceIncidentId: params.sourceIncidentId,
      targetIncidentId: params.targetIncidentId,
      relationshipType: params.relationshipType,
      confidenceScore: params.confidenceScore ?? 1.0,
      establishedBy: params.establishedBy,
      establishedById: params.establishedById,
      notes: params.notes,
      createdAt: new Date().toISOString(),
    };

    this.relationships.push(relationship);

    // Apply bidirectional linking
    if (params.relationshipType === 'DUPLICATE_OF') {
      source.duplicateOfIncidentId = target.id;
      if (!target.duplicateIncidentIds.includes(source.id)) {
        target.duplicateIncidentIds.push(source.id);
      }
    } else if (params.relationshipType === 'CHILD_OF') {
      source.parentIncidentId = target.id;
      if (!target.childIncidentIds.includes(source.id)) {
        target.childIncidentIds.push(source.id);
      }
    } else if (params.relationshipType === 'PARENT_OF') {
      target.parentIncidentId = source.id;
      if (!source.childIncidentIds.includes(target.id)) {
        source.childIncidentIds.push(target.id);
      }
    }

    this.recordHistory({
      incidentId: source.id,
      correlationId: params.correlationId,
      actorType: params.establishedBy,
      actorId: params.establishedById,
      source: 'AGENT_WORKFLOW',
      action: 'RELATIONSHIP_ESTABLISHED',
      previousValue: null,
      newValue: `${params.relationshipType} -> ${target.trackingNumber}`,
      reason: params.notes || `Linked incident as ${params.relationshipType}`,
    });

    return { success: true, relationship };
  }

  public getIncidentRelationships(incidentId: string): IncidentRelationship[] {
    return this.relationships.filter(
      (r) => r.sourceIncidentId === incidentId || r.targetIncidentId === incidentId
    );
  }

  // ==========================================
  // 12. EVIDENCE ATTACHMENT
  // ==========================================
  public attachEvidence(params: {
    incidentId: string;
    uploaderId: string;
    uploaderRole: 'CITIZEN' | 'FIELD_WORKER' | 'AUTHORITY_OFFICER' | 'SYSTEM';
    mediaUrl: string;
    caption?: string;
    fileType?: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'SENSOR_DATA' | 'DOCUMENT';
    correlationId: string;
  }): { success: boolean; evidence?: IncidentEvidence; error?: string } {
    const inc = this.incidents.get(params.incidentId);
    if (!inc) {
      return { success: false, error: 'Incident not found' };
    }

    const ev: IncidentEvidence = {
      id: 'ev-' + Math.random().toString(36).substring(2, 9),
      incidentId: inc.id,
      uploaderId: params.uploaderId,
      uploaderRole: params.uploaderRole,
      fileType: params.fileType || 'IMAGE',
      mediaUrl: params.mediaUrl,
      caption: params.caption,
      capturedAt: new Date().toISOString(),
      hashSha256: 'sha256_' + Math.random().toString(36).substring(2, 10),
      isVerifiedAuthentic: true,
      uploadedAt: new Date().toISOString(),
    };

    inc.evidence.push(ev);
    inc.updatedAt = new Date().toISOString();

    this.recordHistory({
      incidentId: inc.id,
      correlationId: params.correlationId,
      actorType: params.uploaderRole as ActorType,
      actorId: params.uploaderId,
      source: 'WEB_UI',
      action: 'EVIDENCE_ATTACHED',
      previousValue: null,
      newValue: ev.id,
      reason: params.caption || 'Evidence file attached',
    });

    return { success: true, evidence: ev };
  }

  // ==========================================
  // IMPORTANT: AGENT RECOMMENDATION VALIDATION WRAPPER
  // Autonomous agents NEVER mutate database fields directly.
  // Agents produce structured recommendations.
  // The deterministic backend validates recommendations against the state machine.
  // ==========================================
  public evaluateAndApplyAgentRecommendation(
    incidentId: string,
    rec: AgentStructuredRecommendation,
    officerApprovalId?: string // If required by HITL guardrail
  ): {
    approved: boolean;
    appliedTransitions: string[];
    incident?: CivicIncident;
    rejectionReason?: string;
  } {
    const inc = this.incidents.get(incidentId);
    if (!inc) {
      return { approved: false, appliedTransitions: [], rejectionReason: 'Incident not found' };
    }

    const applied: string[] = [];
    const correlationId = `corr-agent-${rec.recommendationId}`;

    // 1. Guardrail: Low Confidence Threshold Check (< 0.70 requires explicit human approval)
    if (rec.confidence < 0.7 && !officerApprovalId) {
      return {
        approved: false,
        appliedTransitions: [],
        rejectionReason: `Agent recommendation confidence ${rec.confidence.toFixed(
          2
        )} is below autonomous threshold (0.70). Human Officer sign-off required.`,
      };
    }

    // 2. Validate and apply category/priority classification proposal
    if (rec.proposedCategory || rec.proposedPriority || rec.proposedDepartmentName) {
      this.updateIncidentAttributes(
        incidentId,
        {
          category: rec.proposedCategory,
          priority: rec.proposedPriority,
          severity: rec.proposedSeverity,
          departmentName: rec.proposedDepartmentName,
          confidenceScore: rec.confidence,
        },
        {
          actorType: 'AI_AGENT',
          actorId: rec.agentName,
          actorName: `${rec.agentRole} (${rec.modelId})`,
          correlationId,
          source: 'AGENT_WORKFLOW',
          reason: `Autonomous cognitive recommendation: ${rec.reasoning}`,
        }
      );
      applied.push(`Attributes: ${rec.proposedCategory || ''} ${rec.proposedPriority || ''}`);
    }

    // 3. Validate and apply status transition through deterministic State Machine
    if (rec.proposedStatusTransition) {
      const trans = this.transitionStatus({
        incidentId,
        targetStatus: rec.proposedStatusTransition,
        actorType: 'AI_AGENT',
        actorId: rec.agentName,
        actorName: `${rec.agentRole} (${rec.modelId})`,
        correlationId,
        source: 'AGENT_WORKFLOW',
        reason: rec.reasoning,
        duplicateOfId: rec.duplicateCandidateId,
      });

      if (!trans.success) {
        return {
          approved: false,
          appliedTransitions: applied,
          rejectionReason: `State machine rejected agent transition to '${rec.proposedStatusTransition}': ${trans.error}`,
        };
      }
      applied.push(`Status Transition: -> ${rec.proposedStatusTransition}`);
    }

    // 4. Duplicate relationship proposal
    if (rec.duplicateCandidateId && rec.duplicateSimilarityScore && rec.duplicateSimilarityScore > 0.85) {
      this.establishRelationship({
        sourceIncidentId: incidentId,
        targetIncidentId: rec.duplicateCandidateId,
        relationshipType: 'DUPLICATE_OF',
        confidenceScore: rec.duplicateSimilarityScore,
        establishedBy: 'AI_AGENT',
        establishedById: rec.agentName,
        notes: `Duplicate detected with ${(rec.duplicateSimilarityScore * 100).toFixed(1)}% spatial/textual cosine similarity`,
        correlationId,
      });
      applied.push(`Relationship: DUPLICATE_OF ${rec.duplicateCandidateId}`);
    }

    return {
      approved: true,
      appliedTransitions: applied,
      incident: this.incidents.get(incidentId),
    };
  }
}

export const incidentEngine = new IncidentManagementEngine();
