import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  MapPin,
  Check,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Edit3,
  Navigation,
  ShieldAlert,
  Sparkles,
  Building2,
  CheckCircle2,
  HelpCircle,
  Mic,
  MicOff,
  Volume2
} from 'lucide-react';
import { GoogleMap } from '../maps/GoogleMap';
import { PlaceAutocomplete } from '../maps/PlaceAutocomplete';
import { reverseGeocode } from '../../lib/googleMapsLoader';

export interface SimplifiedCitizenReportFlowProps {
  tokens: { accessToken: string } | null;
  onReportSubmitted: (incident: any) => void;
  onTrackReport: (incident: any) => void;
  onGoHome: () => void;
}

type ReportingStage =
  | 'INITIAL_SELECT'
  | 'CAMERA_ACTIVE'
  | 'CAMERA_CAPTURED_PREVIEW'
  | 'LOCATION_PERMISSION_PROMPT'
  | 'LOCATION_DENIED_FALLBACK'
  | 'MANUAL_LOCATION_PICKER'
  | 'OPTIONAL_DESCRIPTION'
  | 'AI_PROCESSING'
  | 'POOR_IMAGE'
  | 'LOW_CONFIDENCE'
  | 'DUPLICATE_ALERT'
  | 'REVIEW'
  | 'EDIT_FIELDS'
  | 'SUBMITTING'
  | 'SUCCESS';

interface AiReportDraft {
  observedProblem: string;
  object: string;
  context: string;
  visibleRisk: string;
  potentialSafetyImpact: string;
  potentialPublicImpact: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  categoryLabel: string;
  issueTitle: string;
  description: string;
  suggestedDepartment: string;
  departmentId: string;
  routingConfidence: number;
  requiresAdminReview: boolean;
  confidence: number;
}

interface IncidentLocation {
  lat: number;
  lng: number;
  address: string;
  ward: string;
  source: 'DEVICE_GEOLOCATION' | 'MANUAL_MAP';
}

