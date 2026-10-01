import React, { useState, useEffect } from 'react';
import {
  Wrench, Users, Truck, AlertTriangle, CheckCircle,
  HardHat, RefreshCw, Layers, ArrowUpRight
} from 'lucide-react';

interface ResourcesPanelProps {
  token: string;
  departmentName?: string;
  departmentCode?: string;
}

export const ResourcesPanel: React.FC<ResourcesPanelProps> = ({
  token,
  departmentName,
  departmentCode
}) => {
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchResources = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/department/resources', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch resources', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchResources();
  }, [token]);

  const handleAction = (actionTitle: string) => {
    setActionNotice(`Action initiated: "${actionTitle}". Dispatch memo generated for Depot Logistics.`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  if (isLoading && !data) {
    return (
      <div className="p-8 text-center text-xs text-[#666666] border border-[#E5E5E5] bg-[#FAFAFA]">
        Loading department resources and equipment availability...
      </div>
    );
  }

  const workforce = data?.workforce || { total: 18, assigned: 12, free: 6, status: 'SHORTAGE: 2 WORKERS' };
  const equipment = data?.equipment || { items: [], totalAvailable: 18, totalInUse: 34, totalMaintenance: 1 };
  const vehicles = data?.vehicles || { items: [], totalAvailable: 4, assigned: 3, free: 1 };
  const materials = data?.materials?.items || [];
  const alerts = data?.alerts || [];

  return (
    <div className="space-y-6 text-[#111111]">
      {/* Header & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E5E5E5]">
        <div>
          <h2 className="text-base font-black uppercase text-[#111111] tracking-tight flex items-center space-x-2">
            <Layers className="w-5 h-5 text-[#111111]" />
            <span>Department Resource & Equipment Command</span>
          </h2>
          <p className="text-xs text-[#666666] mt-0.5">
            Real-time balance of field labour, specialized municipal machinery, fleet vehicles, and raw materials.
          </p>
        </div>
        <button
          onClick={fetchResources}
          className="px-3 py-1.5 bg-[#FAFAFA] border border-[#CCCCCC] hover:bg-[#EBEBEB] text-xs font-mono font-bold flex items-center space-x-1.5 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>REFRESH LOGISTICS</span>
        </button>
      </div>

      {actionNotice && (
        <div className="p-3 bg-[#DCFCE7] border border-[#16A34A] text-[#16A34A] text-xs font-medium flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Section 1: Resource Balance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Workforce Balance */}
        <div className="p-4 bg-[#FFFFFF] border border-[#111111]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-[#666666]">
              Workforce Balance
            </span>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-xs ${
              workforce.status.includes('SHORTAGE') ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#DCFCE7] text-[#16A34A]'
            }`}>
              {workforce.status}
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-3">
            <span className="text-2xl font-black text-[#111111] font-mono">{workforce.total}</span>
            <span className="text-xs text-[#666666]">Total Registered Personnel</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#E5E5E5] text-xs">
            <div>
              <span className="text-[10px] text-[#666666] block">Assigned / In Field</span>
              <span className="font-mono font-bold text-[#111111]">{workforce.assigned} Workers</span>
            </div>
            <div>
              <span className="text-[10px] text-[#666666] block">Free / Standby</span>
              <span className="font-mono font-bold text-[#16A34A]">{workforce.free} Workers</span>
            </div>
          </div>
        </div>

        {/* Equipment Balance */}
        <div className="p-4 bg-[#FFFFFF] border border-[#111111]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-[#666666]">
              Machinery & Equipment
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-[#F3F4F6] text-[#4B5563] rounded-xs">
              DEPOT ASSETS
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-3">
            <span className="text-2xl font-black text-[#111111] font-mono">
              {equipment.totalAvailable + equipment.totalInUse + equipment.totalMaintenance}
            </span>
            <span className="text-xs text-[#666666]">Total Heavy Units</span>
          </div>
          <div className="grid grid-cols-3 gap-1 mt-3 pt-3 border-t border-[#E5E5E5] text-xs">
            <div>
              <span className="text-[10px] text-[#666666] block">Available</span>
              <span className="font-mono font-bold text-[#16A34A]">{equipment.totalAvailable}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#666666] block">In Use</span>
              <span className="font-mono font-bold text-[#D97706]">{equipment.totalInUse}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#666666] block">Maintenance</span>
              <span className="font-mono font-bold text-[#DC2626]">{equipment.totalMaintenance}</span>
            </div>
          </div>
        </div>

        {/* Vehicles Fleet */}
        <div className="p-4 bg-[#FFFFFF] border border-[#111111]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-[#666666]">
              Transport Vehicles
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-[#DCFCE7] text-[#16A34A] rounded-xs">
              FLEET ONLINE
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-3">
            <span className="text-2xl font-black text-[#111111] font-mono">{vehicles.totalAvailable}</span>
            <span className="text-xs text-[#666666]">Motor Pool Units</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#E5E5E5] text-xs">
            <div>
              <span className="text-[10px] text-[#666666] block">Active Dispatches</span>
              <span className="font-mono font-bold text-[#111111]">{vehicles.assigned} Units</span>
            </div>
            <div>
              <span className="text-[10px] text-[#666666] block">Available at Depot</span>
              <span className="font-mono font-bold text-[#16A34A]">{vehicles.free} Units</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Proactive Resource Shortage Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] font-mono flex items-center space-x-1.5">
            <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
            <span>Active Resource Shortage & Deployment Alerts</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {alerts.map((alt: any) => (
              <div
                key={alt.id}
                className="p-3.5 bg-[#FAFAFA] border-l-4 border-l-[#DC2626] border border-[#E5E5E5] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-[#DC2626]">
                      {alt.severity} PRIORITY
                    </span>
                    <span className="text-[10px] font-mono text-[#666666]">
                      {alt.type}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#111111] mt-1">
                    {alt.title}
                  </h4>
                  <p className="text-[11px] text-[#555555] mt-1 leading-relaxed">
                    {alt.message}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-[#E5E5E5]">
                  <button
                    onClick={() => handleAction(alt.action)}
                    className="w-full py-1.5 bg-[#FFFFFF] border border-[#111111] hover:bg-[#111111] hover:text-[#FFFFFF] text-[#111111] text-[11px] font-mono font-bold transition-colors inline-flex items-center justify-center space-x-1"
                  >
                    <span>{alt.action}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Equipment Availability Table */}
      <div className="border border-[#111111] bg-[#FFFFFF]">
        <div className="p-3 bg-[#FAFAFA] border-b border-[#E5E5E5] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HardHat className="w-4 h-4 text-[#111111]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] font-mono">
              Specialized Machinery & Equipment Availability
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[#666666]">
            Inventory Standard EN-1436
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E5E5E5] bg-[#F5F5F5] text-[10px] font-mono uppercase text-[#666666]">
                <th className="p-3">Resource / Machine</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-center">Required (Std)</th>
                <th className="p-3 text-center">Available</th>
                <th className="p-3 text-center">In Use</th>
                <th className="p-3 text-center">Maintenance</th>
                <th className="p-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {equipment.items.map((eq: any) => (
                <tr key={eq.id} className="hover:bg-[#FAFAFA] transition-colors">
                  <td className="p-3 font-semibold text-[#111111]">{eq.name}</td>
                  <td className="p-3 text-[#666666]">{eq.category}</td>
                  <td className="p-3 text-center font-mono">{eq.required}</td>
                  <td className="p-3 text-center font-mono font-bold text-[#16A34A]">{eq.available}</td>
                  <td className="p-3 text-center font-mono text-[#D97706]">{eq.inUse}</td>
                  <td className="p-3 text-center font-mono text-[#DC2626]">{eq.maintenance}</td>
                  <td className="p-3 text-right">
                    <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-xs ${
                      eq.status === 'Available' ? 'bg-[#DCFCE7] text-[#16A34A] border border-[#16A34A]' : 'bg-[#FEE2E2] text-[#DC2626] border border-[#DC2626]'
                    }`}>
                      {eq.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 4: Consumable Materials & Vehicles Fleet */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Materials Stock */}
        <div className="border border-[#E5E5E5] bg-[#FFFFFF] p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] font-mono">
              Consumable Materials Inventory
            </h3>
            <span className="text-[10px] font-mono text-[#666666]">Stock Thresholds</span>
          </div>

          <div className="space-y-3">
            {materials.map((mat: any) => (
              <div key={mat.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#111111]">{mat.name}</span>
                  <div className="flex items-center space-x-2 font-mono">
                    <span className={`font-bold ${mat.status === 'LOW' ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}>
                      {mat.stockPct}%
                    </span>
                    <span className="text-[10px] text-[#666666]">({mat.unit})</span>
                  </div>
                </div>
                <div className="w-full bg-[#EBEBEB] h-2 rounded-none overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      mat.status === 'LOW' ? 'bg-[#DC2626]' : 'bg-[#111111]'
                    }`}
                    style={{ width: `${mat.stockPct}%` }}
                  />
                </div>
                {mat.status === 'LOW' && (
                  <span className="text-[10px] text-[#DC2626] font-mono font-bold block">
                    CRITICAL: Below reserve threshold ({mat.thresholdPct}%). Replenishment required.
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Vehicles Fleet */}
        <div className="border border-[#E5E5E5] bg-[#FFFFFF] p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] font-mono">
              Depot Vehicle Fleet Roster
            </h3>
            <span className="text-[10px] font-mono text-[#666666]">Motor Pool Status</span>
          </div>

          <div className="space-y-2">
            {vehicles.items.map((veh: any) => (
              <div
                key={veh.id}
                className="p-2.5 bg-[#FAFAFA] border border-[#EBEBEB] flex items-center justify-between"
              >
                <div className="flex items-center space-x-2.5">
                  <Truck className="w-4 h-4 text-[#666666]" />
                  <div>
                    <span className="text-xs font-bold text-[#111111] block">{veh.name}</span>
                    <span className="text-[10px] text-[#666666]">{veh.type} &bull; Driver: {veh.driver}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-xs ${
                  veh.status === 'Available' ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#F3F4F6] text-[#4B5563]'
                }`}>
                  {veh.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
