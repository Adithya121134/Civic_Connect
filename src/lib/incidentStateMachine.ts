import {
  ControlledIncidentStatus,
  ActorType,
  TransitionValidationResult,
  CivicIncident,
} from '../types/incident';

/**
 * State Transition Graph definition for CivicConnect Incident Lifecycle:
 *
 * Happy path:
 * REPORTED -> PROCESSING -> VALIDATING -> CLASSIFIED -> INVESTIGATING -> ROUTED -> ASSIGNED -> IN_PROGRESS -> RESOLUTION_SUBMITTED -> VERIFYING -> VERIFIED -> CLOSED
 *
 * Alternative & Exception Paths:
 * VALIDATING -> VALIDATION_FAILED | REJECTED | DUPLICATE
 * VALIDATION_FAILED -> INVESTIGATING (manual human review) | REJECTED
 * CLASSIFIED -> DUPLICATE
 * INVESTIGATING -> ROUTED | REJECTED | DUPLICATE
 * ROUTED -> ESCALATED
 * ASSIGNED -> ESCALATED | IN_PROGRESS
 * IN_PROGRESS -> ESCALATED | RESOLUTION_SUBMITTED
 * ESCALATED -> ROUTED | ASSIGNED | IN_PROGRESS (after executive mitigation)
 * RESOLUTION_SUBMITTED -> VERIFYING
 * VERIFYING -> VERIFIED | REOPENED
 * VERIFIED -> CLOSED
 * CLOSED -> REOPENED (within grace period)
 * REOPENED -> INVESTIGATING
 * DUPLICATE -> INVESTIGATING (if mistakenly deduplicated)
 */

export interface TransitionRule {
  allowedTargetStates: ControlledIncidentStatus[];
  allowedActors: ActorType[];
  description: string;
  requiredFields?: (keyof CivicIncident)[];
  customPrecondition?: (incident: CivicIncident) => { satisfied: boolean; reason?: string };
}

