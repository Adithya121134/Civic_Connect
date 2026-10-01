import { UserRole } from './auth';
import { ControlledIncidentStatus, IncidentPriority, IncidentSeverity } from './incident';

export type AgentExecutionStatus =
  | 'QUEUED'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'PENDING_HUMAN_APPROVAL'
  | 'FAILED'
  | 'TIMED_OUT'
  | 'RETRYING'
  | 'SKIPPED_IDEMPOTENT';

export interface ToolDefinition {
  name: string;
  version: string;
  description: string;
  requiredRole: UserRole | 'SYSTEM';
  isReadOnly: boolean;
  parametersSchema: Record<string, { type: string; description: string; required?: boolean }>;
  handler: (params: Record<string, unknown>, context: AgentExecutionContext) => Promise<unknown>;
}

export interface AgentExecutionContext {
  executionId: string;
  correlationId: string;
  incidentId: string;
  callerUserId?: string;
  callerRole: UserRole | 'SYSTEM';
  startedAt: string;
  timeoutMs: number;
  retryCount: number;
  maxRetries: number;
  idempotencyKey: string;
}

export interface AgentResult {
  executionId: string;
  agentName: string;
  agentVersion: string;
  incidentId: string;
  correlationId: string;
  status: AgentExecutionStatus;
  confidence: number; // 0.00 to 1.00
  proposedAction: string;
  structuredOutput: Record<string, unknown>;
  toolCalls: {
    toolName: string;
    arguments: Record<string, unknown>;
    resultSummary: string;
    timestamp: string;
  }[];
  requiresHumanApproval: boolean;
  humanApprovalCheckpoint?: {
    requiredRole: UserRole;
    reason: string;
    approvedBy?: string;
    approvedAt?: string;
    isApproved?: boolean;
  };
  reasoningChain: string[];
  executionTimeMs: number;
  error?: string;
  timestamp: string;
}

export interface AgentDefinition {
  name: string;
  version: string;
  purpose: string;
  allowedTools: string[];
  confidenceThreshold: number; // e.g. 0.75; below this triggers Human-in-the-Loop
  requiresHitlForTransitions: ControlledIncidentStatus[];
  inputSchemaDescription: string;
  outputSchemaDescription: string;
  execute: (input: Record<string, unknown>, context: AgentExecutionContext) => Promise<AgentResult>;
}

export interface WorkflowStage {
  stageId: string;
  stageName: string;
  agentName: string;
  status: AgentExecutionStatus;
  result?: AgentResult;
}

export interface OrchestrationWorkflowExecution {
  workflowExecutionId: string;
  incidentId: string;
  correlationId: string;
  currentStageIndex: number;
  stages: WorkflowStage[];
  status: 'PENDING' | 'RUNNING' | 'PAUSED_WAITING_HUMAN_APPROVAL' | 'COMPLETED' | 'FAILED';
  startedAt: string;
  completedAt?: string;
  error?: string;
}
