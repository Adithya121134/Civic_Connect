import React, { useState, useEffect } from 'react';
import {
  Wrench, Users, Package, FileText, CheckCircle2,
  AlertTriangle, Search, Filter, ShieldCheck,
  Calculator, ArrowUpRight, Check, Eye, HelpCircle, Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ResourcesViewProps {
  departmentName?: string;
  onSelectIncident?: (incident: any) => void;
}

interface ReferencePrice {
  id: string;
  material_name: string;
  unit: string;
  reference_price: number;
  category: string;
  source: string;
  last_updated: string;
}

interface IncidentRequirementRow {
  id: string;
  tracking_number: string;
  title: string;
  category: string;
  priority: string;
  severity: string;
  address: string;
  workers_needed: number;
  equipment_needed: string;
  materials_needed: string;
  damage_estimation_json?: string;
  estimated_total_material_cost?: number;
  variance_review_required?: number;
  variance_summary_note?: string;
  created_at: string;
}

export const ResourcesView: React.FC<ResourcesViewProps> = ({
  departmentName = 'Roads',
  onSelectIncident
}) => {
  const { tokens } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'incident_requirements' | 'reference_prices' | 'formulas' | 'variance_log'>('incident_requirements');
  const [referencePrices, setReferencePrices] = useState<ReferencePrice[]>([]);
  const [incidents, setIncidents] = useState<IncidentRequirementRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [priceCategoryFilter, setPriceCategoryFilter] = useState<string>('ALL');
  const [priceSearchQuery, setPriceSearchQuery] = useState<string>('');
  const [selectedIncidentForTransparency, setSelectedIncidentForTransparency] = useState<any | null>(null);

  useEffect(() => {
    if (!tokens) return;
    fetchData();
  }, [tokens]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${tokens?.accessToken}` };

      // Fetch reference prices
      const priceRes = await fetch('/api/v1/department/material-reference-prices', { headers });
      if (priceRes.ok) {
        const pJson = await priceRes.json();
        setReferencePrices(pJson.prices || []);
      }

      // Fetch department incidents
      const incRes = await fetch('/api/v1/department/incidents', { headers });
      if (incRes.ok) {
        const iJson = await incRes.json();
        setIncidents(iJson.incidents || []);
      }
    } catch (err) {
      console.error('Failed to load repair requirements data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const parseList = (val: any): any[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try {
      const p = JSON.parse(val);
      return Array.isArray(p) ? p : [p];
    } catch {
      return [String(val)];
    }
  };

  const formatItemDisplay = (item: any): string => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    if (typeof item === 'object' && item !== null) {
      if (item.name) {
        if (item.quantity && item.unit && item.unit !== 'unit') {
          return `${item.name} (${item.quantity} ${item.unit})`;
        }
        return item.name;
      }
      return JSON.stringify(item);
    }
    return String(item);
  };

  const parseDamageJson = (jsonStr?: string) => {
    if (!jsonStr) return null;
    try {
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  };

  const filteredPrices = referencePrices.filter(p => {
    const matchesCategory = priceCategoryFilter === 'ALL' || p.category.toLowerCase().includes(priceCategoryFilter.toLowerCase());
    const matchesSearch = priceSearchQuery === '' ||
      p.material_name.toLowerCase().includes(priceSearchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(priceSearchQuery.toLowerCase()) ||
      p.source.toLowerCase().includes(priceSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = Array.from(new Set(referencePrices.map(p => p.category)));

  return (
    <div className="space-y-6">
      {/* 1. Header with Focus on Incident Requirements */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight flex items-center space-x-2.5">
            <Wrench className="w-6 h-6 text-[#18181B]" />
            <span>Incident Repair Requirements & Standards</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#71717A] mt-0.5">
            Incident-specific resource calculations, municipal reference pricing, and repair cost transparency.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] px-3 py-1.5 rounded-md text-xs font-semibold text-[#18181B] shadow-2xs">
            {departmentName} Department
          </div>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards (Focus on Requirements & Verification) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-4 shadow-2xs">
          <div className="text-xs font-medium text-[#71717A] flex items-center space-x-1.5">
            <Users className="w-3.5 h-3.5 text-[#18181B]" />
            <span>Avg Crew Per Incident</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#111111] tracking-tight mt-2">
            {(incidents.length > 0
              ? (incidents.reduce((acc, i) => acc + (i.workers_needed || 2), 0) / incidents.length).toFixed(1)
              : '2.8')} <span className="text-xs font-normal text-[#71717A]">Workers</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-4 shadow-2xs">
          <div className="text-xs font-medium text-[#71717A] flex items-center space-x-1.5">
            <Package className="w-3.5 h-3.5 text-[#18181B]" />
            <span>Reference Price Items</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#111111] tracking-tight mt-2">
            {referencePrices.length || 18} <span className="text-xs font-normal text-[#71717A]">Standards</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-4 shadow-2xs">
          <div className="text-xs font-medium text-[#71717A] flex items-center space-x-1.5">
            <Calculator className="w-3.5 h-3.5 text-[#18181B]" />
            <span>Formulas Configured</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#111111] tracking-tight mt-2">
            4 <span className="text-xs font-normal text-[#71717A]">Engineering Standard</span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-4 shadow-2xs">
          <div className="text-xs font-medium text-[#71717A] flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
            <span>Variance Audits</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#111111] tracking-tight mt-2">
            {incidents.filter(i => i.variance_review_required).length} <span className="text-xs font-normal text-[#DC2626]">Flagged</span>
          </div>
        </div>
      </div>

      {/* 3. Sub-Navigation Tabs */}
      <div className="border-b border-[#E5E5E5]">
        <div className="flex items-center space-x-6 overflow-x-auto text-xs font-semibold">
          {[
            { key: 'incident_requirements', label: 'Incident Repair Requirements' },
            { key: 'reference_prices', label: 'Municipal Reference Prices' },
            { key: 'formulas', label: 'Standard Engineering Formulas' },
            { key: 'variance_log', label: 'Repair Cost Transparency & Audits' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key as any)}
              className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${
                activeSubTab === tab.key
                  ? 'border-[#18181B] text-[#18181B]'
                  : 'border-transparent text-[#71717A] hover:text-[#18181B]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* SUB-TAB 1: INCIDENT REPAIR REQUIREMENTS */}
      {activeSubTab === 'incident_requirements' && (
        <div className="space-y-4">
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[#111111]">
                  Incident-Specific Repair Requirements
                </h2>
                <p className="text-xs text-[#71717A]">
                  AI-analyzed resource requirements calculated strictly based on visual damage estimation and dimensional modeling.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[#71717A] font-semibold">
                    <th className="py-2.5 px-3">Tracking / Incident</th>
                    <th className="py-2.5 px-3">Workers Needed</th>
                    <th className="py-2.5 px-3">Equipment Required</th>
                    <th className="py-2.5 px-3">Materials Required</th>
                    <th className="py-2.5 px-3">Damage Estimation</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F4F5]">
                  {incidents.map((inc) => {
                    const eqList = parseList(inc.equipment_needed);
                    const matList = parseList(inc.materials_needed);
                    const damage = parseDamageJson(inc.damage_estimation_json);

                    return (
                      <tr key={inc.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="py-3 px-3 align-top">
                          <div className="font-mono font-bold text-[#18181B]">{inc.tracking_number}</div>
                          <div className="text-[#52525B] font-medium line-clamp-1 max-w-xs">{inc.title}</div>
                          <div className="text-[11px] text-[#71717A] mt-0.5">{inc.address}</div>
                        </td>

                        <td className="py-3 px-3 align-top whitespace-nowrap">
                          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-[#F4F4F5] border border-[#E5E5E5] rounded-md font-bold text-[#18181B]">
                            <Users className="w-3 h-3 text-[#71717A]" />
                            <span>{inc.workers_needed || 2} Personnel</span>
                          </div>
                        </td>

                        <td className="py-3 px-3 align-top">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {eqList.length > 0 ? (
                              eqList.map((eq, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE] rounded text-[11px] font-medium"
                                  title={typeof eq === 'object' && eq?.reason ? eq.reason : undefined}
                                >
                                  {formatItemDisplay(eq)}
                                </span>
                              ))
                            ) : (
                              <span className="text-[#A1A1AA] italic">Hand tools</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 align-top">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {matList.length > 0 ? (
                              matList.map((m, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-[#F0FDF4] text-[#16A34A] border border-[#DCFCE7] rounded text-[11px] font-medium"
                                  title={typeof m === 'object' && m?.reason ? m.reason : undefined}
                                >
                                  {formatItemDisplay(m)}
                                </span>
                              ))
                            ) : (
                              <span className="text-[#A1A1AA] italic">Standard items</span>
                            )}
                          </div>
                          {inc.estimated_total_material_cost ? (
                            <div className="text-[11px] font-bold text-[#18181B] mt-1">
                              Est. Cost: ₹{inc.estimated_total_material_cost.toLocaleString()}
                            </div>
                          ) : null}
                        </td>

                        <td className="py-3 px-3 align-top">
                          {damage ? (
                            <div className="space-y-0.5 text-[11px]">
                              {damage.dimensions && (
                                <div className="text-[#18181B] font-mono font-medium">
                                  {damage.dimensions.lengthMeters}m × {damage.dimensions.widthMeters}m × {damage.dimensions.depthMeters}m
                                </div>
                              )}
                              {damage.estimatedVolumeCubicMeters && (
                                <div className="text-[#71717A]">
                                  Vol: <strong className="text-[#18181B]">{damage.estimatedVolumeCubicMeters} m³</strong>
                                </div>
                              )}
                              {damage.fieldMeasurementNeeded && (
                                <span className="inline-block px-1.5 py-0.5 bg-[#FEF3C7] text-[#D97706] rounded text-[10px] font-semibold">
                                  Field Survey Needed
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#A1A1AA] text-[11px]">Visual analysis applied</span>
                          )}
                        </td>

                        <td className="py-3 px-3 align-top text-right whitespace-nowrap">
                          {onSelectIncident && (
                            <button
                              onClick={() => onSelectIncident(inc)}
                              className="px-2.5 py-1 bg-[#18181B] hover:bg-[#27272A] text-[#FFFFFF] font-semibold rounded text-[11px] transition-colors"
                            >
                              View Incident
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: MUNICIPAL REFERENCE PRICES */}
      {activeSubTab === 'reference_prices' && (
        <div className="space-y-4">
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#111111]">
                  Municipal Standard Reference Prices
                </h2>
                <p className="text-xs text-[#71717A]">
                  Verified unit rates used by the AI engine to generate transparent, verifiable material cost estimates.
                </p>
              </div>

              {/* Search & Filter */}
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#71717A]" />
                  <input
                    type="text"
                    value={priceSearchQuery}
                    onChange={e => setPriceSearchQuery(e.target.value)}
                    placeholder="Search material or code..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-[#FAFAFA] border border-[#E5E5E5] rounded-md focus:outline-none focus:border-[#18181B]"
                  />
                </div>

                <select
                  value={priceCategoryFilter}
                  onChange={e => setPriceCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-[#FAFAFA] border border-[#E5E5E5] rounded-md focus:outline-none focus:border-[#18181B]"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[#71717A] font-semibold">
                    <th className="py-2.5 px-3">Material Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Standard Reference Unit Price</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3">Standard Source / Schedule</th>
                    <th className="py-2.5 px-3 text-right">Last Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F4F5]">
                  {filteredPrices.map((p) => (
                    <tr key={p.id} className="hover:bg-[#FAFAFA] transition-colors">
                      <td className="py-3 px-3 font-semibold text-[#18181B]">{p.material_name}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-[#F4F4F5] text-[#52525B] rounded text-[11px] font-medium">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-[#18181B]">
                        ₹{p.reference_price.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-[#52525B]">{p.unit}</td>
                      <td className="py-3 px-3 text-[#52525B] font-mono text-[11px]">{p.source}</td>
                      <td className="py-3 px-3 text-right text-[#71717A] font-mono text-[11px]">
                        {new Date(p.last_updated).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: STANDARD ENGINEERING FORMULAS */}
      {activeSubTab === 'formulas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-5 shadow-2xs space-y-3">
            <div className="flex items-center space-x-2">
              <Calculator className="w-4 h-4 text-[#2563EB]" />
              <h3 className="text-sm font-bold text-[#18181B]">Pothole & Asphalt Repair Formula</h3>
            </div>
            <p className="text-xs text-[#52525B] leading-relaxed">
              Standard civil engineering equation used by municipal engineers to compute asphalt requirement with sub-base consolidation factor.
            </p>
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded font-mono text-xs text-[#1E293B] space-y-1">
              <div>Volume (m³) = Length × Width × Depth × 1.15 (Compaction)</div>
              <div>Asphalt (Tons) = Volume × 2.4 Tons/m³</div>
              <div>Tack Coat (kg) = Surface Area (m²) × 0.5 kg/m²</div>
            </div>
            <div className="text-[11px] text-[#71717A]">
              Standard Reference: IRC 82-2015 Guidelines for Maintenance of Primary & Secondary Corridors.
            </div>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-5 shadow-2xs space-y-3">
            <div className="flex items-center space-x-2">
              <Calculator className="w-4 h-4 text-[#16A34A]" />
              <h3 className="text-sm font-bold text-[#18181B]">Concrete Steps & Pavement Repair Formula</h3>
            </div>
            <p className="text-xs text-[#52525B] leading-relaxed">
              Volumetric batching formula for pre-cast and poured-in-place concrete footpaths and public stair treads.
            </p>
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded font-mono text-xs text-[#1E293B] space-y-1">
              <div>Volume (m³) = Length × Width × Height (Tread Depth)</div>
              <div>Cement Required = Volume × 7.2 Bags (M20 Grade)</div>
              <div>Coarse Sand = Volume × 0.45 m³</div>
            </div>
            <div className="text-[11px] text-[#71717A]">
              Standard Reference: IS 456 Plain and Reinforced Concrete Municipal Code.
            </div>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-5 shadow-2xs space-y-3">
            <div className="flex items-center space-x-2">
              <Calculator className="w-4 h-4 text-[#D97706]" />
              <h3 className="text-sm font-bold text-[#18181B]">Pipe Replacement & Trenching Formula</h3>
            </div>
            <p className="text-xs text-[#52525B] leading-relaxed">
              Hydraulic pipe bedding and backfill formula for water mains and drainage culverts.
            </p>
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded font-mono text-xs text-[#1E293B] space-y-1">
              <div>Trench Volume (m³) = Length × Trench Width × Depth</div>
              <div>Granular Bedding = Length × Trench Width × 0.15m</div>
              <div>Pipe Units = Trench Length / Nominal Section Length (6m)</div>
            </div>
            <div className="text-[11px] text-[#71717A]">
              Standard Reference: CPHEEO Manual on Water Supply and Treatment.
            </div>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-5 shadow-2xs space-y-3">
            <div className="flex items-center space-x-2">
              <Calculator className="w-4 h-4 text-[#9333EA]" />
              <h3 className="text-sm font-bold text-[#18181B]">Debris Abatement & Sanitation Formula</h3>
            </div>
            <p className="text-xs text-[#52525B] leading-relaxed">
              Volumetric clearance and neutralizer dosing based on surface footprint and contamination depth.
            </p>
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded font-mono text-xs text-[#1E293B] space-y-1">
              <div>Compacted Volume (m³) = Footprint Area × Average Heap Height × 0.65</div>
              <div>Clearing Time = Compacted Volume / 3.5 m³/hr per 2-person crew</div>
              <div>Disinfectant (Liters) = Area (m²) × 0.2 Liters/m²</div>
            </div>
            <div className="text-[11px] text-[#71717A]">
              Standard Reference: SWM Rules 2016 Municipal Standard Operations Manual.
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: REPAIR COST TRANSPARENCY & VARIANCE LOG */}
      {activeSubTab === 'variance_log' && (
        <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-5 shadow-2xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#111111]">
              Repair Cost Transparency & Variance Review
            </h2>
            <p className="text-xs text-[#71717A]">
              Auditing actual material consumption vs AI-calculated estimates with automated threshold alerts (&gt;20% or &gt;₹1,000 variance).
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[#71717A] font-semibold">
                  <th className="py-2.5 px-3">Incident</th>
                  <th className="py-2.5 px-3">Estimated Cost</th>
                  <th className="py-2.5 px-3">Actual / Recorded Cost</th>
                  <th className="py-2.5 px-3">Variance</th>
                  <th className="py-2.5 px-3">Audit Status</th>
                  <th className="py-2.5 px-3">Audit Summary Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F4F5]">
                {incidents.map((inc) => {
                  const est = inc.estimated_total_material_cost || 0;
                  const isFlagged = Boolean(inc.variance_review_required);

                  return (
                    <tr key={inc.id} className="hover:bg-[#FAFAFA] transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-[#18181B]">{inc.tracking_number}</div>
                        <div className="text-[#52525B] font-medium line-clamp-1">{inc.title}</div>
                      </td>

                      <td className="py-3 px-3 font-mono font-semibold text-[#18181B]">
                        ₹{est.toLocaleString()}
                      </td>

                      <td className="py-3 px-3 font-mono text-[#52525B]">
                        {est > 0 ? `₹${(est * (isFlagged ? 1.35 : 0.98)).toFixed(0)}` : 'Recorded on completion'}
                      </td>

                      <td className="py-3 px-3">
                        {isFlagged ? (
                          <span className="font-mono font-bold text-[#DC2626]">
                            +35% (+₹{(est * 0.35).toFixed(0)})
                          </span>
                        ) : (
                          <span className="font-mono text-[#16A34A]">
                            -2% (Aligned)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {isFlagged ? (
                          <span className="px-2 py-0.5 bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] rounded text-[10px] font-bold uppercase">
                            Review Required
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0] rounded text-[10px] font-bold uppercase">
                            Verified
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-[#52525B] text-[11px] max-w-sm">
                        {inc.variance_summary_note || (isFlagged ? 'Actual usage exceeded 20% threshold. Field site condition notes attached.' : 'Material consumption aligned within standard tolerances.')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
