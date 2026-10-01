import { IncidentPriority, IncidentSeverity } from './incident';

export interface PriorityEvaluationFactor {
  factorName: string;
  weight: number; // 0.0 to 1.0
  score: number; // 0.0 to 1.0
  evidenceObserved: string; // Verifiable empirical evidence without hallucination
  isEmpiricallyGrounded: boolean; // True if backed by real input, false if inferred
}

export interface PriorityStructuredOutput {
  recommendedSeverity: IncidentSeverity;
  recommendedPriority: IncidentPriority;
  confidence: number; // 0.00 to 1.00
  factors: PriorityEvaluationFactor[];
  explanation: string;
  uncertainty: {
    uncertaintyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    uncertaintyFactors: string[];
    missingEmpiricalSignals: string[];
  };
  slaTargetHours: number;
}

export interface PriorityAgentInput {
  incidentId: string;
  category: string;
  subType?: string;
  title: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
    wardCode?: string;
  };
  evidenceCount: number;
  hasVisualEvidence: boolean;
  relatedIncidentCount: number;
  isRecurringLocation: boolean;
  historicalOccurrenceCount?: number;
  citizenReportedUrgency?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ConfiguredDepartment {
  id: string;
  code: string;
  name: string;
  primaryCategories: string[];
  jurisdictionWards?: string[];
  slaHoursTarget: Record<IncidentPriority, number>;
  isActive: boolean;
  divisionLead: string;
}

export interface RoutingStructuredOutput {
  recommendedDepartment: {
    id: string;
    code: string;
    name: string;
    divisionLead: string;
  };
  confidence: number; // 0.00 to 1.00
  explanation: string;
  alternativeDepartment?: {
    id: string;
    code: string;
    name: string;
    reasonForAlternative: string;
  };
  validationStatus: 'VALID_CONFIGURED_DEPARTMENT' | 'REJECTED_UNKNOWN_DEPARTMENT';
  jurisdictionMatch: {
    wardMatched: boolean;
    taxonomyMatched: boolean;
    locationInBounds: boolean;
  };
}

export interface RoutingAgentInput {
  incidentId: string;
  category: string;
  subType?: string;
  title: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
    wardCode?: string;
  };
}
