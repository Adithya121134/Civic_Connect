import { CivicIncident, ControlledIncidentStatus, IncidentSeverity } from '../types/incident';
import {
  PatternSupportingEvidence,
  PreventiveInvestigationRecommendation,
  RecurrenceConfidenceLevel,
  RecurrenceDetectionRunReport,
  RecurrenceGeographicCluster,
  RecurrencePatternType,
  RecurrenceTemporalMetrics,
  RecurringIssue,
} from '../types/recurringProblem';

/**
 * Calculates Great Circle distance between two geographic coordinates using the Haversine formula (meters).
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Historical seed dataset simulating multi-month municipal telemetry.
 * Captures real-world recurring civic infrastructure challenges:
 * 1. Chronic arterial road surface failure (4 potholes within 45m on Market & 4th over 90 days)
 * 2. Repeated storm drain flooding & backup (3 reports at 6th & Mission underpass over 60 days)
 * 3. Chronic waste accumulation (4 illegal dumping reports at 16th & Mission plaza)
 * 4. Intermittent pedestrian lighting failure (3 illumination dropouts at Buena Vista Tunnel)
 */
export function generateHistoricalCivicDataset(): CivicIncident[] {
  const now = Date.now();
  const dayMs = 86400000;

  const rawList: Array<Omit<CivicIncident, 'childIncidentIds' | 'duplicateIncidentIds'>> = [
    // --- Cluster 1: Market & 4th St Road Surface Degradation (DOT) ---
    {
      id: 'inc-hist-road-01',
      trackingNumber: 'CIV-2026-0102',
      title: 'Deep asphalt pothole near bus stop curb',
      description: 'Vehicle tire impact hazard at intersection bus boarding zone.',
      status: 'CLOSED',
      category: 'ROAD_HAZARD',
      priority: 'P2_HIGH',
      severity: 'SEVERE',
      confidenceScore: 0.95,
      location: { latitude: 37.7858, longitude: -122.4065, address: 'Market St & 4th St (Eastbound lane)' },
      citizenAuthorId: 'c-01', citizenAuthorEmail: 'transit_rider@gmail.com', citizenAuthorName: 'David Lee', isCitizenVerified: true,
      departmentId: 'dept-roads', departmentName: 'Department of Transportation & Roads',
      sla: { policyId: 'p2', policyName: 'P2', targetAckMinutes: 30, targetTriageMinutes: 60, targetResolutionHours: 24, ackDeadline: '', triageDeadline: '', resolutionDeadline: '', isBreached: false },
      evidence: [], reopenCount: 0, escalationCount: 0,
      resolutionSummary: 'Temporary cold-patch asphalt compaction applied.',
      createdAt: new Date(now - 78 * dayMs).toISOString(),
      updatedAt: new Date(now - 77 * dayMs).toISOString(),
      closedAt: new Date(now - 77 * dayMs).toISOString(),
    },
    {
      id: 'inc-hist-road-02',
      trackingNumber: 'CIV-2026-0341',
      title: 'Pothole patch disintegrating with exposed aggregate',
      description: 'Previous cold-patch has unraveled following light rain; crater reopened to 8 inch depth.',
      status: 'CLOSED',
      category: 'ROAD_HAZARD',
      priority: 'P2_HIGH',
      severity: 'SEVERE',
      confidenceScore: 0.96,
      location: { latitude: 37.7859, longitude: -122.4066, address: 'Market St & 4th St (Center lane)' },
      citizenAuthorId: 'c-02', citizenAuthorEmail: 'cyclist.sf@gmail.com', citizenAuthorName: 'Chloe Bennett', isCitizenVerified: true,
      departmentId: 'dept-roads', departmentName: 'Department of Transportation & Roads',
      sla: { policyId: 'p2', policyName: 'P2', targetAckMinutes: 30, targetTriageMinutes: 60, targetResolutionHours: 24, ackDeadline: '', triageDeadline: '', resolutionDeadline: '', isBreached: false },
      evidence: [], reopenCount: 0, escalationCount: 0,
      resolutionSummary: 'Hot-mix surface troweling completed.',
      createdAt: new Date(now - 49 * dayMs).toISOString(),
      updatedAt: new Date(now - 48 * dayMs).toISOString(),
      closedAt: new Date(now - 48 * dayMs).toISOString(),
    },
    {
      id: 'inc-hist-road-03',
      trackingNumber: 'CIV-2026-0689',
      title: 'Transverse cracking and new cavity in asphalt',
      description: 'Severe depression and road surface sinking where earlier pothole repairs were undertaken.',
      status: 'CLOSED',
      category: 'ROAD_HAZARD',
      priority: 'P2_HIGH',
      severity: 'SEVERE',
      confidenceScore: 0.94,
      location: { latitude: 37.7857, longitude: -122.4064, address: 'Market St & 4th St (Near pedestrian crosswalk)' },
      citizenAuthorId: 'c-03', citizenAuthorEmail: 'merchant.alex@gmail.com', citizenAuthorName: 'Alex Mercer', isCitizenVerified: true,
      departmentId: 'dept-roads', departmentName: 'Department of Transportation & Roads',
      sla: { policyId: 'p2', policyName: 'P2', targetAckMinutes: 30, targetTriageMinutes: 60, targetResolutionHours: 24, ackDeadline: '', triageDeadline: '', resolutionDeadline: '', isBreached: false },
      evidence: [], reopenCount: 0, escalationCount: 0,
      resolutionSummary: 'Patch filled by Rapid Asphalt Unit.',
      createdAt: new Date(now - 22 * dayMs).toISOString(),
      updatedAt: new Date(now - 21 * dayMs).toISOString(),
      closedAt: new Date(now - 21 * dayMs).toISOString(),
    },
    {
      id: 'inc-hist-road-04',
      trackingNumber: 'CIV-2026-0955',
      title: 'Large structural pothole reopened at 4th and Market',
      description: 'Subsurface gravel spitting out from repeated transit bus axle loading.',
      status: 'INVESTIGATING',
      category: 'ROAD_HAZARD',
      priority: 'P2_HIGH',
      severity: 'CATASTROPHIC',
      confidenceScore: 0.98,
      location: { latitude: 37.7858, longitude: -122.4065, address: 'Market St & 4th St' },
      citizenAuthorId: 'c-04', citizenAuthorEmail: 'downtown.resident@gmail.com', citizenAuthorName: 'Sarah Jenkins', isCitizenVerified: true,
      departmentId: 'dept-roads', departmentName: 'Department of Transportation & Roads',
      sla: { policyId: 'p2', policyName: 'P2', targetAckMinutes: 30, targetTriageMinutes: 60, targetResolutionHours: 24, ackDeadline: '', triageDeadline: '', resolutionDeadline: '', isBreached: false },
      evidence: [], reopenCount: 0, escalationCount: 0,
      createdAt: new Date(now - 2 * dayMs).toISOString(),
      updatedAt: new Date(now - 1 * dayMs).toISOString(),
    },

    // --- Cluster 2: 6th & Mission Storm Drain Backups / Flooding (DWaterP / DPW) ---
    {
      id: 'inc-hist-flood-01',
      trackingNumber: 'CIV-2026-0188',
      title: 'Standing water ponding over curb and sidewalk',
      description: 'Catch basin grating clogged with sediment; water ponding up to 5 inches during mild precipitation.',
      status: 'CLOSED',
      category: 'WATER_UTILITY',
      priority: 'P1_CRITICAL',
      severity: 'SEVERE',
      confidenceScore: 0.92,
      location: { latitude: 37.7812, longitude: -122.4089, address: '6th St & Mission St (Southwest corner)' },
      citizenAuthorId: 'c-05', citizenAuthorEmail: 'mission_biz@gmail.com', citizenAuthorName: 'Carlos Santos', isCitizenVerified: true,
      departmentId: 'dept-water', departmentName: 'Department of Water & Power',
      sla: { policyId: 'p1', policyName: 'P1', targetAckMinutes: 15, targetTriageMinutes: 30, targetResolutionHours: 4, ackDeadline: '', triageDeadline: '', resolutionDeadline: '', isBreached: false },
      evidence: [], reopenCount: 0, escalationCount: 0,
      resolutionSummary: 'Vacuum truck cleared surface grating and debris trap.',
      createdAt: new Date(now - 64 * dayMs).toISOString(),
      updatedAt: new Date(now - 63 * dayMs).toISOString(),
      closedAt: new Date(now - 63 * dayMs).toISOString(),
    },
    {
      id: 'inc-hist-flood-02',
      trackingNumber: 'CIV-2026-0492',
      title: 'Catch basin overflow flooding crosswalk',
      description: 'Drainage outlet bubbling backward; pedestrian crosswalk impassable.',
      status: 'CLOSED',
      category: 'WATER_UTILITY',
      priority: 'P1_CRITICAL',
      severity: 'SEVERE',
      confidenceScore: 0.95,
      location: { latitude: 37.7813, longitude: -122.4088, address: '6th St & Mission St (Intersection)' },
      citizenAuthorId: 'c-06', citizenAuthorEmail: 'pedestrian.voice@gmail.com', citizenAuthorName: 'Emily Clark', isCitizenVerified: true,
      departmentId: 'dept-water', departmentName: 'Department of Water & Power',
      sla: { policyId: 'p1', policyName: 'P1', targetAckMinutes: 15, targetTriageMinutes: 30, targetResolutionHours: 4, ackDeadline: '', triageDeadline: '', resolutionDeadline: '', isBreached: false },
      evidence: [], reopenCount: 0, escalationCount: 0,
      resolutionSummary: 'Emergency pump down completed; debris skimmed.',
      createdAt: new Date(now - 35 * dayMs).toISOString(),
      updatedAt: new Date(now - 34 * dayMs).toISOString(),
      closedAt: new Date(now - 34 * dayMs).toISOString(),
    },
    {
      id: 'inc-hist-flood-03',
      trackingNumber: 'CIV-2026-0811',
      title: 'Persistent road flooding at 6th and Mission',
      description: 'Third water accumulation event this season. Water unable to discharge into municipal culvert.',
      status: 'IN_PROGRESS',
      category: 'WATER_UTILITY',
      priority: 'P1_CRITICAL',
      severity: 'CATASTROPHIC',
      confidenceScore: 0.97,
      location: { latitude: 37.7811, longitude: -122.4090, address: '6th St & Mission St' },
      citizenAuthorId: 'c-07', citizenAuthorEmail: 'storefront.owner@gmail.com', citizenAuthorName: 'Nadia Patel', isCitizenVerified: true,
      departmentId: 'dept-water', departmentName: 'Department of Water & Power',
      sla: { policyId: 'p1', policyName: 'P1', targetAckMinutes: 15, targetTriageMinutes: 30, targetResolutionHours: 4, ackDeadline: '', triageDeadline: '', resolutionDeadline: '', isBreached: false },
      evidence: [], reopenCount: 0, escalationCount: 0,
      createdAt: new Date(now - 4 * dayMs).toISOString(),
      updatedAt: new Date(now - 1 * dayMs).toISOString(),
    },

    // --- Cluster 3: 16th & Mission Plaza Waste Accumulation (Sanitation) ---
    {
      id: 'inc-hist-waste-01',
      trackingNumber: 'CIV-2026-0205',
      title: 'Overflowing commercial refuse sacks on sidewalk',
      description: 'Piles of discarded packaging and discarded food waste blocking walkway.',
      status: 'CLOSED',
      category: 'SANITATION',
      priority: 'P3_MEDIUM',
      severity: 'MODERATE',
      confidenceScore: 0.90,
      location: { latitude: 37.7649, longitude: -122.4199, address: '16th St & Mission St BART Plaza' },
      citizenAuthorId: 'c-08', citizenAuthorEmail: 'clean_streets@gmail.com', citizenAuthorName: 'Samira Khan', isCitizenVerified: true,
      departmentId: 'dept-sanitation', departmentName: 'Department of Sanitation',
      sla: { policyId: 'p3', policyName: 'P3', targetAckMinutes: 60, targetTriageMinutes: 120, targetResolutionHours: 72, ackDeadline: '', triageDeadline: '', resolutionDeadline: '', isBreached: false },
      evidence: [], reopenCount: 0, escalationCount: 0,
      resolutionSummary: 'Compactor vehicle sweep and power-wash executed.',
      createdAt: new Date(now - 70 * dayMs).toISOString(),
      updatedAt: new Date(now - 68 * dayMs).toISOString(),
      closedAt: new Date(now - 68 * dayMs).toISOString(),
    },
    {
      id: 'inc-hist-waste-02',
      trackingNumber: 'CIV-2026-0422',
      title: 'Illegal dumping of bulky furniture and construction bags',
      description: 'Multiple wooden pallets and drywall debris left overnight at transit plaza.',
      status: 'CLOSED',
      category: 'SANITATION',
      priority: 'P2_HIGH',
      severity: 'MODERATE',
      confidenceScore: 0.93,
      location: { latitude: 37.7651, longitude: -122.4201, address: '16th St & Mission St (North entrance)' },
      citizenAuthorId: 'c-09', citizenAuthorEmail: 'commuter.tom@gmail.com', citizenAuthorName: 'Tom Rivera', isCitizenVerified: true,
      departmentId: 'dept-sanitation', departmentName: 'Department of Sanitation',
      sla: { policyId: 'p2', policyName: 'P2', targetAckMinutes: 30, targetTriageMinutes: 60, targetResolutionHours: 24, ackDeadline: '', triageDeadline: '', resolutionDeadline: '', isBreached: false },
      evidence: [], reopenCount: 0, escalationCount: 0,
      resolutionSummary: 'Bulky item removal team cleared area.',
      createdAt: new Date(now - 45 * dayMs).toISOString(),
      updatedAt: new Date(now - 44 * dayMs).toISOString(),
      closedAt: new Date(now - 44 * dayMs).toISOString(),
    },
    {
      id: 'inc-hist-waste-03',
      trackingNumber: 'CIV-2026-0750',
      title: 'Recurring waste overflow near plaza transit shelter',
      description: 'Trash receptacles overwhelmed with commercial dumping.',
      status: 'INVESTIGATING',
      category: 'SANITATION',
      priority: 'P3_MEDIUM',
      severity: 'MODERATE',
      confidenceScore: 0.91,
      location: { latitude: 37.7648, longitude: -122.4198, address: '16th St & Mission St BART Plaza' },
      citizenAuthorId: 'c-10', citizenAuthorEmail: 'neighborhood_watch@gmail.com', citizenAuthorName: 'Elena Rostova', isCitizenVerified: true,
      departmentId: 'dept-sanitation', departmentName: 'Department of Sanitation',
      sla: { policyId: 'p3', policyName: 'P3', targetAckMinutes: 60, targetTriageMinutes: 120, targetResolutionHours: 72, ackDeadline: '', triageDeadline: '', resolutionDeadline: '', isBreached: false },
      evidence: [], reopenCount: 0, escalationCount: 0,
      createdAt: new Date(now - 10 * dayMs).toISOString(),
      updatedAt: new Date(now - 9 * dayMs).toISOString(),
    },

    // --- Cluster 4: Buena Vista Tunnel Streetlight Outages (Lighting Bureau) ---
    {
      id: 'inc-hist-light-01',
      trackingNumber: 'CIV-2026-0155',
      title: 'Pedestrian tunnel illumination flicker and blackout',
      description: 'Fixtures buzzing loudly and flickering out completely after 8pm.',
      status: 'CLOSED',
      category: 'POWER_LIGHTING',
      priority: 'P2_HIGH',
      severity: 'MODERATE',
      confidenceScore: 0.88,
      location: { latitude: 37.7698, longitude: -122.4468, address: 'Buena Vista Tunnel Walkway' },
      citizenAuthorId: 'c-11', citizenAuthorEmail: 'evening_runner@gmail.com', citizenAuthorName: 'Liam O\'Connor', isCitizenVerified: true,
      departmentId: 'dept-transport', departmentName: 'Bureau of Street Lighting',
      sla: { policyId: 'p2', policyName: 'P2', targetAckMinutes: 30, targetTriageMinutes: 60, targetResolutionHours: 24, ackDeadline: '', triageDeadline: '', resolutionDeadline: '', isBreached: false },
      evidence: [], reopenCount: 0, escalationCount: 0,
      resolutionSummary: 'Bulb replaced by lighting technician.',
      createdAt: new Date(now - 82 * dayMs).toISOString(),
      updatedAt: new Date(now - 80 * dayMs).toISOString(),
      closedAt: new Date(now - 80 * dayMs).toISOString(),
    },
    {
      id: 'inc-hist-light-02',
      trackingNumber: 'CIV-2026-0510',
      title: 'Tunnel pathway dark again; lights tripping breaker',
      description: 'Fixtures non-responsive. Total darkness inside pedestrian tunnel walkway.',
      status: 'CLOSED',
      category: 'POWER_LIGHTING',
      priority: 'P2_HIGH',
      severity: 'SEVERE',
      confidenceScore: 0.94,
      location: { latitude: 37.7700, longitude: -122.4466, address: 'Buena Vista Tunnel Walkway' },
      citizenAuthorId: 'c-12', citizenAuthorEmail: 'night_safety@gmail.com', citizenAuthorName: 'Maya Lin', isCitizenVerified: true,
      departmentId: 'dept-transport', departmentName: 'Bureau of Street Lighting',
      sla: { policyId: 'p2', policyName: 'P2', targetAckMinutes: 30, targetTriageMinutes: 60, targetResolutionHours: 24, ackDeadline: '', triageDeadline: '', resolutionDeadline: '', isBreached: false },
      evidence: [], reopenCount: 0, escalationCount: 0,
      resolutionSummary: 'Reset circuit breaker and replaced ballast capacitor.',
      createdAt: new Date(now - 38 * dayMs).toISOString(),
      updatedAt: new Date(now - 37 * dayMs).toISOString(),
      closedAt: new Date(now - 37 * dayMs).toISOString(),
    },
    {
      id: 'inc-hist-light-03',
      trackingNumber: 'CIV-2026-0920',
      title: 'Repeated lighting circuit failure in tunnel',
      description: 'Underpass illumination cutting out intermittently again, creating severe night safety hazard.',
      status: 'IN_PROGRESS',
      category: 'POWER_LIGHTING',
      priority: 'P2_HIGH',
      severity: 'SEVERE',
      confidenceScore: 0.96,
      location: { latitude: 37.7699, longitude: -122.4467, address: 'Buena Vista Tunnel Walkway' },
      citizenAuthorId: 'c-13', citizenAuthorEmail: 'elena.rostova@gmail.com', citizenAuthorName: 'Elena Rostova', isCitizenVerified: true,
      departmentId: 'dept-transport', departmentName: 'Bureau of Street Lighting',
      sla: { policyId: 'p2', policyName: 'P2', targetAckMinutes: 30, targetTriageMinutes: 60, targetResolutionHours: 24, ackDeadline: '', triageDeadline: '', resolutionDeadline: '', isBreached: false },
      evidence: [], reopenCount: 0, escalationCount: 0,
      createdAt: new Date(now - 6 * dayMs).toISOString(),
      updatedAt: new Date(now - 2 * dayMs).toISOString(),
    },
  ];

  return rawList.map((item) => ({
    ...item,
    childIncidentIds: [],
    duplicateIncidentIds: [],
  }));
}

