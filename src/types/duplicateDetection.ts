import { IncidentPriority, IncidentSeverity, ControlledIncidentStatus } from './incident';

export type DuplicateClassificationResult =
  | 'NEW_INCIDENT'
  | 'PROBABLE_DUPLICATE'
  | 'RELATED_INCIDENT'
  | 'UNCERTAIN_MATCH';

export type RecommendedRelationshipType =
  | 'STANDALONE_UNIQUE'
  | 'DUPLICATE_OF'
  | 'RELATED_CORRIDOR_CLUSTER'
  | 'REQUIRES_HUMAN_TRIAGE';

export interface SignalBreakdown {
  geographicProximityScore: number; // 0.0 - 1.0 (based on meters distance)
  timeProximityScore: number; // 0.0 - 1.0 (based on hours difference)
  categoryMatchScore: number; // 0.0 - 1.0 (exact or taxonomy tree match)
  semanticSimilarityScore: number; // 0.0 - 1.0 (NLP cosine/jaccard overlap)
  evidenceSimilarityScore: number; // 0.0 - 1.0 (SHA-256 hash match or visual similarity)
  statusRelevanceScore: number; // 0.0 - 1.0 (whether target is active vs closed)
  distanceMeters: number;
  timeDifferenceHours: number;
}

export interface DuplicateCandidateMatch {
  candidateIncidentId: string;
  candidateTrackingNumber: string;
  candidateTitle: string;
  candidateCategory: string;
  candidateStatus: ControlledIncidentStatus;
  candidateCreatedAt: string;
  distanceMeters: number;
  timeDifferenceHours: number;
  aggregateSimilarityScore: number; // 0.00 to 1.00
  signalBreakdown: SignalBreakdown;
  matchReasons: string[];
}

export interface DuplicateDetectionStructuredOutput {
  determination: DuplicateClassificationResult;
  recommendedRelationship: RecommendedRelationshipType;
  primaryCandidateId?: string;
  primaryCandidateTrackingNumber?: string;
  compositeSimilarityScore: number; // 0.00 to 1.00
  confidence: number; // 0.00 to 1.00
  reason: string;
  candidateMatches: DuplicateCandidateMatch[];
  isDeterministicMergeEligible: boolean; // Must pass backend strict thresholds
  requiresHumanReview: boolean;
  preservedCitizenEvidenceSummary: string;
}

export interface DuplicateDetectionInput {
  targetIncidentId: string;
  title: string;
  description: string;
  category: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  createdAt: string;
  evidenceHashes?: string[];
}
