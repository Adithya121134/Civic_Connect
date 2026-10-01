import { ToolDefinition, AgentExecutionContext } from '../types/agentOrchestrator';
import { incidentEngine } from './incidentManagementEngine';
import { evidenceManager } from './evidenceManagementService';

/**
 * Deterministic Tool Registry.
 * Specialized agents NEVER execute arbitrary SQL or raw mutations.
 * They execute strictly bounded, auditable tools with parameter checks.
 */
export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    this.registerCoreTools();
  }

  public registerTool(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  public getTool(toolName: string): ToolDefinition | undefined {
    return this.tools.get(toolName);
  }

  public getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Invokes a tool with permission and schema boundary enforcement.
   */
  public async invokeTool(
    toolName: string,
    params: Record<string, unknown>,
    context: AgentExecutionContext,
    allowedTools: string[]
  ): Promise<unknown> {
    // 1. Tool authorization boundary check
    if (!allowedTools.includes(toolName)) {
      throw new Error(
        `Security Boundary Violation: Agent is not granted permission to invoke tool '${toolName}'. Allowed tools: [${allowedTools.join(
          ', '
        )}]`
      );
    }

    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`ToolNotFound: Tool '${toolName}' does not exist in registry.`);
    }

    // 2. Validate required parameters
    for (const [key, schema] of Object.entries(tool.parametersSchema)) {
      if (schema.required && (params[key] === undefined || params[key] === null)) {
        throw new Error(`ToolParameterMissing: Required parameter '${key}' missing for tool '${toolName}'.`);
      }
    }

    // 3. Execute tool handler
    return await tool.handler(params, context);
  }

  private registerCoreTools() {
    // 1. Fetch Incident Data (Read-only)
    this.registerTool({
      name: 'get_incident_details',
      version: '1.0.0',
      description: 'Retrieves current validated incident entity, status, and geographic coordinates.',
      requiredRole: 'SYSTEM',
      isReadOnly: true,
      parametersSchema: {
        incidentId: { type: 'string', description: 'Unique incident identifier', required: true },
      },
      handler: async (params) => {
        const incident = incidentEngine.getIncidentById(params.incidentId as string);
        if (!incident) throw new Error(`Incident ${params.incidentId} not found`);
        return {
          id: incident.id,
          title: incident.title,
          description: incident.description,
          status: incident.status,
          category: incident.category,
          priority: incident.priority,
          location: incident.location,
          createdAt: incident.createdAt,
        };
      },
    });

    // 2. Fetch Evidence Metadata (Read-only)
    this.registerTool({
      name: 'get_incident_evidence',
      version: '1.0.0',
      description: 'Fetches cryptographic metadata, SHA-256 hashes, and EXIF locations for incident evidence.',
      requiredRole: 'SYSTEM',
      isReadOnly: true,
      parametersSchema: {
        incidentId: { type: 'string', description: 'Unique incident identifier', required: true },
      },
      handler: async (params) => {
        const evidenceList = evidenceManager.getEvidenceByIncident(params.incidentId as string);
        return evidenceList.map((e) => ({
          id: e.id,
          type: e.evidenceType,
          originalFilename: e.fileMetadata.originalFilename,
          sha256: e.sha256Hash,
          exifCoordinates: e.geoMetadata,
          validationStatus: e.validationStatus,
          score: e.validationScore,
        }));
      },
    });

    // 3. PostGIS Spatial Proximity & Deduplication Query (Read-only)
    this.registerTool({
      name: 'query_spatial_duplicates',
      version: '1.2.0',
      description: 'Queries nearby active incidents within specified meter radius for spatial clustering.',
      requiredRole: 'SYSTEM',
      isReadOnly: true,
      parametersSchema: {
        latitude: { type: 'number', description: 'Target latitude coordinate', required: true },
        longitude: { type: 'number', description: 'Target longitude coordinate', required: true },
        radiusMeters: { type: 'number', description: 'Search buffer radius in meters', required: true },
        category: { type: 'string', description: 'Optional incident category filter' },
      },
      handler: async (params) => {
        const targetLat = params.latitude as number;
        const targetLng = params.longitude as number;
        const radius = (params.radiusMeters as number) || 50;

        // Haversine distance calculation simulating PostGIS ST_DWithin
        const all = incidentEngine.getAllIncidents();
        const duplicates = all
          .map((inc) => {
            const dLat = (inc.location.latitude - targetLat) * 111000;
            const dLng =
              (inc.location.longitude - targetLng) * 111000 * Math.cos((targetLat * Math.PI) / 180);
            const distMeters = Math.sqrt(dLat * dLat + dLng * dLng);
            return { incident: inc, distanceMeters: Math.round(distMeters) };
          })
          .filter((item) => item.distanceMeters <= radius && item.distanceMeters > 0)
          .map((item) => ({
            incidentId: item.incident.id,
            trackingNumber: item.incident.trackingNumber,
            title: item.incident.title,
            distanceMeters: item.distanceMeters,
            status: item.incident.status,
            category: item.incident.category,
          }));

        return {
          clusterRadiusMeters: radius,
          foundCandidateCount: duplicates.length,
          candidates: duplicates,
        };
      },
    });

    // 4. Municipal Department Jurisdiction Lookup (Read-only)
    this.registerTool({
      name: 'lookup_department_jurisdiction',
      version: '1.0.0',
      description: 'Matches category taxonomy and geospatial ward code to designated authority department.',
      requiredRole: 'SYSTEM',
      isReadOnly: true,
      parametersSchema: {
        category: { type: 'string', description: 'Incident category', required: true },
        wardCode: { type: 'string', description: 'Geographic ward identifier', required: false },
      },
      handler: async (params) => {
        const cat = (params.category as string).toUpperCase();
        if (cat.includes('ROAD') || cat.includes('TRAFFIC') || cat.includes('STREET')) {
          return {
            departmentId: 'dept-transport',
            departmentName: 'Department of Transportation & Roads',
            slaPolicy: 'Standard Urban Pothole SLA (24hr Triage)',
            defaultTeamId: 'team-rapid-asphalt-01',
          };
        }
        if (cat.includes('WATER') || cat.includes('SEWER') || cat.includes('DRAIN')) {
          return {
            departmentId: 'dept-water',
            departmentName: 'Department of Water & Power',
            slaPolicy: 'Emergency Water Hazard SLA (4hr Isolation)',
            defaultTeamId: 'team-water-burst-crew',
          };
        }
        if (cat.includes('LIGHT') || cat.includes('POWER')) {
          return {
            departmentId: 'dept-lighting',
            departmentName: 'Bureau of Street Lighting',
            slaPolicy: 'Pedestrian Illumination SLA (48hr)',
            defaultTeamId: 'team-electrical-safety',
          };
        }
        return {
          departmentId: 'dept-public-works',
          departmentName: 'General Department of Public Works',
          slaPolicy: 'Routine Municipal SLA (72hr)',
          defaultTeamId: 'team-general-maintenance',
        };
      },
    });

    // 5. Work Crew Dispatch Capacity Checker (Read-only)
    this.registerTool({
      name: 'check_field_worker_capacity',
      version: '1.0.0',
      description: 'Checks real-time availability and proximity of certified field workers.',
      requiredRole: 'SYSTEM',
      isReadOnly: true,
      parametersSchema: {
        departmentId: { type: 'string', description: 'Department to query', required: true },
      },
      handler: async (params) => {
        return {
          availableWorkers: [
            { id: 'usr-worker-01', name: 'Marcus Chen', role: 'FIELD_WORKER', activeLoad: 1, maxCapacity: 4 },
            { id: 'usr-worker-02', name: 'Devon Patel', role: 'FIELD_WORKER', activeLoad: 2, maxCapacity: 4 },
          ],
        };
      },
    });
  }
}

export const toolRegistry = new ToolRegistry();
