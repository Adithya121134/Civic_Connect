import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { evidenceManager } from '../lib/evidenceManagementService';
import {
  EvidenceRecord,
  EvidenceMediaType,
  PresignedUploadSession,
  SignedAccessUrlResponse,
} from '../types/evidence';
import { FILE_LIMITS } from '../lib/fileSecurityValidator';
import {
  Shield,
  FileCheck,
  Upload,
  Fingerprint,
  Link,
  Lock,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  Copy,
  Layers,
  Sparkles,
} from 'lucide-react';

export const EvidenceVaultConsole: React.FC = () => {
  const { user } = useAuth();
  const [evidenceList, setEvidenceList] = useState<EvidenceRecord[]>(evidenceManager.getAllEvidence());
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string>(
    evidenceList[0]?.id || 'ev-seed-pothole-01'
  );

  // Upload Form State
  const [incidentId, setIncidentId] = useState('inc-pothole-101');
  const [evidenceType, setEvidenceType] = useState<EvidenceMediaType>('IMAGE');
  const [fileName, setFileName] = useState('road_crack_evidence.jpg');
  const [declaredMime, setDeclaredMime] = useState('image/jpeg');
  const [payloadText, setPayloadText] = useState('Simulated raw binary camera payload with EXIF GPS markers...');
  const [lat, setLat] = useState('37.7749');
  const [lng, setLng] = useState('-122.4194');

  // Presigned Session State
  const [activeSession, setActiveSession] = useState<PresignedUploadSession | null>(null);
  const [signedUrlData, setSignedUrlData] = useState<SignedAccessUrlResponse | null>(null);

  // Notice & Feedback
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const reloadData = () => {
    setEvidenceList(evidenceManager.getAllEvidence());
  };

  const selectedEvidence = evidenceList.find((e) => e.id === selectedEvidenceId) || evidenceList[0];
  const auditLogs = selectedEvidence ? evidenceManager.getEvidenceAuditTrail(selectedEvidence.id) : [];

  // 1. Generate Presigned Upload Session
  const handleRequestPresignedUpload = async () => {
    if (!user) return;

    const res = await evidenceManager.requestPresignedUploadSession({
      incidentId,
      uploader: user,
      originalFilename: fileName,
      fileSizeBytes: new TextEncoder().encode(payloadText).byteLength || 1024,
      declaredMimeType: declaredMime,
      evidenceType,
    });

    if (res.success && res.session) {
      setActiveSession(res.session);
      setFeedback({
        success: true,
        message: `Presigned upload ticket generated. Direct client upload endpoint ready (expires in 15 mins). No raw cloud credentials exposed.`,
      });
    } else {
      setFeedback({
        success: false,
        message: res.error || 'Failed to generate upload ticket.',
      });
    }
  };

  // 2. Ingest Evidence with Magic Byte Verification & SHA-256 Checksum
  const handleDirectIngest = async (simulateCorruption = false, simulateDuplicate = false) => {
    if (!user) return;

    // Craft binary byte array
    let bytes: Uint8Array;
    if (simulateCorruption) {
      // Intentionally invalid header: Random bytes that fail magic byte verification
      bytes = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x12, 0x34]);
    } else if (evidenceType === 'IMAGE') {
      // JPEG Magic bytes: FF D8 FF E0
      const content = simulateDuplicate
        ? 'DUPLICATE_PAYLOAD_TEST_EXACT_BINARY_MATCH_2026'
        : payloadText + '_' + Date.now();
      const textBytes = new TextEncoder().encode(content);
      bytes = new Uint8Array(4 + textBytes.length);
      bytes[0] = 0xff;
      bytes[1] = 0xd8;
      bytes[2] = 0xff;
      bytes[3] = 0xe0;
      bytes.set(textBytes, 4);
    } else if (evidenceType === 'DOCUMENT') {
      // PDF Magic bytes: 25 50 44 46 (%PDF)
      const content = simulateDuplicate
        ? 'DUPLICATE_PAYLOAD_TEST_EXACT_BINARY_MATCH_2026'
        : payloadText + '_' + Date.now();
      const textBytes = new TextEncoder().encode(content);
      bytes = new Uint8Array(4 + textBytes.length);
      bytes[0] = 0x25;
      bytes[1] = 0x50;
      bytes[2] = 0x44;
      bytes[3] = 0x46;
      bytes.set(textBytes, 4);
    } else {
      bytes = new TextEncoder().encode(payloadText);
    }

    const res = await evidenceManager.ingestAndVerifyEvidence({
      incidentId,
      uploader: user,
      originalFilename: fileName,
      declaredMimeType: declaredMime,
      evidenceType,
      fileData: bytes,
      geoMetadata: {
        latitude: parseFloat(lat) || 37.7749,
        longitude: parseFloat(lng) || -122.4194,
        altitudeMeters: 12.5,
        accuracyMeters: 3.5,
        geotagSource: 'EXIF_GPS',
      },
    });

    if (res.success && res.evidence) {
      setFeedback({
        success: true,
        message: `Evidence validated via Magic Bytes and ingested into Object Storage. SHA-256: ${res.evidence.sha256Hash.substring(
          0,
          16
        )}...`,
      });
      reloadData();
      setSelectedEvidenceId(res.evidence.id);
      setActiveSession(null);
    } else {
      setFeedback({
        success: false,
        message: res.error || 'Ingestion failed.',
      });
    }
  };

  // 3. Issue Time-Bounded Signed URL
  const handleRequestSignedUrl = async (targetId: string) => {
    if (!user) return;

    const res = await evidenceManager.getSignedEvidenceAccessUrl({
      evidenceId: targetId,
      requestingUser: user,
      expiresInSeconds: 300, // 5 min expiry
    });

    if (res.success && res.access) {
      setSignedUrlData(res.access);
      setFeedback({
        success: true,
        message: `Temporary signed access token issued (valid until ${new Date(
          res.access.expiresAt
        ).toLocaleTimeString()}). Access granted under role '${user.role}'.`,
      });
    } else {
      setFeedback({
        success: false,
        message: res.error || 'Access denied.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <Shield className="w-4 h-4" />
              <span>Cryptographic Evidence Management & Cloud Object Storage Vault</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              CivicConnect Evidence Management Engine
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Strict object storage abstraction isolating large binaries from PostgreSQL. Features presigned direct-to-cloud upload sessions, binary magic-byte inspection (zero trust for client MIME types), SHA-256 duplicate deduplication, and time-bounded signed download URLs.
            </p>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono flex items-center justify-between ${
            feedback.success
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-red-950/60 border-red-800 text-red-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload & Ingestion Simulator (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Upload Console */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1">
              <Upload className="w-4 h-4" />
              <span>Secure Upload Pipeline</span>
            </div>
            <h3 className="text-sm font-bold text-white">Ingest Binary Evidence</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Step 1: Request presigned upload URL. Step 2: Push binary with magic bytes and SHA-256 hashing.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Incident ID</label>
                <input
                  type="text"
                  value={incidentId}
                  onChange={(e) => setIncidentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Evidence Media Type</label>
                  <select
                    value={evidenceType}
                    onChange={(e) => {
                      const t = e.target.value as EvidenceMediaType;
                      setEvidenceType(t);
                      if (t === 'IMAGE') {
                        setFileName('hazard_photo.jpg');
                        setDeclaredMime('image/jpeg');
                      } else if (t === 'DOCUMENT') {
                        setFileName('inspection_report.pdf');
                        setDeclaredMime('application/pdf');
                      } else if (t === 'AUDIO') {
                        setFileName('dispatch_recording.mp3');
                        setDeclaredMime('audio/mpeg');
                      } else {
                        setFileName('field_video.mp4');
                        setDeclaredMime('video/mp4');
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  >
                    <option value="IMAGE">IMAGE (Max 15MB)</option>
                    <option value="DOCUMENT">DOCUMENT (Max 20MB)</option>
                    <option value="VIDEO">VIDEO (Max 100MB)</option>
                    <option value="AUDIO">AUDIO (Max 25MB)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Declared Filename</label>
                  <input
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Client Declared MIME Type</label>
                <input
                  type="text"
                  value={declaredMime}
                  onChange={(e) => setDeclaredMime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Simulated Payload Content</label>
                <textarea
                  rows={2}
                  value={payloadText}
                  onChange={(e) => setPayloadText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">EXIF Latitude</label>
                  <input
                    type="text"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">EXIF Longitude</label>
                  <input
                    type="text"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-200 font-mono"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleRequestPresignedUpload}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5 border border-slate-700"
                >
                  <Link className="w-3.5 h-3.5 text-cyan-400" />
                  <span>1. Generate Presigned Upload Session</span>
                </button>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleDirectIngest(false, false)}
                    className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Upload Valid</span>
                  </button>

                  <button
                    onClick={() => handleDirectIngest(true, false)}
                    title="Tests magic byte inspector rejecting spoofed headers"
                    className="py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 font-medium rounded-lg transition cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Corrupt Magic</span>
                  </button>

                  <button
                    onClick={() => handleDirectIngest(false, true)}
                    title="Submits identical binary to trigger SHA-256 duplicate deduplication"
                    className="py-2 bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-amber-300 font-medium rounded-lg transition cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <Fingerprint className="w-3.5 h-3.5" />
                    <span>Duplicate</span>
                  </button>
                </div>
              </div>

              {/* Active Presigned Session Viewer */}
              {activeSession && (
                <div className="p-3 bg-slate-950 rounded-lg border border-cyan-900/60 mt-3 space-y-2 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-cyan-400">
                    <span className="font-bold">Presigned Cloud Upload URL Active</span>
                    <span>Expires: 15m</span>
                  </div>
                  <div className="text-slate-400 truncate">Target Key: {activeSession.targetStorageKey}</div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800 text-slate-300 break-all text-[10px]">
                    {activeSession.uploadUrl}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Evidence Vault Explorer & Signed URL Issuer (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Evidence Inventory */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Object Storage Vault Records ({evidenceList.length})
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">Verified Binary Objects</h3>
              </div>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {evidenceList.map((ev) => {
                const isSelected = ev.id === selectedEvidenceId;
                return (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEvidenceId(ev.id)}
                    className={`p-3.5 rounded-lg border cursor-pointer transition ${
                      isSelected
                        ? 'bg-slate-800 border-emerald-500 shadow-md'
                        : 'bg-slate-950 border-slate-800/80 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {ev.fileMetadata.originalFilename}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          {ev.evidenceType}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {ev.validationStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono text-slate-400 mt-2">
                      <div>Size: {(ev.fileMetadata.fileSizeBytes / 1024).toFixed(1)} KB</div>
                      <div>MIME: {ev.fileMetadata.detectedMimeType}</div>
                      <div>Incident: {ev.incidentId}</div>
                    </div>

                    <div className="text-[10px] font-mono text-slate-500 truncate mt-1">
                      SHA-256: <code className="text-purple-300">{ev.sha256Hash}</code>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Evidence Detail & Signed URL Gate */}
          {selectedEvidence && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs font-mono text-slate-400">Object Key:</span>
                  <h4 className="text-sm font-bold text-white font-mono truncate max-w-md">
                    {selectedEvidence.storageRef.storageKey}
                  </h4>
                </div>

                <button
                  onClick={() => handleRequestSignedUrl(selectedEvidence.id)}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium px-3.5 py-2 rounded-lg transition flex items-center space-x-1.5 cursor-pointer shrink-0"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Issue Signed Download URL</span>
                </button>
              </div>

              {/* Technical Specifications Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px]">STORAGE BUCKET</span>
                  <span className="text-slate-300 truncate block">{selectedEvidence.storageRef.bucket}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">MAGIC BYTES</span>
                  <span className="text-emerald-400 font-bold">VERIFIED MATCH</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">UPLOADER</span>
                  <span className="text-slate-300 truncate block">{selectedEvidence.uploaderName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">GEOTAG ACCURACY</span>
                  <span className="text-cyan-400 font-bold">
                    {selectedEvidence.geoMetadata?.accuracyMeters || 4.5}m (EXIF)
                  </span>
                </div>
              </div>

              {/* Active Signed Access URL Viewer */}
              {signedUrlData && signedUrlData.evidenceId === selectedEvidence.id && (
                <div className="p-3 bg-purple-950/40 border border-purple-800 rounded-lg space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-purple-300">
                    <span className="font-bold flex items-center space-x-1">
                      <Lock className="w-3.5 h-3.5 text-purple-400" />
                      <span>Authorized Signed Temporary Access URL</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900/80">
                      Watermark: {signedUrlData.watermarkToken}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Expires at: {new Date(signedUrlData.expiresAt).toLocaleTimeString()}
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-purple-900/60 text-slate-300 break-all text-[11px] select-all">
                    {signedUrlData.signedUrl}
                  </div>
                </div>
              )}

              {/* Audit Trail for this Evidence Object */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
                  <span>Cryptographic Audit Trail ({auditLogs.length} Events)</span>
                  <span className="text-[10px] font-mono text-slate-500">Immutable Storage Log</span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-xs">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2 bg-slate-950 rounded border border-slate-800/80 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className="font-bold text-emerald-400">{log.action}</span>
                        <span className="text-slate-400 truncate">{log.details}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