/**
 * CivicConnect Recurring Problem Intelligence Subsystem.
 * 
 * Core Design Invariants:
 * 1. Does not simply count complaints. Analyzes spatiotemporal density, repeat failure intervals,
 *    and resolution efficacy to identify meaningful recurring patterns.
 * 2. Grounded, non-speculative wording: Recommends investigative engineering surveys and operational
 *    audits without claiming unverified root causes.
 * 3. Preserves full audit trail and supporting evidence records.
 */
class RecurringProblemDetectionService {
  private detectedPatterns: RecurringIssue[] = [];
  private runHistory: RecurrenceDetectionRunReport[] = [];
  private listeners: Array<() => void> = [];

  // Configurable thresholds for meaningful recurrence
  private readonly CLUSTER_RADIUS_METERS = 100; // 100-meter geographic radius
  private readonly MIN_INCIDENTS_FOR_PATTERN = 3; // At least 3 independent incidents
  private readonly MAX_SPAN_DAYS = 180; // Within a 6-month historical observation window

  constructor() {
    this.runDetection(generateHistoricalCivicDataset());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('Recurrence listener error:', err);
      }
    }
  }

  /**
   * Run geographic clustering and frequency analysis over incident dataset.
   */
  public runDetection(incidents: CivicIncident[]): RecurrenceDetectionRunReport {
    const startTime = Date.now();
    const runId = `rec-run-${startTime}`;

    // 1. Group incidents by normalized category
    const categoryBuckets = new Map<string, CivicIncident[]>();
    for (const inc of incidents) {
      const cat = inc.category || 'OTHER';
      if (!categoryBuckets.has(cat)) {
        categoryBuckets.set(cat, []);
      }
      categoryBuckets.get(cat)!.push(inc);
    }

    const newRecurringPatterns: RecurringIssue[] = [];

    // 2. Perform density-based spatial clustering per category
    for (const [category, catIncidents] of categoryBuckets.entries()) {
      if (catIncidents.length < this.MIN_INCIDENTS_FOR_PATTERN) continue;

      const visited = new Set<string>();

      for (let i = 0; i < catIncidents.length; i++) {
        const primary = catIncidents[i];
        if (visited.has(primary.id)) continue;

        const clusterMembers: CivicIncident[] = [primary];
        visited.add(primary.id);

        for (let j = 0; j < catIncidents.length; j++) {
          if (i === j) continue;
          const candidate = catIncidents[j];
          if (visited.has(candidate.id)) continue;

          const distanceMeters = calculateHaversineDistanceMeters(
            primary.location.latitude,
            primary.location.longitude,
            candidate.location.latitude,
            candidate.location.longitude
          );

          if (distanceMeters <= this.CLUSTER_RADIUS_METERS) {
            clusterMembers.push(candidate);
            visited.add(candidate.id);
          }
        }

        // 3. Evaluate if cluster meets meaningful recurrence threshold
        if (clusterMembers.length >= this.MIN_INCIDENTS_FOR_PATTERN) {
          const pattern = this.synthesizeRecurringPattern(clusterMembers, category);
          if (pattern) {
            newRecurringPatterns.push(pattern);
          }
        }
      }
    }

    this.detectedPatterns = newRecurringPatterns;

    const criticalCount = newRecurringPatterns.filter(
      (p) => p.severityRating === 'CATASTROPHIC' || p.confidence === 'VERY_HIGH'
    ).length;

    const report: RecurrenceDetectionRunReport = {
      runId,
      executedAt: new Date(startTime).toISOString(),
      totalIncidentsScanned: incidents.length,
      clustersEvaluated: categoryBuckets.size,
      recurringPatternsIdentified: newRecurringPatterns.length,
      criticalPatternsCount: criticalCount,
      executionDurationMs: Date.now() - startTime,
    };

    this.runHistory.unshift(report);
    if (this.runHistory.length > 30) this.runHistory.pop();

    this.notify();
    return report;
  }

  /**
   * Evaluates cluster timestamps, frequency, interval variance, and resolution outcomes
   * to construct an objective, evidence-grounded RecurringIssue.
   */
  private synthesizeRecurringPattern(
    clusterMembers: CivicIncident[],
    category: string
  ): RecurringIssue | null {
    // Sort chronologically ascending
    const sorted = [...clusterMembers].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const firstDate = new Date(sorted[0].createdAt);
    const lastDate = new Date(sorted[sorted.length - 1].createdAt);
    const totalSpanDays = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 3600 * 24));

    if (totalSpanDays > this.MAX_SPAN_DAYS && clusterMembers.length < 5) {
      // Overly diluted sporadic occurrences
      return null;
    }

    // Compute intervals between successive reports
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].createdAt).getTime();
      const curr = new Date(sorted[i].createdAt).getTime();
      const diffDays = (curr - prev) / (1000 * 3600 * 24);
      intervals.push(Math.max(0.1, Number(diffDays.toFixed(1))));
    }

    const averageIntervalDays = intervals.length > 0
      ? Number((intervals.reduce((acc, v) => acc + v, 0) / intervals.length).toFixed(1))
      : 0;
    const minIntervalDays = intervals.length > 0 ? Math.min(...intervals) : 0;
    const maxIntervalDays = intervals.length > 0 ? Math.max(...intervals) : 0;
    const frequencyPerMonth = Number(((clusterMembers.length / totalSpanDays) * 30).toFixed(1));

    // Calculate cluster centroid
    const avgLat =
      clusterMembers.reduce((sum, inc) => sum + inc.location.latitude, 0) / clusterMembers.length;
    const avgLon =
      clusterMembers.reduce((sum, inc) => sum + inc.location.longitude, 0) / clusterMembers.length;

    // Calculate max radius from center
    let maxDist = 0;
    for (const inc of clusterMembers) {
      const d = calculateHaversineDistanceMeters(avgLat, avgLon, inc.location.latitude, inc.location.longitude);
      if (d > maxDist) maxDist = d;
    }

    // Determine Pattern Type
    const patternType = this.classifyPatternType(category, sorted);

    // Analyze Resolution History (Was it resolved, and did it recur anyway?)
    const resolvedPriorIncidents = sorted.filter(
      (inc) => inc.status === 'CLOSED' || inc.status === 'VERIFIED'
    );
    const hasRepeatedPostResolutionFailure = resolvedPriorIncidents.length >= 2;

    // Confidence Calculation based on multi-signal evidence
    let confidenceScore = 0.65;
    if (clusterMembers.length >= 4) confidenceScore += 0.15;
    if (hasRepeatedPostResolutionFailure) confidenceScore += 0.12;
    if (averageIntervalDays <= 30) confidenceScore += 0.08;
    confidenceScore = Math.min(0.99, Number(confidenceScore.toFixed(2)));

    let confidence: RecurrenceConfidenceLevel = 'MODERATE';
    if (confidenceScore >= 0.9) confidence = 'VERY_HIGH';
    else if (confidenceScore >= 0.8) confidence = 'HIGH';
    else if (confidenceScore >= 0.7) confidence = 'MODERATE';
    else confidence = 'LOW';

    // Supporting Evidence mapping
    const supportingEvidence: PatternSupportingEvidence[] = sorted.map((inc) => {
      const dist = calculateHaversineDistanceMeters(
        avgLat,
        avgLon,
        inc.location.latitude,
        inc.location.longitude
      );
      return {
        incidentId: inc.id,
        trackingNumber: inc.trackingNumber,
        title: inc.title,
        reportedAt: inc.createdAt,
        category: inc.category,
        severity: inc.severity,
        status: inc.status,
        distanceMetersFromClusterCenter: Math.round(dist),
        resolutionHistoryNote: inc.resolutionSummary || (inc.status === 'CLOSED' ? 'Marked closed in field log' : undefined),
        isResolvedBeforeRecurrence: inc.status === 'CLOSED' || inc.status === 'VERIFIED',
      };
    });

    // Highest severity present
    const severities: IncidentSeverity[] = sorted.map((s) => s.severity);
    const highestSeverity: IncidentSeverity = severities.includes('CATASTROPHIC')
      ? 'CATASTROPHIC'
      : severities.includes('SEVERE')
      ? 'SEVERE'
      : severities.includes('MODERATE')
      ? 'MODERATE'
      : 'MINOR';

    const approximateAddress = sorted[sorted.length - 1].location.address || `${avgLat.toFixed(4)}, ${avgLon.toFixed(4)}`;

    // Generate Evidence-Grounded Preventive Recommendation
    const preventiveRecommendation = this.generatePreventiveRecommendation({
      patternType,
      category,
      approximateAddress,
      clusterCount: clusterMembers.length,
      averageIntervalDays,
      totalSpanDays,
      hasRepeatedPostResolutionFailure,
      resolvedCount: resolvedPriorIncidents.length,
    });

    const temporalMetrics: RecurrenceTemporalMetrics = {
      firstObservedAt: firstDate.toISOString(),
      lastObservedAt: lastDate.toISOString(),
      totalSpanDays: Math.round(totalSpanDays),
      incidentCount: clusterMembers.length,
      averageIntervalDays,
      minIntervalDays,
      maxIntervalDays,
      recurrenceFrequencyPerMonth: frequencyPerMonth,
      seasonalOrCyclicIndicator: totalSpanDays >= 60 ? 'Observed across multi-month period' : 'Rapid acute recurrence cluster',
    };

    const geographicCluster: RecurrenceGeographicCluster = {
      clusterCenter: {
        latitude: Number(avgLat.toFixed(6)),
        longitude: Number(avgLon.toFixed(6)),
        approximateAddress,
      },
      clusterRadiusMeters: Math.round(Math.max(12, maxDist)),
      geoHashPrefix: `${avgLat.toFixed(2)}_${avgLon.toFixed(2)}`,
      distinctReportingSites: new Set(sorted.map((s) => `${s.location.latitude.toFixed(4)}_${s.location.longitude.toFixed(4)}`)).size,
    };

    return {
      id: `rec-iss-${patternType.toLowerCase()}-${Math.abs(Math.round(avgLat * 100))}`,
      clusterId: `geo-cl-${Math.round(avgLat * 1000)}-${Math.round(avgLon * 1000)}`,
      patternType,
      title: this.generatePatternTitle(patternType, approximateAddress),
      issueCategory: category,
      issueSubtypes: Array.from(new Set(sorted.map((s) => s.title))),
      confidence,
      confidenceScore,
      severityRating: highestSeverity,
      geographicCluster,
      temporalMetrics,
      contributingIncidentIds: sorted.map((s) => s.id),
      supportingEvidence,
      preventiveRecommendation,
      detectionTimestamp: new Date().toISOString(),
      detectedBy: 'CIVICCONNECT_RECURRING_PROBLEM_INTELLIGENCE_ENGINE',
      status: 'IDENTIFIED',
    };
  }

  private classifyPatternType(category: string, incidents: CivicIncident[]): RecurrencePatternType {
    const textCorpus = incidents.map((i) => `${i.title} ${i.description}`).join(' ').toLowerCase();

    if (category === 'ROAD_HAZARD' || textCorpus.includes('pothole') || textCorpus.includes('asphalt')) {
      return 'CHRONIC_ROAD_SURFACE_FAILURE';
    }
    if (category === 'WATER_UTILITY' || textCorpus.includes('flood') || textCorpus.includes('water ponding')) {
      return textCorpus.includes('drain') || textCorpus.includes('basin') ? 'REPEATED_DRAINAGE_FAILURE' : 'REPEATED_FLOODING';
    }
    if (category === 'SANITATION' || textCorpus.includes('trash') || textCorpus.includes('dumping') || textCorpus.includes('waste')) {
      return 'CHRONIC_WASTE_ACCUMULATION';
    }
    if (category === 'POWER_LIGHTING' || textCorpus.includes('street lamp') || textCorpus.includes('illumination') || textCorpus.includes('tunnel')) {
      return 'INTERMITTENT_STREETLIGHT_FAILURE';
    }

    return 'PERSISTENT_PUBLIC_HAZARD';
  }

  private generatePatternTitle(patternType: RecurrencePatternType, address: string): string {
    switch (patternType) {
      case 'CHRONIC_ROAD_SURFACE_FAILURE':
        return `Chronic Road Surface Failure: ${address}`;
      case 'REPEATED_FLOODING':
        return `Repeated Storm Surface Flooding: ${address}`;
      case 'REPEATED_DRAINAGE_FAILURE':
        return `Repeated Catch Basin Drainage Obstruction: ${address}`;
      case 'CHRONIC_WASTE_ACCUMULATION':
        return `Chronic Waste Accumulation & Unauthorized Dumping: ${address}`;
      case 'INTERMITTENT_STREETLIGHT_FAILURE':
        return `Intermittent Pathway Illumination Dropouts: ${address}`;
      default:
        return `Recurring Infrastructure Vulnerability: ${address}`;
    }
  }

  /**
   * Generates strictly evidence-grounded recommendations without declaring unverified root causes.
   */
  private generatePreventiveRecommendation(params: {
    patternType: RecurrencePatternType;
    category: string;
    approximateAddress: string;
    clusterCount: number;
    averageIntervalDays: number;
    totalSpanDays: number;
    hasRepeatedPostResolutionFailure: boolean;
    resolvedCount: number;
  }): PreventiveInvestigationRecommendation {
    switch (params.patternType) {
      case 'CHRONIC_ROAD_SURFACE_FAILURE':
        return {
          summaryHeadline: 'Recurring pattern detected; infrastructure inspection recommended.',
          recommendedAction:
            'Dispatch geotechnical pavement engineering team to inspect roadbed sub-base stability and subsurface moisture penetration.',
          targetDepartmentCode: 'DOT_ROADS',
          targetDepartmentName: 'Department of Transportation & Roads',
          suggestedInspectionScope: [
            'Ground-penetrating radar (GPR) scan of road subgrade layers',
            'Transit vehicle axle loading and asphalt core sample testing',
            'Review of previous patch compaction methods and material adherence logs',
            'Inspection of surrounding utility trench cuts for settlement',
          ],
          preventiveUrgency: 'SCHEDULED_ENGINEERING_SURVEY',
          evidenceSummaryStatement: `${params.clusterCount} road surface failure incidents documented over ${params.totalSpanDays} days (mean recurrence every ${params.averageIntervalDays} days). Noticeable failure recurrence observed following ${params.resolvedCount} prior surface patch completions.`,
        };

      case 'REPEATED_FLOODING':
      case 'REPEATED_DRAINAGE_FAILURE':
        return {
          summaryHeadline: 'Recurring pattern detected; infrastructure inspection recommended.',
          recommendedAction:
            'Commission hydraulic CCTV pipeline inspection of storm drainage mains and downstream trunk connection.',
          targetDepartmentCode: 'DWaterP',
          targetDepartmentName: 'Department of Water & Power',
          suggestedInspectionScope: [
            'Closed-Circuit Television (CCTV) crawler camera survey through lateral storm drain conduits',
            'Sediment build-up profile measurement inside catchment vaults',
            'Topographic gradient and hydraulic flow rate assessment during wet weather',
            'Inter-departmental coordination with sanitation for scheduled pre-storm street sweeping',
          ],
          preventiveUrgency: 'CRITICAL_INTERVENTION',
          evidenceSummaryStatement: `${params.clusterCount} separate localized flooding and drainage overflow reports logged at ${params.approximateAddress} within ${params.totalSpanDays} days, despite routine surface clearing.`,
        };

      case 'CHRONIC_WASTE_ACCUMULATION':
        return {
          summaryHeadline: 'Recurring pattern detected; operational audit recommended.',
          recommendedAction:
            'Conduct municipal waste collection audit and review commercial receptacle capacity schedules.',
          targetDepartmentCode: 'DEPT_SAN',
          targetDepartmentName: 'Department of Sanitation',
          suggestedInspectionScope: [
            'Audit commercial business dumpster capacity vs actual daily refuse volume',
            'Evaluate placement of high-capacity solar compacting public receptacles',
            'Assess timing alignment between transit rush hour and street sanitation sweeps',
            'Review municipal code enforcement camera feasibility for off-hour dumping',
          ],
          preventiveUrgency: 'OPERATIONAL_AUDIT',
          evidenceSummaryStatement: `${params.clusterCount} separate waste accumulation complaints recorded at this transit plaza over ${params.totalSpanDays} days, recurring an average of every ${params.averageIntervalDays} days.`,
        };

      case 'INTERMITTENT_STREETLIGHT_FAILURE':
        return {
          summaryHeadline: 'Recurring pattern detected; electrical inspection recommended.',
          recommendedAction:
            'Perform comprehensive electrical conduit diagnostics and circuit breaker load analysis.',
          targetDepartmentCode: 'BSL_LIGHTING',
          targetDepartmentName: 'Bureau of Street Lighting',
          suggestedInspectionScope: [
            'Megohmmeter insulation resistance testing on underground feeder cable lines',
            'Thermal imaging scan of electrical distribution panel to detect breaker hotspots',
            'Moisture intrusion inspection in tunnel lighting junction enclosures',
            'Evaluation of luminaire photocell sensors for intermittent voltage fluctuation',
          ],
          preventiveUrgency: 'SCHEDULED_ENGINEERING_SURVEY',
          evidenceSummaryStatement: `${params.clusterCount} lighting blackout incidents documented in walkway tunnel within ${params.totalSpanDays} days; previous bulb replacements did not halt recurrence.`,
        };

      default:
        return {
          summaryHeadline: 'Recurring pattern detected; municipal investigation recommended.',
          recommendedAction:
            'Coordinate multi-agency field inspection to examine repeating civic disruptions in localized zone.',
          targetDepartmentCode: 'DPW_GENERAL',
          targetDepartmentName: 'Department of Public Works',
          suggestedInspectionScope: ['Site survey', 'Historical permit log audit', 'Multi-disciplinary safety assessment'],
          preventiveUrgency: 'MONITORING_SUGGESTED',
          evidenceSummaryStatement: `${params.clusterCount} reports recorded in close proximity across ${params.totalSpanDays} days.`,
        };
    }
  }

  // API Getters
  public getRecurringIssues(): RecurringIssue[] {
    return [...this.detectedPatterns];
  }

  public getIssueById(id: string): RecurringIssue | undefined {
    return this.detectedPatterns.find((p) => p.id === id);
  }

  public getRunHistory(): RecurrenceDetectionRunReport[] {
    return [...this.runHistory];
  }

  public updateIssueStatus(
    id: string,
    status: RecurringIssue['status']
  ): void {
    const issue = this.detectedPatterns.find((p) => p.id === id);
    if (issue) {
      issue.status = status;
      this.notify();
    }
  }
}

export const recurringProblemService = new RecurringProblemDetectionService();
