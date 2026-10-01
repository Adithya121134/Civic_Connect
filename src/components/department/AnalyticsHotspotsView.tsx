import React, { useState } from 'react';
import {
  Calendar, Flame, TrendingUp, Clock, CheckCircle2,
  AlertTriangle, MapPin, ChevronRight, BarChart3, Layers
} from 'lucide-react';
import { GoogleMap, MarkerData } from '../maps/GoogleMap';

interface AnalyticsHotspotsViewProps {
  departmentName?: string;
  onSelectHotspotWard?: (ward: string) => void;
}

export const AnalyticsHotspotsView: React.FC<AnalyticsHotspotsViewProps> = ({
  departmentName = 'Roads',
  onSelectHotspotWard,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'hotspots' | 'trends' | 'recurring' | 'performance'>('hotspots');

  // Hotspots data matching reference image Panel 6
  const topHotspots = [
    {
      id: 'h1',
      location: 'Ward 04 - Main Road',
      detail: '18 Incidents, 3 critical',
      badge: 'High',
      badgeColor: 'bg-[#FFEDD5] text-[#EA580C]',
      lat: 11.0168,
      lng: 76.9558,
      radius: 400
    },
    {
      id: 'h2',
      location: 'Ward 02 - 5th Street',
      detail: '12 Incidents, 2 critical',
      badge: 'High',
      badgeColor: 'bg-[#FFEDD5] text-[#EA580C]',
      lat: 11.025,
      lng: 76.948,
      radius: 350
    },
    {
      id: 'h3',
      location: 'Ward 07 - Lake Road',
      detail: '8 Incidents, 1 critical',
      badge: 'Medium',
      badgeColor: 'bg-[#FEF3C7] text-[#D97706]',
      lat: 11.031,
      lng: 76.971,
      radius: 280
    },
    {
      id: 'h4',
      location: 'Ward 01 - Market Street',
      detail: '6 Incidents, 0 critical',
      badge: 'Medium',
      badgeColor: 'bg-[#FEF3C7] text-[#D97706]',
      lat: 11.008,
      lng: 76.959,
      radius: 220
    }
  ];

  const mapMarkers: MarkerData[] = topHotspots.map(h => ({
    id: h.id,
    lat: h.lat,
    lng: h.lng,
    title: `${h.location} (${h.detail})`,
    color: h.badge === 'High' ? '#EA580C' : '#D97706'
  }));

  return (
    <div className="space-y-6">
      {/* 1. Header (Reference Image Panel 6) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight">
            {departmentName} Analytics
          </h1>
          <p className="text-xs sm:text-sm text-[#71717A] mt-0.5">
            Insights and trends for road-related incidents.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-[#FFFFFF] border border-[#E5E5E5] px-3 py-1.5 rounded-md text-xs text-[#71717A] shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-[#71717A]" />
          <span className="font-medium text-[#18181B]">Nov 01, 2025 &rarr; Nov 16, 2025</span>
        </div>
      </div>

      {/* 2. 4 Top KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-4 shadow-2xs">
          <div className="text-2xl sm:text-3xl font-bold text-[#111111] tracking-tight">
            128
          </div>
          <div className="text-xs font-medium text-[#71717A] mt-1">
            Total Incidents
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-4 shadow-2xs">
          <div className="text-2xl sm:text-3xl font-bold text-[#16A34A] tracking-tight">
            24
          </div>
          <div className="text-xs font-medium text-[#71717A] mt-1">
            Resolved
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-4 shadow-2xs">
          <div className="text-2xl sm:text-3xl font-bold text-[#2563EB] tracking-tight">
            6.5h
          </div>
          <div className="text-xs font-medium text-[#71717A] mt-1">
            Avg. Resolution Time
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-4 shadow-2xs">
          <div className="text-2xl sm:text-3xl font-bold text-[#111111] tracking-tight">
            92%
          </div>
          <div className="text-xs font-medium text-[#71717A] mt-1">
            SLA Compliance
          </div>
        </div>
      </div>

      {/* 3. Sub-Navigation Tabs */}
      <div className="border-b border-[#E5E5E5]">
        <div className="flex items-center space-x-6 overflow-x-auto text-xs font-semibold">
          {[
            { key: 'hotspots', label: 'Hotspots' },
            { key: 'trends', label: 'Incident Trends' },
            { key: 'recurring', label: 'Recurring Issues' },
            { key: 'performance', label: 'Department Performance' },
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

      {/* 4. Tab Content: HOTSPOTS (Reference Image Panel 6) */}
      {activeSubTab === 'hotspots' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Civic Hotspots Map */}
          <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#111111]">
                Civic Hotspots ({departmentName})
              </h2>
              <span className="text-xs text-[#71717A]">
                Cluster Density (500m radius)
              </span>
            </div>

            <div className="h-[360px] rounded-md overflow-hidden border border-[#E5E5E5] relative">
              <GoogleMap
                center={{ lat: 11.0168, lng: 76.9558 }}
                zoom={13}
                markers={mapMarkers}
                className="h-full w-full"
              />
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-[#71717A]">
              <span>Hotspot detection based on 30-day spatial density</span>
              <span className="font-semibold text-[#18181B]">4 High-Frequency Nodes</span>
            </div>
          </div>

          {/* Right Column: Top Hotspots Card */}
          <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-4 shadow-2xs space-y-3">
            <h2 className="text-sm font-bold text-[#111111]">
              Top Hotspots
            </h2>

            <div className="space-y-3 divide-y divide-[#F4F4F5]">
              {topHotspots.map((h) => (
                <div
                  key={h.id}
                  onClick={() => onSelectHotspotWard?.(h.location)}
                  className="pt-3 first:pt-0 flex items-center justify-between cursor-pointer hover:bg-[#FAFAFA] p-2 rounded-md transition-colors"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-xs text-[#18181B]">
                      {h.location}
                    </div>
                    <div className="text-[11px] text-[#71717A]">
                      {h.detail}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${h.badgeColor}`}>
                      {h.badge}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#A1A1AA]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: INCIDENT TRENDS */}
      {activeSubTab === 'trends' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-[#111111]">Daily Incident Intake & Velocity</h2>
            <div className="h-48 flex items-end justify-between gap-2 pt-6">
              {[12, 18, 14, 22, 19, 28, 24, 15, 18, 26, 31, 20, 16, 22].map((val, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-mono text-[#71717A]">{val}</span>
                  <div
                    className="w-full bg-[#18181B] rounded-t-xs hover:bg-[#52525B] transition-colors"
                    style={{ height: `${(val / 35) * 140}px` }}
                  />
                  <span className="text-[9px] font-mono text-[#A1A1AA]">{idx + 1}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-[#71717A] border-t border-[#F4F4F5] pt-2">
              <span>Nov 1 &rarr; Nov 14</span>
              <span className="font-semibold text-[#18181B]">Average: 20.4 incidents/day</span>
            </div>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-[#111111]">Incident Classification Breakdown</h2>
            <div className="space-y-3 py-2 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-[#18181B]">Potholes & Asphalt Degradation</span>
                  <span className="font-bold text-[#18181B]">54% (69)</span>
                </div>
                <div className="w-full h-2 bg-[#F4F4F5] rounded-full overflow-hidden">
                  <div className="h-full bg-[#18181B] rounded-full" style={{ width: '54%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-[#18181B]">Footpath & Curb Damage</span>
                  <span className="font-bold text-[#18181B]">22% (28)</span>
                </div>
                <div className="w-full h-2 bg-[#F4F4F5] rounded-full overflow-hidden">
                  <div className="h-full bg-[#18181B] rounded-full" style={{ width: '22%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-[#18181B]">Drainage Grating & Manholes</span>
                  <span className="font-bold text-[#18181B]">16% (20)</span>
                </div>
                <div className="w-full h-2 bg-[#F4F4F5] rounded-full overflow-hidden">
                  <div className="h-full bg-[#18181B] rounded-full" style={{ width: '16%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-[#18181B]">Traffic Signage & Markings</span>
                  <span className="font-bold text-[#18181B]">8% (11)</span>
                </div>
                <div className="w-full h-2 bg-[#F4F4F5] rounded-full overflow-hidden">
                  <div className="h-full bg-[#18181B] rounded-full" style={{ width: '8%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: RECURRING ISSUES */}
      {activeSubTab === 'recurring' && (
        <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-5 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-[#111111]">Pattern Detection: Recurring Civic Incidents</h2>
          <div className="divide-y divide-[#F4F4F5] text-xs">
            <div className="py-3 flex items-start justify-between">
              <div className="space-y-1">
                <div className="font-bold text-[#18181B]">Repeated Pothole Formation at Main Road Junction</div>
                <div className="text-[11px] text-[#71717A]">4 incidents reported in past 60 days within 30-meter radius</div>
                <div className="text-[11px] text-[#DC2626] font-medium">Root Cause: Subsurface water leak from adjacent municipal line saturating road base</div>
              </div>
              <span className="px-2.5 py-1 bg-[#FEE2E2] text-[#DC2626] rounded-md font-semibold text-[11px]">
                Requires Cross-Dept Action
              </span>
            </div>

            <div className="py-3 flex items-start justify-between">
              <div className="space-y-1">
                <div className="font-bold text-[#18181B]">Manhole Cover Displacement near Sector 2 Market</div>
                <div className="text-[11px] text-[#71717A]">3 incidents reported following heavy vehicle deliveries</div>
                <div className="text-[11px] text-[#EA580C] font-medium">Root Cause: Frame collar wear under heavy axle loading</div>
              </div>
              <span className="px-2.5 py-1 bg-[#FFEDD5] text-[#EA580C] rounded-md font-semibold text-[11px]">
                Heavy-Duty Frame Upgrade Recommended
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: DEPARTMENT PERFORMANCE */}
      {activeSubTab === 'performance' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-4 shadow-2xs">
            <span className="text-[11px] font-mono text-[#71717A] uppercase block">Road Maintenance A</span>
            <span className="text-2xl font-bold text-[#18181B] mt-1 block">4.8h Avg</span>
            <span className="text-[11px] text-[#16A34A] font-semibold mt-1 block">96% SLA Adherence</span>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-4 shadow-2xs">
            <span className="text-[11px] font-mono text-[#71717A] uppercase block">Road Maintenance B</span>
            <span className="text-2xl font-bold text-[#18181B] mt-1 block">6.2h Avg</span>
            <span className="text-[11px] text-[#16A34A] font-semibold mt-1 block">91% SLA Adherence</span>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg p-4 shadow-2xs">
            <span className="text-[11px] font-mono text-[#71717A] uppercase block">Road Maintenance C</span>
            <span className="text-2xl font-bold text-[#18181B] mt-1 block">8.5h Avg</span>
            <span className="text-[11px] text-[#D97706] font-semibold mt-1 block">84% SLA Adherence</span>
          </div>
        </div>
      )}
    </div>
  );
};
