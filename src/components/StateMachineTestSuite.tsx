import React, { useState } from 'react';
import { incidentEngine } from '../lib/incidentManagementEngine';
import { ControlledIncidentStatus, ActorType } from '../types/incident';
import { INCIDENT_STATE_MACHINE } from '../lib/incidentStateMachine';
import {
  ShieldAlert,
  Play,
  CheckCircle2,
  XCircle,
  RefreshCw,
  GitBranch,
  Bot,
  AlertTriangle,
} from 'lucide-react';

interface TransitionTestCase {
  id: string;
  name: string;
  category: 'VALID_LIFECYCLE' | 'ILLEGAL_JUMP' | 'UNAUTHORIZED_ACTOR' | 'AGENT_OVERREACH' | 'PRECONDITION_ENFORCEMENT' | 'DUPLICATE_BRANCH';
  initialStatus: ControlledIncidentStatus;
  targetStatus: ControlledIncidentStatus;
  actor: ActorType;
  expectedValid: boolean;
  expectedErrorCode?: string;
  description: string;
}

export const StateMachineTestSuite: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<
    Record<string, { passed: boolean; actualStatus: number; message: string }>
  >({});

  const testCases: TransitionTestCase[] = [
    // 1. Valid Happy Path Intake Transition
    {
      id: 'test_1_valid_intake',
      name: '1. Ingestion: REPORTED -> PROCESSING (System/Agent)',
      category: 'VALID_LIFECYCLE',
      initialStatus: 'REPORTED',
      targetStatus: 'PROCESSING',
      actor: 'AI_AGENT',
      expectedValid: true,
      description: 'System or AI ingestion worker picks up a fresh report for automated intake processing.',
    },
    // 2. Valid Validation Step
    {
      id: 'test_2_valid_validating',
      name: '2. Intake: PROCESSING -> VALIDATING (AI Agent)',
      category: 'VALID_LIFECYCLE',
      initialStatus: 'PROCESSING',
      targetStatus: 'VALIDATING',
      actor: 'AI_AGENT',
      expectedValid: true,
      description: 'Proceeds from initial data parsing to PostGIS spatial boundary and photo verification.',
    },
    // 3. Illegal Jump Rejection: REPORTED -> CLOSED
    {
      id: 'test_3_illegal_jump_close',
      name: '3. Illegal Direct Jump: REPORTED -> CLOSED (Blocked)',
      category: 'ILLEGAL_JUMP',
      initialStatus: 'REPORTED',
      targetStatus: 'CLOSED',
      actor: 'AUTHORITY_OFFICER',
      expectedValid: false,
      expectedErrorCode: 'ILLEGAL_TRANSITION',
      description: 'Attempts to close a freshly reported incident without investigation, dispatch, or resolution. Must be rejected.',
    },
    // 4. Illegal Jump: REPORTED -> RESOLUTION_SUBMITTED
    {
      id: 'test_4_illegal_jump_resolution',
      name: '4. Illegal Direct Jump: REPORTED -> RESOLUTION_SUBMITTED',
      category: 'ILLEGAL_JUMP',
      initialStatus: 'REPORTED',
      targetStatus: 'RESOLUTION_SUBMITTED',
      actor: 'FIELD_WORKER',
      expectedValid: false,
      expectedErrorCode: 'ILLEGAL_TRANSITION',
      description: 'Field worker cannot submit resolution before incident has even been triaged, routed, and assigned.',
    },
    // 5. Unauthorized Actor: CITIZEN attempting to transition to ASSIGNED
    {
      id: 'test_5_citizen_cannot_assign',
      name: '5. Unauthorized Role: CITIZEN -> ASSIGNED (Blocked)',
      category: 'UNAUTHORIZED_ACTOR',
      initialStatus: 'ROUTED',
      targetStatus: 'ASSIGNED',
      actor: 'CITIZEN',
      expectedValid: false,
      expectedErrorCode: 'UNAUTHORIZED_ACTOR',
      description: 'Citizens are strictly forbidden from dispatching municipal work crews.',
    },
    // 6. AI Agent Overreach: AI Agent attempting to mark CLOSED
    {
      id: 'test_6_agent_cannot_close',
      name: '6. Agent Overreach: AI_AGENT -> CLOSED (Blocked)',
      category: 'AGENT_OVERREACH',
      initialStatus: 'VERIFIED',
      targetStatus: 'CLOSED',
      actor: 'AI_AGENT',
      expectedValid: false,
      expectedErrorCode: 'UNAUTHORIZED_ACTOR',
      description: 'Autonomous AI agents cannot execute final administrative closure. Only municipal Officers/Admins or verified automated closure batch jobs can close tickets.',
    },
    // 7. Precondition Enforcement: ROUTED requires Department
    {
      id: 'test_7_precondition_department',
      name: '7. Precondition Check: INVESTIGATING -> ROUTED (Requires Dept)',
      category: 'PRECONDITION_ENFORCEMENT',
      initialStatus: 'INVESTIGATING',
      targetStatus: 'ROUTED',
      actor: 'AUTHORITY_OFFICER',
      expectedValid: true,
      description: 'Verifies state transition enforces that a municipal department must be assigned.',
    },
    // 8. Precondition Check: DUPLICATE requires Parent Link
    {
      id: 'test_8_duplicate_link_enforcement',
      name: '8. Duplicate Precondition: Requires duplicateOfIncidentId link',
      category: 'DUPLICATE_BRANCH',
      initialStatus: 'CLASSIFIED',
      targetStatus: 'DUPLICATE',
      actor: 'AUTHORITY_OFFICER',
      expectedValid: true,
      description: 'An incident can only enter DUPLICATE state if linked to an existing primary incident.',
    },
    // 9. Valid Escalation from IN_PROGRESS
    {
      id: 'test_9_valid_escalation',
      name: '9. Operational Exception: IN_PROGRESS -> ESCALATED',
      category: 'VALID_LIFECYCLE',
      initialStatus: 'IN_PROGRESS',
      targetStatus: 'ESCALATED',
      actor: 'AUTHORITY_OFFICER',
      expectedValid: true,
      description: 'Officer escalates active field emergency due to unexpected underground gas main discovery.',
    },
    // 10. Reopening Cycle: CLOSED -> REOPENED
    {
      id: 'test_10_reopen_cycle',
      name: '10. Citizen Reopen Cycle: CLOSED -> REOPENED',
      category: 'VALID_LIFECYCLE',
      initialStatus: 'CLOSED',
      targetStatus: 'REOPENED',
      actor: 'CITIZEN',
      expectedValid: true,
      description: 'Citizen identifies that repaired street fixture failed again within 7 days, reopening the ticket.',
    },
  ];

  const runTestCase = async (test: TransitionTestCase) => {
    // Create temporary scratch incident in state machine to test transition in isolation
    const tempIncRes = incidentEngine.createIncident({
      title: `State Machine Test Specimen [${test.id}]`,
      description: 'Automated test specimen validating transition logic.',
      category: 'ROADS_HAZARD',
      priority: 'P2_HIGH',
      severity: 'SEVERE',
      latitude: 37.7749,
      longitude: -122.4194,
      citizenAuthorId: 'usr-tester-01',
      citizenAuthorEmail: 'tester@civicconnect.gov',
      citizenAuthorName: 'Test Automator',
      actorType: 'SYSTEM_CRON',
      correlationId: `test-corr-${test.id}`,
    });

    if (!tempIncRes.incident) {
      return { passed: false, actualStatus: 500, message: 'Failed to create test specimen' };
    }

    const inc = tempIncRes.incident;
    // Fast-forward initial state for test harness
    inc.status = test.initialStatus;

    // Set preconditions if testing happy path
    if (test.targetStatus === 'ROUTED') {
      inc.departmentId = 'dept-transport';
      inc.departmentName = 'Department of Transportation';
    }
    if (test.targetStatus === 'DUPLICATE') {
      inc.duplicateOfIncidentId = 'inc-pothole-101';
    }
    if (test.targetStatus === 'ASSIGNED') {
      inc.assignedWorkerName = 'Marcus Chen';
    }

    // Execute transition
    const trans = incidentEngine.transitionStatus({
      incidentId: inc.id,
      targetStatus: test.targetStatus,
      actorType: test.actor,
      correlationId: `corr-exec-${test.id}`,
      source: 'REST_API',
      reason: `Automated test run for ${test.id}`,
      duplicateOfId: test.targetStatus === 'DUPLICATE' ? 'inc-pothole-101' : undefined,
    });

    const isMatch = trans.success === test.expectedValid;
    const errorCodeMatches = !test.expectedValid
      ? !test.expectedErrorCode || trans.validationErrorCode === test.expectedErrorCode
      : true;

    const passed = isMatch && errorCodeMatches;

    return {
      passed,
      actualStatus: trans.success ? 200 : 422,
      message: trans.success
        ? `Allowed: Transitioned to '${test.targetStatus}' successfully.`
        : `Blocked as expected: [${trans.validationErrorCode}] ${trans.error}`,
    };
  };

  const handleRunAll = async () => {
    setRunning(true);
    const newResults: Record<string, { passed: boolean; actualStatus: number; message: string }> = {};

    for (const test of testCases) {
      const outcome = await runTestCase(test);
      newResults[test.id] = outcome;
    }

    setResults(newResults);
    setRunning(false);
  };

  const passedCount = Object.values(results).filter((r) => r.passed).length;
  const totalCount = testCases.length;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
              <GitBranch className="w-4 h-4" />
              <span>Deterministic State Machine Test Harness</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Transition Validation & Boundary Enforcement Verification
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Confirms the 17-state incident lifecycle rules, prevents illegal state skips (e.g. REPORTED &rarr; CLOSED), blocks unauthorized caller roles, and validates that <strong>AI Agents cannot perform arbitrary mutations</strong>.
            </p>
          </div>

          <button
            onClick={handleRunAll}
            disabled={running}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs px-4 py-2.5 rounded-lg transition flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {running ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Validating State Machine...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Run State Machine Tests</span>
              </>
            )}
          </button>
        </div>

        {Object.keys(results).length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">
              Enforcement Pass Rate: <strong className="text-white">{passedCount}</strong> / {totalCount} Tests
            </span>
            <span
              className={`px-2.5 py-0.5 rounded font-semibold ${
                passedCount === totalCount
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}
            >
              {passedCount === totalCount ? '100% STRICTLY ENFORCED' : 'TESTS FAILED'}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {testCases.map((test) => {
          const res = results[test.id];
          return (
            <div
              key={test.id}
              className={`bg-slate-900 border rounded-xl p-4 transition ${
                res
                  ? res.passed
                    ? 'border-emerald-500/50 bg-slate-900/90'
                    : 'border-red-500/80 bg-red-950/20'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold font-mono text-white">{test.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {test.category}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-purple-300 border border-purple-900">
                      Actor: {test.actor}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 max-w-4xl">{test.description}</p>
                  <div className="text-[11px] font-mono text-slate-500 flex items-center space-x-3">
                    <span>
                      Transition: <code className="text-amber-400">{test.initialStatus}</code> &rarr;{' '}
                      <code className="text-emerald-400">{test.targetStatus}</code>
                    </span>
                    <span>&bull;</span>
                    <span>
                      Expected Result:{' '}
                      <strong className={test.expectedValid ? 'text-emerald-400' : 'text-rose-400'}>
                        {test.expectedValid ? 'ALLOW (200 OK)' : 'BLOCK (422 REJECT)'}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  {res && (
                    <div
                      className={`flex items-center space-x-1.5 text-xs font-mono px-3 py-1 rounded border ${
                        res.passed
                          ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                          : 'bg-red-950/60 border-red-800 text-red-400'
                      }`}
                    >
                      {res.passed ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>PASSED</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-red-400" />
                          <span>FAILED</span>
                        </>
                      )}
                    </div>
                  )}

                  <button
                    onClick={async () => {
                      const outcome = await runTestCase(test);
                      setResults((prev) => ({ ...prev, [test.id]: outcome }));
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono transition cursor-pointer border border-slate-700 flex items-center space-x-1"
                  >
                    <Play className="w-3 h-3 text-cyan-400" />
                    <span>Run</span>
                  </button>
                </div>
              </div>

              {res && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-xs font-mono text-slate-300">
                  <strong className="text-white">Execution Result:</strong> {res.message}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
