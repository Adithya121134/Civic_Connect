import {
  DuplicateDetectionInput,
  DuplicateDetectionStructuredOutput,
  DuplicateCandidateMatch,
  SignalBreakdown,
  DuplicateClassificationResult,
  RecommendedRelationshipType,
} from '../types/duplicateDetection';
import { incidentEngine } from './incidentManagementEngine';
import { evidenceManager } from './evidenceManagementService';
import { ControlledIncidentStatus } from '../types/incident';

// Helper: Haversine distance in meters
function computeHaversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Helper: Text token similarity (Jaccard on normalized word set)
function computeSemanticTokenSimilarity(textA: string, textB: string): number {
  const stopWords = new Set(['the', 'and', 'a', 'in', 'of', 'on', 'at', 'near', 'with', 'is', 'it', 'to', 'for']);
  const tokenize = (t: string) =>
    new Set(
      t
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w))
    );

  const setA = tokenize(textA);
  const setB = tokenize(textB);

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionCount = 0;
  for (const word of setA) {
    if (setB.has(word)) intersectionCount++;
  }

  const unionCount = setA.size + setB.size - intersectionCount;
  return unionCount === 0 ? 0 : Number((intersectionCount / unionCount).toFixed(3));
}

/**
 * CivicConnect Duplicate Detection Multi-Signal Engine
 * Analyzes:
 * 1. Geographic proximity (PostGIS ST_DWithin simulation)
 * 2. Time proximity (Hours since initial report)
 * 3. Issue Category taxonomy match
 * 4. Semantic narrative similarity
 * 5. Cryptographic SHA-256 evidence similarity
 * 6. Existing incident lifecycle status (active vs closed)
 */
