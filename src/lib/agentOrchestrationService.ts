import {
  AgentDefinition,
  AgentExecutionContext,
  AgentResult,
  OrchestrationWorkflowExecution,
  WorkflowStage,
} from '../types/agentOrchestrator';
import {
  observationAgent,
  evidenceAgent,
  deduplicationAgent,
  investigationAgent,
  priorityAgent,
  routingAgent,
  assignmentAgent,
} from './specializedAgents';
import { incidentEngine } from './incidentManagementEngine';
import { User, UserRole } from '../types/auth';

export class AgentOrchestratorService {
  private agentRegistry: Map<string, AgentDefinition> = new Map();
  private workflowHistory: Map<string, OrchestrationWorkflowExecution> = new Map();
  private agentResultsCache: Map<string, AgentResult> = new Map(); // Idempotency cache key -> AgentResult
  private executionLog: AgentResult[] = [];

  constructor() {
    this.registerCoreAgents();
  }

  public registerAgent(agent: AgentDefinition) {
    this.agentRegistry.set(agent.name, agent);
  }

  public getAgent(name: string): AgentDefinition | undefined {
    return this.agentRegistry.get(name);
  }

  public getAllAgents(): AgentDefinition[] {
    return Array.from(this.agentRegistry.values());
  }

  private registerCoreAgents() {
    this.registerAgent(observationAgent);
    this.registerAgent(evidenceAgent);
    this.registerAgent(deduplicationAgent);
    this.registerAgent(investigationAgent);
    this.registerAgent(priorityAgent);
    this.registerAgent(routingAgent);
    this.registerAgent(assignmentAgent);
  }

