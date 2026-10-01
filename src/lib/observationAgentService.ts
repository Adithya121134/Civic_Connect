import {
  CivicIssueCategory,
  InformationSufficiencyStatus,
  ObservationRecommendedNextAction,
  ObservationStructuredOutput,
  RawCitizenObservationInput,
} from '../types/observationAgent';
import { toolRegistry } from './toolRegistry';
import { AgentExecutionContext } from '../types/agentOrchestrator';

interface CategoryLexiconRule {
  category: CivicIssueCategory;
  label: string;
  subTypes: { name: string; triggers: string[]; defaultUrgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }[];
  primaryKeywords: string[];
}

const CATEGORY_LEXICON: CategoryLexiconRule[] = [
  {
    category: 'ROAD_DAMAGE',
    label: 'Road Damage',
    primaryKeywords: ['pothole', 'crack', 'asphalt', 'pavement', 'subsidence', 'crater', 'rut', 'bump', 'curb'],
    subTypes: [
      { name: 'Pothole on Roadway', triggers: ['pothole', 'hole in road', 'crater', 'asphalt collapse'], defaultUrgency: 'HIGH' },
      { name: 'Curb / Sidewalk Deterioration', triggers: ['curb', 'sidewalk', 'walkway', 'paver', 'slab'], defaultUrgency: 'MEDIUM' },
      { name: 'Road Surface Fissure / Cracking', triggers: ['crack', 'alligator crack', 'fissure', 'seam'], defaultUrgency: 'LOW' },
    ],
  },
  {
    category: 'DRAINAGE',
    label: 'Drainage',
    primaryKeywords: ['drain', 'culvert', 'gutter', 'runoff', 'clogged', 'grate', 'catch basin', 'stormwater'],
    subTypes: [
      { name: 'Clogged Storm Drain', triggers: ['clogged', 'leaves', 'trash in drain', 'grate blocked'], defaultUrgency: 'HIGH' },
      { name: 'Broken Culvert / Gutter', triggers: ['broken grate', 'collapsed culvert', 'gutter damaged'], defaultUrgency: 'MEDIUM' },
      { name: 'Inadequate Stormwater Runoff', triggers: ['overflow', 'ponding', 'water not draining'], defaultUrgency: 'HIGH' },
    ],
  },
  {
    category: 'WATER_LEAKAGE',
    label: 'Water Leakage',
    primaryKeywords: ['water pipe', 'main break', 'gushing water', 'hydrant', 'spraying', 'leaking meter', 'burst'],
    subTypes: [
      { name: 'Water Main Rupture', triggers: ['main burst', 'gushing', 'high pressure', 'flooding road'], defaultUrgency: 'CRITICAL' },
      { name: 'Municipal Hydrant Leak', triggers: ['hydrant', 'fire hydrant leaking'], defaultUrgency: 'HIGH' },
      { name: 'Service Pipe Seepage', triggers: ['trickle', 'meter leaking', 'puddle on dry day'], defaultUrgency: 'MEDIUM' },
    ],
  },
  {
    category: 'SEWAGE',
    label: 'Sewage & Wastewater',
    primaryKeywords: ['sewer', 'manhole', 'foul odor', 'blackwater', 'sewage overflow', 'waste backup', 'stench'],
    subTypes: [
      { name: 'Sanitary Sewer Overflow', triggers: ['overflowing manhole', 'raw sewage', 'blackwater'], defaultUrgency: 'CRITICAL' },
      { name: 'Manhole Cover Displacement', triggers: ['manhole off', 'open lid', 'dangerous hole'], defaultUrgency: 'CRITICAL' },
      { name: 'Toxic Odor / Drain Fumes', triggers: ['stench', 'foul smell', 'chemical vapor'], defaultUrgency: 'HIGH' },
    ],
  },
  {
    category: 'STREETLIGHT',
    label: 'Streetlight & Illumination',
    primaryKeywords: ['streetlight', 'lamp', 'dark street', 'flickering', 'pole damaged', 'bulb out', 'lighting'],
    subTypes: [
      { name: 'Complete Dark Corridor (Pedestrian Hazard)', triggers: ['pitch black', 'multiple lights out', 'unsafe walkway'], defaultUrgency: 'HIGH' },
      { name: 'Damaged Light Pole / Exposed Wire', triggers: ['pole leaning', 'exposed wires', 'hit by car'], defaultUrgency: 'CRITICAL' },
      { name: 'Single Lamp Out / Flickering', triggers: ['flickering', 'bulb dead', 'single lamp'], defaultUrgency: 'LOW' },
    ],
  },
  {
    category: 'WASTE',
    label: 'Waste & Illegal Dumping',
    primaryKeywords: ['dumping', 'trash', 'garbage', 'mattress', 'debris', 'litter pile', 'rubbish', 'overflowing bin'],
    subTypes: [
      { name: 'Illegal Commercial / Bulk Dumping', triggers: ['tires', 'mattress', 'bulk', 'construction debris'], defaultUrgency: 'MEDIUM' },
      { name: 'Overflowing Public Receptacle', triggers: ['bin overflowing', 'trash can full', 'litter spilling'], defaultUrgency: 'LOW' },
      { name: 'Biohazard / Chemical Spillage', triggers: ['hazard', 'syringe', 'chemical drums', 'batteries'], defaultUrgency: 'CRITICAL' },
    ],
  },
  {
    category: 'TRAFFIC_RELATED',
    label: 'Traffic-Related Civic Issue',
    primaryKeywords: ['traffic light', 'signal', 'stop sign', 'blocked lane', 'crosswalk', 'speed bump', 'bollard'],
    subTypes: [
      { name: 'Traffic Signal Failure (Blackout / Flashing)', triggers: ['light stuck', 'signal off', 'flashing red', 'intersection dangerous'], defaultUrgency: 'CRITICAL' },
      { name: 'Downed or Missing Regulatory Sign', triggers: ['stop sign knocked down', 'one way missing', 'blind turn'], defaultUrgency: 'HIGH' },
      { name: 'Damaged Bollard / Guardrail', triggers: ['guardrail dented', 'bollard sheared', 'barrier broken'], defaultUrgency: 'MEDIUM' },
    ],
  },
  {
    category: 'PUBLIC_INFRASTRUCTURE',
    label: 'Public Infrastructure',
    primaryKeywords: ['bridge', 'sidewalk railing', 'overpass', 'bench', 'bus shelter', 'stairs', 'retaining wall'],
    subTypes: [
      { name: 'Structural Integrity Defect (Bridge/Wall)', triggers: ['cracking bridge', 'retaining wall leaning', 'concrete falling'], defaultUrgency: 'CRITICAL' },
      { name: 'Damaged Transit Shelter / Public Furniture', triggers: ['bus stop glass broken', 'bench vandalized'], defaultUrgency: 'MEDIUM' },
      { name: 'Pedestrian Railing / Stair Collapse', triggers: ['handrail loose', 'steps crumbling', 'fall risk'], defaultUrgency: 'HIGH' },
    ],
  },
  {
    category: 'SANITATION',
    label: 'Sanitation',
    primaryKeywords: ['stagnant water', 'mosquito', 'dead animal', 'pest', 'feces', 'graffiti on facility', 'unsanitary'],
    subTypes: [
      { name: 'Dead Animal Removal', triggers: ['carcass', 'dead animal', 'roadkill'], defaultUrgency: 'HIGH' },
      { name: 'Stagnant Vector Breeding Water', triggers: ['standing water', 'larvae', 'disease risk'], defaultUrgency: 'MEDIUM' },
      { name: 'Severe Biological Hazard', triggers: ['feces', 'unsanitary biohazard'], defaultUrgency: 'HIGH' },
    ],
  },
];

