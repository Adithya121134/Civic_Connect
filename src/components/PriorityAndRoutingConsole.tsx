import React, { useState } from 'react';
import { incidentEngine } from '../lib/incidentManagementEngine';
import {
  CONFIGURED_MUNICIPAL_DEPARTMENTS,
  evaluateIncidentPriority,
  evaluateDepartmentRouting,
} from '../lib/priorityAndRoutingService';
import {
  PriorityStructuredOutput,
  RoutingStructuredOutput,
} from '../types/priorityAndRouting';
import {
  Flame,
  GitPullRequest,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Clock,
  Shield,
  Building,
  ArrowRight,
  Sliders,
  FileCheck2,
  MapPin,
  Camera,
  Layers,
  Sparkles,
} from 'lucide-react';

export const PriorityAndRoutingConsole: React.FC = () => {
  const incidents = incidentEngine.getAllIncidents();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(
    incidents[0]?.id || 'inc-pothole-101'
  );

  const currentIncident = incidents.find((i) => i.id === selectedIncidentId) || incidents[0];

  // Simulation State
  const [simCategory, setSimCategory] = useState<string>(currentIncident ? currentIncident.category : 'ROAD_DAMAGE');
  const [simTitle, setSimTitle] = useState<string>(currentIncident ? currentIncident.title : 'Hazard on Market St');
  const [simDesc, setSimDesc] = useState<string>(currentIncident ? currentIncident.description : '');
  const [hasVisualEvidence, setHasVisualEvidence] = useState<boolean>(true);
  const [evidenceCount, setEvidenceCount] = useState<number>(2);
  const [relatedReportCount, setRelatedReportCount] = useState<number>(1);
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [isTransitArterial, setIsTransitArterial] = useState<boolean>(true);

  // Computations
  const runPriorityEval = (): PriorityStructuredOutput => {
    return evaluateIncidentPriority({
      incidentId: selectedIncidentId,
      category: simCategory,
      title: simTitle,
      description: simDesc,
      location: {
        latitude: currentIncident?.location.latitude || 37.7749,
        longitude: currentIncident?.location.longitude || -122.4194,
        address: isTransitArterial ? 'Market Street Arterial & 5th Ave' : 'Residential Cul-de-sac',
        wardCode: 'WARD-2',
      },
      evidenceCount,
      hasVisualEvidence,
      relatedIncidentCount: relatedReportCount,
      isRecurringLocation: isRecurring,
      historicalOccurrenceCount: isRecurring ? 3 : 0,
    });
  };

  const runRoutingEval = (): RoutingStructuredOutput => {
    return evaluateDepartmentRouting({
      incidentId: selectedIncidentId,
      category: simCategory,
      title: simTitle,
      description: simDesc,
      location: {
        latitude: currentIncident?.location.latitude || 37.7749,
        longitude: currentIncident?.location.longitude || -122.4194,
        address: currentIncident?.location.address,
        wardCode: 'WARD-2',
      },
    });
  };

  const [priorityResult, setPriorityResult] = useState<PriorityStructuredOutput>(runPriorityEval);
  const [routingResult, setRoutingResult] = useState<RoutingStructuredOutput>(runRoutingEval);

  const handleSelectIncident = (id: string) => {
    setSelectedIncidentId(id);
    const inc = incidents.find((i) => i.id === id);
    if (inc) {
      setSimCategory(inc.category);
      setSimTitle(inc.title);
      setSimDesc(inc.description);
      const isArt = inc.title.toLowerCase().includes('arterial') || (inc.location.address || '').toLowerCase().includes('market');
      setIsTransitArterial(isArt);
      setTimeout(handleReevaluate, 20);
    }
  };

  const handleReevaluate = () => {
    setPriorityResult(runPriorityEval());
    setRoutingResult(runRoutingEval());
  };

  const handlePreset = (type: 'p1_emergency' | 'p2_arterial' | 'p3_routine' | 'disputed_water_road') => {
    if (type === 'p1_emergency') {
      setSimCategory('WATER_LEAKAGE');
      setSimTitle('High pressure water main rupture flooding Market Street');
      setSimDesc('Clean municipal water gushing 6 feet high, road asphalt collapsing. Threatens subway station entrance.');
      setHasVisualEvidence(true);
      setEvidenceCount(3);
      setRelatedReportCount(5);
      setIsRecurring(true);
      setIsTransitArterial(true);
    } else if (type === 'p2_arterial') {
      setSimCategory('ROAD_DAMAGE');
      setSimTitle('Deep pothole near crosswalk on Mission St');
      setSimDesc('Vehicles swerving into oncoming lane to avoid blowout.');
      setHasVisualEvidence(true);
      setEvidenceCount(1);
      setRelatedReportCount(2);
      setIsRecurring(false);
      setIsTransitArterial(true);
    } else if (type === 'p3_routine') {
      setSimCategory('WASTE');
      setSimTitle('Litter accumulation in local neighborhood park');
      setSimDesc('Public trash can full, bags sitting on grass.');
      setHasVisualEvidence(false);
      setEvidenceCount(0);
      setRelatedReportCount(0);
      setIsRecurring(false);
      setIsTransitArterial(false);
    } else if (type === 'disputed_water_road') {
      setSimCategory('DRAINAGE');
      setSimTitle('Broken storm drain catch basin grate in road surface');
      setSimDesc('Heavy steel grate cracked, water backing up into road lane.');
      setHasVisualEvidence(true);
      setEvidenceCount(2);
      setRelatedReportCount(1);
      setIsRecurring(false);
      setIsTransitArterial(true);
    }
    setTimeout(handleReevaluate, 50);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
              <Flame className="w-4 h-4" />
              <span>Fact-Grounded Triage & Jurisdictional Dispatch Intelligence</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Priority Assessment & Department Routing Agents
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Evaluates empirical public safety risks, transit arterials, verified evidence, and cluster volume to recommend SLA response targets without inventing facts. Routes exclusively to active configured municipal departments with contingent alternatives.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <select
              value={selectedIncidentId}
              onChange={(e) => handleSelectIncident(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
            >
              {incidents.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.trackingNumber} - {i.title.substring(0, 24)}...
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Preset Scenario Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Empirical Test Scenarios & Multi-Agency Boundary Cases
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <button
            onClick={() => handlePreset('p1_emergency')}
            className="p-2.5 rounded-lg text-left text-xs font-medium border bg-slate-950 border-slate-800 hover:border-rose-500 transition cursor-pointer text-slate-300"
          >
            <div className="font-bold text-rose-400 flex items-center space-x-1">
              <Flame className="w-3.5 h-3.5" />
              <span>P1 Critical Emergency</span>
            </div>
            <div className="text-[10px] text-slate-500 truncate mt-0.5">High pressure rupture + 5 reports</div>
          </button>

          <button
            onClick={() => handlePreset('p2_arterial')}
            className="p-2.5 rounded-lg text-left text-xs font-medium border bg-slate-950 border-slate-800 hover:border-amber-500 transition cursor-pointer text-slate-300"
          >
            <div className="font-bold text-amber-400 flex items-center space-x-1">
              <Shield className="w-3.5 h-3.5" />
              <span>P2 Arterial Hazard</span>
            </div>
            <div className="text-[10px] text-slate-500 truncate mt-0.5">Market St vehicular lane pothole</div>
          </button>

          <button
            onClick={() => handlePreset('disputed_water_road')}
            className="p-2.5 rounded-lg text-left text-xs font-medium border bg-slate-950 border-slate-800 hover:border-cyan-500 transition cursor-pointer text-slate-300"
          >
            <div className="font-bold text-cyan-400 flex items-center space-x-1">
              <GitPullRequest className="w-3.5 h-3.5" />
              <span>Disputed Jurisdiction</span>
            </div>
            <div className="text-[10px] text-slate-500 truncate mt-0.5">Catch basin: Water vs DOT</div>
          </button>

          <button
            onClick={() => handlePreset('p3_routine')}
            className="p-2.5 rounded-lg text-left text-xs font-medium border bg-slate-950 border-slate-800 hover:border-emerald-500 transition cursor-pointer text-slate-300"
          >
            <div className="font-bold text-emerald-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>P3 / P4 Routine Maintenance</span>
            </div>
            <div className="text-[10px] text-slate-500 truncate mt-0.5">Local park litter, zero photo</div>
          </button>
        </div>
      </div>

      {/* Main Grid Split: Controls (4 cols) + Outputs (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Empirical Parameters Workbench (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-amber-400 font-bold">
                <Sliders className="w-4 h-4" />
                <span>Empirical Factors Input</span>
              </div>
              <button
                onClick={handleReevaluate}
                className="bg-amber-600 hover:bg-amber-500 text-white font-medium px-3 py-1 rounded transition cursor-pointer"
              >
                Assess
              </button>
            </div>

            <div>
              <label className="block text-slate-400 text-[10px] mb-1">MUNICIPAL CATEGORY</label>
              <select
                value={simCategory}
                onChange={(e) => setSimCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
              >
                <option value="ROAD_DAMAGE">ROAD_DAMAGE (Transportation)</option>
                <option value="WATER_LEAKAGE">WATER_LEAKAGE (Water & Power)</option>
                <option value="DRAINAGE">DRAINAGE (Catch basin / Culverts)</option>
                <option value="SEWAGE">SEWAGE (Wastewater / Biohazard)</option>
                <option value="STREETLIGHT">STREETLIGHT (Electrical Safety)</option>
                <option value="WASTE">WASTE (Sanitation Operations)</option>
                <option value="PUBLIC_INFRASTRUCTURE">PUBLIC_INFRASTRUCTURE (Public Works)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-[10px] mb-1">INCIDENT TITLE</label>
              <input
                type="text"
                value={simTitle}
                onChange={(e) => setSimTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-[10px] mb-1">OBSERVATION NARRATIVE</label>
              <textarea
                rows={3}
                value={simDesc}
                onChange={(e) => setSimDesc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-sans text-xs"
              />
            </div>

            {/* Factor Toggles */}
            <div className="space-y-2 pt-2 border-t border-slate-800 text-[11px]">
              <label className="flex items-center justify-between p-2 bg-slate-950 rounded border border-slate-800 cursor-pointer">
                <span className="text-slate-300">Transit Arterial / High Pedestrian</span>
                <input
                  type="checkbox"
                  checked={isTransitArterial}
                  onChange={(e) => setIsTransitArterial(e.target.checked)}
                  className="rounded text-amber-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 bg-slate-950 rounded border border-slate-800 cursor-pointer">
                <span className="text-slate-300">Verified Photographic Evidence</span>
                <input
                  type="checkbox"
                  checked={hasVisualEvidence}
                  onChange={(e) => setHasVisualEvidence(e.target.checked)}
                  className="rounded text-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 bg-slate-950 rounded border border-slate-800 cursor-pointer">
                <span className="text-slate-300">Historical Defect Recurrence</span>
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded text-purple-500"
                />
              </label>
            </div>

            {/* Cluster Counts */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="text-slate-500 block mb-1">RELATED CLUSTER REPORTS</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={relatedReportCount}
                  onChange={(e) => setRelatedReportCount(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-200 font-mono"
                />
              </div>
              <div>
                <span className="text-slate-500 block mb-1">VERIFIED EVIDENCE COUNT</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={evidenceCount}
                  onChange={(e) => setEvidenceCount(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-200 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Configured Departments List Reference */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2 text-xs font-mono">
            <span className="text-slate-400 font-bold block mb-1">
              Active Configured Departments ({CONFIGURED_MUNICIPAL_DEPARTMENTS.length})
            </span>
            <div className="space-y-1.5 text-[11px]">
              {CONFIGURED_MUNICIPAL_DEPARTMENTS.map((dept) => (
                <div key={dept.id} className="p-2 bg-slate-950 rounded border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-white font-bold block">{dept.name}</span>
                    <span className="text-[10px] text-slate-500">{dept.code} &bull; Lead: {dept.divisionLead}</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 bg-emerald-950 text-emerald-300 rounded border border-emerald-800">
                    ACTIVE
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Structured Output Display (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Agent 1: Priority Assessment Result */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
                  <Flame className="w-4 h-4" />
                  <span>Priority Assessment Agent (v3.0.0)</span>
                </div>
                <h3 className="text-sm font-bold text-white mt-0.5">Empirical Risk & SLA Classification</h3>
              </div>

              {/* Priority & Severity Badges */}
              <div className="flex items-center space-x-2">
                <span
                  className={`text-xs font-mono px-3 py-1 rounded-full font-bold ${
                    priorityResult.recommendedPriority === 'P1_CRITICAL'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : priorityResult.recommendedPriority === 'P2_HIGH'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}
                >
                  {priorityResult.recommendedPriority}
                </span>
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {priorityResult.recommendedSeverity}
                </span>
              </div>
            </div>

            {/* Metric Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs">
                <span className="text-slate-500 block text-[10px]">SLA TARGET DEADLINE</span>
                <span className="text-amber-400 font-bold text-sm block mt-0.5 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{priorityResult.slaTargetHours} Hours Triage</span>
                </span>
                <span className="text-[10px] text-slate-400">Resolution enforcement deadline</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs">
                <span className="text-slate-500 block text-[10px]">EPISTEMIC CONFIDENCE</span>
                <span className="text-emerald-400 font-bold text-sm block mt-0.5">
                  {(priorityResult.confidence * 100).toFixed(0)}%
                </span>
                <span className="text-[10px] text-slate-400">
                  Uncertainty: {priorityResult.uncertainty.uncertaintyLevel}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs">
                <span className="text-slate-500 block text-[10px]">SAFETY ESCALATION</span>
                <span
                  className={`text-xs font-bold block mt-0.5 ${
                    priorityResult.recommendedPriority === 'P1_CRITICAL' ? 'text-rose-400' : 'text-slate-400'
                  }`}
                >
                  {priorityResult.recommendedPriority === 'P1_CRITICAL' ? 'OFFICER SIGN-OFF REQ.' : 'STANDARD DISPATCH'}
                </span>
                <span className="text-[10px] text-slate-500">Autonomous workflow threshold</span>
              </div>
            </div>

            {/* Explanation */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs space-y-1">
              <span className="text-slate-500 block text-[10px]">AGENT SYNTHESIS & EXPLANATION</span>
              <div className="text-slate-200 leading-relaxed">{priorityResult.explanation}</div>
            </div>

            {/* Empirical Factors Breakdown */}
            <div>
              <span className="text-xs font-mono font-bold text-slate-300 block mb-2">
                Empirical Evaluation Factors ({priorityResult.factors.length})
              </span>
              <div className="space-y-2">
                {priorityResult.factors.map((f, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-950 rounded border border-slate-800 font-mono text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-bold">{f.factorName}</span>
                      <span className="text-amber-400 font-bold">
                        Score: {(f.score * 100).toFixed(0)}% (Weight: {(f.weight * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">{f.evidenceObserved}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Uncertainty Diagnostics */}
            {priorityResult.uncertainty.missingEmpiricalSignals.length > 0 && (
              <div className="p-3 bg-amber-950/30 border border-amber-900/60 rounded-lg font-mono text-xs text-amber-300 space-y-1">
                <div className="font-bold flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Uncertainty Diagnostics ({priorityResult.uncertainty.uncertaintyLevel}):</span>
                </div>
                <div className="text-[11px] text-amber-200/80">
                  Missing empirical telemetry: [
                  {priorityResult.uncertainty.missingEmpiricalSignals.join(', ')}]. Priority calculated conservatively without hallucination.
                </div>
              </div>
            )}
          </div>

          {/* Agent 2: Department Routing Result */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
                  <Building className="w-4 h-4" />
                  <span>Department Routing Agent (v3.0.0)</span>
                </div>
                <h3 className="text-sm font-bold text-white mt-0.5">Municipal Jurisdictional Matching</h3>
              </div>

              {/* Validation Status Badge */}
              <span className="text-xs font-mono px-3 py-1 rounded-full font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{routingResult.validationStatus}</span>
              </span>
            </div>

            {/* Routing Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary Recommended Department */}
              <div className="p-4 bg-slate-950 rounded-lg border border-cyan-800/80 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                    PRIMARY JURISDICTION
                  </span>
                  <span className="text-xs font-bold text-emerald-400">
                    {(routingResult.confidence * 100).toFixed(0)}% Match
                  </span>
                </div>

                <div className="text-white font-bold text-sm">
                  {routingResult.recommendedDepartment.name}
                </div>

                <div className="text-[11px] text-slate-400 space-y-0.5">
                  <div>Department ID: <span className="text-slate-200">{routingResult.recommendedDepartment.id}</span></div>
                  <div>Charter Code: <span className="text-slate-200">{routingResult.recommendedDepartment.code}</span></div>
                  <div>Division Lead: <span className="text-slate-200">{routingResult.recommendedDepartment.divisionLead}</span></div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300">
                  {routingResult.explanation}
                </div>
              </div>

              {/* Contingent Alternative Department */}
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    CONTINGENT ALTERNATIVE (IF UNCERTAIN)
                  </span>
                  <span className="text-[10px] text-slate-500">Secondary Triage</span>
                </div>

                {routingResult.alternativeDepartment ? (
                  <>
                    <div className="text-slate-300 font-bold text-sm">
                      {routingResult.alternativeDepartment.name}
                    </div>

                    <div className="text-[11px] text-slate-400 space-y-0.5">
                      <div>Department ID: <span className="text-slate-300">{routingResult.alternativeDepartment.id}</span></div>
                      <div>Charter Code: <span className="text-slate-300">{routingResult.alternativeDepartment.code}</span></div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 text-[11px] text-amber-300/90">
                      &bull; Reason: {routingResult.alternativeDepartment.reasonForAlternative}
                    </div>
                  </>
                ) : (
                  <div className="text-slate-500 text-xs py-4 text-center">
                    Zero jurisdictional conflict. Single authoritative department.
                  </div>
                )}
              </div>
            </div>

            {/* Strict Guardrail Notice */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center space-x-2">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Backend Guardrail Enforced: Routing decisions are strictly validated against active configured municipal departments. AI agents are prevented from inventing arbitrary agencies or dispatching unauthorized users.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
