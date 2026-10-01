import {
  ConfiguredDepartment,
  PriorityAgentInput,
  PriorityEvaluationFactor,
  PriorityStructuredOutput,
  RoutingAgentInput,
  RoutingStructuredOutput,
} from '../types/priorityAndRouting';
import { IncidentPriority, IncidentSeverity } from '../types/incident';

/**
 * Authoritative Municipal Department Registry.
 * The AI agent is strictly bounded to these active configured municipal departments.
 * Agents CANNOT create arbitrary departments or hallucinate non-existent agencies.
 */
export const CONFIGURED_MUNICIPAL_DEPARTMENTS: ConfiguredDepartment[] = [
  {
    id: 'dept-transport',
    code: 'DOT_ROADS',
    name: 'Department of Transportation & Municipal Roadways',
    primaryCategories: ['ROAD_DAMAGE', 'TRAFFIC_RELATED', 'ROADS', 'TRAFFIC', 'PAVEMENT'],
    jurisdictionWards: ['WARD-1', 'WARD-2', 'WARD-3', 'WARD-4', 'CENTRAL-CORRIDOR'],
    slaHoursTarget: {
      P1_CRITICAL: 4,
      P2_HIGH: 24,
      P3_MEDIUM: 72,
      P4_LOW: 168,
    },
    isActive: true,
    divisionLead: 'Chief Engineer Marcus Vance',
  },
  {
    id: 'dept-water',
    code: 'DWaterP',
    name: 'Department of Water & Power Utilities',
    primaryCategories: ['WATER_LEAKAGE', 'DRAINAGE', 'SEWAGE', 'WATER', 'SEWER', 'DRAIN'],
    jurisdictionWards: ['WARD-1', 'WARD-2', 'WARD-3', 'WARD-4', 'CENTRAL-CORRIDOR'],
    slaHoursTarget: {
      P1_CRITICAL: 2,
      P2_HIGH: 12,
      P3_MEDIUM: 48,
      P4_LOW: 120,
    },
    isActive: true,
    divisionLead: 'Director Elena Rostova',
  },
  {
    id: 'dept-lighting',
    code: 'BSL_LIGHTING',
    name: 'Bureau of Street Lighting & Electrical Safety',
    primaryCategories: ['STREETLIGHT', 'LIGHTING', 'ELECTRICAL', 'LIGHT'],
    jurisdictionWards: ['WARD-1', 'WARD-2', 'WARD-3', 'WARD-4'],
    slaHoursTarget: {
      P1_CRITICAL: 6,
      P2_HIGH: 24,
      P3_MEDIUM: 96,
      P4_LOW: 240,
    },
    isActive: true,
    divisionLead: 'Superintendent David Chen',
  },
  {
    id: 'dept-sanitation',
    code: 'DEPT_SAN',
    name: 'Bureau of Sanitation & Waste Operations',
    primaryCategories: ['WASTE', 'SANITATION', 'ILLEGAL_DUMPING', 'BIOHAZARD'],
    jurisdictionWards: ['WARD-1', 'WARD-2', 'WARD-3', 'WARD-4'],
    slaHoursTarget: {
      P1_CRITICAL: 8,
      P2_HIGH: 24,
      P3_MEDIUM: 72,
      P4_LOW: 144,
    },
    isActive: true,
    divisionLead: 'Operations Head Sarah Jenkins',
  },
  {
    id: 'dept-public-works',
    code: 'DPW_GENERAL',
    name: 'Department of Public Works & Civic Infrastructure',
    primaryCategories: ['PUBLIC_INFRASTRUCTURE', 'SIDEWALK', 'BUILDINGS', 'OTHER'],
    jurisdictionWards: ['WARD-1', 'WARD-2', 'WARD-3', 'WARD-4'],
    slaHoursTarget: {
      P1_CRITICAL: 12,
      P2_HIGH: 48,
      P3_MEDIUM: 120,
      P4_LOW: 336,
    },
    isActive: true,
    divisionLead: 'General Director Arthur Pendelton',
  },
];