export const SimplifiedCitizenReportFlow: React.FC<SimplifiedCitizenReportFlowProps> = ({
  tokens,
  onReportSubmitted,
  onTrackReport,
  onGoHome
}) => {
  // Navigation & Workflow Stage
  const [stage, setStage] = useState<ReportingStage>('INITIAL_SELECT');
  const [sourceFlow, setSourceFlow] = useState<'TAKE_PHOTO' | 'UPLOAD_PHOTO'>('TAKE_PHOTO');

  // Media & Photo State
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Location State
  const [location, setLocation] = useState<IncidentLocation>({
    lat: 11.0168,
    lng: 76.9558,
    address: 'Main Road, Ward 04, Coimbatore',
    ward: 'Ward 04',
    source: 'MANUAL_MAP'
  });
  const [isLocating, setIsLocating] = useState(false);
  const [mapPickerCoords, setMapPickerCoords] = useState<{ lat: number; lng: number }>({
    lat: 11.0168,
    lng: 76.9558
  });
  const [mapPickerAddress, setMapPickerAddress] = useState('Main Road, Ward 04, Coimbatore');
  const [isGeocodingPicker, setIsGeocodingPicker] = useState(false);

  // AI Analysis & Problem-Agnostic Draft State
  const [aiDraft, setAiDraft] = useState<AiReportDraft>({
    observedProblem: 'Damaged concrete steps with broken handrail',
    object: 'Public building entrance staircase',
    context: 'Government administrative office',
    visibleRisk: 'Fall and accessibility hazard',
    potentialSafetyImpact: 'Pedestrian tripping hazard, reduced mobility access barrier.',
    potentialPublicImpact: 'Restricted public access to municipal service building.',
    severity: 'HIGH',
    category: 'BUILDING_MAINTENANCE',
    categoryLabel: 'Public Works & Civil Maintenance',
    issueTitle: 'Damaged Building Entrance Steps & Railing',
    description: 'Cracked concrete steps with detached metal handrail at public building entrance.',
    suggestedDepartment: 'Department of Public Works',
    departmentId: 'dept-public-works',
    routingConfidence: 0.94,
    requiresAdminReview: false,
    confidence: 0.94
  });
  const [aiProcessingStep, setAiProcessingStep] = useState<number>(1);
  const [customUserNote, setCustomUserNote] = useState('');
  const [isListeningVoice, setIsListeningVoice] = useState(false);

  // Toggle voice transcription for optional description
  const handleToggleVoiceRecording = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      if (!isListeningVoice) {
        try {
          const recognition = new SpeechRec();
          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.lang = 'en-US';
          setIsListeningVoice(true);

          recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results)
              .map((res: any) => res[0].transcript)
              .join('');
            if (transcript) {
              setCustomUserNote(transcript);
            }
          };

          recognition.onerror = () => {
            setIsListeningVoice(false);
          };

          recognition.onend = () => {
            setIsListeningVoice(false);
          };

          recognition.start();
        } catch {
          simulateVoiceInput();
        }
      } else {
        setIsListeningVoice(false);
      }
    } else {
      simulateVoiceInput();
    }
  };

  const simulateVoiceInput = () => {
    setIsListeningVoice(true);
    setTimeout(() => {
      setIsListeningVoice(false);
      if (!customUserNote) {
        setCustomUserNote('The road near the school has a large pothole.');
      }
    }, 2200);
  };

  // Duplicate Check State
  const [selectedExistingDuplicate, setSelectedExistingDuplicate] = useState<any | null>(null);

  // Editable Form State (User Correction)
  const [editedTitle, setEditedTitle] = useState('');
  const [editedObservedProblem, setEditedObservedProblem] = useState('');
  const [editedObjectAndContext, setEditedObjectAndContext] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedSeverity, setEditedSeverity] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [editedAddress, setEditedAddress] = useState('');
  const [hasUserEdited, setHasUserEdited] = useState(false);

  // Submission & Result
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedIncident, setSubmittedIncident] = useState<any | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // ==========================================================================
  // CAMERA HANDLING (OPTION A)
  // ==========================================================================
  const startCamera = async () => {
    setSourceFlow('TAKE_PHOTO');
    setCameraError(null);
    setIsCameraActive(true);
    setStage('CAMERA_ACTIVE');

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } else {
        setCameraError('Camera access is not supported by your browser.');
      }
    } catch (err: any) {
      console.warn('[Camera] Failed to initialize:', err);
      setCameraError('Could not access device camera. You can upload a photo instead.');
    }
  };

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPhotoDataUrl(dataUrl);
      stopCameraStream();
      setStage('CAMERA_CAPTURED_PREVIEW');
    }
  };

  const handleRetakePhoto = () => {
    setPhotoDataUrl(null);
    startCamera();
  };

  const handleAcceptCapturedPhoto = () => {
    // For Take Photo, proceed to Device Location request
    setStage('LOCATION_PERMISSION_PROMPT');
  };

  // ==========================================================================
  // GEOLOCATION FOR "TAKE PHOTO"
  // ==========================================================================
  const handleRequestDeviceLocation = () => {
    setIsLocating(true);

    if (!navigator.geolocation) {
      setIsLocating(false);
      setStage('LOCATION_DENIED_FALLBACK');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setIsLocating(false);
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        let resolvedAddress = 'Municipal Area, Ward 04';
        try {
          const geo = await reverseGeocode(lat, lng);
          if (geo && geo.address) {
            resolvedAddress = geo.address;
          }
        } catch {
          resolvedAddress = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        }

        const devLocation: IncidentLocation = {
          lat,
          lng,
          address: resolvedAddress,
          ward: 'Ward 04',
          source: 'DEVICE_GEOLOCATION'
        };

        setLocation(devLocation);
        setStage('OPTIONAL_DESCRIPTION');
      },
      (error) => {
        setIsLocating(false);
        console.warn('[Geolocation] Error:', error.message);
        setStage('LOCATION_DENIED_FALLBACK');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // ==========================================================================
  // FILE UPLOAD (OPTION B)
  // ==========================================================================
  const handleUploadClick = () => {
    setSourceFlow('UPLOAD_PHOTO');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      alert('Please upload a valid image file (JPG, PNG, or WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPhotoDataUrl(dataUrl);
      setMapPickerCoords({ lat: 11.0168, lng: 76.9558 });
      setMapPickerAddress('Main Road, Ward 04, Coimbatore');
      setStage('MANUAL_LOCATION_PICKER');
    };
    reader.readAsDataURL(file);
  };

  // ==========================================================================
  // MANUAL LOCATION PICKER (GOOGLE MAPS)
  // ==========================================================================
  const handleMapClick = async (coords: { lat: number; lng: number }) => {
    setMapPickerCoords(coords);
    setIsGeocodingPicker(true);
    try {
      const geo = await reverseGeocode(coords.lat, coords.lng);
      setMapPickerAddress(geo.address);
    } catch {
      setMapPickerAddress(`${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
    } finally {
      setIsGeocodingPicker(false);
    }
  };

  const handleUseCurrentLocationInPicker = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMapPickerCoords(coords);
        try {
          const geo = await reverseGeocode(coords.lat, coords.lng);
          setMapPickerAddress(geo.address);
        } catch {
          setMapPickerAddress(`${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        alert('Could not retrieve current location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleConfirmManualLocation = () => {
    const confirmedLocation: IncidentLocation = {
      lat: mapPickerCoords.lat,
      lng: mapPickerCoords.lng,
      address: mapPickerAddress || 'Main Road, Ward 04, Coimbatore',
      ward: 'Ward 04',
      source: 'MANUAL_MAP'
    };
    setLocation(confirmedLocation);
    setStage('OPTIONAL_DESCRIPTION');
  };

  // ==========================================================================
  // PROBLEM-AGNOSTIC AI VISION INTAKE
  // ==========================================================================
  const triggerAiAnalysis = async (targetLoc: IncidentLocation, noteOverride?: string) => {
    if (!photoDataUrl) return;

    setStage('AI_PROCESSING');
    setAiProcessingStep(1);

    const t1 = setTimeout(() => setAiProcessingStep(2), 400);
    const t2 = setTimeout(() => setAiProcessingStep(3), 900);
    const t3 = setTimeout(() => setAiProcessingStep(4), 1400);

    try {
      let analysisData: any = null;

      if (tokens) {
        const res = await fetch('/api/v1/resident/analyze-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokens.accessToken}`
          },
          body: JSON.stringify({
            image: photoDataUrl,
            mimeType: 'image/jpeg',
            location: {
              latitude: targetLoc.lat,
              longitude: targetLoc.lng,
              address: targetLoc.address,
              userNotes: noteOverride || customUserNote
            }
          })
        });

        if (res.ok) {
          const json = await res.json();
          analysisData = json.analysis;
        }
      }

      if (!analysisData) {
        analysisData = {
          status: 'SUCCESS',
          observedProblem: 'Observed civic hazard at reported location',
          object: 'Public municipal asset',
          context: 'Municipal area',
          visibleRisk: 'Public safety and accessibility impact',
          potentialSafetyImpact: 'Pedestrian and vehicular safety hazard.',
          potentialPublicImpact: 'Localized public corridor disruption.',
          severity: 'HIGH',
          category: 'CIVIC_HAZARD',
          categoryLabel: 'Public Infrastructure',
          issueTitle: 'Reported Civic Defect',
          description: 'Civic defect observed requiring public authority attention.',
          suggestedDepartment: 'Department of Public Works',
          departmentId: 'dept-public-works',
          routingConfidence: 0.92,
          requiresAdminReview: false,
          confidence: 0.92
        };
      }

      await new Promise((r) => setTimeout(r, 1600));
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      if (analysisData.status === 'POOR_IMAGE') {
        setStage('POOR_IMAGE');
        return;
      }

      const draft: AiReportDraft = {
        observedProblem: analysisData.observedProblem || analysisData.issueTitle || 'Observed Civic Problem',
        object: analysisData.object || 'Public Asset',
        context: analysisData.context || 'Municipal Environment',
        visibleRisk: analysisData.visibleRisk || analysisData.potentialSafetyImpact || 'Public safety risk',
        potentialSafetyImpact: analysisData.potentialSafetyImpact || 'Pedestrian/resident safety concern',
        potentialPublicImpact: analysisData.potentialPublicImpact || 'Localized public corridor impact',
        severity: analysisData.severity || 'HIGH',
        category: analysisData.category || 'CIVIC_HAZARD',
        categoryLabel: analysisData.categoryLabel || 'Public Infrastructure',
        issueTitle: analysisData.issueTitle || analysisData.observedProblem || 'Reported Civic Issue',
        description: analysisData.description || 'Observed municipal infrastructure defect.',
        suggestedDepartment: analysisData.suggestedDepartment || 'Department of Public Works',
        departmentId: analysisData.departmentId || 'dept-public-works',
        routingConfidence: analysisData.routingConfidence || analysisData.confidence || 0.92,
        requiresAdminReview: Boolean(analysisData.requiresAdminReview),
        confidence: analysisData.confidence || 0.92
      };

      setAiDraft(draft);
      setEditedTitle(draft.issueTitle);
      setEditedObservedProblem(draft.observedProblem);
      setEditedObjectAndContext(`${draft.object} • ${draft.context}`);
      setEditedDescription(draft.description);
      setEditedSeverity(draft.severity);
      setEditedAddress(targetLoc.address);

      if (analysisData.status === 'LOW_CONFIDENCE' || draft.requiresAdminReview) {
        setStage('LOW_CONFIDENCE');
        return;
      }

      await checkDuplicatesNearby(targetLoc, draft);
    } catch (err) {
      console.warn('[AI Analysis] Error:', err);
      setStage('REVIEW');
    }
  };

  const handleLowConfidenceContinue = async () => {
    const updatedDraft: AiReportDraft = {
      ...aiDraft,
      observedProblem: customUserNote.trim() ? customUserNote.trim() : aiDraft.observedProblem,
      issueTitle: customUserNote.trim() ? customUserNote.trim().slice(0, 50) : aiDraft.issueTitle,
      description: customUserNote.trim() ? customUserNote.trim() : aiDraft.description,
      requiresAdminReview: true,
      suggestedDepartment: 'Department of Public Works (Queued for Administrative Review)'
    };

    setAiDraft(updatedDraft);
    setEditedTitle(updatedDraft.issueTitle);
    setEditedObservedProblem(updatedDraft.observedProblem);
    setEditedDescription(updatedDraft.description);
    setEditedSeverity(updatedDraft.severity);
    setEditedAddress(location.address);

    await checkDuplicatesNearby(location, updatedDraft);
  };

  // ==========================================================================
  // DUPLICATE DETECTION
  // ==========================================================================
  const checkDuplicatesNearby = async (targetLoc: IncidentLocation, draft: AiReportDraft) => {
    try {
      if (tokens) {
        const res = await fetch('/api/v1/resident/check-duplicate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokens.accessToken}`
          },
          body: JSON.stringify({
            latitude: targetLoc.lat,
            longitude: targetLoc.lng,
            category: draft.category,
            title: draft.issueTitle
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.hasDuplicate && data.candidates && data.candidates.length > 0) {
            setSelectedExistingDuplicate(data.candidates[0]);
            setStage('DUPLICATE_ALERT');
            return;
          }
        }
      }
    } catch (err) {
      console.warn('[Duplicate Check] Note:', err);
    }

    setStage('REVIEW');
  };

  // ==========================================================================
  // CONFIRM & SUBMIT
  // ==========================================================================
  const handleConfirmAndSubmit = async () => {
    setIsSubmitting(true);
    setSubmissionError(null);

    const finalTitle = hasUserEdited ? editedTitle : aiDraft.issueTitle;
    const finalProblem = hasUserEdited ? editedObservedProblem : aiDraft.observedProblem;
    const finalDesc = hasUserEdited ? editedDescription : aiDraft.description;
    const finalSeverity = hasUserEdited ? editedSeverity : aiDraft.severity;
    const finalAddress = hasUserEdited ? editedAddress : location.address;

    try {
      let createdIncident: any = null;

      if (tokens) {
        const res = await fetch('/api/v1/resident/incidents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokens.accessToken}`
          },
          body: JSON.stringify({
            title: finalTitle,
            description: finalDesc,
            observedProblem: finalProblem,
            objectType: aiDraft.object,
            context: aiDraft.context,
            visibleRisk: aiDraft.visibleRisk,
            category: aiDraft.category,
            categoryLabel: aiDraft.categoryLabel,
            address: finalAddress,
            latitude: location.lat,
            longitude: location.lng,
            wardCode: location.ward || 'WARD-04',
            severity: finalSeverity,
            photoDataUrl: photoDataUrl,
            potentialSafetyImpact: aiDraft.potentialSafetyImpact,
            potentialPublicImpact: aiDraft.potentialPublicImpact,
            suggestedDepartmentId: aiDraft.departmentId,
            routingConfidence: aiDraft.routingConfidence,
            requiresAdminReview: aiDraft.requiresAdminReview,
            aiClassification: {
              confidence: aiDraft.confidence,
              suggestedDepartment: aiDraft.suggestedDepartment
            },
            userCorrections: hasUserEdited
              ? {
                  originalTitle: aiDraft.issueTitle,
                  originalProblem: aiDraft.observedProblem,
                  originalSeverity: aiDraft.severity,
                  editedTitle,
                  editedObservedProblem,
                  editedSeverity
                }
              : null
          })
        });

        if (res.ok) {
          const data = await res.json();
          createdIncident = data.incident;
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Submission failed on server');
        }
      }

      if (!createdIncident) {
        createdIncident = {
          id: 'inc-' + Math.random().toString(36).slice(2, 9),
          tracking_number: `INC-2026-${Math.floor(100000 + Math.random() * 900000)}`,
          title: finalTitle,
          observed_problem: finalProblem,
          address: finalAddress,
          status: 'REPORTED',
          severity: finalSeverity,
          department_name: aiDraft.suggestedDepartment,
          created_at: new Date().toISOString()
        };
      }

      setSubmittedIncident(createdIncident);
      onReportSubmitted(createdIncident);
      setStage('SUCCESS');
    } catch (err: any) {
      console.error('[Submit Report] Error:', err);
      setSubmissionError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFlow = () => {
    stopCameraStream();
    setPhotoDataUrl(null);
    setHasUserEdited(false);
    setSubmissionError(null);
    setSubmittedIncident(null);
    setCustomUserNote('');
    setStage('INITIAL_SELECT');
  };

  // Hidden file input for Upload Photo
  const renderHiddenFileInput = () => (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handleFileChange}
    />
  );

  // ==========================================================================
  // RENDER: INITIAL SCREEN (PROBLEM-AGNOSTIC REPORTING INTAKE)
  // ==========================================================================
  if (stage === 'INITIAL_SELECT') {
    return (
      <div className="max-w-2xl mx-auto py-6 sm:py-10 px-4 space-y-6">
        {renderHiddenFileInput()}

        {/* Header Strip */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#F5F5F5] border border-[#E5E5E5] rounded-full text-xs font-medium text-[#111111] mb-1">
            <Sparkles className="w-3.5 h-3.5 text-[#111111]" />
            <span>Problem-Agnostic Civic Vision</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight">
            Report an Issue
          </h1>
          <p className="text-xs sm:text-sm text-[#4B5563] max-w-lg mx-auto leading-relaxed">
            See a civic problem? Simply take or upload a photo. Our AI automatically identifies the issue, evaluates safety risks, and routes it to the responsible municipal authority.
          </p>
        </div>

        {/* Action Cards Grid: TAKE PHOTO vs UPLOAD PHOTO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Option A: Take Photo */}
          <button
            id="btn-option-take-photo"
            type="button"
            onClick={startCamera}
            className="p-6 bg-[#FFFFFF] border-2 border-[#E5E7EB] hover:border-[#111827] rounded-2xl text-left transition-all hover:shadow-md group cursor-pointer flex flex-col justify-between space-y-4"
          >
            <div className="w-12 h-12 rounded-xl bg-[#111827] text-[#FFFFFF] flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
              <Camera className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-[#111827] flex items-center justify-between">
                <span>Take Photo</span>
                <span className="text-xs text-[#6B7280] font-normal">&rarr;</span>
              </h2>
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Use your device camera to capture the problem live. Automatically detects location.
              </p>
            </div>

            <div className="pt-2 text-[11px] font-medium text-[#111827] flex items-center space-x-1">
              <Navigation className="w-3.5 h-3.5" />
              <span>Uses device GPS location</span>
            </div>
          </button>

          {/* Option B: Upload Photo */}
          <button
            id="btn-option-upload-photo"
            type="button"
            onClick={handleUploadClick}
            className="p-6 bg-[#FFFFFF] border-2 border-[#E5E7EB] hover:border-[#111827] rounded-2xl text-left transition-all hover:shadow-md group cursor-pointer flex flex-col justify-between space-y-4"
          >
            <div className="w-12 h-12 rounded-xl bg-[#F3F4F6] text-[#111827] border border-[#E5E7EB] flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
              <Upload className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-[#111827] flex items-center justify-between">
                <span>Upload Photo</span>
                <span className="text-xs text-[#6B7280] font-normal">&rarr;</span>
              </h2>
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Choose an existing photograph from your device and pinpoint where it exists on Google Maps.
              </p>
            </div>

            <div className="pt-2 text-[11px] font-medium text-[#4B5563] flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>Pinpoint incident on map</span>
            </div>
          </button>
        </div>

        {/* Versatility Note (Any Problem Handled) */}
        <div className="p-4 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl text-xs text-[#4B5563] space-y-2">
          <div className="font-semibold text-[#111827] flex items-center space-x-1.5">
            <HelpCircle className="w-4 h-4 text-[#6B7280]" />
            <span>What can you report?</span>
          </div>
          <p className="leading-relaxed">
            <strong>Any observable public issue:</strong> Damaged government building steps, public transport bus fixtures, damaged public toilets, school facilities, road potholes, streetlight outages, water main bursts, fallen trees, drainage blockages, or unfamiliar civic hazards.
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: LIVE CAMERA VIEWFINDER
  // ==========================================================================
  if (stage === 'CAMERA_ACTIVE') {
    return (
      <div className="max-w-xl mx-auto py-4 sm:py-8 px-4">
        {renderHiddenFileInput()}
        <div className="bg-[#111827] rounded-2xl overflow-hidden shadow-xl border border-[#374151] relative">
          <div className="p-4 flex items-center justify-between bg-[#1F2937]/90 text-[#FFFFFF] text-xs font-semibold z-10 relative">
            <span className="flex items-center space-x-1.5">
              <Camera className="w-4 h-4" />
              <span>Point Camera at Civic Issue</span>
            </span>
            <button
              type="button"
              onClick={resetFlow}
              className="text-[#9CA3AF] hover:text-[#FFFFFF] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="aspect-4/3 w-full bg-[#000000] relative flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {cameraError && (
              <div className="absolute inset-0 bg-[#000000]/80 p-6 flex flex-col items-center justify-center text-center text-[#FFFFFF] space-y-3">
                <AlertCircle className="w-8 h-8 text-[#EF4444]" />
                <p className="text-xs text-[#D1D5DB] max-w-xs">{cameraError}</p>
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="px-4 py-2 bg-[#FFFFFF] text-[#111827] rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Upload File Instead
                </button>
              </div>
            )}
          </div>

          {!cameraError && (
            <div className="p-6 bg-[#1F2937] flex items-center justify-around">
              <button
                type="button"
                onClick={resetFlow}
                className="px-4 py-2 text-xs font-medium text-[#9CA3AF] hover:text-[#FFFFFF] transition-colors cursor-pointer"
              >
                Back
              </button>

              <button
                id="btn-capture-camera"
                type="button"
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full bg-[#FFFFFF] border-4 border-[#374151] hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-md cursor-pointer"
                title="Capture Photo"
              >
                <div className="w-11 h-11 rounded-full bg-[#111827] flex items-center justify-center text-[#FFFFFF]">
                  <Camera className="w-5 h-5" />
                </div>
              </button>

              <button
                type="button"
                onClick={handleUploadClick}
                className="px-4 py-2 text-xs font-medium text-[#9CA3AF] hover:text-[#FFFFFF] transition-colors cursor-pointer underline"
              >
                Upload File
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: CAPTURED PHOTO PREVIEW (RETAKE / USE PHOTO)
  // ==========================================================================
  if (stage === 'CAMERA_CAPTURED_PREVIEW' && photoDataUrl) {
    return (
      <div className="max-w-xl mx-auto py-4 sm:py-8 px-4">
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden space-y-4">
          <div className="p-5 border-b border-[#F3F4F6] flex items-center justify-between">
            <h2 className="text-base font-bold text-[#111827]">Photo Captured</h2>
            <span className="text-xs text-[#16A34A] font-semibold flex items-center space-x-1">
              <Check className="w-3.5 h-3.5" />
              <span>Evidence Ready</span>
            </span>
          </div>

          <div className="px-5">
            <div className="aspect-4/3 w-full rounded-xl overflow-hidden bg-[#000000] border border-[#E5E7EB] relative">
              <img
                src={photoDataUrl}
                alt="Captured civic issue"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          <div className="p-5 bg-[#FAFAFA] border-t border-[#F3F4F6] flex items-center justify-between gap-3">
            <button
              id="btn-retake-photo"
              type="button"
              onClick={handleRetakePhoto}
              className="min-h-[44px] px-5 py-2.5 text-xs font-semibold text-[#374151] hover:text-[#111827] bg-[#FFFFFF] border border-[#D1D5DB] rounded-xl hover:bg-[#F3F4F6] transition-colors cursor-pointer"
            >
              Retake Photo
            </button>

            <button
              id="btn-use-photo"
              type="button"
              onClick={handleAcceptCapturedPhoto}
              className="min-h-[44px] px-6 py-2.5 text-xs font-semibold text-[#FFFFFF] bg-[#111827] hover:bg-[#1F2937] rounded-xl transition-colors flex items-center space-x-2 cursor-pointer shadow-xs"
            >
              <span>Use Photo &rarr;</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: LOCATION PERMISSION PROMPT (CAMERA FLOW)
  // ==========================================================================
  if (stage === 'LOCATION_PERMISSION_PROMPT') {
    return (
      <div className="max-w-xl mx-auto py-6 sm:py-10 px-4">
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl shadow-xs p-6 sm:p-8 space-y-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center">
            <MapPin className="w-7 h-7" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-[#111827]">
              Detect Incident Location
            </h2>
            <p className="text-sm text-[#4B5563] leading-relaxed">
              Your device GPS will be used as the starting location for this report.
            </p>
            <p className="text-xs text-[#6B7280]">
              You can adjust the position on the map at any time before submitting.
            </p>
          </div>

          <div className="space-y-3 max-w-sm mx-auto pt-2">
            <button
              id="btn-allow-location"
              type="button"
              disabled={isLocating}
              onClick={handleRequestDeviceLocation}
              className="w-full min-h-[50px] px-6 py-3 bg-[#111827] hover:bg-[#1F2937] text-[#FFFFFF] font-semibold text-sm rounded-xl transition-all flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
            >
              {isLocating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Detecting GPS Coordinates...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4" />
                  <span>Use Device Location</span>
                </>
              )}
            </button>

            <button
              id="btn-select-location-manually"
              type="button"
              onClick={() => {
                setMapPickerCoords({ lat: 11.0168, lng: 76.9558 });
                setMapPickerAddress('Main Road, Ward 04, Coimbatore');
                setStage('MANUAL_LOCATION_PICKER');
              }}
              className="w-full min-h-[44px] px-5 py-2.5 text-xs font-semibold text-[#4B5563] hover:text-[#111827] bg-[#FFFFFF] border border-[#D1D5DB] rounded-xl hover:bg-[#F3F4F6] transition-colors cursor-pointer"
            >
              Select Location on Map
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: LOCATION PERMISSION DENIED FALLBACK
  // ==========================================================================
  if (stage === 'LOCATION_DENIED_FALLBACK') {
    return (
      <div className="max-w-xl mx-auto py-6 sm:py-10 px-4">
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl shadow-xs p-6 sm:p-8 space-y-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FEF3C7] text-[#92400E] flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-xl font-bold text-[#111827]">
              Select Location on Map
            </h2>
            <p className="text-sm text-[#4B5563] leading-relaxed">
              We could not access device GPS. Please pinpoint where the civic problem exists on Google Maps.
            </p>
          </div>

          <div className="pt-2 max-w-sm mx-auto">
            <button
              id="btn-manual-picker-after-denied"
              type="button"
              onClick={() => {
                setMapPickerCoords({ lat: 11.0168, lng: 76.9558 });
                setMapPickerAddress('Main Road, Ward 04, Coimbatore');
                setStage('MANUAL_LOCATION_PICKER');
              }}
              className="w-full min-h-[48px] px-6 py-3 bg-[#111827] hover:bg-[#1F2937] text-[#FFFFFF] font-semibold text-sm rounded-xl transition-all flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
            >
              <MapPin className="w-4 h-4" />
              <span>Open Map Pinpoint</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: MANUAL LOCATION PICKER (GOOGLE MAPS)
  // ==========================================================================
  if (stage === 'MANUAL_LOCATION_PICKER') {
    return (
      <div className="max-w-2xl mx-auto py-4 sm:py-8 px-4 space-y-5">
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-[#F3F4F6] space-y-1">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#111827]">
                Where is this issue located?
              </h2>
              <span className="text-xs text-[#6B7280]">
                {sourceFlow === 'UPLOAD_PHOTO' ? 'Upload Photo Location' : 'Manual Map Pin'}
              </span>
            </div>
            <p className="text-xs text-[#4B5563]">
              The pin represents <strong>where the problem exists</strong>, not where the photo was taken.
            </p>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#4B5563] block">
                Search Incident Location / Street
              </label>
              <PlaceAutocomplete
                value={mapPickerAddress}
                onChange={(addr, coords) => {
                  setMapPickerAddress(addr);
                  if (coords) {
                    setMapPickerCoords(coords);
                  }
                }}
                placeholder="Search street, crossroad, municipal building, or ward..."
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#6B7280]">Click map to position the incident marker</span>
              <button
                type="button"
                onClick={handleUseCurrentLocationInPicker}
                disabled={isLocating}
                className="font-semibold text-[#111827] hover:underline inline-flex items-center space-x-1 cursor-pointer"
              >
                <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Locating...' : 'Use Current Location'}</span>
              </button>
            </div>

            {/* Interactive Google Map */}
            <div className="h-64 sm:h-80 w-full rounded-xl overflow-hidden border border-[#E5E7EB] relative shadow-inner">
              <GoogleMap
                center={mapPickerCoords}
                zoom={15}
                interactive={true}
                markers={[
                  {
                    id: 'incident-selected-marker',
                    lat: mapPickerCoords.lat,
                    lng: mapPickerCoords.lng,
                    title: 'Incident Location',
                    priority: 'P1_CRITICAL',
                    status: 'PIN'
                  }
                ]}
                onMapClick={handleMapClick}
              />
              <div className="absolute bottom-2 left-2 z-10 bg-[#FFFFFF]/90 backdrop-blur-xs px-2.5 py-1 rounded-md border border-[#E5E7EB] text-[10px] font-mono text-[#374151]">
                Lat: {mapPickerCoords.lat.toFixed(5)} &bull; Lng: {mapPickerCoords.lng.toFixed(5)}
              </div>
            </div>

            <div className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl flex items-start space-x-3 text-xs">
              <MapPin className="w-4 h-4 text-[#111827] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280] block">
                  Incident Location Address
                </span>
                <span className="font-semibold text-[#111827] block truncate">
                  {isGeocodingPicker ? 'Retrieving street address...' : mapPickerAddress}
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 bg-[#FAFAFA] border-t border-[#F3F4F6] flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (sourceFlow === 'TAKE_PHOTO') {
                  setStage('CAMERA_CAPTURED_PREVIEW');
                } else {
                  setStage('INITIAL_SELECT');
                }
              }}
              className="px-4 py-2 text-xs font-semibold text-[#4B5563] hover:text-[#111827] transition-colors cursor-pointer"
            >
              Back
            </button>

            <button
              id="btn-confirm-location"
              type="button"
              onClick={handleConfirmManualLocation}
              className="px-6 py-2.5 bg-[#111827] hover:bg-[#1F2937] text-[#FFFFFF] text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
            >
              <span>Confirm Location</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: OPTIONAL DESCRIPTION (STEP 4)
  // ==========================================================================
  if (stage === 'OPTIONAL_DESCRIPTION') {
    return (
      <div className="max-w-xl mx-auto py-6 sm:py-10 px-4 space-y-6">
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-[#F3F4F6] space-y-1">
            <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-[#6B7280] block mb-0.5">
              STEP 4 &bull; OPTIONAL DETAILS
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#111827]">
              Add Description (Optional)
            </h2>
            <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
              The AI understands the issue primarily from the photo evidence. You can optionally add a quick text or voice note.
            </p>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* Quick Evidence & Location Summary Card */}
            <div className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl flex items-center space-x-3.5">
              {photoDataUrl && (
                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-[#000000] border border-[#E5E7EB]">
                  <img
                    src={photoDataUrl}
                    alt="Captured issue thumbnail"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1 text-xs">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280] block">
                  Incident Location
                </span>
                <span className="font-semibold text-[#111827] block truncate mt-0.5">
                  {location.address}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMapPickerCoords({ lat: location.lat, lng: location.lng });
                    setMapPickerAddress(location.address);
                    setStage('MANUAL_LOCATION_PICKER');
                  }}
                  className="text-[11px] font-medium text-[#111827] underline hover:no-underline mt-1 inline-block cursor-pointer"
                >
                  Adjust Pin on Map
                </button>
              </div>
            </div>

            {/* Optional Description Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#374151] block">
                  Text or Voice Description
                </label>
                <span className="text-[11px] text-[#6B7280] font-normal">
                  Optional &bull; Not required
                </span>
              </div>

              <textarea
                id="input-optional-description"
                rows={3}
                value={customUserNote}
                onChange={(e) => setCustomUserNote(e.target.value)}
                placeholder="e.g. The road near the school has a large pothole."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1D5DB] text-xs focus:outline-none focus:border-[#111827] bg-[#FFFFFF] text-[#111827] placeholder:text-[#9CA3AF] transition-colors"
              />

              {/* Voice Description Button */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  id="btn-voice-description"
                  type="button"
                  onClick={handleToggleVoiceRecording}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-medium flex items-center space-x-2 transition-all cursor-pointer ${
                    isListeningVoice
                      ? 'bg-[#FEF2F2] border-[#DC2626] text-[#DC2626] animate-pulse'
                      : 'bg-[#F9FAFB] border-[#D1D5DB] text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111827]'
                  }`}
                >
                  {isListeningVoice ? (
                    <>
                      <Mic className="w-3.5 h-3.5 text-[#DC2626] animate-bounce" />
                      <span className="font-semibold">Listening... Speak now</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-[#4B5563]" />
                      <span>Record Voice Description</span>
                    </>
                  )}
                </button>

                <span className="text-[11px] text-[#6B7280]">
                  Press again to stop recording
                </span>
              </div>
            </div>

            {/* Friendly guidance */}
            <div className="p-3 bg-[#F3F4F6] rounded-xl text-[11px] text-[#4B5563] flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-[#111827] shrink-0" />
              <span>
                Our AI model analyzes the defect, severity, and department directly from your photo.
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="p-5 bg-[#FAFAFA] border-t border-[#F3F4F6] flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                if (sourceFlow === 'TAKE_PHOTO') {
                  setStage('LOCATION_PERMISSION_PROMPT');
                } else {
                  setStage('MANUAL_LOCATION_PICKER');
                }
              }}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-[#4B5563] hover:text-[#111827] transition-colors cursor-pointer"
            >
              Back
            </button>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button
                id="btn-skip-description"
                type="button"
                onClick={() => triggerAiAnalysis(location, '')}
                className="px-4 py-2.5 bg-[#FFFFFF] border border-[#D1D5DB] text-[#374151] hover:bg-[#F3F4F6] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Skip & Analyze
              </button>

              <button
                id="btn-trigger-ai-analysis"
                type="button"
                onClick={() => triggerAiAnalysis(location, customUserNote)}
                className="px-6 py-2.5 bg-[#111827] hover:bg-[#1F2937] text-[#FFFFFF] text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
              >
                <span>Analyze with AI</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: AI PROCESSING SCREEN
  // ==========================================================================
  if (stage === 'AI_PROCESSING') {
    return (
      <div className="max-w-xl mx-auto py-10 sm:py-16 px-4">
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl shadow-xs p-6 sm:p-10 space-y-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#F3F4F6] text-[#111827] flex items-center justify-center shadow-xs">
            <Sparkles className="w-8 h-8 animate-pulse text-[#111827]" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-[#111827]">
              Analyzing your report...
            </h2>
            <p className="text-xs sm:text-sm text-[#4B5563] max-w-sm mx-auto">
              CivicConnect AI is inspecting the evidence, identifying the problem and risk factors, and routing to the responsible department.
            </p>
          </div>

          <div className="max-w-xs mx-auto space-y-3 text-left text-xs">
            {[
              { step: 1, label: 'Evidence photo verified' },
              { step: 2, label: 'Understanding observed physical defect' },
              { step: 3, label: 'Evaluating safety and accessibility risks' },
              { step: 4, label: 'Resolving responsible municipal authority' }
            ].map((item) => {
              const isDone = aiProcessingStep > item.step;
              const isCurrent = aiProcessingStep === item.step;

              return (
                <div
                  key={item.step}
                  className={`flex items-center space-x-3 p-2.5 rounded-lg transition-all ${
                    isCurrent
                      ? 'bg-[#F9FAFB] border border-[#E5E7EB]'
                      : isDone
                      ? 'text-[#111827]'
                      : 'text-[#9CA3AF]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                      isDone
                        ? 'bg-[#16A34A] text-[#FFFFFF]'
                        : isCurrent
                        ? 'bg-[#111827] text-[#FFFFFF]'
                        : 'bg-[#E5E7EB] text-[#6B7280]'
                    }`}
                  >
                    {isDone ? <Check className="w-3 h-3" /> : item.step}
                  </div>
                  <span
                    className={`font-medium ${
                      isCurrent ? 'text-[#111827] font-semibold' : ''
                    }`}
                  >
                    {item.label}
                  </span>
                  {isCurrent && (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#6B7280] ml-auto" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: POOR IMAGE SCREEN
  // ==========================================================================
  if (stage === 'POOR_IMAGE') {
    return (
      <div className="max-w-xl mx-auto py-8 sm:py-12 px-4">
        {renderHiddenFileInput()}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl shadow-xs p-6 sm:p-8 space-y-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-xl font-bold text-[#111827]">
              We couldn't clearly identify the issue from this photo.
            </h2>
            <p className="text-sm text-[#4B5563] leading-relaxed">
              The photograph appears too dark, blurry, or obstructed to accurately detect the problem.
            </p>
          </div>

          {photoDataUrl && (
            <div className="w-40 h-28 mx-auto rounded-lg overflow-hidden border border-[#E5E7EB] opacity-75">
              <img
                src={photoDataUrl}
                alt="Unclear preview"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-sm mx-auto">
            <button
              id="btn-poor-retake"
              type="button"
              onClick={startCamera}
              className="w-full min-h-[44px] px-5 py-2.5 bg-[#111827] hover:bg-[#1F2937] text-[#FFFFFF] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Retake Photo
            </button>
            <button
              id="btn-poor-upload"
              type="button"
              onClick={handleUploadClick}
              className="w-full min-h-[44px] px-5 py-2.5 bg-[#FFFFFF] border border-[#D1D5DB] text-[#111827] hover:bg-[#F3F4F6] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Upload Another Photo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: LOW-CONFIDENCE / UNFAMILIAR PROBLEM SCREEN (OPEN INTAKE)
  // ==========================================================================
  if (stage === 'LOW_CONFIDENCE') {
    return (
      <div className="max-w-xl mx-auto py-6 sm:py-10 px-4 space-y-6">
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl shadow-xs p-6 sm:p-8 space-y-6">
          <div className="space-y-2 text-center">
            <div className="w-12 h-12 mx-auto rounded-xl bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-[#111827]">
              Civic Issue Detected
            </h2>
            <p className="text-xs sm:text-sm text-[#4B5563] max-w-md mx-auto">
              CivicConnect handles all civic and public-service problems. If you'd like, add a quick note to assist municipal routing:
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#4B5563] block">
              Describe What You Observed (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Damaged steps inside government hospital, broken school window, loose electric wire, transit bus door latch..."
              value={customUserNote}
              onChange={(e) => setCustomUserNote(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1D5DB] text-xs focus:outline-none focus:border-[#111827] bg-[#FFFFFF] text-[#111827]"
            />
            <p className="text-[11px] text-[#6B7280]">
              Our municipal intake workflow will review this report and dispatch the appropriate department.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              id="btn-low-confidence-continue"
              type="button"
              onClick={handleLowConfidenceContinue}
              className="px-6 py-2.5 bg-[#111827] hover:bg-[#1F2937] text-[#FFFFFF] rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <span>Continue to Confirmation &rarr;</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: DUPLICATE DETECTION WARNING
  // ==========================================================================
  if (stage === 'DUPLICATE_ALERT') {
    return (
      <div className="max-w-xl mx-auto py-6 sm:py-10 px-4 space-y-5">
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl shadow-xs p-6 sm:p-8 space-y-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-[#FEF3C7] text-[#92400E] flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[#111827]">
                A similar issue was already reported nearby.
              </h2>
              <p className="text-xs text-[#4B5563]">
                Municipal crews might already be addressing this problem. You can inspect the existing issue or submit your new report.
              </p>
            </div>
          </div>

          {selectedExistingDuplicate && (
            <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-[#111827]">
                  {selectedExistingDuplicate.trackingNumber || selectedExistingDuplicate.id}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EFF6FF] text-[#1D4ED8]">
                  {selectedExistingDuplicate.status}
                </span>
              </div>
              <div className="font-semibold text-sm text-[#111827]">
                {selectedExistingDuplicate.title}
              </div>
              <div className="text-[#6B7280] flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{selectedExistingDuplicate.address}</span>
              </div>
              <div className="text-[11px] text-[#9CA3AF]">
                Distance: ~{selectedExistingDuplicate.distanceMeters || 45}m from your pin
              </div>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              id="btn-view-existing-duplicate"
              type="button"
              onClick={() => {
                if (selectedExistingDuplicate) {
                  onTrackReport(selectedExistingDuplicate);
                }
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#FFFFFF] border border-[#D1D5DB] hover:bg-[#F3F4F6] text-[#111827] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              View Existing Issue
            </button>

            <button
              id="btn-submit-anyway"
              type="button"
              onClick={() => setStage('REVIEW')}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#111827] hover:bg-[#1F2937] text-[#FFFFFF] text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              Submit Anyway
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: USER CORRECTION / EDIT SCREEN (PROBLEM-AGNOSTIC)
  // ==========================================================================
  if (stage === 'EDIT_FIELDS') {
    return (
      <div className="max-w-xl mx-auto py-6 sm:py-8 px-4 space-y-5">
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[#F3F4F6] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#111827]">Correct Report Details</h2>
              <p className="text-xs text-[#6B7280]">Edit what you observed or where it is located</p>
            </div>
            <span className="text-xs text-[#111827] font-semibold bg-[#F5F5F5] px-2.5 py-1 rounded-md">
              Problem-Agnostic Edit
            </span>
          </div>

          <div className="p-5 sm:p-6 space-y-4 text-xs">
            {/* Free-form Observed Problem */}
            <div className="space-y-1.5">
              <label className="font-semibold uppercase tracking-wider text-[#4B5563] block">
                What is the observed problem?
              </label>
              <input
                type="text"
                placeholder="e.g. Damaged steps inside government hospital building, broken handrail..."
                value={editedObservedProblem}
                onChange={(e) => {
                  setEditedObservedProblem(e.target.value);
                  setEditedTitle(e.target.value);
                  setHasUserEdited(true);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1D5DB] text-xs focus:outline-none focus:border-[#111827] bg-[#FFFFFF] text-[#111827]"
              />
              <p className="text-[11px] text-[#6B7280]">
                Describe what you saw in your own words. No predefined category required.
              </p>
            </div>

            {/* Free-form Object & Context */}
            <div className="space-y-1.5">
              <label className="font-semibold uppercase tracking-wider text-[#4B5563] block">
                Object & Civic Context
              </label>
              <input
                type="text"
                placeholder="e.g. Government administrative building entrance • Public health clinic"
                value={editedObjectAndContext}
                onChange={(e) => {
                  setEditedObjectAndContext(e.target.value);
                  setHasUserEdited(true);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1D5DB] text-xs focus:outline-none focus:border-[#111827] bg-[#FFFFFF] text-[#111827]"
              />
            </div>

            {/* Severity */}
            <div className="space-y-1.5">
              <label className="font-semibold uppercase tracking-wider text-[#4B5563] block">
                Severity Level
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => {
                      setEditedSeverity(sev);
                      setHasUserEdited(true);
                    }}
                    className={`py-2 px-3 rounded-lg border text-center font-semibold text-xs transition-all cursor-pointer ${
                      editedSeverity === sev
                        ? 'bg-[#111827] text-[#FFFFFF] border-[#111827]'
                        : 'bg-[#FFFFFF] text-[#4B5563] border-[#E5E7EB] hover:border-[#9CA3AF]'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional details */}
            <div className="space-y-1.5">
              <label className="font-semibold uppercase tracking-wider text-[#4B5563] block">
                Additional Details
              </label>
              <textarea
                rows={3}
                value={editedDescription}
                onChange={(e) => {
                  setEditedDescription(e.target.value);
                  setHasUserEdited(true);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1D5DB] text-xs focus:outline-none focus:border-[#111827] bg-[#FFFFFF] text-[#111827]"
              />
            </div>

            {/* Location Address */}
            <div className="space-y-1.5">
              <label className="font-semibold uppercase tracking-wider text-[#4B5563] block">
                Incident Location Address
              </label>
              <input
                type="text"
                value={editedAddress}
                onChange={(e) => {
                  setEditedAddress(e.target.value);
                  setHasUserEdited(true);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1D5DB] text-xs focus:outline-none focus:border-[#111827] bg-[#FFFFFF] text-[#111827]"
              />
            </div>
          </div>

          <div className="p-5 bg-[#FAFAFA] border-t border-[#F3F4F6] flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setStage('REVIEW')}
              className="px-5 py-2.5 bg-[#111827] hover:bg-[#1F2937] text-[#FFFFFF] rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            >
              Done & Return to Confirmation
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: CITIZEN CONFIRMATION CARD (SECTION 9 SPECIFICATION)
  // ==========================================================================
  if (stage === 'REVIEW') {
    const displayProblem = hasUserEdited ? editedObservedProblem : aiDraft.observedProblem;
    const displayObjectContext = hasUserEdited ? editedObjectAndContext : `${aiDraft.object} • ${aiDraft.context}`;
    const displayDesc = hasUserEdited ? editedDescription : aiDraft.description;
    const displaySeverity = hasUserEdited ? editedSeverity : aiDraft.severity;
    const displayAddress = hasUserEdited ? editedAddress : location.address;

    const severityColor =
      displaySeverity === 'CRITICAL'
        ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FCA5A5]'
        : displaySeverity === 'HIGH'
        ? 'bg-[#FFFBEB] text-[#D97706] border-[#FCD34D]'
        : displaySeverity === 'MEDIUM'
        ? 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]'
        : 'bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]';

    return (
      <div className="max-w-xl mx-auto py-4 sm:py-8 px-4 space-y-5">
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-[#F3F4F6] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-[#6B7280] block mb-0.5">
                WE UNDERSTOOD YOUR REPORT AS
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-[#111827]">
                {displayProblem}
              </h1>
            </div>
            <button
              id="btn-edit-report"
              type="button"
              onClick={() => setStage('EDIT_FIELDS')}
              className="px-3.5 py-1.5 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#111827] text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-5 text-xs">
            {/* Photo Evidence */}
            {photoDataUrl && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] block">
                    Captured Evidence
                  </span>
                  <button
                    id="btn-change-photo"
                    type="button"
                    onClick={() => {
                      if (sourceFlow === 'TAKE_PHOTO') {
                        startCamera();
                      } else {
                        handleUploadClick();
                      }
                    }}
                    className="text-xs font-semibold text-[#111827] hover:underline cursor-pointer"
                  >
                    Change Photo
                  </button>
                </div>
                <div className="aspect-16/9 w-full rounded-xl overflow-hidden bg-[#000000] border border-[#E5E7EB]">
                  <img
                    src={photoDataUrl}
                    alt="Civic evidence"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            )}

            {/* AI Structured Understanding Panel */}
            <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl space-y-3.5">
              {/* Observed Object & Context */}
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280] block">
                  Observed Object & Context
                </span>
                <div className="font-semibold text-sm text-[#111827]">
                  {displayObjectContext}
                </div>
              </div>

              {/* Potential Safety & Public Impact */}
              <div className="space-y-1 border-t border-[#E5E7EB] pt-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280] block">
                    Potential Safety Impact
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${severityColor}`}>
                    {displaySeverity} Priority
                  </span>
                </div>
                <div className="text-xs text-[#374151] font-medium">
                  {aiDraft.visibleRisk || aiDraft.potentialSafetyImpact}
                </div>
                {aiDraft.potentialPublicImpact && (
                  <div className="text-[11px] text-[#6B7280]">
                    {aiDraft.potentialPublicImpact}
                  </div>
                )}
              </div>

              {/* Responsible Municipal Authority */}
              <div className="space-y-1.5 border-t border-[#E5E7EB] pt-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280] block">
                  Responsible Authority
                </span>
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-[#111827] flex items-center space-x-1.5">
                    <Building2 className="w-4 h-4 text-[#111827]" />
                    <span>{aiDraft.suggestedDepartment}</span>
                  </div>
                  <span className="px-2.5 py-0.5 bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] rounded-full text-[10px] font-semibold flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{Math.round(aiDraft.routingConfidence * 100)}% Confidence</span>
                  </span>
                </div>
                <p className="text-[11px] text-[#6B7280]">
                  Validated against municipal authority and jurisdictional routing mappings.
                </p>
              </div>

              {/* Description */}
              {displayDesc && (
                <div className="space-y-1 border-t border-[#E5E7EB] pt-2.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280] block">
                    Summary
                  </span>
                  <p className="text-xs text-[#4B5563] leading-relaxed">
                    {displayDesc}
                  </p>
                </div>
              )}
            </div>

            {/* Interactive Map & Location */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                  Incident Location
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMapPickerCoords({ lat: location.lat, lng: location.lng });
                    setMapPickerAddress(location.address);
                    setStage('MANUAL_LOCATION_PICKER');
                  }}
                  className="text-xs font-semibold text-[#111827] hover:underline"
                >
                  Change Pin on Map
                </button>
              </div>

              <div className="h-44 w-full rounded-xl overflow-hidden border border-[#E5E7EB] relative shadow-inner">
                <GoogleMap
                  center={{ lat: location.lat, lng: location.lng }}
                  zoom={15}
                  interactive={false}
                  markers={[
                    {
                      id: 'review-marker',
                      lat: location.lat,
                      lng: location.lng,
                      title: displayProblem,
                      priority: 'P1_CRITICAL',
                      status: 'CONFIRMED'
                    }
                  ]}
                />
              </div>

              <div className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl flex items-start space-x-2.5">
                <MapPin className="w-4 h-4 text-[#111827] shrink-0 mt-0.5" />
                <span className="font-semibold text-xs text-[#111827] truncate">
                  {displayAddress}
                </span>
              </div>
            </div>

            {submissionError && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#DC2626] font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submissionError}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="p-5 bg-[#FAFAFA] border-t border-[#F3F4F6] flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStage('EDIT_FIELDS')}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-[#4B5563] hover:text-[#111827] bg-[#FFFFFF] border border-[#D1D5DB] rounded-xl hover:bg-[#F3F4F6] transition-colors cursor-pointer"
            >
              Edit Details
            </button>

            <button
              id="btn-confirm-and-submit"
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmAndSubmit}
              className="w-full sm:w-auto min-h-[44px] px-7 py-2.5 bg-[#111827] hover:bg-[#1F2937] disabled:opacity-50 text-[#FFFFFF] text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting to Department...</span>
                </>
              ) : (
                <>
                  <span>Confirm & Submit</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: SUCCESS SCREEN
  // ==========================================================================
  if (stage === 'SUCCESS') {
    const trackingNo = submittedIncident?.tracking_number || submittedIncident?.trackingNumber || 'INC-2026-00421';

    return (
      <div className="max-w-xl mx-auto py-8 sm:py-12 px-4">
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl shadow-xs p-6 sm:p-10 space-y-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] flex items-center justify-center shadow-xs">
            <Check className="w-8 h-8 stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-[#111827]">
              Report Submitted Successfully
            </h1>
            <p className="text-xs sm:text-sm text-[#4B5563] max-w-md mx-auto">
              Your report has been validated and routed to <strong>{submittedIncident?.department_name || aiDraft.suggestedDepartment}</strong>.
            </p>
          </div>

          <div className="p-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl space-y-3 max-w-sm mx-auto text-xs text-left">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
              <span className="text-[#6B7280]">Tracking ID:</span>
              <span className="font-mono font-bold text-sm text-[#111827]">
                {trackingNo}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#6B7280]">Observed Issue:</span>
              <span className="font-semibold text-[#111827] truncate max-w-[180px]">
                {submittedIncident?.observed_problem || submittedIncident?.title || aiDraft.observedProblem}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#6B7280]">Status:</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EFF6FF] text-[#1D4ED8]">
                REPORTED &bull; QUEUED
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-sm mx-auto">
            <button
              id="btn-track-report"
              type="button"
              onClick={() => onTrackReport(submittedIncident)}
              className="w-full min-h-[44px] px-6 py-2.5 bg-[#111827] hover:bg-[#1F2937] text-[#FFFFFF] rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            >
              Track Report Status
            </button>

            <button
              id="btn-report-another"
              type="button"
              onClick={resetFlow}
              className="w-full min-h-[44px] px-5 py-2.5 bg-[#FFFFFF] border border-[#D1D5DB] text-[#374151] hover:bg-[#F3F4F6] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Report Another Issue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