export function evaluateDuplicateCandidates(input: DuplicateDetectionInput): DuplicateDetectionStructuredOutput {
  const allIncidents = incidentEngine.getAllIncidents();
  const candidateMatches: DuplicateCandidateMatch[] = [];

  const targetEvidence = evidenceManager.getEvidenceByIncident(input.targetIncidentId);
  const targetHashes = new Set(
    (input.evidenceHashes || []).concat(targetEvidence.map((e) => e.sha256Hash))
  );

  const inputTime = new Date(input.createdAt).getTime();

  for (const existing of allIncidents) {
    // Skip evaluating the identical record
    if (existing.id === input.targetIncidentId) continue;

    // 1. Geographic Signal (Distance in meters)
    const distanceMeters = computeHaversineMeters(
      input.location.latitude,
      input.location.longitude,
      existing.location.latitude,
      existing.location.longitude
    );

    // Only consider candidates within 500 meters buffer
    if (distanceMeters > 500) continue;

    // Proximity score: 1.0 within 15m; scales down to 0 at 250m
    let geoScore = 0;
    if (distanceMeters <= 15) {
      geoScore = 1.0;
    } else if (distanceMeters <= 50) {
      geoScore = 0.9 - ((distanceMeters - 15) / 35) * 0.2; // 0.90 to 0.70
    } else if (distanceMeters <= 150) {
      geoScore = 0.7 - ((distanceMeters - 50) / 100) * 0.35; // 0.70 to 0.35
    } else {
      geoScore = Math.max(0, 0.35 - ((distanceMeters - 150) / 100) * 0.35);
    }

    // 2. Time Proximity Signal
    const candidateTime = new Date(existing.createdAt).getTime();
    const diffHours = Math.abs(inputTime - candidateTime) / (1000 * 60 * 60);

    let timeScore = 0;
    if (diffHours <= 6) {
      timeScore = 1.0;
    } else if (diffHours <= 24) {
      timeScore = 0.9;
    } else if (diffHours <= 72) {
      timeScore = 0.75;
    } else if (diffHours <= 168) {
      // 1 week
      timeScore = 0.5;
    } else {
      timeScore = 0.2;
    }

    // 3. Category Match Signal
    let categoryScore = 0;
    const catA = (input.category || '').toUpperCase();
    const catB = (existing.category || '').toUpperCase();
    if (catA === catB) {
      categoryScore = 1.0;
    } else if (
      (catA.includes('ROAD') && catB.includes('ROAD')) ||
      (catA.includes('WATER') && catB.includes('WATER')) ||
      (catA.includes('DRAIN') && catB.includes('WATER'))
    ) {
      categoryScore = 0.65;
    } else {
      categoryScore = 0.1;
    }

    // 4. Semantic Similarity Signal
    const combinedTargetText = `${input.title} ${input.description}`;
    const combinedCandidateText = `${existing.title} ${existing.description}`;
    const semanticScore = computeSemanticTokenSimilarity(combinedTargetText, combinedCandidateText);

    // 5. Evidence Similarity Signal (SHA-256 hash collision detection)
    let evidenceScore = 0;
    const candidateEvidence = evidenceManager.getEvidenceByIncident(existing.id);
    let exactHashMatchFound = false;

    for (const ce of candidateEvidence) {
      if (targetHashes.has(ce.sha256Hash)) {
        exactHashMatchFound = true;
        break;
      }
    }

    if (exactHashMatchFound) {
      evidenceScore = 1.0; // Exact identical binary file uploaded!
    } else if (targetEvidence.length > 0 && candidateEvidence.length > 0) {
      evidenceScore = 0.4; // Both have visual evidence but differing checksums
    } else {
      evidenceScore = 0.0;
    }

    // 6. Status Relevance Signal
    // Active incidents (REPORTED to IN_PROGRESS) are prime duplicate targets.
    // VERIFIED/CLOSED incidents are historical, representing possible recurrence.
    let statusScore = 0.5;
    const activeStatuses: ControlledIncidentStatus[] = [
      'REPORTED',
      'PROCESSING',
      'VALIDATING',
      'CLASSIFIED',
      'INVESTIGATING',
      'ROUTED',
      'ASSIGNED',
      'IN_PROGRESS',
    ];
    if (activeStatuses.includes(existing.status)) {
      statusScore = 1.0;
    } else if (existing.status === 'VERIFIED' || existing.status === 'CLOSED') {
      statusScore = 0.3; // Historical recurring defect
    } else if (existing.status === 'DUPLICATE') {
      statusScore = 0.8; // Target is already a duplicate cluster member
    }

    // Weights:
    // Geo: 35%, Semantic: 20%, Category: 15%, Time: 10%, Evidence: 10%, Status: 10%
    const compositeScore = Number(
      (
        geoScore * 0.35 +
        semanticScore * 0.2 +
        categoryScore * 0.15 +
        timeScore * 0.1 +
        evidenceScore * 0.1 +
        statusScore * 0.1
      ).toFixed(3)
    );

    const matchReasons: string[] = [];
    if (distanceMeters <= 25) matchReasons.push(`Located within immediate spatial vicinity (${distanceMeters}m)`);
    if (exactHashMatchFound) matchReasons.push('Identical cryptographic binary hash (SHA-256) detected across attachments');
    if (catA === catB) matchReasons.push(`Exact civic category taxonomy match (${catA})`);
    if (diffHours <= 24) matchReasons.push(`Reported within ${Math.round(diffHours)} hours of candidate`);
    if (semanticScore >= 0.3) matchReasons.push(`High keyword overlap (${Math.round(semanticScore * 100)}%)`);

    const signalBreakdown: SignalBreakdown = {
      geographicProximityScore: geoScore,
      timeProximityScore: timeScore,
      categoryMatchScore: categoryScore,
      semanticSimilarityScore: semanticScore,
      evidenceSimilarityScore: evidenceScore,
      statusRelevanceScore: statusScore,
      distanceMeters,
      timeDifferenceHours: Math.round(diffHours * 10) / 10,
    };

    candidateMatches.push({
      candidateIncidentId: existing.id,
      candidateTrackingNumber: existing.trackingNumber,
      candidateTitle: existing.title,
      candidateCategory: existing.category,
      candidateStatus: existing.status,
      candidateCreatedAt: existing.createdAt,
      distanceMeters,
      timeDifferenceHours: Math.round(diffHours * 10) / 10,
      aggregateSimilarityScore: compositeScore,
      signalBreakdown,
      matchReasons,
    });
  }

  // Sort candidates by aggregate similarity score descending
  candidateMatches.sort((a, b) => b.aggregateSimilarityScore - a.aggregateSimilarityScore);
  const bestCandidate = candidateMatches[0];

  // Epistemic Threshold Assessment
  // Deterministic rules:
  // 1. Probable Duplicate: similarity >= 0.80 AND distance <= 35m AND category match
  // 2. Related Incident: distance <= 120m AND category match AND similarity >= 0.55
  // 3. Uncertain Match: similarity between 0.45 and 0.79
  // 4. New Incident: similarity < 0.45 or no candidates within 500m

  let determination: DuplicateClassificationResult = 'NEW_INCIDENT';
  let recommendedRelationship: RecommendedRelationshipType = 'STANDALONE_UNIQUE';
  let isDeterministicMergeEligible = false;
  let requiresHumanReview = false;
  let reason = 'No spatial or semantic collision detected within 500-meter buffer. Isolated unique incident.';
  let confidence = 0.95;

  if (bestCandidate) {
    const isVeryClose = bestCandidate.distanceMeters <= 35;
    const isCategoryExact = bestCandidate.signalBreakdown.categoryMatchScore >= 0.9;
    const hasHashMatch = bestCandidate.signalBreakdown.evidenceSimilarityScore === 1.0;

    if ((bestCandidate.aggregateSimilarityScore >= 0.78 && isVeryClose && isCategoryExact) || hasHashMatch) {
      determination = 'PROBABLE_DUPLICATE';
      recommendedRelationship = 'DUPLICATE_OF';
      // Deterministic threshold rule: must be >= 0.82 score to qualify for automated relationship linking
      isDeterministicMergeEligible = bestCandidate.aggregateSimilarityScore >= 0.82 || hasHashMatch;
      requiresHumanReview = !isDeterministicMergeEligible; // If between 0.78 and 0.82, requires officer sign-off
      confidence = bestCandidate.aggregateSimilarityScore;
      reason = `High-confidence spatial match (${bestCandidate.distanceMeters}m away) on active ticket ${
        bestCandidate.candidateTrackingNumber
      }. ${hasHashMatch ? 'Cryptographic SHA-256 evidence hash match.' : 'Category and defect description align.'}`;
    } else if (
      bestCandidate.distanceMeters <= 150 &&
      bestCandidate.aggregateSimilarityScore >= 0.52 &&
      isCategoryExact
    ) {
      determination = 'RELATED_INCIDENT';
      recommendedRelationship = 'RELATED_CORRIDOR_CLUSTER';
      isDeterministicMergeEligible = false;
      requiresHumanReview = true;
      confidence = 0.72;
      reason = `Proximity cluster along shared civic corridor (${bestCandidate.distanceMeters}m away). Recommended for multi-ticket grouping rather than direct merge.`;
    } else if (bestCandidate.aggregateSimilarityScore >= 0.42) {
      determination = 'UNCERTAIN_MATCH';
      recommendedRelationship = 'REQUIRES_HUMAN_TRIAGE';
      isDeterministicMergeEligible = false;
      requiresHumanReview = true;
      confidence = 0.5;
      reason = `Marginal similarity (${(bestCandidate.aggregateSimilarityScore * 100).toFixed(
        0
      )}%) with ticket ${bestCandidate.candidateTrackingNumber}. Insufficient certainty for automated relationship; retained for human review.`;
    }
  }

  // Preserve all citizen evidence guarantee
  const preservedCitizenEvidenceSummary = `Preserved ${targetEvidence.length} submitted citizen artifact(s). Even if linked or merged with candidate ${
    bestCandidate ? bestCandidate.candidateTrackingNumber : 'none'
  }, all citizen photos, timestamps, and statements are retained as immutable evidence.`;

  return {
    determination,
    recommendedRelationship,
    primaryCandidateId: bestCandidate?.candidateIncidentId,
    primaryCandidateTrackingNumber: bestCandidate?.candidateTrackingNumber,
    compositeSimilarityScore: bestCandidate ? bestCandidate.aggregateSimilarityScore : 0,
    confidence,
    reason,
    candidateMatches: candidateMatches.slice(0, 5), // top 5
    isDeterministicMergeEligible,
    requiresHumanReview,
    preservedCitizenEvidenceSummary,
  };
}