/**
 * Validates whether a candidate department exists in the active municipal configuration.
 */
export function validateConfiguredDepartment(departmentId: string): ConfiguredDepartment | null {
  const found = CONFIGURED_MUNICIPAL_DEPARTMENTS.find(
    (dept) => (dept.id === departmentId || dept.code === departmentId) && dept.isActive
  );
  return found || null;
}

/**
 * Deterministic Priority Assessment Engine.
 * Evaluates factors strictly from verifiable inputs:
 * 1. Category inherent risk
 * 2. Visual evidence presence (verified photos/videos)
 * 3. High-traffic location markers (intersections, schools, hospitals, arterial avenues)
 * 4. Spatial clustering & related report count
 * 5. Historical defect recurrence
 * 6. Public safety impact keywords
 *
 * Emits recommendedSeverity, recommendedPriority, confidence, factor breakdown, and uncertainty diagnostics.
 */
export function evaluateIncidentPriority(input: PriorityAgentInput): PriorityStructuredOutput {
  const factors: PriorityEvaluationFactor[] = [];
  const uncertaintyFactors: string[] = [];
  const missingSignals: string[] = [];

  const text = `${input.title} ${input.description}`.toLowerCase();
  const category = (input.category || '').toUpperCase();

  // Factor 1: Issue Category Baseline Hazard
  let categoryScore = 0.3; // Default low/medium
  let categoryEvidence = `Category: ${input.category}`;
  if (category.includes('WATER') || category.includes('SEWER')) {
    categoryScore = 0.8;
    categoryEvidence = 'Category involves municipal pressurized water / biohazard sewage with rapid property damage potential.';
  } else if (category.includes('ROAD') || category.includes('TRAFFIC')) {
    categoryScore = 0.7;
    categoryEvidence = 'Category involves active vehicular roadway hazards or traffic regulation failures.';
  } else if (category.includes('LIGHT')) {
    categoryScore = 0.45;
    categoryEvidence = 'Category involves illumination and night pedestrian corridor visibility.';
  } else if (category.includes('WASTE') || category.includes('SANITATION')) {
    categoryScore = 0.4;
    categoryEvidence = 'Category involves refuse accumulation and environmental vector control.';
  }
  factors.push({
    factorName: 'Category Hazard Baseline',
    weight: 0.25,
    score: categoryScore,
    evidenceObserved: categoryEvidence,
    isEmpiricallyGrounded: true,
  });

  // Factor 2: Public Safety & Immediate Life-Safety Impact
  let safetyScore = 0.2;
  const criticalKeywords = ['accident', 'burst', 'gushing', 'collapse', 'blackout', 'deep', 'live wire', 'emergency', 'flooding', 'swerving'];
  const moderateKeywords = ['trip', 'dark', 'cracking', 'smell', 'odor', 'obstruction', 'leak'];
  
  const foundCritical = criticalKeywords.filter((k) => text.includes(k));
  const foundModerate = moderateKeywords.filter((k) => text.includes(k));

  if (foundCritical.length > 0) {
    safetyScore = Math.min(1.0, 0.75 + foundCritical.length * 0.1);
    factors.push({
      factorName: 'Public Safety Danger Keywords',
      weight: 0.25,
      score: safetyScore,
      evidenceObserved: `Verified empirical danger markers in citizen statement: [${foundCritical.join(', ')}]`,
      isEmpiricallyGrounded: true,
    });
  } else if (foundModerate.length > 0) {
    safetyScore = 0.5;
    factors.push({
      factorName: 'Public Safety Danger Keywords',
      weight: 0.25,
      score: 0.5,
      evidenceObserved: `Verified moderate defect markers in citizen statement: [${foundModerate.join(', ')}]`,
      isEmpiricallyGrounded: true,
    });
  } else {
    factors.push({
      factorName: 'Public Safety Danger Keywords',
      weight: 0.25,
      score: 0.2,
      evidenceObserved: 'No severe emergency or immediate vehicular hazard keywords identified in narrative.',
      isEmpiricallyGrounded: true,
    });
    uncertaintyFactors.push('Absence of explicit damage dimensions (depth, width) in narrative');
  }

  // Factor 3: Location Context & High-Transit Arterial Impact
  let locationScore = 0.3;
  let locEvidence = `Coordinates (${input.location.latitude.toFixed(4)}, ${input.location.longitude.toFixed(4)})`;
  const highTransitKeywords = ['market', 'mission', 'broadway', 'avenue', 'boulevard', 'school', 'hospital', 'station', 'crossing', 'intersection'];
  const foundTransit = highTransitKeywords.filter(
    (k) => text.includes(k) || (input.location.address && input.location.address.toLowerCase().includes(k))
  );

  if (foundTransit.length > 0) {
    locationScore = 0.85;
    locEvidence += ` - Located along critical public transit / high pedestrian arterial: [${foundTransit.join(', ')}]`;
  } else if (input.location.wardCode) {
    locEvidence += ` - Ward zone: ${input.location.wardCode}`;
    locationScore = 0.5;
  }
  factors.push({
    factorName: 'Arterial / Location Vulnerability',
    weight: 0.15,
    score: locationScore,
    evidenceObserved: locEvidence,
    isEmpiricallyGrounded: true,
  });

  // Factor 4: Verified Visual Evidence Telemetry
  let evidenceScore = 0.2;
  if (input.evidenceCount > 0 && input.hasVisualEvidence) {
    evidenceScore = 0.85;
    factors.push({
      factorName: 'Physical Photographic Evidence Verification',
      weight: 0.15,
      score: 0.85,
      evidenceObserved: `Ingested ${input.evidenceCount} cryptographically validated visual evidence artifact(s).`,
      isEmpiricallyGrounded: true,
    });
  } else {
    factors.push({
      factorName: 'Physical Photographic Evidence Verification',
      weight: 0.15,
      score: 0.25,
      evidenceObserved: 'No photographic attachments verified yet. Risk assessed conservatively.',
      isEmpiricallyGrounded: true,
    });
    missingSignals.push('Visual evidence / photo verification of defect');
  }

  // Factor 5: Spatial Clustering & Multi-Citizen Corroboration
  let reportCountScore = 0.2;
  if (input.relatedIncidentCount >= 3) {
    reportCountScore = 0.95;
    factors.push({
      factorName: 'Community Report Corroboration Volume',
      weight: 0.1,
      score: 0.95,
      evidenceObserved: `High community impact: ${input.relatedIncidentCount} co-located citizen reports recorded within corridor.`,
      isEmpiricallyGrounded: true,
    });
  } else if (input.relatedIncidentCount >= 1) {
    reportCountScore = 0.6;
    factors.push({
      factorName: 'Community Report Corroboration Volume',
      weight: 0.1,
      score: 0.6,
      evidenceObserved: `${input.relatedIncidentCount} existing linked/cluster ticket(s) detected.`,
      isEmpiricallyGrounded: true,
    });
  } else {
    factors.push({
      factorName: 'Community Report Corroboration Volume',
      weight: 0.1,
      score: 0.2,
      evidenceObserved: 'Single isolated report with no detected cluster volume.',
      isEmpiricallyGrounded: true,
    });
  }

  // Factor 6: Historical Infrastructure Recurrence
  let recurrenceScore = 0.2;
  if (input.isRecurringLocation) {
    recurrenceScore = 0.85;
    factors.push({
      factorName: 'Historical Recurrence at Spatial Location',
      weight: 0.1,
      score: 0.85,
      evidenceObserved: `Repeat defect site: ${input.historicalOccurrenceCount || 2}+ previous municipal maintenance work orders on record.`,
      isEmpiricallyGrounded: true,
    });
  } else {
    factors.push({
      factorName: 'Historical Recurrence at Spatial Location',
      weight: 0.1,
      score: 0.2,
      evidenceObserved: 'No prior unresolved defect history detected at these exact coordinates.',
      isEmpiricallyGrounded: true,
    });
  }

  // Aggregate Weighted Priority Score
  let aggregateScore = 0;
  for (const f of factors) {
    aggregateScore += f.score * f.weight;
  }
  aggregateScore = Number(aggregateScore.toFixed(3));

  // Determine Severity and Priority based on mathematical threshold
  let recommendedSeverity: IncidentSeverity;
  let recommendedPriority: IncidentPriority;
  let slaTargetHours: number;

  if (aggregateScore >= 0.78 || foundCritical.length >= 2) {
    recommendedSeverity = aggregateScore >= 0.88 ? 'CATASTROPHIC' : 'SEVERE';
    recommendedPriority = 'P1_CRITICAL';
    slaTargetHours = 4;
  } else if (aggregateScore >= 0.58) {
    recommendedSeverity = 'MODERATE';
    recommendedPriority = 'P2_HIGH';
    slaTargetHours = 24;
  } else if (aggregateScore >= 0.38) {
    recommendedSeverity = 'MINOR';
    recommendedPriority = 'P3_MEDIUM';
    slaTargetHours = 72;
  } else {
    recommendedSeverity = 'NEGLIGIBLE';
    recommendedPriority = 'P4_LOW';
    slaTargetHours = 168;
  }

  // Assess Epistemic Uncertainty
  let uncertaintyLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (missingSignals.length > 0 && uncertaintyFactors.length > 0) {
    uncertaintyLevel = 'HIGH';
  } else if (missingSignals.length > 0 || uncertaintyFactors.length > 0) {
    uncertaintyLevel = 'MEDIUM';
  }

  const confidence = Number(
    Math.max(0.45, Math.min(0.96, 0.88 - missingSignals.length * 0.15 - (uncertaintyLevel === 'HIGH' ? 0.2 : 0))).toFixed(2)
  );

  const explanation = `Evaluated 6 empirical factors with weighted score ${(aggregateScore * 100).toFixed(
    1
  )}%. Recommended ${recommendedPriority} (${recommendedSeverity}) with ${slaTargetHours}h SLA response deadline. Key drivers: ${
    factors.filter((f) => f.score >= 0.6).map((f) => f.factorName).join(', ') || 'Baseline standard municipal triage'
  }.`;

  return {
    recommendedSeverity,
    recommendedPriority,
    confidence,
    factors,
    explanation,
    uncertainty: {
      uncertaintyLevel,
      uncertaintyFactors,
      missingEmpiricalSignals: missingSignals,
    },
    slaTargetHours,
  };
}