  /**
   * Executes a single agent with timeouts, retries, idempotency, and audit logging.
   */
  public async executeAgent(
    agentName: string,
    incidentId: string,
    caller: User | { id: string; role: UserRole | 'SYSTEM' },
    customCorrelationId?: string,
    idempotencyKeySuffix?: string
  ): Promise<AgentResult> {
    const agent = this.agentRegistry.get(agentName);
    if (!agent) {
      throw new Error(`AgentNotFound: Agent '${agentName}' is not registered in orchestrator.`);
    }

    const correlationId = customCorrelationId || `corr-orch-${Date.now()}`;
    const idempotencyKey = `idem-${agentName}-${agent.version}-${incidentId}-${idempotencyKeySuffix || 'default'}`;

    // 1. Idempotency Check: Return cached deterministic result if identical request
    if (this.agentResultsCache.has(idempotencyKey)) {
      const cached = this.agentResultsCache.get(idempotencyKey)!;
      return {
        ...cached,
        status: 'SKIPPED_IDEMPOTENT',
        reasoningChain: [...cached.reasoningChain, 'Skipped re-execution: Identical idempotency key cached.'],
      };
    }

    const context: AgentExecutionContext = {
      executionId: 'exec-' + Math.random().toString(36).substring(2, 9),
      correlationId,
      incidentId,
      callerUserId: caller.id,
      callerRole: caller.role,
      startedAt: new Date().toISOString(),
      timeoutMs: 8000,
      retryCount: 0,
      maxRetries: 2,
      idempotencyKey,
    };

    let attempts = 0;
    let lastError: Error | null = null;

    // Retry loop with timeout race
    while (attempts <= context.maxRetries) {
      try {
        attempts++;
        context.retryCount = attempts - 1;

        // Timeout Promise wrapper
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout: Agent '${agentName}' exceeded limit of ${context.timeoutMs}ms`)), context.timeoutMs)
        );

        const executionPromise = agent.execute({ incidentId }, context);
        const result = await Promise.race([executionPromise, timeoutPromise]);

        // Validate Agent Result against Backend Constraints:
        // Check confidence threshold
        if (result.confidence < agent.confidenceThreshold) {
          result.requiresHumanApproval = true;
          result.status = 'PENDING_HUMAN_APPROVAL';
          result.humanApprovalCheckpoint = {
            requiredRole: 'AUTHORITY_OFFICER',
            reason: `Cognitive confidence (${(result.confidence * 100).toFixed(
              0
            )}%) below autonomous threshold (${(agent.confidenceThreshold * 100).toFixed(0)}%). Human Officer review required.`,
          };
        }

        // Cache for Idempotency
        this.agentResultsCache.set(idempotencyKey, result);
        this.executionLog.unshift(result);
        if (this.executionLog.length > 300) this.executionLog.pop();

        return result;
      } catch (err: any) {
        lastError = err;
        if (attempts <= context.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 300 * attempts)); // Backoff
        }
      }
    }

    // Handled Failure Result
    const failureResult: AgentResult = {
      executionId: context.executionId,
      agentName: agent.name,
      agentVersion: agent.version,
      incidentId,
      correlationId,
      status: lastError?.message.includes('Timeout') ? 'TIMED_OUT' : 'FAILED',
      confidence: 0,
      proposedAction: 'NONE',
      structuredOutput: {},
      toolCalls: [],
      requiresHumanApproval: true,
      humanApprovalCheckpoint: {
        requiredRole: 'ADMIN',
        reason: `Agent execution failed after ${attempts} attempts: ${lastError?.message}`,
      },
      reasoningChain: [`Execution aborted due to error: ${lastError?.message}`],
      executionTimeMs: context.timeoutMs,
      error: lastError?.message,
      timestamp: new Date().toISOString(),
    };

    this.executionLog.unshift(failureResult);
    return failureResult;
  }

  /**
   * Starts the Complete End-to-End Orchestrated Civic Incident Workflow:
   * Incident Created -> Observation -> Evidence -> Deduplication -> Investigation -> Priority -> Routing -> Assignment
   */
  public async runFullPipelineWorkflow(
    incidentId: string,
    caller: User | { id: string; role: UserRole | 'SYSTEM' },
    onStageUpdate?: (workflow: OrchestrationWorkflowExecution) => void
  ): Promise<OrchestrationWorkflowExecution> {
    const workflowId = 'wf-' + Math.random().toString(36).substring(2, 9);
    const correlationId = `corr-pipe-${Date.now()}`;

    const stages: WorkflowStage[] = [
      { stageId: 's1', stageName: '1. Observation Normalization', agentName: 'ObservationAgent', status: 'QUEUED' },
      { stageId: 's2', stageName: '2. Evidence Verification', agentName: 'EvidenceAgent', status: 'QUEUED' },
      { stageId: 's3', stageName: '3. Spatial Deduplication', agentName: 'DeduplicationAgent', status: 'QUEUED' },
      { stageId: 's4', stageName: '4. Deep Investigation', agentName: 'InvestigationAgent', status: 'QUEUED' },
      { stageId: 's5', stageName: '5. Priority & SLA Policy', agentName: 'PriorityAgent', status: 'QUEUED' },
      { stageId: 's6', stageName: '6. Departmental Routing', agentName: 'RoutingAgent', status: 'QUEUED' },
      { stageId: 's7', stageName: '7. Work Order Assignment', agentName: 'AssignmentAgent', status: 'QUEUED' },
    ];

    const workflow: OrchestrationWorkflowExecution = {
      workflowExecutionId: workflowId,
      incidentId,
      correlationId,
      currentStageIndex: 0,
      stages,
      status: 'RUNNING',
      startedAt: new Date().toISOString(),
    };

    this.workflowHistory.set(workflowId, workflow);

    for (let i = 0; i < stages.length; i++) {
      workflow.currentStageIndex = i;
      const stage = stages[i];
      stage.status = 'EXECUTING';
      onStageUpdate?.({ ...workflow });

      // Artificial small pause for UI pipeline observability
      await new Promise((r) => setTimeout(r, 450));

      const agentResult = await this.executeAgent(stage.agentName, incidentId, caller, correlationId, `stage-${i}`);
      stage.result = agentResult;
      stage.status = agentResult.status;

      // Check if this agent triggered a Human-in-the-Loop Checkpoint
      if (agentResult.requiresHumanApproval && agentResult.status === 'PENDING_HUMAN_APPROVAL') {
        workflow.status = 'PAUSED_WAITING_HUMAN_APPROVAL';
        onStageUpdate?.({ ...workflow });
        // Pause execution until municipal officer signs off
        return workflow;
      }

      if (agentResult.status === 'FAILED' || agentResult.status === 'TIMED_OUT') {
        workflow.status = 'FAILED';
        workflow.error = `Pipeline stalled at ${stage.stageName}: ${agentResult.error}`;
        onStageUpdate?.({ ...workflow });
        return workflow;
      }

      // Backend applies validated agent recommendations deterministically to state machine
      this.applyAgentStageResultsToBackend(incidentId, agentResult, correlationId);
    }

    workflow.status = 'COMPLETED';
    workflow.completedAt = new Date().toISOString();
    onStageUpdate?.({ ...workflow });
    return workflow;
  }

  /**
   * Deterministic Backend Validation Bridge:
   * Translates structured agent outputs into state machine mutations.
   */
  private applyAgentStageResultsToBackend(incidentId: string, result: AgentResult, correlationId: string) {
    if (result.agentName === 'ObservationAgent') {
      const category = (result.structuredOutput.primaryCategory as string) || 'ROAD_DAMAGE';
      incidentEngine.updateIncidentAttributes(
        incidentId,
        {
          category,
          confidenceScore: result.confidence,
        },
        {
          actorType: 'AI_AGENT',
          actorName: result.agentName,
          correlationId,
          source: 'AGENT_WORKFLOW',
          reason: `Normalized category to ${category} (${result.structuredOutput.subType || ''}) via cognitive observation agent`,
        }
      );
    } else if (result.agentName === 'EvidenceAgent') {
      incidentEngine.transitionStatus({
        incidentId,
        targetStatus: 'PROCESSING',
        actorType: 'AI_AGENT',
        actorName: result.agentName,
        correlationId,
        source: 'AGENT_WORKFLOW',
        reason: 'Visual defect authenticated by EvidenceAgent',
      });
    } else if (result.agentName === 'DeduplicationAgent') {
      const primaryCandidateId = result.structuredOutput.primaryCandidateId as string | undefined;
      const determination = result.structuredOutput.determination as string;
      const isMergeEligible = !!result.structuredOutput.isDeterministicMergeEligible;

      if (primaryCandidateId && (determination === 'PROBABLE_DUPLICATE' || determination === 'RELATED_INCIDENT')) {
        incidentEngine.establishRelationship({
          sourceIncidentId: incidentId,
          targetIncidentId: primaryCandidateId,
          relationshipType: determination === 'PROBABLE_DUPLICATE' ? 'DUPLICATE_OF' : 'CO_LOCATED_WITH',
          confidenceScore: result.confidence,
          establishedBy: 'AI_AGENT',
          establishedById: 'agent-dedup-v3.5',
          correlationId,
          notes: `Deterministic duplicate engine linked candidate (${(result.confidence * 100).toFixed(0)}% composite match). All citizen evidence preserved.`,
        });

        // Only transition status to DUPLICATE if deterministic threshold passed AND officer approved
        if (isMergeEligible && result.status === 'COMPLETED') {
          incidentEngine.transitionStatus({
            incidentId,
            targetStatus: 'DUPLICATE',
            actorType: 'AI_AGENT',
            actorName: result.agentName,
            correlationId,
            source: 'AGENT_WORKFLOW',
            reason: `Linked as duplicate of ${result.structuredOutput.primaryCandidateTrackingNumber}. Citizen evidence preserved.`,
          });
        }
      }
    } else if (result.agentName === 'InvestigationAgent') {
      incidentEngine.transitionStatus({
        incidentId,
        targetStatus: 'VALIDATING',
        actorType: 'AI_AGENT',
        actorName: result.agentName,
        correlationId,
        source: 'AGENT_WORKFLOW',
        reason: 'InvestigationAgent confirmed geospatial boundaries',
      });
    } else if (result.agentName === 'PriorityAgent') {
      const recPriority = (result.structuredOutput.recommendedPriority as any) || 'P3_MEDIUM';
      const recSeverity = (result.structuredOutput.recommendedSeverity as any) || 'MODERATE';
      incidentEngine.updateIncidentAttributes(
        incidentId,
        {
          priority: recPriority,
          severity: recSeverity,
          confidenceScore: result.confidence,
        },
        {
          actorType: 'AI_AGENT',
          actorName: result.agentName,
          correlationId,
          source: 'AGENT_WORKFLOW',
          reason: `PriorityAgent assigned ${recPriority} (${recSeverity}) with ${result.structuredOutput.slaTargetHours || 72}h SLA`,
        }
      );
      incidentEngine.transitionStatus({
        incidentId,
        targetStatus: 'CLASSIFIED',
        actorType: 'AI_AGENT',
        actorName: result.agentName,
        correlationId,
        source: 'AGENT_WORKFLOW',
        reason: 'Categorized and prioritized by cognitive triage layer',
      });
    } else if (result.agentName === 'RoutingAgent') {
      const recDept = result.structuredOutput.recommendedDepartment as any;
      const deptId = recDept?.id || (result.structuredOutput.departmentId as string) || 'dept-transport';
      const deptName = recDept?.name || (result.structuredOutput.departmentName as string) || 'Department of Transportation';

      incidentEngine.updateIncidentAttributes(
        incidentId,
        {
          departmentId: deptId,
          departmentName: deptName,
        },
        {
          actorType: 'AI_AGENT',
          actorName: result.agentName,
          correlationId,
          source: 'AGENT_WORKFLOW',
          reason: `RoutingAgent assigned jurisdictional department ${deptName}`,
        }
      );
      incidentEngine.transitionStatus({
        incidentId,
        targetStatus: 'ROUTED',
        actorType: 'AUTHORITY_OFFICER', // Routed via authority rules
        actorName: 'System Authority Daemon',
        correlationId,
        source: 'AGENT_WORKFLOW',
        reason: `Routed to ${deptName}`,
      });
    } else if (result.agentName === 'AssignmentAgent') {
      incidentEngine.updateIncidentAttributes(
        incidentId,
        {
          assignedWorkerId: result.structuredOutput.assignedWorkerId as string,
          assignedWorkerName: result.structuredOutput.assignedWorkerName as string,
        },
        {
          actorType: 'AI_AGENT',
          actorName: result.agentName,
          correlationId,
          source: 'AGENT_WORKFLOW',
          reason: 'AssignmentAgent coordinated operational dispatch',
        }
      );
      incidentEngine.transitionStatus({
        incidentId,
        targetStatus: 'ASSIGNED',
        actorType: 'AUTHORITY_OFFICER',
        actorName: 'Dispatch Coordinator',
        correlationId,
        source: 'AGENT_WORKFLOW',
        reason: 'Work order dispatched to certified field crew',
      });
    }
  }

  /**
   * Human Officer Approval Sign-off on Paused Checkpoint
   */
  public approveCheckpoint(
    workflowId: string,
    approver: User,
    resume: boolean = true
  ): OrchestrationWorkflowExecution | undefined {
    const wf = this.workflowHistory.get(workflowId);
    if (!wf) return undefined;

    const currentStage = wf.stages[wf.currentStageIndex];
    if (currentStage?.result?.humanApprovalCheckpoint) {
      currentStage.result.humanApprovalCheckpoint.approvedBy = `${approver.firstName} ${approver.lastName}`;
      currentStage.result.humanApprovalCheckpoint.approvedAt = new Date().toISOString();
      currentStage.result.humanApprovalCheckpoint.isApproved = true;
      currentStage.result.status = 'COMPLETED';
      currentStage.status = 'COMPLETED';
    }

    wf.status = 'RUNNING';
    return wf;
  }

  public getWorkflow(id: string): OrchestrationWorkflowExecution | undefined {
    return this.workflowHistory.get(id);
  }

  public getAllWorkflows(): OrchestrationWorkflowExecution[] {
    return Array.from(this.workflowHistory.values());
  }

  public getExecutionLogs(): AgentResult[] {
    return [...this.executionLog];
  }
}

export const agentOrchestrator = new AgentOrchestratorService();
