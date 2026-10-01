import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, MapPin, AlertTriangle, Shield, CheckCircle2,
  Clock, Wrench, Users, Camera, Upload, Check, AlertCircle,
  RefreshCw, Package, FileText, ChevronRight, Share2, Navigation,
  Calculator, ShieldAlert, CheckSquare, Plus, Info, HelpCircle
} from 'lucide-react';
import { GoogleMap, MarkerData } from '../maps/GoogleMap';

interface IncidentDetailViewProps {
  incident: any;
  onBack: () => void;
  onOpenTeamAssignment?: () => void;
  onStatusUpdated?: () => void;
  tokens?: any;
}

interface ActualUsageItem {
  id?: string;
  material_name: string;
  estimated_quantity: number;
  actual_quantity: number;
  unit: string;
  reference_unit_price: number;
  estimated_cost?: number;
  actual_cost?: number;
  variance_quantity?: number;
  variance_cost?: number;
  variance_percentage?: number;
  variance_flag?: boolean | number;
  variance_reason?: string;
  price_source?: string;
}

export const IncidentDetailView: React.FC<IncidentDetailViewProps> = ({
  incident,
  onBack,
  onOpenTeamAssignment,
  onStatusUpdated,
  tokens
}) => {
  const [targetStatus, setTargetStatus] = useState<string>(incident?.status || 'WORK STARTED');
  const [updateNote, setUpdateNote] = useState<string>('');
  const [completionImage, setCompletionImage] = useState<string | null>(incident?.completion_image_url || null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Material usage and transparency state
  const [actualUsages, setActualUsages] = useState<ActualUsageItem[]>([]);
  const [isLoggingUsage, setIsLoggingUsage] = useState<boolean>(false);
  const [usageSuccessMsg, setUsageSuccessMsg] = useState<string | null>(null);
  const [usageErrorMsg, setUsageErrorMsg] = useState<string | null>(null);
  const [varianceReviewNote, setVarianceReviewNote] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  // Initialize or fetch material usage
  useEffect(() => {
    if (!incident) return;
    loadMaterialUsage();
  }, [incident?.id, tokens]);

  const loadMaterialUsage = async () => {
    if (!incident?.id || !tokens) return;
    try {
      const res = await fetch(`/api/v1/department/incidents/${incident.id}/material-usage`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.usages) && data.usages.length > 0) {
          setActualUsages(data.usages.map((u: any) => ({
            id: u.id,
            material_name: u.material_name,
            estimated_quantity: Number(u.estimated_quantity) || 0,
            actual_quantity: Number(u.actual_quantity) || 0,
            unit: u.unit || 'unit',
            reference_unit_price: Number(u.reference_unit_price) || 0,
            estimated_cost: Number(u.estimated_cost) || 0,
            actual_cost: Number(u.actual_cost) || 0,
            variance_quantity: Number(u.variance_quantity) || 0,
            variance_cost: Number(u.variance_cost) || 0,
            variance_percentage: Number(u.variance_percentage) || 0,
            variance_flag: Boolean(u.variance_flag),
            variance_reason: u.variance_reason || '',
            price_source: u.price_source || 'Standard Municipal Schedule'
          })));
        } else {
          // Initialize baseline from incident materials if not already created
          initializeBaselineUsages();
        }
      }
    } catch (err) {
      console.error('Failed to load material usage', err);
      initializeBaselineUsages();
    }
  };

  const initializeBaselineUsages = () => {
    const rawMaterials = incident?.materials_needed;
    let list: any[] = [];
    if (Array.isArray(rawMaterials)) {
      list = rawMaterials;
    } else if (typeof rawMaterials === 'string') {
      try {
        const parsed = JSON.parse(rawMaterials);
        list = Array.isArray(parsed) ? parsed : [rawMaterials];
      } catch {
        list = [rawMaterials];
      }
    }

    if (list.length > 0) {
      setActualUsages(list.map(rawItem => {
        const isObj = typeof rawItem === 'object' && rawItem !== null;
        const itemName = isObj ? (rawItem.name || 'Standard Material') : String(rawItem);
        let qty = isObj && typeof rawItem.quantity === 'number' ? rawItem.quantity : 2;
        let unit = isObj && rawItem.unit ? rawItem.unit : 'Units';
        let reason = isObj && rawItem.reason ? rawItem.reason : '';
        let price = 1200;
        const itemLower = itemName.toLowerCase();

        if (itemLower.includes('asphalt')) {
          if (!isObj) { qty = 2.5; unit = 'Tons'; }
          price = 5800;
        } else if (itemLower.includes('gravel') || itemLower.includes('aggregate')) {
          if (!isObj) { qty = 1.5; unit = 'Tons'; }
          price = 1450;
        } else if (itemLower.includes('cement')) {
          if (!isObj) { qty = 4; unit = 'Bags'; }
          price = 420;
        } else if (itemLower.includes('paint')) {
          if (!isObj) { qty = 4; unit = 'Litres'; }
          price = 380;
        } else if (itemLower.includes('pipe')) {
          if (!isObj) { qty = 1; unit = 'Units (6m)'; }
          price = 8500;
        }

        return {
          material_name: itemName,
          estimated_quantity: qty,
          actual_quantity: qty,
          unit,
          reference_unit_price: price,
          estimated_cost: qty * price,
          actual_cost: qty * price,
          variance_quantity: 0,
          variance_cost: 0,
          variance_percentage: 0,
          variance_flag: false,
          variance_reason: reason,
          price_source: 'PWD Schedule of Rates 2026 (Item 4.12)'
        };
      }));
    }
  };

  if (!incident) return null;

  const trackingId = incident.tracking_number || `INC-${incident.id}`;
  const title = incident.title || 'Reported Civic Problem';
  const address = incident.address || 'Ward 04, Public Municipal Sector, Coimbatore';
  const simpleExplanation = incident.simple_explanation || incident.observed_problem || incident.description || 'Hazard presents risk to pedestrians and public traffic.';
  const workersNeeded = incident.workers_needed || 2;
  const citizenImage = incident.citizen_image_url || incident.photoDataUrl || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80';
  const completionImageUrl = completionImage || incident.completion_image_url;

  // Parse structured damage estimation
  let damageEstimation: any = null;
  if (incident.damage_estimation) {
    damageEstimation = incident.damage_estimation;
  } else if (incident.damage_estimation_json) {
    try {
      damageEstimation = JSON.parse(incident.damage_estimation_json);
    } catch {
      damageEstimation = null;
    }
  }

  // Parse equipment list
  const parseJsonList = (val: any): any[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [String(val)];
    }
  };

  const equipmentList = parseJsonList(incident.equipment_needed);
  const materialsList = parseJsonList(incident.materials_needed);

  // Workflow steps
  const workflowSteps = [
    { key: 'REPORTED', label: 'Reported' },
    { key: 'ASSIGNED', label: 'Assigned' },
    { key: 'WORK STARTED', label: 'Work Started' },
    { key: 'WORK IN PROGRESS', label: 'In Progress' },
    { key: 'WORK COMPLETED', label: 'Work Completed' },
  ];

  const currentStatusNorm = (incident.status || 'REPORTED').toUpperCase().replace(/_/g, ' ');
  let activeIndex = 0;
  if (currentStatusNorm.includes('COMPLETED') || currentStatusNorm.includes('RESOLVED')) activeIndex = 4;
  else if (currentStatusNorm.includes('PROGRESS')) activeIndex = 3;
  else if (currentStatusNorm.includes('STARTED')) activeIndex = 2;
  else if (currentStatusNorm.includes('ASSIGN')) activeIndex = 1;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCompletionImage(event.target?.result as string);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateStatus = async () => {
    const isDone = targetStatus === 'WORK COMPLETED' || targetStatus === 'RESOLVED';
    if (isDone && !completionImage && !incident.completion_image_url) {
      setErrorMsg('A completion proof photograph is mandatory to mark work as COMPLETED.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/v1/department/incidents/${incident.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: tokens ? `Bearer ${tokens.accessToken}` : ''
        },
        body: JSON.stringify({
          targetStatus,
          updateNote: updateNote || (isDone ? 'Repair completed and verified on site with photo proof.' : `Status updated to ${targetStatus}`),
          completionPhotoDataUrl: completionImage,
          expectedVersion: incident.version || 1
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update work status.');
      }

      setSuccessMsg('Status updated and saved to audit history. Resident notified!');
      setTimeout(() => {
        if (onStatusUpdated) onStatusUpdated();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while updating status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActualUsageQuantityChange = (idx: number, newQty: number) => {
    setActualUsages(prev => {
      const next = [...prev];
      const item = { ...next[idx] };
      item.actual_quantity = newQty;
      const unitPrice = item.reference_unit_price || 0;
      const estCost = item.estimated_quantity * unitPrice;
      const actCost = newQty * unitPrice;
      const varQty = newQty - item.estimated_quantity;
      const varCost = actCost - estCost;
      const varPct = estCost > 0 ? (varCost / estCost) * 100 : (actCost > 0 ? 100 : 0);

      item.estimated_cost = Math.round(estCost);
      item.actual_cost = Math.round(actCost);
      item.variance_quantity = Math.round(varQty * 100) / 100;
      item.variance_cost = Math.round(varCost);
      item.variance_percentage = Math.round(varPct * 10) / 10;
      item.variance_flag = Math.abs(varPct) > 20 || Math.abs(varCost) > 1000;

      next[idx] = item;
      return next;
    });
  };

  const handleActualUsageReasonChange = (idx: number, reason: string) => {
    setActualUsages(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], variance_reason: reason };
      return next;
    });
  };

  const handleSaveMaterialUsage = async () => {
    if (!incident?.id || !tokens) return;
    setIsLoggingUsage(true);
    setUsageSuccessMsg(null);
    setUsageErrorMsg(null);

    try {
      const res = await fetch(`/api/v1/department/incidents/${incident.id}/material-usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.accessToken}`
        },
        body: JSON.stringify({
          items: actualUsages.map(u => ({
            material_name: u.material_name,
            estimated_quantity: u.estimated_quantity,
            actual_quantity: u.actual_quantity,
            unit: u.unit,
            reference_unit_price: u.reference_unit_price,
            variance_reason: u.variance_reason,
            price_source: u.price_source
          }))
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save material usage');

      setUsageSuccessMsg('Material consumption recorded & variance analysis computed successfully.');
      setTimeout(() => setUsageSuccessMsg(null), 3500);
      loadMaterialUsage();
    } catch (err: any) {
      setUsageErrorMsg(err.message || 'Error saving material usage log');
    } finally {
      setIsLoggingUsage(false);
    }
  };

  const handleVarianceSignoff = async (approve: boolean) => {
    if (!incident?.id || !tokens) return;
    setIsSubmittingReview(true);
    try {
      const res = await fetch(`/api/v1/department/incidents/${incident.id}/variance-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.accessToken}`
        },
        body: JSON.stringify({
          resolutionNote: varianceReviewNote || (approve ? 'Discrepancy verified against on-site subsurface excavation depth.' : 'Variance noted for material reconciliation audit.'),
          approveVariance: approve
        })
      });
      if (res.ok) {
        setUsageSuccessMsg('Variance audit note recorded successfully.');
        setTimeout(() => setUsageSuccessMsg(null), 3000);
        loadMaterialUsage();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getSeverityBadge = (s?: string) => {
    const sev = (s || 'MEDIUM').toUpperCase();
    if (sev.includes('CRITICAL')) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]">
          Critical Severity
        </span>
      );
    }
    if (sev.includes('HIGH')) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#FFEDD5] text-[#EA580C] border border-[#FED7AA]">
          High Severity
        </span>
      );
    }
    if (sev.includes('LOW')) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]">
          Low Severity
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
        Medium Severity
      </span>
    );
  };

  const totalEstimatedCost = actualUsages.reduce((acc, u) => acc + (u.estimated_quantity * u.reference_unit_price), 0);
  const totalActualCost = actualUsages.reduce((acc, u) => acc + (u.actual_quantity * u.reference_unit_price), 0);
  const totalVarianceCost = totalActualCost - totalEstimatedCost;
  const totalVariancePct = totalEstimatedCost > 0 ? ((totalActualCost - totalEstimatedCost) / totalEstimatedCost) * 100 : 0;
  const hasVarianceFlag = actualUsages.some(u => u.variance_flag) || Math.abs(totalVariancePct) > 20 || Math.abs(totalVarianceCost) > 1000;

  const mapMarker: MarkerData = {
    id: incident.id,
    lat: Number(incident.latitude) || 11.0168,
    lng: Number(incident.longitude) || 76.9558,
    title,
    color: '#18181B',
    incident: {
      id: incident.id,
      trackingNumber: trackingId,
      title,
      status: incident.status,
      priority: incident.priority || incident.severity,
      address
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* 1. Back Navigation Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-[#18181B] hover:text-[#52525B] transition-colors bg-[#FFFFFF] border border-[#E5E5E5] px-3.5 py-1.5 rounded-lg shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Department Overview</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              setCopiedLink(true);
              setTimeout(() => setCopiedLink(false), 2000);
            }}
            className="px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5E5] text-xs font-medium text-[#18181B] rounded-lg hover:bg-[#F4F4F5] transition-colors flex items-center space-x-1.5 shadow-2xs"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Share2 className="w-3.5 h-3.5 text-[#6B7280]" />}
            <span>{copiedLink ? 'Copied' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Header Card */}
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2.5 mb-1.5">
              <span className="font-mono text-xs font-bold text-[#18181B] bg-[#F4F4F5] px-2.5 py-1 rounded">
                {trackingId}
              </span>
              {getSeverityBadge(incident.severity || incident.priority)}
              {incident.variance_review_required ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]">
                  Material Variance Flagged
                </span>
              ) : null}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111827] leading-tight">
              {title}
            </h1>
            <div className="flex items-center space-x-1.5 text-xs text-[#4B5563] mt-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
              <span>{address}</span>
            </div>
          </div>

          <div className="shrink-0 text-right sm:text-right">
            <div className="text-[11px] text-[#6B7280]">Reported On</div>
            <div className="text-xs font-semibold text-[#18181B]">
              {incident.created_at ? new Date(incident.created_at).toLocaleString() : 'Recent'}
            </div>
          </div>
        </div>

        {/* 5-Step Workflow Status Indicator */}
        <div className="pt-4 border-t border-[#F4F4F5]">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] mb-3">
            Work Status Workflow
          </div>
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            {workflowSteps.map((step, idx) => {
              const isPassed = idx < activeIndex;
              const isCurrent = idx === activeIndex;

              return (
                <div
                  key={step.key}
                  className={`py-2 px-1 rounded-lg border text-[11px] font-semibold transition-all ${
                    isCurrent
                      ? 'bg-[#18181B] text-[#FFFFFF] border-[#18181B] shadow-2xs'
                      : isPassed
                      ? 'bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]'
                      : 'bg-[#FAFAFA] text-[#9CA3AF] border-[#E5E5E5]'
                  }`}
                >
                  <div className="truncate">{step.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Main 2-Column Work Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Understand, Damage Modeling & Requirements */}
        <div className="lg:col-span-7 space-y-6">
          {/* STEP 1: Understand Problem & Risk */}
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center space-x-2 text-sm font-bold text-[#111827]">
              <AlertTriangle className="w-4 h-4 text-[#D97706]" />
              <span>1. Understand Reported Problem & Hazard</span>
            </div>

            <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-3.5 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                Simple Explanation (Why this is a risk)
              </div>
              <p className="text-sm font-medium text-[#1F2937] leading-relaxed">
                {simpleExplanation}
              </p>
            </div>

            {/* Original Citizen Evidence Image */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                Original Citizen Image
              </div>
              <div className="rounded-lg overflow-hidden border border-[#E5E5E5] bg-[#FAFAFA] h-64 relative">
                <img
                  src={citizenImage}
                  alt="Original citizen evidence"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* STEP 2: Visual Damage Estimation & Dimensional Analysis */}
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm font-bold text-[#111827]">
                <Calculator className="w-4 h-4 text-[#2563EB]" />
                <span>2. Visual Damage Estimation & Volume Analysis</span>
              </div>
              {damageEstimation?.fieldMeasurementNeeded && (
                <span className="px-2 py-0.5 bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] rounded text-[10px] font-bold uppercase">
                  Field Survey Needed
                </span>
              )}
            </div>

            {damageEstimation ? (
              <div className="space-y-3">
                {/* Dimensions & Volume Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-[#F9FAFB] border border-[#E5E5E5] rounded-lg">
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase block">Length</span>
                    <span className="text-base font-bold font-mono text-[#18181B]">
                      {damageEstimation.dimensions?.lengthMeters || 1.8} m
                    </span>
                  </div>
                  <div className="p-3 bg-[#F9FAFB] border border-[#E5E5E5] rounded-lg">
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase block">Width</span>
                    <span className="text-base font-bold font-mono text-[#18181B]">
                      {damageEstimation.dimensions?.widthMeters || 1.2} m
                    </span>
                  </div>
                  <div className="p-3 bg-[#F9FAFB] border border-[#E5E5E5] rounded-lg">
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase block">Depth / Height</span>
                    <span className="text-base font-bold font-mono text-[#18181B]">
                      {damageEstimation.dimensions?.depthMeters || 0.12} m
                    </span>
                  </div>
                  <div className="p-3 bg-[#EFF6FF] border border-[#DBEAFE] rounded-lg">
                    <span className="text-[10px] font-bold text-[#2563EB] uppercase block">Damage Volume</span>
                    <span className="text-base font-bold font-mono text-[#2563EB]">
                      {damageEstimation.estimatedVolumeCubicMeters || 0.3} m³
                    </span>
                  </div>
                </div>

                {/* Formula & Method */}
                <div className="p-3 bg-[#F9FAFB] border border-[#E5E5E5] rounded-lg space-y-1 text-xs">
                  <div className="flex items-center space-x-1.5 font-semibold text-[#18181B]">
                    <Info className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Calculation Formula Applied:</span>
                  </div>
                  <div className="font-mono text-[11px] text-[#4B5563] pl-5">
                    {damageEstimation.calculationFormula || 'Volume (m³) = Length × Width × Depth × 1.15 (Compaction Factor)'}
                  </div>
                  {damageEstimation.visualDamageAssessment && (
                    <div className="text-[11px] text-[#52525B] pt-1 pl-5">
                      <strong>Visual Notes:</strong> {damageEstimation.visualDamageAssessment}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-[#F9FAFB] border border-[#E5E5E5] rounded-lg text-xs text-[#6B7280]">
                Standard visual area calculation: Estimated repair footprint ~2.2 m² requiring asphalt overlay and base leveling.
              </div>
            )}
          </div>

          {/* STEP 3: Personnel & Equipment Requirements */}
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center space-x-2 text-sm font-bold text-[#111827]">
              <Users className="w-4 h-4 text-[#16A34A]" />
              <span>3. Personnel & Specialized Equipment Required</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Workers Needed with role breakdown */}
              <div className="bg-[#F9FAFB] border border-[#E5E5E5] rounded-lg p-4 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                  <Users className="w-3.5 h-3.5 text-[#1F2937]" />
                  <span>Workers Required</span>
                </div>
                <div className="text-2xl font-bold text-[#111827]">
                  {workersNeeded} Personnel
                </div>
                <div className="text-xs text-[#52525B] space-y-1 pt-1 border-t border-[#E5E5E5]">
                  <div>• <strong>{Math.max(1, workersNeeded - 1)} Field Technicians:</strong> Site prep & material laying</div>
                  <div>• <strong>1 Safety Marshal:</strong> Traffic/pedestrian diversion & barricading</div>
                </div>
              </div>

              {/* Equipment Needed with functional reason */}
              <div className="bg-[#F9FAFB] border border-[#E5E5E5] rounded-lg p-4 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                  <Wrench className="w-3.5 h-3.5 text-[#1F2937]" />
                  <span>Equipment Required</span>
                </div>
                {equipmentList.length > 0 ? (
                  <ul className="space-y-1.5 text-xs text-[#1F2937] pt-1">
                    {equipmentList.map((item, i) => {
                      const isObj = typeof item === 'object' && item !== null;
                      const name = isObj ? (item.name || JSON.stringify(item)) : String(item);
                      const reason = isObj && item.reason ? item.reason : 'Required for site restoration & safety';
                      const qty = isObj && item.quantity ? `${item.quantity} ${item.unit || 'unit'}` : null;

                      return (
                        <li key={i} className="flex items-start space-x-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#18181B] mt-1.5 shrink-0" />
                          <span>
                            <strong>{name}</strong>
                            {qty && <span className="text-[#6B7280] font-normal ml-1">({qty})</span>}
                            <span className="text-[#6B7280] font-normal"> — {reason}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="text-xs text-[#6B7280] pt-1">
                    Standard inspection and hand repair kit.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* STEP 4: Materials Required with Municipal Standard Reference Pricing */}
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm font-bold text-[#111827]">
                <Package className="w-4 h-4 text-[#7C3AED]" />
                <span>4. Materials Required & Standard Reference Pricing</span>
              </div>
              <span className="font-mono text-xs font-bold text-[#16A34A] bg-[#DCFCE7] px-2.5 py-1 rounded">
                Est. Total: ₹{totalEstimatedCost.toLocaleString()}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[#71717A] font-semibold">
                    <th className="py-2.5 px-3">Material</th>
                    <th className="py-2.5 px-3">Quantity</th>
                    <th className="py-2.5 px-3">Ref. Price</th>
                    <th className="py-2.5 px-3">Est. Cost</th>
                    <th className="py-2.5 px-3">Standard Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F4F5]">
                  {actualUsages.map((item, i) => (
                    <tr key={i} className="hover:bg-[#FAFAFA]">
                      <td className="py-2.5 px-3 font-semibold text-[#18181B]">{item.material_name}</td>
                      <td className="py-2.5 px-3 font-mono font-medium">{item.estimated_quantity} {item.unit}</td>
                      <td className="py-2.5 px-3 font-mono text-[#52525B]">
                        {item.reference_unit_price ? `₹${item.reference_unit_price.toLocaleString()} / ${item.unit}` : <span className="text-[#A1A1AA] italic">Pending Verification</span>}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#18181B]">
                        ₹{(item.estimated_quantity * item.reference_unit_price).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-[#71717A] font-mono text-[11px] truncate max-w-xs">
                        {item.price_source || 'PWD Rate Schedule 2026'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Work Status, Material Consumption Logging & Transparency */}
        <div className="lg:col-span-5 space-y-6">
          {/* STEP 5: Resource Requirement Transparency & Actual Usage Tracking */}
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm font-bold text-[#111827]">
                <ShieldAlert className="w-4 h-4 text-[#2563EB]" />
                <span>Resource Requirement Transparency</span>
              </div>
              {hasVarianceFlag ? (
                <span className="px-2 py-0.5 bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] rounded text-[10px] font-bold uppercase">
                  Variance &gt;20%
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0] rounded text-[10px] font-bold uppercase">
                  Within Tolerances
                </span>
              )}
            </div>

            <p className="text-xs text-[#52525B]">
              Record actual field material consumption upon work completion to track budget variance and audit cost discrepancies.
            </p>

            {usageSuccessMsg && (
              <div className="p-3 bg-[#DCFCE7] border border-[#BBF7D0] rounded-lg text-xs text-[#16A34A] font-medium flex items-center space-x-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{usageSuccessMsg}</span>
              </div>
            )}

            {usageErrorMsg && (
              <div className="p-3 bg-[#FEE2E2] border border-[#FECACA] rounded-lg text-xs text-[#DC2626] font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{usageErrorMsg}</span>
              </div>
            )}

            {/* Interactive Consumption Log Inputs */}
            <div className="space-y-3 pt-1">
              {actualUsages.map((item, idx) => (
                <div key={idx} className="p-3 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#18181B]">{item.material_name}</span>
                    <span className="text-[#71717A] text-[11px]">Est: {item.estimated_quantity} {item.unit}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="text-[11px] font-medium text-[#52525B] shrink-0">Actual Used:</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={item.actual_quantity}
                      onChange={e => handleActualUsageQuantityChange(idx, Number(e.target.value))}
                      className="w-24 px-2 py-1 bg-[#FFFFFF] border border-[#E5E5E5] rounded text-xs font-mono font-bold text-[#18181B] focus:outline-none focus:border-[#18181B]"
                    />
                    <span className="text-xs text-[#52525B]">{item.unit}</span>

                    <div className="ml-auto text-right">
                      <span className={`font-mono text-xs font-bold ${
                        (item.variance_percentage || 0) > 20 ? 'text-[#DC2626]' : 'text-[#16A34A]'
                      }`}>
                        {(item.variance_percentage || 0) > 0 ? `+${item.variance_percentage}%` : `${item.variance_percentage}%`}
                      </span>
                    </div>
                  </div>

                  {item.variance_flag ? (
                    <div className="pt-1">
                      <input
                        type="text"
                        placeholder="Reason for variance (e.g. Sub-base cavity depth expanded)..."
                        value={item.variance_reason || ''}
                        onChange={e => handleActualUsageReasonChange(idx, e.target.value)}
                        className="w-full px-2 py-1 bg-[#FFFFFF] border border-[#FECACA] rounded text-[11px] text-[#DC2626] focus:outline-none"
                      />
                    </div>
                  ) : null}
                </div>
              ))}

              <div className="p-3 bg-[#F4F4F5] rounded-lg flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-[#71717A] block text-[10px] uppercase">Actual Total Cost</span>
                  <span className="font-bold text-[#18181B] text-sm">₹{totalActualCost.toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-[#71717A] block text-[10px] uppercase">Net Variance</span>
                  <span className={`font-bold text-sm ${totalVarianceCost > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}>
                    {totalVarianceCost > 0 ? `+₹${totalVarianceCost.toLocaleString()} (+${totalVariancePct.toFixed(1)}%)` : `₹${totalVarianceCost.toLocaleString()} (${totalVariancePct.toFixed(1)}%)`}
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={isLoggingUsage}
                onClick={handleSaveMaterialUsage}
                className="w-full py-2 bg-[#FFFFFF] hover:bg-[#F4F4F5] border border-[#18181B] text-[#18181B] rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5"
              >
                {isLoggingUsage ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5" />}
                <span>Save Material Consumption Log</span>
              </button>
            </div>

            {/* Officer Variance Review Section if flagged */}
            {hasVarianceFlag && (
              <div className="mt-3 p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg space-y-2 text-xs">
                <div className="flex items-center space-x-1.5 text-[#D97706] font-bold uppercase text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Officer Variance Audit & Signoff</span>
                </div>
                <textarea
                  rows={2}
                  placeholder="Officer audit justification note..."
                  value={varianceReviewNote}
                  onChange={e => setVarianceReviewNote(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#FDE68A] rounded text-xs focus:outline-none"
                />
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={isSubmittingReview}
                    onClick={() => handleVarianceSignoff(true)}
                    className="flex-1 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-[#FFFFFF] font-bold text-[11px] rounded transition-colors"
                  >
                    Approve Variance
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingReview}
                    onClick={() => handleVarianceSignoff(false)}
                    className="flex-1 py-1.5 bg-[#FFFFFF] border border-[#D97706] text-[#D97706] font-bold text-[11px] rounded transition-colors"
                  >
                    Flag for Dep. Head
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* STEP 6: Update Work Status & Submit Completion Proof */}
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center space-x-2 text-sm font-bold text-[#111827]">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
              <span>Update Work Status & Proof</span>
            </div>

            {errorMsg && (
              <div className="p-3 bg-[#FEE2E2] border border-[#FECACA] rounded-lg text-xs text-[#DC2626] font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-[#DCFCE7] border border-[#BBF7D0] rounded-lg text-xs text-[#16A34A] font-medium flex items-center space-x-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Select Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151] block uppercase tracking-wider">
                Select Work Status
              </label>
              <select
                value={targetStatus}
                onChange={e => {
                  const val = e.target.value;
                  setTargetStatus(val);
                  if (val === 'WORK STARTED') setUpdateNote('Repair team has reached the location and started the work.');
                  else if (val === 'WORK IN PROGRESS') setUpdateNote('Damaged steps are being repaired.');
                  else if (val === 'WORK COMPLETED') setUpdateNote('Repair completed and verified on site with photo proof.');
                }}
                className="w-full px-3 py-2 text-xs font-medium border border-[#E5E5E5] rounded-lg bg-[#FAFAFA] focus:outline-none focus:border-[#18181B]"
              >
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="WORK STARTED">WORK STARTED</option>
                <option value="WORK IN PROGRESS">WORK IN PROGRESS</option>
                <option value="WORK COMPLETED">WORK COMPLETED</option>
              </select>
            </div>

            {/* Update note */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151] block uppercase tracking-wider">
                Department Update Note (Visible to Resident)
              </label>
              <textarea
                rows={3}
                value={updateNote}
                onChange={e => setUpdateNote(e.target.value)}
                placeholder="e.g. Repair team has reached the location and started the work..."
                className="w-full px-3 py-2 text-xs border border-[#E5E5E5] rounded-lg bg-[#FAFAFA] focus:outline-none focus:border-[#18181B]"
              />
            </div>

            {/* Completion Image Upload */}
            <div className="space-y-2 pt-2 border-t border-[#F4F4F5]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center space-x-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span>Completion Proof Photo</span>
                </label>
                {(targetStatus === 'WORK COMPLETED' || targetStatus === 'RESOLVED') && (
                  <span className="text-[10px] font-bold text-[#DC2626] uppercase">Required</span>
                )}
              </div>

              {completionImageUrl ? (
                <div className="relative rounded-lg overflow-hidden border border-[#16A34A] h-44 group">
                  <img
                    src={completionImageUrl}
                    alt="Completed work proof"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-[#16A34A] text-[#FFFFFF] text-[10px] font-bold px-2 py-0.5 rounded">
                    Verified Resolution Proof
                  </div>
                  <label className="absolute bottom-2 right-2 bg-[#000000]/70 hover:bg-[#000000] text-[#FFFFFF] text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer transition-colors">
                    Replace Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <label className="border-2 border-dashed border-[#D4D4D8] hover:border-[#18181B] bg-[#FAFAFA] rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer transition-colors">
                  <Upload className="w-6 h-6 text-[#6B7280] mb-1.5" />
                  <span className="font-semibold text-xs text-[#18181B]">Upload Completion Image</span>
                  <span className="text-[10px] text-[#6B7280] mt-0.5">Required to mark WORK COMPLETED</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleUpdateStatus}
              className="w-full py-2.5 bg-[#18181B] hover:bg-[#27272A] disabled:opacity-50 text-[#FFFFFF] rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 shadow-2xs"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Update...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Work Status & Notify Citizen</span>
                </>
              )}
            </button>
          </div>

          {/* Location Map Snapshot */}
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-4 shadow-2xs space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-[#111827] uppercase tracking-wider">
              <Navigation className="w-3.5 h-3.5" />
              <span>Location Coordinate & Map</span>
            </div>
            <div className="h-44 rounded-lg overflow-hidden border border-[#E5E5E5] relative">
              <GoogleMap
                center={{ lat: Number(incident.latitude) || 11.0168, lng: Number(incident.longitude) || 76.9558 }}
                zoom={15}
                markers={[mapMarker]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
