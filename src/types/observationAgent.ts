import { GeographicMetadata, EvidenceRecord } from './evidence';

export type CivicIssueCategory =
  | 'ROAD_DAMAGE'
  | 'DRAINAGE'
  | 'WASTE'
  | 'STREETLIGHT'
  | 'WATER_LEAKAGE'
  | 'SEWAGE'
  | 'PUBLIC_INFRASTRUCTURE'
  | 'TRAFFIC_RELATED'
  | 'SANITATION'
  | 'OTHER';

export type InformationSufficiencyStatus =
  | 'SUFFICIENT_INFORMATION'
  | 'INSUFFICIENT_INFORMATION'
  | 'UNCERTAIN_CLASSIFICATION';

export type ObservationRecommendedNextAction =
  | 'PROCEED_TO_EVIDENCE_ANALYSIS'
  | 'PROCEED_TO_DEDUPLICATION'
  | 'REQUEST_ADDITIONAL_EVIDENCE'
  | 'REQUEST_LOCATION_CLARIFICATION'
  | 'DISPATCH_COMMUNITY_TRIAGE'
  | 'ROUTE_FOR_OFFICER_REVIEW';

export interface RawCitizenObservationInput {
  incidentId: string;
  citizenText: string;
  transcribedAudioText?: string;
  hasAudioAttachment?: boolean;
  imageEvidenceList?: {
    id: string;
    originalFilename: string;
    sha256Hash: string;
    detectedMimeType: string;
    fileSizeBytes: number;
    geoMetadata?: GeographicMetadata;
  }[];
  declaredLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  capturedTimestamp: string;
  existingIncidentContext?: {
    trackingNumber?: string;
    previousCategory?: string;
    reporterReputationScore?: number;
  };
}

export interface ObservationStructuredOutput {
  // Primary classification taxonomy
  primaryCategory: CivicIssueCategory;
  categoryLabel: string;
  subType: string;
  
  // Cognitive extraction
  extractedTitle: string;
  extractedDescription: string;
  visibleEvidenceSummary: string;
  
  // Epistemic assessment
  sufficiencyStatus: InformationSufficiencyStatus;
  confidence: number; // 0.00 to 1.00
  hazardUrgencyEstimate: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  // Missing details diagnostic
  missingInformation: string[];
  
  // Recommended downstream workflow decision
  recommendedNextAction: ObservationRecommendedNextAction;
  
  // Extracted entities
  entities: {
    landmarksMentioned: string[];
    infrastructureElements: string[];
    safetyKeywordsFound: string[];
  };
}

export interface ObservationAgentExecutionResponse {
  executionId: string;
  agentName: string;
  agentVersion: string;
  incidentId: string;
  correlationId: string;
  timestamp: string;
  input: RawCitizenObservationInput;
  output: ObservationStructuredOutput;
  reasoningChain: string[];
  toolCallsExecuted: {
    toolName: string;
    arguments: Record<string, unknown>;
    resultSummary: string;
    timestamp: string;
  }[];
}
