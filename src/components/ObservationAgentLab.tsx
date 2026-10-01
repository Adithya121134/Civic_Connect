import React, { useState } from 'react';
import { analyzeCitizenObservation } from '../lib/observationAgentService';
import {
  RawCitizenObservationInput,
  ObservationStructuredOutput,
  InformationSufficiencyStatus,
} from '../types/observationAgent';
import {
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileText,
  Camera,
  MapPin,
  Mic,
  ArrowRight,
  Shield,
  Layers,
  ChevronRight,
} from 'lucide-react';

const PRESET_OBSERVATIONS: { label: string; data: RawCitizenObservationInput }[] = [
  {
    label: 'Road Damage (Sufficient info with photo & GPS)',
    data: {
      incidentId: 'sim-inc-01',
      citizenText:
        'Huge asphalt subsidence and deep pothole on Market Street near the 5th street crossing. Vehicles are swerving into oncoming traffic to avoid blowing tires. Very dangerous.',
      declaredLocation: { latitude: 37.7749, longitude: -122.4194, address: '500 Market St, Financial District' },
      capturedTimestamp: new Date().toISOString(),
      imageEvidenceList: [
        {
          id: 'ev-img-01',
          originalFilename: 'pothole_depth_marker.jpg',
          sha256Hash: 'a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8',
          detectedMimeType: 'image/jpeg',
          fileSizeBytes: 3421500,
          geoMetadata: { latitude: 37.7749, longitude: -122.4194, geotagSource: 'EXIF_GPS' },
        },
      ],
    },
  },
  {
    label: 'Water Main Break (Critical emergency + audio transcript)',
    data: {
      incidentId: 'sim-inc-02',
      citizenText: 'High pressure water pipe burst! Clean water gushing 4 feet into the air and flooding the roadway.',
      transcribedAudioText:
        'Reporting severe water main rupture. Street is beginning to wash out. Needs urgent public works shutoff valve crew.',
      hasAudioAttachment: true,
      declaredLocation: { latitude: 37.765, longitude: -122.421, address: 'Valencia St & 16th St' },
      capturedTimestamp: new Date().toISOString(),
    },
  },
  {
    label: 'Streetlight Corridor (Dark corridor hazard)',
    data: {
      incidentId: 'sim-inc-03',
      citizenText:
        'Entire block of pedestrian streetlights is completely dead and pitch black. Walkway between park and elementary school feels unsafe for kids after dusk.',
      declaredLocation: { latitude: 37.752, longitude: -122.435, address: 'Mission Dolores Park Path' },
      capturedTimestamp: new Date().toISOString(),
      imageEvidenceList: [
        {
          id: 'ev-img-02',
          originalFilename: 'unlit_corridor.jpg',
          sha256Hash: 'e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2',
          detectedMimeType: 'image/jpeg',
          fileSizeBytes: 2150000,
        },
      ],
    },
  },
  {
    label: 'Insufficient Information (Vague note without photo or GPS)',
    data: {
      incidentId: 'sim-inc-04',
      citizenText: 'Something broken near the tree.',
      capturedTimestamp: new Date().toISOString(),
    },
  },
  {
    label: 'Uncertain / Ambiguous Classification',
    data: {
      incidentId: 'sim-inc-05',
      citizenText: 'Smelly liquid leaking near curb with some dirt and leaves.',
      declaredLocation: { latitude: 37.77, longitude: -122.42, address: 'Folsom St' },
      capturedTimestamp: new Date().toISOString(),
    },
  },
];

