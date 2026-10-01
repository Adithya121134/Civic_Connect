import React, { useState, useEffect } from 'react';
import {
  X, Check, AlertTriangle, Clock, MapPin, Users,
  Truck, Wrench, Shield, ArrowRight, ExternalLink, HardHat, Navigation
} from 'lucide-react';
import { GoogleMap } from '../maps/GoogleMap';
import { calculateRouteDistance } from '../../lib/googleMapsLoader';

interface IncidentDetailModalProps {
  incident: any;
  isOpen: boolean;
  onClose: () => void;
  teams: any[];
  workers: any[];
  token: string;
  onAssigned: () => void;
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  incident,
  isOpen,
  onClose,
  teams,
  workers,
  token,
  onAssigned
}) => {
  const [assessment, setAssessment] = useState<any | null>(null);
  const [isLoadingAssessment, setIsLoadingAssessment] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !incident) return;

    setSelectedTeamId(incident.assigned_team_id || (teams[0] ? teams[0].id : ''));
    setSelectedWorkerId(incident.assigned_worker_id || '');
    setErrorMessage(null);
    setSuccessMessage(null);

    // Fetch assessment for this incident
    const fetchAssessment = async () => {
      setIsLoadingAssessment(true);
      try {
        const res = await fetch(`/api/v1/department/incidents/${incident.id}/assessment`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAssessment(data.assessment);
        }
      } catch (err) {
        console.error('Failed to load incident assessment', err);
      } finally {
        setIsLoadingAssessment(false);
      }
    };

    fetchAssessment();
  }, [isOpen, incident, token, teams]);

  if (!isOpen || !incident) return null;

  const handleAssign = async (overrideTeamId?: string, overrideWorkerId?: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const teamToAssign = overrideTeamId || selectedTeamId;
    const workerToAssign = overrideWorkerId || selectedWorkerId;

    try {
      const res = await fetch(`/api/v1/department/incidents/${incident.id}/assign`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          teamId: teamToAssign,
          workerId: workerToAssign || null,
          expectedVersion: incident.version
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.message || data.error || 'Assignment failed');
      } else {
        setSuccessMessage('Incident successfully assigned and work order dispatched to field team.');
        onAssigned();
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error occurred during assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCritical = incident.priority === 'P1_CRITICAL' || incident.severity === 'CRITICAL';
  const isHigh = incident.priority === 'P2_HIGH' || incident.severity === 'HIGH';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000000]/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FFFFFF] border border-[#111111] max-w-4xl w-full my-8 max-h-[90vh] flex flex-col rounded-none shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E5E5E5] bg-[#FAFAFA]">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-[#666666]">
                {incident.tracking_number || incident.id}
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-sm ${
                isCritical ? 'bg-[#FEE2E2] text-[#DC2626] border border-[#DC2626]' :
                isHigh ? 'bg-[#FEF3C7] text-[#D97706] border border-[#D97706]' :
                'bg-[#F3F4F6] text-[#4B5563] border border-[#D1D5DB]'
              }`}>
                {incident.priority || incident.severity || 'MEDIUM'}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#111111] text-[#FFFFFF] uppercase rounded-sm">
                STATUS: {incident.status}
              </span>
            </div>
            <h2 className="text-base font-bold text-[#111111]">
              {incident.title}
            </h2>
          </div>
          <button
            id="btn-close-incident-modal"
            onClick={onClose}
            className="p-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#EBEBEB] transition-colors rounded-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-[#111111]">
          {errorMessage && (
            <div className="p-3 bg-[#FEE2E2] border border-[#DC2626] text-[#DC2626] font-medium flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-[#DCFCE7] border border-[#16A34A] text-[#16A34A] font-medium flex items-center space-x-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Section 1: Core Incident Facts & Description */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-[#FAFAFA] border border-[#E5E5E5]">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#666666] block">Location / Ward</span>
              <div className="font-semibold text-xs mt-0.5 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-[#666666]" />
                <span>{incident.address || 'Address unrecorded'}</span>
              </div>
              <span className="text-[10px] text-[#666666] font-mono block mt-0.5">
                Ward: {incident.ward_code || 'WARD-04'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#666666] block">SLA Target Deadline</span>
              <div className="font-semibold text-xs mt-0.5 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-[#666666]" />
                <span>
                  {incident.sla_deadline
                    ? new Date(incident.sla_deadline).toLocaleString()
                    : 'Target: Within 24 Hours'}
                </span>
              </div>
              <span className="text-[10px] text-[#DC2626] font-mono block mt-0.5 font-bold">
                {isCritical ? 'CRITICAL DISPATCH WINDOW' : 'STANDARD WORK ORDER'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#666666] block">Assigned Team</span>
              <div className="font-semibold text-xs mt-0.5 flex items-center space-x-1">
                <Users className="w-3.5 h-3.5 text-[#666666]" />
                <span>
                  {incident.assigned_team_id
                    ? teams.find(t => t.id === incident.assigned_team_id)?.name || incident.assigned_team_id
                    : 'Unassigned (Awaiting Officer Dispatch)'}
                </span>
              </div>
              <span className="text-[10px] text-[#666666] font-mono block mt-0.5">
                Version Token: v{incident.version} (OCC Lock)
              </span>
            </div>
          </div>

          {/* Section 1.5: Interactive Location & Dispatch Route */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#111111] font-mono flex items-center space-x-1.5">
                <Navigation className="w-3.5 h-3.5 text-[#111111]" />
                <span>Geographic Location & Field Crew Route</span>
              </h3>
              <span className="text-[10px] font-mono text-[#666666]">
                Lat: {Number(incident.latitude || 37.7749).toFixed(4)} &bull; Lng: {Number(incident.longitude || -122.4194).toFixed(4)}
              </span>
            </div>
            <div className="h-52 w-full rounded-lg overflow-hidden border border-[#E5E5E5] relative shadow-inner">
              <GoogleMap
                center={{
                  lat: Number(incident.latitude) || 37.7749,
                  lng: Number(incident.longitude) || -122.4194
                }}
                zoom={14}
                interactive={true}
                markers={[
                  {
                    id: incident.id,
                    lat: Number(incident.latitude) || 37.7749,
                    lng: Number(incident.longitude) || -122.4194,
                    title: incident.title,
                    priority: incident.priority,
                    status: incident.status,
                    address: incident.address
                  },
                  {
                    id: 'depot-hq',
                    lat: 37.7790,
                    lng: -122.4130,
                    title: 'Municipal Central Depot',
                    status: 'DEPOT'
                  }
                ]}
                route={{
                  origin: { lat: 37.7790, lng: -122.4130 },
                  destination: {
                    lat: Number(incident.latitude) || 37.7749,
                    lng: Number(incident.longitude) || -122.4194
                  }
                }}
              />
              <div className="absolute bottom-2 left-2 bg-[#FFFFFF]/90 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono text-[#333333] border border-[#E5E5E5] shadow-xs">
                Route from Municipal Central Depot to Site &bull; Turn-by-Turn GPS Active
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#666666] mb-1.5 font-mono">
              Incident Description & Field Notes
            </h3>
            <p className="p-3 bg-[#FFFFFF] border border-[#E5E5E5] text-xs leading-relaxed text-[#333333]">
              {incident.description || 'No detailed field notes provided.'}
            </p>
          </div>

          {/* Section 2: Severity & Damage Impact Assessment */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#111111] font-mono flex items-center space-x-1.5">
                <Shield className="w-4 h-4 text-[#111111]" />
                <span>Damage Severity & Impact Assessment</span>
              </h3>
              <span className="text-[10px] font-mono text-[#666666]">
                Municipal Structural Standards
              </span>
            </div>

            {isLoadingAssessment ? (
              <div className="p-6 text-center text-xs text-[#666666] border border-[#E5E5E5] bg-[#FAFAFA]">
                Calculating structural impact, commuter disruption, and required machinery...
              </div>
            ) : assessment ? (
              <div className="border border-[#111111] p-4 bg-[#FAFAFA] space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-2.5 bg-[#FFFFFF] border border-[#E5E5E5]">
                    <span className="text-[10px] uppercase font-mono text-[#666666] block">Damage Severity</span>
                    <span className="text-xs font-bold text-[#DC2626]">{assessment.damageSeverity}</span>
                  </div>
                  <div className="p-2.5 bg-[#FFFFFF] border border-[#E5E5E5]">
                    <span className="text-[10px] uppercase font-mono text-[#666666] block">Public Safety Impact</span>
                    <span className="text-xs font-bold text-[#111111]">{assessment.impactAssessment.publicSafetyImpact}</span>
                  </div>
                  <div className="p-2.5 bg-[#FFFFFF] border border-[#E5E5E5]">
                    <span className="text-[10px] uppercase font-mono text-[#666666] block">Traffic Disruption</span>
                    <span className="text-xs font-bold text-[#111111]">{assessment.impactAssessment.trafficDisruption}</span>
                  </div>
                  <div className="p-2.5 bg-[#FFFFFF] border border-[#E5E5E5]">
                    <span className="text-[10px] uppercase font-mono text-[#666666] block">Affected Population</span>
                    <span className="text-xs font-bold text-[#111111]">{assessment.impactAssessment.affectedPopulationEstimate}</span>
                  </div>
                </div>

                <div className="p-3 bg-[#FFFFFF] border border-[#E5E5E5] text-xs">
                  <span className="text-[10px] uppercase font-mono text-[#666666] block font-semibold mb-1">
                    Recommended Operational Response
                  </span>
                  <p className="text-[#222222] font-medium">
                    {assessment.impactAssessment.recommendedResponse}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Section 3: Required Resources & Labour Requirement */}
          {assessment && (
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#111111] mb-2 font-mono flex items-center space-x-1.5">
                <Wrench className="w-4 h-4 text-[#111111]" />
                <span>Required Resources & Labour Breakdown</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Labour & Crew Requirements */}
                <div className="p-3 border border-[#E5E5E5] bg-[#FAFAFA] space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-[#E5E5E5]">
                    <span className="text-[10px] font-mono uppercase font-bold text-[#111111]">
                      Labour & Personnel
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#DC2626] text-[#FFFFFF] font-bold rounded-xs">
                      {assessment.workforceRequirement.workforceStatus}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {assessment.requiredResources.labour.map((item: any, idx: number) => (
                      <li key={idx} className="flex items-center justify-between bg-[#FFFFFF] p-2 border border-[#EBEBEB]">
                        <span className="font-medium text-xs">{item.role}</span>
                        <span className="font-mono text-xs font-bold">{item.count} Required</span>
                      </li>
                    ))}
                  </ul>
                  <div className="p-2 bg-[#FFFBEB] border border-[#FDE68A] text-[11px] text-[#92400E]">
                    <strong>Crew Balance:</strong> Required: {assessment.workforceRequirement.requiredWorkers} | Available: {assessment.workforceRequirement.availableWorkers} | Additional Needed: {assessment.workforceRequirement.additionalNeeded}
                  </div>
                </div>

                {/* Equipment & Heavy Machinery */}
                <div className="p-3 border border-[#E5E5E5] bg-[#FAFAFA] space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-[#E5E5E5]">
                    <span className="text-[10px] font-mono uppercase font-bold text-[#111111]">
                      Equipment & Machinery
                    </span>
                    <span className="text-[10px] font-mono text-[#666666]">
                      Depot Reserve Status
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {assessment.requiredResources.equipment.map((eq: any, idx: number) => (
                      <li key={idx} className="flex items-center justify-between bg-[#FFFFFF] p-2 border border-[#EBEBEB]">
                        <div className="flex items-center space-x-1.5">
                          <HardHat className="w-3.5 h-3.5 text-[#666666]" />
                          <span className="font-medium text-xs">{eq.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[10px] text-[#666666]">Req: {eq.required}</span>
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-xs ${
                            eq.status === 'Available' ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#FEE2E2] text-[#DC2626]'
                          }`}>
                            {eq.status}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Materials & Transport Fleet */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div className="p-3 border border-[#E5E5E5] bg-[#FAFAFA] space-y-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-[#111111] block pb-1 border-b border-[#E5E5E5]">
                    Consumable Materials Required
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {assessment.requiredResources.materials.map((mat: any, idx: number) => (
                      <div key={idx} className="bg-[#FFFFFF] p-2 border border-[#EBEBEB]">
                        <span className="text-[10px] text-[#666666] block">{mat.name}</span>
                        <span className="text-xs font-bold text-[#111111] font-mono">{mat.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 border border-[#E5E5E5] bg-[#FAFAFA] space-y-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-[#111111] block pb-1 border-b border-[#E5E5E5]">
                    Required Transport & Vehicles
                  </span>
                  <ul className="space-y-1.5">
                    {assessment.requiredResources.vehicles.map((v: any, idx: number) => (
                      <li key={idx} className="flex items-center justify-between bg-[#FFFFFF] p-2 border border-[#EBEBEB]">
                        <div className="flex items-center space-x-1.5">
                          <Truck className="w-3.5 h-3.5 text-[#666666]" />
                          <span className="text-xs font-medium">{v.name}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-[#F3F4F6] text-[#4B5563]">
                          {v.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Intelligent Team Recommendation & One-Click Dispatch */}
          {assessment?.recommendedTeam && (
            <div className="p-4 border-2 border-[#111111] bg-[#FAFAFA] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-[#DC2626] tracking-wider block">
                    ★ Intelligent Team Recommendation
                  </span>
                  <h4 className="text-sm font-bold text-[#111111]">
                    {assessment.recommendedTeam.name}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-mono font-bold text-[#111111] block">
                    Distance: {assessment.recommendedTeam.distance}
                  </span>
                  <span className="text-[10px] text-[#666666] font-mono">
                    Lead: {assessment.recommendedTeam.leadName}
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#444444] bg-[#FFFFFF] p-2.5 border border-[#E5E5E5] leading-relaxed">
                <strong>Match Reason:</strong> {assessment.recommendedTeam.matchReason}
              </p>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-3 text-[11px] text-[#666666] font-mono">
                  <span>Workload: <strong>{assessment.recommendedTeam.currentWorkload}</strong></span>
                  <span>&bull;</span>
                  <span>Crew Available: <strong>{assessment.recommendedTeam.availableWorkers} Workers</strong></span>
                </div>

                <button
                  id="btn-dispatch-recommended-team"
                  onClick={() => handleAssign(assessment.recommendedTeam.id)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#111111] hover:bg-[#333333] text-[#FFFFFF] text-xs font-mono font-bold uppercase transition-colors inline-flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'DISPATCHING...' : 'DISPATCH RECOMMENDED TEAM'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Section 5: Manual Officer Override Assignment */}
          <div className="p-4 border border-[#E5E5E5] bg-[#FFFFFF] space-y-3">
            <h4 className="text-xs font-bold uppercase text-[#111111] font-mono">
              Manual Assignment Override
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono uppercase text-[#666666] block mb-1">
                  Select Field Team
                </label>
                <select
                  id="select-override-team"
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#CCCCCC] text-xs focus:outline-hidden focus:border-[#111111]"
                >
                  <option value="">-- Choose Team --</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Lead: {t.lead_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-[#666666] block mb-1">
                  Assign Lead Worker (Optional)
                </label>
                <select
                  id="select-override-worker"
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#CCCCCC] text-xs focus:outline-hidden focus:border-[#111111]"
                >
                  <option value="">-- Any Available Field Worker --</option>
                  {workers.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.first_name} {w.last_name} ({w.badge_number || 'Field Worker'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                id="btn-submit-override-assignment"
                onClick={() => handleAssign()}
                disabled={isSubmitting || !selectedTeamId}
                className="px-4 py-2 bg-[#FFFFFF] border border-[#111111] hover:bg-[#F5F5F5] text-[#111111] text-xs font-mono font-bold uppercase transition-colors"
              >
                {isSubmitting ? 'SAVING...' : 'UPDATE WORK ORDER ASSIGNMENT'}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#E5E5E5] bg-[#FAFAFA] flex items-center justify-between text-xs">
          <span className="text-[#666666] font-mono text-[11px]">
            Server-Enforced Department Isolation Active &bull; OCC Protected
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#FFFFFF] border border-[#CCCCCC] hover:bg-[#F0F0F0] text-[#111111] font-mono text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