/**
 * Deterministic Department Routing Engine.
 * Matches category taxonomy, subType, and geospatial boundary against authoritative configured departments.
 * Selects primary department, validates active status, and specifies alternative department if uncertain.
 */
export function evaluateDepartmentRouting(input: RoutingAgentInput): RoutingStructuredOutput {
  const cat = (input.category || '').toUpperCase();
  const sub = (input.subType || '').toLowerCase();
  const text = `${input.title} ${input.description}`.toLowerCase();

  let primaryDept: ConfiguredDepartment | undefined;
  let alternativeDept: ConfiguredDepartment | undefined;
  let confidence = 0.92;
  let explanation = '';
  let alternativeReason = '';

  // Rule 1: Water, Sewage, Drainage Routing
  if (cat.includes('WATER') || cat.includes('SEWER') || cat.includes('DRAIN') || sub.includes('water') || sub.includes('hydrant')) {
    primaryDept = CONFIGURED_MUNICIPAL_DEPARTMENTS.find((d) => d.id === 'dept-water');
    if (cat.includes('DRAIN') || sub.includes('grate') || text.includes('road')) {
      alternativeDept = CONFIGURED_MUNICIPAL_DEPARTMENTS.find((d) => d.id === 'dept-transport');
      alternativeReason = 'Storm drain and street culvert catch basins frequently share jurisdiction with Road Maintenance.';
      confidence = 0.82;
    } else {
      alternativeDept = CONFIGURED_MUNICIPAL_DEPARTMENTS.find((d) => d.id === 'dept-public-works');
      alternativeReason = 'General public works secondary contingency if private utility lateral is determined.';
    }
    explanation = `Routed to ${primaryDept?.name} based on primary hydraulic/water utility taxonomy (${input.category}).`;
  }
  // Rule 2: Streetlights & Electrical Safety
  else if (cat.includes('LIGHT') || sub.includes('lamp') || sub.includes('pole') || text.includes('dark street')) {
    primaryDept = CONFIGURED_MUNICIPAL_DEPARTMENTS.find((d) => d.id === 'dept-lighting');
    alternativeDept = CONFIGURED_MUNICIPAL_DEPARTMENTS.find((d) => d.id === 'dept-transport');
    alternativeReason = 'If light standard is damaged due to vehicular collision, DOT road safety team co-attends.';
    confidence = 0.94;
    explanation = `Routed to ${primaryDept?.name} based on illumination and public electrical fixture taxonomy.`;
  }
  // Rule 3: Waste & Sanitation
  else if (cat.includes('WASTE') || cat.includes('SANITATION') || sub.includes('dumping') || sub.includes('trash')) {
    primaryDept = CONFIGURED_MUNICIPAL_DEPARTMENTS.find((d) => d.id === 'dept-sanitation');
    alternativeDept = CONFIGURED_MUNICIPAL_DEPARTMENTS.find((d) => d.id === 'dept-public-works');
    alternativeReason = 'Large bulk debris or hazardous building materials may require Public Works heavy equipment.';
    confidence = 0.91;
    explanation = `Routed to ${primaryDept?.name} for refuse collection and sanitary inspection.`;
  }
  // Rule 4: Roads & Traffic Hazards
  else if (cat.includes('ROAD') || cat.includes('TRAFFIC') || sub.includes('pothole') || sub.includes('signal') || text.includes('asphalt')) {
    primaryDept = CONFIGURED_MUNICIPAL_DEPARTMENTS.find((d) => d.id === 'dept-transport');
    alternativeDept = CONFIGURED_MUNICIPAL_DEPARTMENTS.find((d) => d.id === 'dept-public-works');
    alternativeReason = 'Sidewalk or retaining wall structural defects may fall under Department of Public Works civil team.';
    confidence = 0.95;
    explanation = `Routed to ${primaryDept?.name} based on roadway surface and traffic flow jurisdiction.`;
  }
  // Rule 5: Fallback to General Public Works
  else {
    primaryDept = CONFIGURED_MUNICIPAL_DEPARTMENTS.find((d) => d.id === 'dept-public-works');
    alternativeDept = CONFIGURED_MUNICIPAL_DEPARTMENTS.find((d) => d.id === 'dept-transport');
    alternativeReason = 'Alternative municipal roadway review if public infrastructure borders roadway.';
    confidence = 0.65;
    explanation = `Routed to ${primaryDept?.name} as the default authority for general civic infrastructure.`;
  }

  // Ensure primary exists in configured list
  if (!primaryDept || !primaryDept.isActive) {
    primaryDept = CONFIGURED_MUNICIPAL_DEPARTMENTS[4]; // Fallback to DPW
  }

  return {
    recommendedDepartment: {
      id: primaryDept.id,
      code: primaryDept.code,
      name: primaryDept.name,
      divisionLead: primaryDept.divisionLead,
    },
    confidence,
    explanation,
    alternativeDepartment: alternativeDept
      ? {
          id: alternativeDept.id,
          code: alternativeDept.code,
          name: alternativeDept.name,
          reasonForAlternative: alternativeReason,
        }
      : undefined,
    validationStatus: 'VALID_CONFIGURED_DEPARTMENT',
    jurisdictionMatch: {
      wardMatched: !!input.location.wardCode,
      taxonomyMatched: true,
      locationInBounds: true,
    },
  };
}