export const ObservationAgentLab: React.FC = () => {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [citizenText, setCitizenText] = useState(PRESET_OBSERVATIONS[0].data.citizenText);
  const [audioTranscript, setAudioTranscript] = useState(PRESET_OBSERVATIONS[0].data.transcribedAudioText || '');
  const [includeImage, setIncludeImage] = useState(true);
  const [includeGps, setIncludeGps] = useState(true);
  const [lat, setLat] = useState('37.7749');
  const [lng, setLng] = useState('-122.4194');
  const [address, setAddress] = useState('500 Market St, Financial District');

  const [analysisResult, setAnalysisResult] = useState<ObservationStructuredOutput>(() =>
    analyzeCitizenObservation(PRESET_OBSERVATIONS[0].data)
  );

  const handleApplyPreset = (index: number) => {
    setSelectedPresetIndex(index);
    const preset = PRESET_OBSERVATIONS[index].data;
    setCitizenText(preset.citizenText);
    setAudioTranscript(preset.transcribedAudioText || '');
    setIncludeImage(!!preset.imageEvidenceList && preset.imageEvidenceList.length > 0);
    setIncludeGps(!!preset.declaredLocation);
    if (preset.declaredLocation) {
      setLat(preset.declaredLocation.latitude.toString());
      setLng(preset.declaredLocation.longitude.toString());
      setAddress(preset.declaredLocation.address || '');
    }
    const res = analyzeCitizenObservation(preset);
    setAnalysisResult(res);
  };

  const handleRunAnalysis = () => {
    const raw: RawCitizenObservationInput = {
      incidentId: 'lab-run-' + Date.now(),
      citizenText,
      transcribedAudioText: audioTranscript || undefined,
      hasAudioAttachment: !!audioTranscript,
      declaredLocation: includeGps
        ? {
            latitude: parseFloat(lat) || 37.7749,
            longitude: parseFloat(lng) || -122.4194,
            address,
          }
        : undefined,
      capturedTimestamp: new Date().toISOString(),
      imageEvidenceList: includeImage
        ? [
            {
              id: 'ev-test-img',
              originalFilename: 'defect_attachment.jpg',
              sha256Hash: 'b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2',
              detectedMimeType: 'image/jpeg',
              fileSizeBytes: 2840000,
              geoMetadata: includeGps
                ? {
                    latitude: parseFloat(lat),
                    longitude: parseFloat(lng),
                    geotagSource: 'EXIF_GPS',
                  }
                : undefined,
            },
          ]
        : [],
    };

    const res = analyzeCitizenObservation(raw);
    setAnalysisResult(res);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <span>Cognitive Observation Intelligence & Epistemic Diagnostics</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              CivicConnect Observation Agent Engine
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Converts raw multi-modal citizen inputs (text, voice transcriptions, visual evidence, EXIF GPS) into structured civic observations. Evaluates information completeness (<code>SUFFICIENT</code>, <code>INSUFFICIENT</code>, or <code>UNCERTAIN</code>) without blindly forcing hardcoded conclusions.
            </p>
          </div>
        </div>
      </div>

      {/* Preset Scenario Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Test Scenarios & Epistemic Boundary Cases
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {PRESET_OBSERVATIONS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleApplyPreset(idx)}
              className={`p-2.5 rounded-lg text-left text-xs font-medium border transition cursor-pointer ${
                selectedPresetIndex === idx
                  ? 'bg-slate-800 border-emerald-500 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-bold truncate">{preset.label}</div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5">{preset.data.citizenText}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Workbench Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Raw Multi-Modal Citizen Input (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold">
                <FileText className="w-4 h-4" />
                <span>Raw Citizen Ingestion Packet</span>
              </div>
              <button
                onClick={handleRunAnalysis}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Analyze Input</span>
              </button>
            </div>

            {/* Citizen Text Field */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">Citizen Narrative Input</label>
              <textarea
                rows={4}
                value={citizenText}
                onChange={(e) => setCitizenText(e.target.value)}
                placeholder="Describe municipal defect..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 text-xs font-sans leading-relaxed"
              />
            </div>

            {/* Transcribed Speech / Voice Field */}
            <div>
              <label className="block text-slate-300 font-medium mb-1 flex items-center space-x-1.5">
                <Mic className="w-3.5 h-3.5 text-purple-400" />
                <span>Transcribed Voice Audio (Optional)</span>
              </label>
              <input
                type="text"
                value={audioTranscript}
                onChange={(e) => setAudioTranscript(e.target.value)}
                placeholder="Simulated speech-to-text transcript..."
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
              />
            </div>

            {/* Multi-modal Toggles */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <label className="flex items-center space-x-2 p-2 bg-slate-950 rounded border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeImage}
                  onChange={(e) => setIncludeImage(e.target.checked)}
                  className="rounded text-emerald-500"
                />
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-300 text-[11px]">Attach Image Evidence</span>
              </label>

              <label className="flex items-center space-x-2 p-2 bg-slate-950 rounded border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeGps}
                  onChange={(e) => setIncludeGps(e.target.checked)}
                  className="rounded text-cyan-500"
                />
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-300 text-[11px]">Include GPS Fix</span>
              </label>
            </div>

            {includeGps && (
              <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px]">DECLARED STREET ADDRESS</span>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200 mt-0.5"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 text-[10px]">LATITUDE</span>
                    <input
                      type="text"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px]">LONGITUDE</span>
                    <input
                      type="text"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-slate-300 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Structured Extraction & Epistemic Diagnostics (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Observation Agent Structured Assessment
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">Cognitive Extraction Payload</h3>
              </div>

              {/* Status Badge */}
              <span
                className={`text-xs font-mono px-3 py-1 rounded-full font-bold flex items-center space-x-1.5 ${
                  analysisResult.sufficiencyStatus === 'SUFFICIENT_INFORMATION'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : analysisResult.sufficiencyStatus === 'INSUFFICIENT_INFORMATION'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}
              >
                {analysisResult.sufficiencyStatus === 'SUFFICIENT_INFORMATION' ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : analysisResult.sufficiencyStatus === 'INSUFFICIENT_INFORMATION' ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : (
                  <HelpCircle className="w-3.5 h-3.5" />
                )}
                <span>{analysisResult.sufficiencyStatus}</span>
              </span>
            </div>

            {/* Categorization & Subtype Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs">
                <span className="text-slate-500 block text-[10px]">IDENTIFIED CATEGORY</span>
                <span className="text-emerald-400 font-bold text-sm block mt-0.5">
                  {analysisResult.categoryLabel}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">({analysisResult.primaryCategory})</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs">
                <span className="text-slate-500 block text-[10px]">DEFECT SUBTYPE</span>
                <span className="text-cyan-300 font-bold block mt-0.5 truncate">
                  {analysisResult.subType}
                </span>
                <span className="text-[10px] text-slate-400">Urgency: {analysisResult.hazardUrgencyEstimate}</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs">
                <span className="text-slate-500 block text-[10px]">COGNITIVE CONFIDENCE</span>
                <span className="text-purple-400 font-bold text-sm block mt-0.5">
                  {(analysisResult.confidence * 100).toFixed(0)}%
                </span>
                <span className="text-[10px] text-slate-400">
                  Next: {analysisResult.recommendedNextAction.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Extracted Title & Description */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs space-y-2">
              <div>
                <span className="text-slate-500 block text-[10px]">EXTRACTED NORMALIZED TITLE</span>
                <div className="text-white font-bold text-xs mt-0.5">{analysisResult.extractedTitle}</div>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">VISIBLE EVIDENCE SUMMARY</span>
                <div className="text-slate-300 text-xs mt-0.5 leading-relaxed">
                  {analysisResult.visibleEvidenceSummary}
                </div>
              </div>
            </div>

            {/* Missing Information Diagnostics */}
            <div>
              <div className="text-xs font-mono font-bold text-slate-300 mb-2 flex items-center justify-between">
                <span>Missing Information Diagnostics:</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  {analysisResult.missingInformation.length === 0
                    ? 'No gaps detected'
                    : `${analysisResult.missingInformation.length} missing requirement(s)`}
                </span>
              </div>

              {analysisResult.missingInformation.length > 0 ? (
                <div className="p-3 bg-amber-950/30 border border-amber-900/60 rounded-lg space-y-1.5 font-mono text-xs text-amber-200">
                  {analysisResult.missingInformation.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                  <div className="pt-2 text-[11px] text-slate-400 font-sans border-t border-amber-900/40">
                    &bull; Backend Action: The system issues an automated follow-up request to the citizen rather than guessing or prematurely closing the incident.
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-950/30 border border-emerald-900/60 rounded-lg font-mono text-xs text-emerald-300 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Sufficient information provided to proceed autonomously to spatial deduplication and triage.</span>
                </div>
              )}
            </div>

            {/* Entity Extraction */}
            <div className="grid grid-cols-3 gap-2 font-mono text-[11px] bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px]">LANDMARKS</span>
                <span className="text-slate-300">
                  {analysisResult.entities.landmarksMentioned.join(', ') || 'None'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">INFRASTRUCTURE</span>
                <span className="text-slate-300">
                  {analysisResult.entities.infrastructureElements.join(', ') || 'None'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">SAFETY KEYWORDS</span>
                <span className="text-rose-300">
                  {analysisResult.entities.safetyKeywordsFound.join(', ') || 'None'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
