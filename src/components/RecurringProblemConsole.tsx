import React, { useState, useEffect } from 'react';
import {
  recurringProblemService,
  generateHistoricalCivicDataset,
} from '../lib/recurringProblemService';
import {
  RecurringIssue,
  RecurrenceDetectionRunReport,
  RecurrenceConfidenceLevel,
} from '../types/recurringProblem';
import {
  TrendingUp,
  MapPin,
  Calendar,
  AlertOctagon,
  ShieldCheck,
  Search,
  RefreshCw,
  Compass,
  FileText,
  Activity,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Lightbulb,
  Building,
  Info,
} from 'lucide-react';

export const RecurringProblemConsole: React.FC = () => {
  const [issues, setIssues] = useState<RecurringIssue[]>([]);
  const [runs, setRuns] = useState<RecurrenceDetectionRunReport[]>([]);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [filterConfidence, setFilterConfidence] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [isScanning, setIsScanning] = useState<boolean>(false);

  const refresh = () => {
    setIssues(recurringProblemService.getRecurringIssues());
    setRuns(recurringProblemService.getRunHistory());
  };

  useEffect(() => {
    refresh();
    const unsub = recurringProblemService.subscribe(() => {
      refresh();
    });
    return () => unsub();
  }, []);

  const handleRunAnalysis = () => {
    setIsScanning(true);
    setTimeout(() => {
      recurringProblemService.runDetection(generateHistoricalCivicDataset());
      setIsScanning(false);
      refresh();
    }, 400);
  };

  const handleUpdateStatus = (id: string, status: RecurringIssue['status']) => {
    recurringProblemService.updateIssueStatus(id, status);
    refresh();
  };

  const filteredIssues = issues.filter((iss) => {
    if (filterConfidence !== 'ALL' && iss.confidence !== filterConfidence) return false;
    if (filterCategory !== 'ALL' && iss.issueCategory !== filterCategory) return false;
    return true;
  });

  const selectedIssue = issues.find((i) => i.id === selectedIssueId) || filteredIssues[0] || issues[0];

  const getConfidenceBadge = (conf: RecurrenceConfidenceLevel) => {
    switch (conf) {
      case 'VERY_HIGH':
        return 'bg-rose-950/80 text-rose-300 border-rose-800';
      case 'HIGH':
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
      case 'MODERATE':
        return 'bg-blue-950/80 text-blue-300 border-blue-800';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL_INTERVENTION':
        return 'bg-rose-950 text-rose-300 border-rose-800';
      case 'SCHEDULED_ENGINEERING_SURVEY':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'OPERATIONAL_AUDIT':
        return 'bg-cyan-950 text-cyan-300 border-cyan-800';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
              <TrendingUp className="w-4 h-4" />
              <span>Recurring Problem Intelligence Subsystem</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Spatiotemporal Civic Pattern & Repeat Defect Detection
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Analyzes historical incident clusters beyond simple complaint counts. Evaluates geographic radius, inter-occurrence frequency, resolution history, and repeat failure intervals to produce evidence-grounded preventive engineering recommendations for municipal authorities.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunAnalysis}
              disabled={isScanning}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white font-medium text-xs font-mono rounded-lg flex items-center space-x-2 transition cursor-pointer shadow"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning Telemetry...' : 'Run Pattern Analysis'}</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Filter Confidence:</span>
            {['ALL', 'VERY_HIGH', 'HIGH', 'MODERATE'].map((c) => (
              <button
                key={c}
                onClick={() => setFilterConfidence(c)}
                className={`px-2.5 py-1 rounded border text-xs transition cursor-pointer ${
                  filterConfidence === c
                    ? 'bg-slate-800 text-cyan-300 border-cyan-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Category:</span>
            {['ALL', 'ROAD_HAZARD', 'WATER_UTILITY', 'SANITATION', 'POWER_LIGHTING'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2 py-1 rounded border text-xs transition cursor-pointer ${
                  filterCategory === cat
                    ? 'bg-slate-800 text-cyan-300 border-cyan-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-slate-500 block text-[10px] uppercase">IDENTIFIED PATTERNS</span>
          <span className="text-xl font-bold text-white mt-0.5 block">{issues.length}</span>
          <span className="text-[10px] text-slate-400">Meaningful repeating clusters</span>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-slate-500 block text-[10px] uppercase">VERY HIGH CONFIDENCE</span>
          <span className="text-xl font-bold text-rose-400 mt-0.5 block">
            {issues.filter((i) => i.confidence === 'VERY_HIGH').length}
          </span>
          <span className="text-[10px] text-slate-400">Chronic multi-failure hotspots</span>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-slate-500 block text-[10px] uppercase">SUPPORTING INCIDENTS</span>
          <span className="text-xl font-bold text-cyan-400 mt-0.5 block">
            {issues.reduce((acc, i) => acc + i.supportingEvidence.length, 0)}
          </span>
          <span className="text-[10px] text-slate-400">Total historical reports linked</span>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-slate-500 block text-[10px] uppercase">ANALYSIS RUNS LOGGED</span>
          <span className="text-xl font-bold text-emerald-400 mt-0.5 block">{runs.length}</span>
          <span className="text-[10px] text-slate-400">Spatiotemporal sweeps executed</span>
        </div>
      </div>

      {/* Two Column Workspace: Pattern List (5 cols) & Deep Inspection Dossier (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Patterns List */}
        <div className="lg:col-span-5 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400 pb-1">
            <span className="font-bold text-white flex items-center space-x-1.5">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Detected Chronic Patterns ({filteredIssues.length})</span>
            </span>
            <span className="text-[11px]">Radius: &le;100m</span>
          </div>

          <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
            {filteredIssues.map((iss) => {
              const isSelected = selectedIssue?.id === iss.id;
              return (
                <div
                  key={iss.id}
                  onClick={() => setSelectedIssueId(iss.id)}
                  className={`p-4 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/95 border-cyan-500 shadow-lg ring-1 ring-cyan-500/30'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getConfidenceBadge(
                        iss.confidence
                      )}`}
                    >
                      {iss.confidence} CONFIDENCE ({(iss.confidenceScore * 100).toFixed(0)}%)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {iss.temporalMetrics.incidentCount} incidents
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white mt-2 leading-snug">
                    {iss.title}
                  </h3>

                  <div className="flex items-center space-x-2 text-slate-400 text-[11px] mt-2">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="truncate">{iss.geographicCluster.clusterCenter.approximateAddress}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                    <div>
                      <span className="text-slate-500 block">FREQUENCY</span>
                      <span className="text-slate-200 font-bold">
                        Every ~{iss.temporalMetrics.averageIntervalDays} days
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">OBSERVED SPAN</span>
                      <span className="text-slate-200 font-bold">
                        {iss.temporalMetrics.totalSpanDays} days
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/60">
                    <span className="text-cyan-400 font-medium truncate max-w-[220px]">
                      {iss.preventiveRecommendation.targetDepartmentName}
                    </span>
                    <span className="text-slate-500 flex items-center space-x-1">
                      <span>Inspect</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Pattern Dossier & Preventive Recommendation */}
        <div className="lg:col-span-7 space-y-5">
          {selectedIssue ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
              {/* Header & Status */}
              <div className="border-b border-slate-800 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${getConfidenceBadge(
                        selectedIssue.confidence
                      )}`}
                    >
                      {selectedIssue.confidence} CONFIDENCE
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Cluster: {selectedIssue.clusterId}
                    </span>
                  </div>

                  {/* Status Dropdown / Indicator */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono text-slate-400">Status:</span>
                    <select
                      value={selectedIssue.status}
                      onChange={(e) =>
                        handleUpdateStatus(selectedIssue.id, e.target.value as RecurringIssue['status'])
                      }
                      className="bg-slate-950 text-xs font-mono border border-slate-700 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="IDENTIFIED">IDENTIFIED</option>
                      <option value="UNDER_CIVIC_INVESTIGATION">UNDER CIVIC INVESTIGATION</option>
                      <option value="ENGINEERING_WORK_COMMISSIONED">ENGINEERING WORK COMMISSIONED</option>
                      <option value="DISMISSED">DISMISSED</option>
                    </select>
                  </div>
                </div>

                <h2 className="text-lg font-bold text-white mt-2.5">{selectedIssue.title}</h2>
                <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    Centroid: {selectedIssue.geographicCluster.clusterCenter.latitude},{' '}
                    {selectedIssue.geographicCluster.clusterCenter.longitude} (Radius:{' '}
                    {selectedIssue.geographicCluster.clusterRadiusMeters}m)
                  </span>
                </div>
              </div>

              {/* Preventive Recommendation Callout (Strict Non-Speculative Wording) */}
              <div className="p-4 bg-slate-950 border-l-4 border-l-amber-500 border border-slate-800 rounded-r-xl space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 flex items-center space-x-1.5 text-sm">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    <span>{selectedIssue.preventiveRecommendation.summaryHeadline}</span>
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded border font-bold ${getUrgencyBadge(
                      selectedIssue.preventiveRecommendation.preventiveUrgency
                    )}`}
                  >
                    {selectedIssue.preventiveRecommendation.preventiveUrgency.replace(/_/g, ' ')}
                  </span>
                </div>

                <p className="text-slate-300 text-xs leading-relaxed">
                  <strong className="text-white">Recommended Course of Action:</strong>{' '}
                  {selectedIssue.preventiveRecommendation.recommendedAction}
                </p>

                <div className="p-2.5 bg-slate-900/90 rounded border border-slate-800 text-[11px] text-slate-300">
                  <span className="text-slate-400 font-bold block mb-1">
                    Grounded Evidence Summary:
                  </span>
                  {selectedIssue.preventiveRecommendation.evidenceSummaryStatement}
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">
                    Suggested Inspection Scope for Authorized Engineers:
                  </span>
                  <ul className="space-y-1 text-slate-300 text-[11px]">
                    {selectedIssue.preventiveRecommendation.suggestedInspectionScope.map((scope, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-cyan-400 font-bold shrink-0">&bull;</span>
                        <span>{scope}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Spatiotemporal Analysis Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">TOTAL SPAN</span>
                  <span className="text-slate-200 font-bold">
                    {selectedIssue.temporalMetrics.totalSpanDays} Days
                  </span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">AVG RECURRENCE</span>
                  <span className="text-cyan-400 font-bold">
                    Every {selectedIssue.temporalMetrics.averageIntervalDays} Days
                  </span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">FREQUENCY RATE</span>
                  <span className="text-slate-200 font-bold">
                    {selectedIssue.temporalMetrics.recurrenceFrequencyPerMonth} / Month
                  </span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">TARGET DEPT</span>
                  <span className="text-amber-400 font-bold truncate block">
                    {selectedIssue.preventiveRecommendation.targetDepartmentCode}
                  </span>
                </div>
              </div>

              {/* Supporting Historical Evidence Stream */}
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white flex items-center space-x-1.5">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span>Documented Supporting Evidence ({selectedIssue.supportingEvidence.length} Events)</span>
                  </span>
                  <span className="text-slate-500 text-[10px]">Multi-Signal Audit Records</span>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {selectedIssue.supportingEvidence.map((ev, idx) => (
                    <div
                      key={ev.incidentId}
                      className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-bold">{ev.trackingNumber}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            {ev.severity}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {ev.distanceMetersFromClusterCenter}m from center
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(ev.reportedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="text-slate-300 text-xs font-sans font-medium">{ev.title}</div>

                      {ev.resolutionHistoryNote && (
                        <div className="text-[11px] text-slate-400 bg-slate-900/90 p-2 rounded border border-slate-850">
                          <span className="text-amber-400 font-bold block text-[10px]">
                            PRIOR RESOLUTION RECORD:
                          </span>
                          {ev.resolutionHistoryNote}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 font-mono text-xs">
              Select a recurring pattern from the left panel to inspect its supporting evidence and preventive engineering recommendation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