export const INCIDENT_STATE_MACHINE: Record<ControlledIncidentStatus, TransitionRule> = {
  REPORTED: {
    allowedTargetStates: ['PROCESSING', 'REJECTED'],
    allowedActors: ['SYSTEM_CRON', 'AI_AGENT', 'AUTHORITY_OFFICER', 'ADMINISTRATOR'],
    description: 'Initial intake. Autonomous ingestion engine or officer picks up ticket for preliminary processing.',
  },

  PROCESSING: {
    allowedTargetStates: ['VALIDATING', 'VALIDATION_FAILED', 'REJECTED'],
    allowedActors: ['AI_AGENT', 'SYSTEM_CRON', 'AUTHORITY_OFFICER', 'ADMINISTRATOR'],
    description: 'Data sanitation, virus scan, and syntactic validation.',
  },

  VALIDATING: {
    allowedTargetStates: ['CLASSIFIED', 'VALIDATION_FAILED', 'DUPLICATE', 'REJECTED'],
    allowedActors: ['AI_AGENT', 'AUTHORITY_OFFICER', 'ADMINISTRATOR'],
    description: 'Geospatial boundary verification, computer vision defect authenticity check, and duplicate spatial cluster analysis.',
    customPrecondition: (inc) => {
      if (!inc.location.latitude || !inc.location.longitude) {
        return { satisfied: false, reason: 'Valid geographic coordinate point required for spatial boundary check' };
      }
      return { satisfied: true };
    },
  },

  VALIDATION_FAILED: {
    allowedTargetStates: ['INVESTIGATING', 'REJECTED'],
    allowedActors: ['AUTHORITY_OFFICER', 'ADMINISTRATOR'],
    description: 'Automated verification failed (e.g., coordinates outside municipality). Requires manual human investigation or rejection.',
  },

  CLASSIFIED: {
    allowedTargetStates: ['INVESTIGATING', 'ROUTED', 'DUPLICATE', 'REJECTED'],
    allowedActors: ['AI_AGENT', 'AUTHORITY_OFFICER', 'ADMINISTRATOR'],
    description: 'Taxonomy categorized (category, severity, priority, initial SLA policy assigned). Ready for departmental routing or deep investigation.',
    customPrecondition: (inc) => {
      if (!inc.category || !inc.priority) {
        return { satisfied: false, reason: 'Incident must have assigned category and priority before leaving CLASSIFIED' };
      }
      return { satisfied: true };
    },
  },

  INVESTIGATING: {
    allowedTargetStates: ['ROUTED', 'DUPLICATE', 'REJECTED', 'ESCALATED'],
    allowedActors: ['AUTHORITY_OFFICER', 'ADMINISTRATOR'],
    description: 'Officer conducting municipal assessment, engineering analysis, or historical correlation check.',
  },

  ROUTED: {
    allowedTargetStates: ['ASSIGNED', 'ESCALATED', 'REJECTED'],
    allowedActors: ['AUTHORITY_OFFICER', 'ADMINISTRATOR'],
    description: 'Incident matched to responsible authority department (e.g. Dept of Transportation). Pending team/worker dispatch.',
    customPrecondition: (inc) => {
      if (!inc.departmentId && !inc.departmentName) {
        return { satisfied: false, reason: 'Department assignment is required to enter ROUTED state' };
      }
      return { satisfied: true };
    },
  },

  ASSIGNED: {
    allowedTargetStates: ['IN_PROGRESS', 'ESCALATED', 'ROUTED'],
    allowedActors: ['FIELD_WORKER', 'AUTHORITY_OFFICER', 'ADMINISTRATOR'],
    description: 'Dispatched to field crew or specialized contractor with assigned work order ID.',
    customPrecondition: (inc) => {
      if (!inc.assignedWorkerName && !inc.assignedTeamName) {
        return { satisfied: false, reason: 'Operational crew or field worker must be designated before ASSIGNED transition' };
      }
      return { satisfied: true };
    },
  },

  IN_PROGRESS: {
    allowedTargetStates: ['RESOLUTION_SUBMITTED', 'ESCALATED'],
    allowedActors: ['FIELD_WORKER', 'AUTHORITY_OFFICER', 'ADMINISTRATOR'],
    description: 'Physical works underway on site (labor, excavation, equipment repair).',
  },

  ESCALATED: {
    allowedTargetStates: ['ROUTED', 'ASSIGNED', 'IN_PROGRESS'],
    allowedActors: ['AUTHORITY_OFFICER', 'ADMINISTRATOR'],
    description: 'SLA violation, public safety emergency, or cross-jurisdiction blockage under active executive triage.',
  },

  RESOLUTION_SUBMITTED: {
    allowedTargetStates: ['VERIFYING', 'REOPENED'],
    allowedActors: ['FIELD_WORKER', 'AUTHORITY_OFFICER', 'ADMINISTRATOR'],
    description: 'Field repair concluded. Post-work proof photos and materials checklist submitted for verification.',
    customPrecondition: (inc) => {
      if (!inc.resolutionSummary && !inc.resolutionEvidenceUrl) {
        return { satisfied: false, reason: 'Resolution summary or evidence photo required to submit resolution' };
      }
      return { satisfied: true };
    },
  },

  VERIFYING: {
    allowedTargetStates: ['VERIFIED', 'REOPENED', 'ESCALATED'],
    allowedActors: ['CITIZEN', 'AUTHORITY_OFFICER', 'ADMINISTRATOR', 'AI_AGENT'],
    description: 'Cognitive visual change-detection and citizen validation active.',
  },

  VERIFIED: {
    allowedTargetStates: ['CLOSED', 'REOPENED'],
    allowedActors: ['AUTHORITY_OFFICER', 'ADMINISTRATOR', 'SYSTEM_CRON'],
    description: 'Repairs confirmed authentic and satisfactory. Transitioning to administrative archive.',
  },

  CLOSED: {
    allowedTargetStates: ['REOPENED'],
    allowedActors: ['CITIZEN', 'AUTHORITY_OFFICER', 'ADMINISTRATOR'],
    description: 'Incident completed and archived. Can only be REOPENED if recurring defect reported within grace period.',
  },

  REOPENED: {
    allowedTargetStates: ['INVESTIGATING', 'ROUTED', 'ASSIGNED'],
    allowedActors: ['AUTHORITY_OFFICER', 'ADMINISTRATOR'],
    description: 'Citizen contested closure or defect reappeared. Re-entering investigation lifecycle with escalation flag.',
  },

  REJECTED: {
    allowedTargetStates: ['INVESTIGATING'], // In case of wrongful rejection appeal
    allowedActors: ['AUTHORITY_OFFICER', 'ADMINISTRATOR'],
    description: 'Spam, non-municipal jurisdiction, or invalid report.',
  },

  DUPLICATE: {
    allowedTargetStates: ['INVESTIGATING'], // Can be decoupled if misidentified
    allowedActors: ['AUTHORITY_OFFICER', 'ADMINISTRATOR'],
    description: 'Merged into primary parent incident. Shares updates with parent.',
    customPrecondition: (inc) => {
      if (!inc.duplicateOfIncidentId) {
        return { satisfied: false, reason: 'Must establish duplicateOfIncidentId link to mark DUPLICATE' };
      }
      return { satisfied: true };
    },
  },
};