/**
 * CivicConnect Cognitive Observation Analyzer
 * Converts unstructured citizen narratives, voice transcriptions, and evidence cues into normalized taxonomy.
 */
export function analyzeCitizenObservation(input: RawCitizenObservationInput): ObservationStructuredOutput {
  const reasoning: string[] = [];
  const combinedText = `${input.citizenText} ${input.transcribedAudioText || ''}`.trim().toLowerCase();
  
  // 1. Entity Extraction
  const landmarks: string[] = [];
  const infrastructure: string[] = [];
  const safetyWords: string[] = [];

  const commonLandmarks = ['corner', 'intersection', 'school', 'hospital', 'park', 'station', 'crosswalk', 'bridge', 'plaza'];
  commonLandmarks.forEach((lm) => {
    if (combinedText.includes(lm)) landmarks.push(lm);
  });

  const infraTerms = ['manhole', 'pavement', 'pole', 'grate', 'curb', 'hydrant', 'signal', 'asphalt', 'pipe', 'wall'];
  infraTerms.forEach((t) => {
    if (combinedText.includes(t)) infrastructure.push(t);
  });

  const dangerTerms = ['dangerous', 'accident', 'deep', 'tire', 'hazard', 'severe', 'flooding', 'fall', 'urgent', 'blind'];
  dangerTerms.forEach((d) => {
    if (combinedText.includes(d)) safetyWords.push(d);
  });

  // 2. Multi-Class Keyword Density Scoring
  const categoryScores: { category: CivicIssueCategory; score: number; matchedSubtype: string; urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }[] = [];

  for (const rule of CATEGORY_LEXICON) {
    let score = 0;
    let bestSubtype = rule.subTypes[0].name;
    let bestUrgency = rule.subTypes[0].defaultUrgency;

    // Check primary keywords
    for (const kw of rule.primaryKeywords) {
      if (combinedText.includes(kw)) {
        score += 1.5;
      }
    }

    // Check subtype triggers
    for (const st of rule.subTypes) {
      for (const trig of st.triggers) {
        if (combinedText.includes(trig)) {
          score += 2.5;
          bestSubtype = st.name;
          bestUrgency = st.defaultUrgency;
        }
      }
    }

    categoryScores.push({
      category: rule.category,
      score,
      matchedSubtype: bestSubtype,
      urgency: bestUrgency,
    });
  }

  // Sort by highest keyword score
  categoryScores.sort((a, b) => b.score - a.score);
  const topCandidate = categoryScores[0];
  const runnerUp = categoryScores[1];

  // 3. Evidence Inspection
  const images = input.imageEvidenceList || [];
  const hasImages = images.length > 0;
  const hasAudio = !!input.hasAudioAttachment || !!input.transcribedAudioText;
  const hasGps = !!input.declaredLocation?.latitude && !!input.declaredLocation?.longitude;

  // Build Visible Evidence Summary
  let visibleEvidenceSummary = 'No photographic attachments provided.';
  if (hasImages) {
    const filenames = images.map((i) => i.originalFilename).join(', ');
    const hasGpsTags = images.some((i) => i.geoMetadata?.latitude);
    visibleEvidenceSummary = `Ingested ${images.length} verified image file(s): [${filenames}]. ${
      hasGpsTags ? 'EXIF geospatial camera tags verified.' : 'No EXIF GPS tags embedded in files.'
    }`;
  }
  if (hasAudio) {
    visibleEvidenceSummary += ' Included speech audio recording with automatic transcription.';
  }

  // 4. Missing Information Diagnostics
  const missingInfo: string[] = [];
  if (!hasImages) {
    missingInfo.push('Photographic or video evidence of the reported defect.');
  }
  if (!hasGps && !input.declaredLocation?.address) {
    missingInfo.push('Precise GPS coordinates or physical street address.');
  }
  if (combinedText.length < 15) {
    missingInfo.push('More descriptive narrative regarding defect severity or size.');
  }

  // 5. Determine Epistemic Sufficiency & Confidence
  let sufficiencyStatus: InformationSufficiencyStatus;
  let confidence: number;
  let recommendedNextAction: ObservationRecommendedNextAction;

  // Case A: Barely any text and no photos -> INSUFFICIENT_INFORMATION
  if (combinedText.length < 12 && !hasImages) {
    sufficiencyStatus = 'INSUFFICIENT_INFORMATION';
    confidence = 0.28;
    recommendedNextAction = 'REQUEST_ADDITIONAL_EVIDENCE';
  }
  // Case B: Low text or competitive tie without visual proof -> UNCERTAIN_CLASSIFICATION
  else if (topCandidate.score < 2.0 || (runnerUp && Math.abs(topCandidate.score - runnerUp.score) < 0.8 && topCandidate.score < 3.5)) {
    sufficiencyStatus = 'UNCERTAIN_CLASSIFICATION';
    confidence = 0.54;
    recommendedNextAction = hasImages ? 'ROUTE_FOR_OFFICER_REVIEW' : 'REQUEST_ADDITIONAL_EVIDENCE';
  }
  // Case C: Clear category detected
  else {
    confidence = Math.min(0.96, 0.70 + topCandidate.score * 0.05 + (hasImages ? 0.15 : 0.0));
    if (confidence >= 0.75 && (hasGps || input.declaredLocation?.address)) {
      sufficiencyStatus = 'SUFFICIENT_INFORMATION';
      recommendedNextAction = hasImages ? 'PROCEED_TO_EVIDENCE_ANALYSIS' : 'PROCEED_TO_DEDUPLICATION';
    } else if (!hasGps) {
      sufficiencyStatus = 'INSUFFICIENT_INFORMATION';
      recommendedNextAction = 'REQUEST_LOCATION_CLARIFICATION';
    } else {
      sufficiencyStatus = 'UNCERTAIN_CLASSIFICATION';
      recommendedNextAction = 'ROUTE_FOR_OFFICER_REVIEW';
    }
  }

  // Fallback category if none matched
  const finalCategory: CivicIssueCategory = topCandidate.score > 0 ? topCandidate.category : 'OTHER';
  const categoryRule = CATEGORY_LEXICON.find((r) => r.category === finalCategory);
  const categoryLabel = categoryRule ? categoryRule.label : 'General Civic Issue';
  const subType = topCandidate.score > 0 ? topCandidate.matchedSubtype : 'Unspecified Municipal Observation';

  // Format clean extracted title
  const words = input.citizenText.trim().split(/\s+/);
  const snippet = words.slice(0, 8).join(' ');
  const extractedTitle = `${categoryLabel}: ${snippet}${words.length > 8 ? '...' : ''}`;

  return {
    primaryCategory: finalCategory,
    categoryLabel,
    subType,
    extractedTitle,
    extractedDescription: input.citizenText.trim(),
    visibleEvidenceSummary,
    sufficiencyStatus,
    confidence,
    hazardUrgencyEstimate: topCandidate.urgency || 'MEDIUM',
    missingInformation: missingInfo,
    recommendedNextAction,
    entities: {
      landmarksMentioned: landmarks,
      infrastructureElements: infrastructure,
      safetyKeywordsFound: safetyWords,
    },
  };
}
