import React, { useState } from 'react';
import { incidentEngine } from '../lib/incidentManagementEngine';
import { evaluateDuplicateCandidates } from '../lib/duplicateDetectionEngine';
import {
  DuplicateDetectionStructuredOutput,
  DuplicateCandidateMatch,
  DuplicateClassificationResult,
} from '../types/duplicateDetection';
import { useAuth } from '../context/AuthContext';
import {
  Copy,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  MapPin,
  Clock,
  FileText,
  Shield,
  Layers,
  ArrowRight,
  Database,
  Hash,
  Sliders,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export const DuplicateDetectionConsole: React.FC = () => {
  const { user } = useAuth();
  const incidents = incidentEngine.getAllIncidents();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(
    incidents[0]?.id || 'inc-pothole-101'
  );

  // Simulation adjustments
  const currentIncident = incidents.find((i) => i.id === selectedIncidentId) || incidents[0];
  const [simulatedLat, setSimulatedLat] = useState<string>(
    currentIncident ? currentIncident.location.latitude.toString() : '37.7749'
  );
  const [simulatedLng, setSimulatedLng] = useState<string>(
    currentIncident ? currentIncident.location.longitude.toString() : '-122.4194'
  );
  const [simulatedTitle, setSimulatedTitle] = useState<string>(
    currentIncident ? currentIncident.title : 'Deep crater pothole'
  );
  const [simulatedCategory, setSimulatedCategory] = useState<string>(
    currentIncident ? currentIncident.category : 'ROADS'
  );
  const [simulatedEvidenceHash, setSimulatedEvidenceHash] = useState<string>('');

  const [selectedCandidate, setSelectedCandidate] = useState<DuplicateCandidateMatch | null>(null);

  // Run duplicate evaluation
  const runEvaluation = (): DuplicateDetectionStructuredOutput => {
    return evaluateDuplicateCandidates({
      targetIncidentId: selectedIncidentId,
      title: simulatedTitle,
      description: currentIncident ? currentIncident.description : '',
      category: simulatedCategory,
      location: {
        latitude: parseFloat(simulatedLat) || 37.7749,
        longitude: parseFloat(simulatedLng) || -122.4194,
        address: currentIncident?.location.address,
      },
      createdAt: currentIncident?.createdAt || new Date().toISOString(),
      evidenceHashes: simulatedEvidenceHash ? [simulatedEvidenceHash] : undefined,
    });
  };

  const [evaluationResult, setEvaluationResult] = useState<DuplicateDetectionStructuredOutput>(runEvaluation);

  const handleSelectIncident = (id: string) => {
    setSelectedIncidentId(id);
    const inc = incidents.find((i) => i.id === id);
    if (inc) {
      setSimulatedLat(inc.location.latitude.toString());
      setSimulatedLng(inc.location.longitude.toString());
      setSimulatedTitle(inc.title);
      setSimulatedCategory(inc.category);
      setSimulatedEvidenceHash('');
      const res = evaluateDuplicateCandidates({
        targetIncidentId: id,
        title: inc.title,
        description: inc.description,
        category: inc.category,
        location: inc.location,
        createdAt: inc.createdAt,
      });
      setEvaluationResult(res);
      setSelectedCandidate(res.candidateMatches[0] || null);
    }
  };

  const handleReevaluate = () => {
    const res = runEvaluation();
    setEvaluationResult(res);
    setSelectedCandidate(res.candidateMatches[0] || null);
  };

  const handleSimulateCollision = (distanceOffsetMeters: number, exactCategory: boolean) => {
    const base = currentIncident?.location || { latitude: 37.7749, longitude: -122.4194 };
    // 0.0001 deg lat is approx 11.1 meters
    const latOffset = (distanceOffsetMeters / 111000);
    setSimulatedLat((base.latitude + latOffset).toFixed(6));
    setSimulatedLng(base.longitude.toFixed(6));
    if (exactCategory) {
      setSimulatedCategory(currentIncident?.category || 'ROADS');
    } else {
      setSimulatedCategory('STREETLIGHT');
    }
    setTimeout(handleReevaluate, 50);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
              <Copy className="w-4 h-4" />
              <span>Multi-Signal Geospatial & Semantic Telemetry</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              CivicConnect Duplicate Detection Agent Console
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Evaluates 6 weighted telemetry signals (Geographic Proximity, Time Delta, Category Taxonomy, Semantic Token Overlap, SHA-256 Binary Collisions, and Lifecycle Status). Preserves 100% of citizen evidence without arbitrary irreversible auto-merges.
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
                  {i.trackingNumber} - {i.title.substring(0, 26)}...
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Telemetry Simulator & Signal Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Multi-Signal Simulation Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold">
                <Sliders className="w-4 h-4" />
                <span>Target Telemetry Parameters</span>
              </div>
              <button
                onClick={handleReevaluate}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-3 py-1.5 rounded-lg transition cursor-pointer"
              >
                Re-evaluate
              </button>
            </div>

            {/* Quick Presets */}
            <div>
              <span className="text-slate-500 block text-[10px] mb-1.5">TEST SCENARIO PRESETS</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => handleSimulateCollision(12, true)}
                  className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-[10px] text-slate-300 transition text-center"
                >
                  Near (12m, Same Cat)
                </button>
                <button
                  onClick={() => handleSimulateCollision(85, true)}
                  className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-[10px] text-slate-300 transition text-center"
                >
                  Corridor (85m Cluster)
                </button>
                <button
                  onClick={() => handleSimulateCollision(350, false)}
                  className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-[10px] text-slate-300 transition text-center"
                >
                  Distant (350m Unique)
                </button>
              </div>
            </div>

            {/* Title & Category */}
            <div>
              <label className="block text-slate-400 text-[10px] mb-1">INCIDENT TITLE</label>
              <input
                type="text"
                value={simulatedTitle}
                onChange={(e) => setSimulatedTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 text-[10px] mb-1">CATEGORY</label>
                <input
                  type="text"
                  value={simulatedCategory}
                  onChange={(e) => setSimulatedCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[10px] mb-1">SHA-256 EVIDENCE HASH</label>
                <input
                  type="text"
                  value={simulatedEvidenceHash}
                  onChange={(e) => setSimulatedEvidenceHash(e.target.value)}
                  placeholder="Optional hex checksum..."
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono text-[10px]"
                />
              </div>
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 text-[10px] mb-1">LATITUDE</label>
                <input
                  type="text"
                  value={simulatedLat}
                  onChange={(e) => setSimulatedLat(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[10px] mb-1">LONGITUDE</label>
                <input
                  type="text"
                  value={simulatedLng}
                  onChange={(e) => setSimulatedLng(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-300 font-mono"
                />
              </div>
            </div>

            {/* Strict Deterministic Threshold Guide */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1 text-[11px] text-slate-400">
              <span className="font-bold text-slate-300 block">Deterministic Threshold Rules:</span>
              <div>&bull; <span className="text-emerald-400 font-bold">&ge; 82% composite &le; 35m</span>: Probable Duplicate (Eligible for link)</div>
              <div>&bull; <span className="text-cyan-400 font-bold">52% - 81% &le; 150m</span>: Related Corridor Cluster</div>
              <div>&bull; <span className="text-amber-400 font-bold">42% - 51%</span>: Uncertain Match (Human Review Required)</div>
              <div>&bull; <span className="text-slate-400 font-bold">&lt; 42%</span>: New Standalone Incident</div>
            </div>
          </div>
        </div>

        {/* Right Column: Structured Decision & Candidate Radar (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Duplicate Agent Determination
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">Classification & Recommendation</h3>
              </div>

              {/* Status Badge */}
              <span
                className={`text-xs font-mono px-3 py-1 rounded-full font-bold flex items-center space-x-1.5 ${
                  evaluationResult.determination === 'PROBABLE_DUPLICATE'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : evaluationResult.determination === 'RELATED_INCIDENT'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                    : evaluationResult.determination === 'UNCERTAIN_MATCH'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}
              >
                {evaluationResult.determination === 'PROBABLE_DUPLICATE' ? (
                  <Copy className="w-3.5 h-3.5" />
                ) : evaluationResult.determination === 'RELATED_INCIDENT' ? (
                  <Layers className="w-3.5 h-3.5" />
                ) : evaluationResult.determination === 'UNCERTAIN_MATCH' ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>{evaluationResult.determination}</span>
              </span>
            </div>

            {/* Score Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs">
                <span className="text-slate-500 block text-[10px]">RECOMMENDED RELATIONSHIP</span>
                <span className="text-cyan-400 font-bold text-xs block mt-0.5">
                  {evaluationResult.recommendedRelationship}
                </span>
                <span className="text-[10px] text-slate-400">
                  Target: {evaluationResult.primaryCandidateTrackingNumber || 'None'}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs">
                <span className="text-slate-500 block text-[10px]">COMPOSITE SIMILARITY</span>
                <span className="text-purple-400 font-bold text-sm block mt-0.5">
                  {(evaluationResult.compositeSimilarityScore * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-400">
                  Confidence: {(evaluationResult.confidence * 100).toFixed(0)}%
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs">
                <span className="text-slate-500 block text-[10px]">DETERMINISTIC MERGE ELIGIBLE</span>
                <span
                  className={`font-bold text-xs block mt-0.5 ${
                    evaluationResult.isDeterministicMergeEligible ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {evaluationResult.isDeterministicMergeEligible ? 'YES (Meets Criteria)' : 'NO (Preserve Separate)'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {evaluationResult.requiresHumanReview ? 'Officer Sign-Off Needed' : 'Autonomous Boundary'}
                </span>
              </div>
            </div>

            {/* Agent Reason */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs space-y-1">
              <span className="text-slate-500 block text-[10px]">AGENT SYNTHESIS & REASON</span>
              <div className="text-slate-300 text-xs leading-relaxed">{evaluationResult.reason}</div>
              <div className="text-emerald-400 text-[11px] pt-1">
                &bull; {evaluationResult.preservedCitizenEvidenceSummary}
              </div>
            </div>

            {/* Candidate Matches Table */}
            <div>
              <span className="text-xs font-mono font-bold text-slate-300 block mb-2">
                Spatial & Semantic Candidate Matches ({evaluationResult.candidateMatches.length})
              </span>

              <div className="space-y-2">
                {evaluationResult.candidateMatches.length === 0 ? (
                  <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-slate-500 text-center">
                    Zero candidate incidents found within 500-meter buffer.
                  </div>
                ) : (
                  evaluationResult.candidateMatches.map((cand) => (
                    <div
                      key={cand.candidateIncidentId}
                      onClick={() => setSelectedCandidate(cand)}
                      className={`p-3 rounded-lg border cursor-pointer font-mono text-xs transition ${
                        selectedCandidate?.candidateIncidentId === cand.candidateIncidentId
                          ? 'bg-slate-800 border-cyan-500'
                          : 'bg-slate-950 border-slate-800 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white">{cand.candidateTrackingNumber}</span>
                          <span className="text-[10px] text-slate-400">{cand.candidateCategory}</span>
                        </div>
                        <span className="text-cyan-400 font-bold">
                          {(cand.aggregateSimilarityScore * 100).toFixed(0)}% Match
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-300 truncate mb-1.5">{cand.candidateTitle}</div>

                      {/* 6 Signals Breakdown Bar */}
                      <div className="grid grid-cols-6 gap-1 text-[9px] text-slate-400 text-center">
                        <div className="p-1 bg-slate-900 rounded">
                          Geo: {(cand.signalBreakdown.geographicProximityScore * 100).toFixed(0)}% ({cand.distanceMeters}m)
                        </div>
                        <div className="p-1 bg-slate-900 rounded">
                          Time: {(cand.signalBreakdown.timeProximityScore * 100).toFixed(0)}%
                        </div>
                        <div className="p-1 bg-slate-900 rounded">
                          Cat: {(cand.signalBreakdown.categoryMatchScore * 100).toFixed(0)}%
                        </div>
                        <div className="p-1 bg-slate-900 rounded">
                          NLP: {(cand.signalBreakdown.semanticSimilarityScore * 100).toFixed(0)}%
                        </div>
                        <div className="p-1 bg-slate-900 rounded">
                          Hash: {(cand.signalBreakdown.evidenceSimilarityScore * 100).toFixed(0)}%
                        </div>
                        <div className="p-1 bg-slate-900 rounded">
                          Status: {cand.candidateStatus}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