/**
 * Deterministic State Machine Transition Validator.
 * Pure function enforcing strict transition integrity.
 */
export function validateStateTransition(
  incident: CivicIncident,
  targetState: ControlledIncidentStatus,
  actor: ActorType
): TransitionValidationResult {
  const currentState = incident.status;

  if (currentState === targetState) {
    return {
      isValid: false,
      errorCode: 'NOOP_TRANSITION',
      errorMessage: `Incident is already in state '${targetState}'.`,
      allowedRoles: [],
      preconditionsSatisfied: false,
    };
  }

  const rule = INCIDENT_STATE_MACHINE[currentState];
  if (!rule) {
    return {
      isValid: false,
      errorCode: 'UNKNOWN_CURRENT_STATE',
      errorMessage: `State '${currentState}' has no defined transition graph.`,
      allowedRoles: [],
      preconditionsSatisfied: false,
    };
  }

  // 1. Check if Target State is in the Allowed Transition Graph
  if (!rule.allowedTargetStates.includes(targetState)) {
    return {
      isValid: false,
      errorCode: 'ILLEGAL_TRANSITION',
      errorMessage: `Illegal transition: Cannot transition from '${currentState}' directly to '${targetState}'. Allowed next states: [${rule.allowedTargetStates.join(
        ', '
      )}]`,
      allowedRoles: rule.allowedActors,
      preconditionsSatisfied: false,
    };
  }

  // 2. Check Actor Permission for this Transition
  if (!rule.allowedActors.includes(actor)) {
    return {
      isValid: false,
      errorCode: 'UNAUTHORIZED_ACTOR',
      errorMessage: `Actor '${actor}' is not authorized to transition incident from '${currentState}' to '${targetState}'. Allowed actors: [${rule.allowedActors.join(
        ', '
      )}]`,
      allowedRoles: rule.allowedActors,
      preconditionsSatisfied: false,
    };
  }

  // 3. Evaluate State Preconditions (Department, Coordinates, Evidence)
  const targetRule = INCIDENT_STATE_MACHINE[targetState];
  if (targetRule?.customPrecondition) {
    const check = targetRule.customPrecondition(incident);
    if (!check.satisfied) {
      return {
        isValid: false,
        errorCode: 'PRECONDITION_FAILED',
        errorMessage: `Precondition unmet for target state '${targetState}': ${check.reason}`,
        allowedRoles: rule.allowedActors,
        preconditionsSatisfied: false,
        missingRequirements: [check.reason || 'Custom precondition failed'],
      };
    }
  }

  return {
    isValid: true,
    allowedRoles: rule.allowedActors,
    preconditionsSatisfied: true,
  };
}
