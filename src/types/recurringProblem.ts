import { ControlledIncidentStatus, IncidentPriority, IncidentSeverity } from './incident';

export type RecurrencePatternType =
  | 'REPEATED_FLOODING'
  | 'CHRONIC_ROAD_SURFACE_FAILURE'
  | 'CHRONIC_WASTE_ACCUMULATION'
  | 'INTERMITTENT_STREETLIGHT_FAILURE'
  | 'REPEATED_DRAINAGE_FAILURE'
  | 'CHRONIC_WATER_LEAKAGE'
  | 'PERSISTENT_PUBLIC_HAZARD';

export type RecurrenceConfidenceLevel = 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW';

export interface RecurrenceTemporalMetrics {
  firstObservedAt: string;
  lastObservedAt: string;
  totalSpanDays: number;
  incidentCount: number;
  averageIntervalDays: number;
  minIntervalDays: number;
  maxIntervalDays: number;
  recurrenceFrequencyPerMonth: number;
  seasonalOrCyclicIndicator?: string;
}

export interface RecurrenceGeographicCluster {
  clusterCenter: {
    latitude: number;
    longitude: number;
    approximateAddress: string;
  };
  clusterRadiusMeters: number;
  geoHashPrefix: string;
  distinctReportingSites: number;
}

export interface PatternSupportingEvidence {
  incidentId: string;
  trackingNumber: string;
  title: string;
  reportedAt: string;
  category: string;
  severity: IncidentSeverity;
  status: ControlledIncidentStatus;
  distanceMetersFromClusterCenter: number;
  resolutionHistoryNote?: string;
  isResolvedBeforeRecurrence: boolean;
}

export interface PreventiveInvestigationRecommendation {
  summaryHeadline: string; // e.g. "Recurring pattern detected; infrastructure inspection recommended."
  recommendedAction: string;
  targetDepartmentCode: string;
  targetDepartmentName: string;
  suggestedInspectionScope: string[];
  preventiveUrgency: 'CRITICAL_INTERVENTION' | 'SCHEDULED_ENGINEERING_SURVEY' | 'OPERATIONAL_AUDIT' | 'MONITORING_SUGGESTED';
  evidenceSummaryStatement: string; // Non-speculative, grounded in documented historical events
}

export interface RecurringIssue {
  id: string;
  clusterId: string;
  patternType: RecurrencePatternType;
  title: string;
  issueCategory: string;
  issueSubtypes: string[];
  confidence: RecurrenceConfidenceLevel;
  confidenceScore: number; // 0.0 - 1.0
  severityRating: IncidentSeverity;
  
  geographicCluster: RecurrenceGeographicCluster;
  temporalMetrics: RecurrenceTemporalMetrics;
  
  contributingIncidentIds: string[];
  supportingEvidence: PatternSupportingEvidence[];
  
  preventiveRecommendation: PreventiveInvestigationRecommendation;
  
  detectionTimestamp: string;
  detectedBy: 'CIVICCONNECT_RECURRING_PROBLEM_INTELLIGENCE_ENGINE';
  status: 'IDENTIFIED' | 'UNDER_CIVIC_INVESTIGATION' | 'ENGINEERING_WORK_COMMISSIONED' | 'DISMISSED';
}

export interface RecurrenceDetectionRunReport {
  runId: string;
  executedAt: string;
  totalIncidentsScanned: number;
  clustersEvaluated: number;
  recurringPatternsIdentified: number;
  criticalPatternsCount: number;
  executionDurationMs: number;
}
