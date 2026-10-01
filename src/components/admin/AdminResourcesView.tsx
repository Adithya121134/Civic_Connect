import React, { useState, useEffect } from 'react';
import {
  Wrench, Truck, Package, Users, AlertTriangle,
  ArrowRightLeft, Plus, RefreshCw, CheckCircle2
} from 'lucide-react';

interface AdminResourcesViewProps {
  token: string;
}

export const AdminResourcesView: React.FC<AdminResourcesViewProps> = ({ token }) => {
  const [data, setData] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Transfer modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [fromDeptId, setFromDeptId] = useState('');
  const [toDeptId, setToDeptId] = useState('');
  const [resourceType, setResourceType] = useState('EQUIPMENT');
  const [resourceId, setResourceId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [transferReason, setTransferReason] = useState('');

  const [notification, setNotification] = useState<string | null>(null);

  const fetchResources = async () => {
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch('/api/v1/admin/resources', { headers });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }

      const dRes = await fetch('/api/v1/admin/departments', { headers });
      if (dRes.ok) {
        const dJson = await dRes.json();
        setDepartments(dJson.departments || []);
        if (dJson.departments?.length > 1) {
          setFromDeptId(dJson.departments[0].id);
          setToDeptId(dJson.departments[1].id);
        }
      }
    } catch (err) {
      console.error('Failed to load resources', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [token]);

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/admin/resources/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fromDepartmentId: fromDeptId,
          toDepartmentId: toDeptId,
          resourceType,
          resourceId: resourceId || 'RES-GEN-01',
          quantity: parseInt(quantity) || 1,
          reason: transferReason || 'Emergency inter-departmental mutual aid reallocation'
        })
      });

      if (res.ok) {
        setNotification('Inter-departmental resource transfer authorized and logged.');
        setIsTransferModalOpen(false);
        setTransferReason('');
        fetchResources();
        setTimeout(() => setNotification(null), 4000);
      }
    } catch (err) {
      console.error('Failed to transfer resource', err);
    }
  };

  const equipment = data?.equipment || [];
  const vehicles = data?.vehicles || [];
  const materials = data?.materials || [];
  const workforce = data?.workforce || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] p-5 rounded-lg shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#111111]">
            City-Wide Resource Governance & Mutual Aid
          </h2>
          <p className="text-xs text-[#666666] mt-0.5">
            Monitor equipment readiness, municipal fleet vehicles, material stockpiles, and authorize inter-departmental transfers.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchResources}
            disabled={isLoading}
            className="px-3 py-1.5 bg-[#FAFAFA] hover:bg-[#F0F0F0] border border-[#E5E5E5] text-[#111111] text-xs font-semibold rounded-md flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="px-3.5 py-1.5 bg-[#111111] hover:bg-[#222222] text-[#FFFFFF] text-xs font-semibold rounded-md flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Authorize Resource Transfer</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-[#DCFCE7] border border-[#86EFAC] text-[#166534] rounded-lg text-xs font-medium">
          {notification}
        </div>
      )}

      {/* Workforce Readiness Breakdown */}
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] p-5 rounded-lg shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-[#111111]" />
            <h3 className="text-sm font-bold text-[#111111]">Municipal Workforce Distribution</h3>
          </div>
          <span className="text-[11px] font-mono text-[#8A8A8A]">Active Personnel on Duty</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {workforce.map((w: any) => (
            <div key={w.department} className="p-3 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg">
              <span className="text-[10px] font-mono uppercase text-[#8A8A8A] block truncate">{w.department}</span>
              <div className="text-xl font-bold text-[#111111] mt-1">{w.active_personnel} Staff</div>
              <div className="text-[10px] text-[#16A34A] font-semibold mt-0.5">Active &bull; {w.teams_count} Teams</div>
            </div>
          ))}
        </div>
      </div>

      {/* Heavy Equipment & Vehicles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Heavy Equipment */}
        <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Wrench className="w-4 h-4 text-[#111111]" />
              <h3 className="text-sm font-bold text-[#111111]">Operational Heavy Machinery</h3>
            </div>
            <span className="text-[11px] font-mono text-[#8A8A8A]">{equipment.length} Units Tracked</span>
          </div>

          <div className="divide-y divide-[#F0F0F0] text-xs">
            {equipment.map((eq: any) => (
              <div key={eq.id} className="p-3.5 flex items-center justify-between hover:bg-[#FAFAFA]">
                <div>
                  <div className="font-semibold text-[#111111]">{eq.name}</div>
                  <div className="text-[11px] font-mono text-[#8A8A8A]">
                    {eq.department} &bull; ID: {eq.id}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                    eq.status === 'AVAILABLE' ? 'bg-[#DCFCE7] text-[#166534]' :
                    eq.status === 'IN_USE' ? 'bg-[#EFF6FF] text-[#1E40AF]' :
                    'bg-[#FEF3C7] text-[#92400E]'
                  }`}>
                    {eq.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fleet Vehicles */}
        <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Truck className="w-4 h-4 text-[#111111]" />
              <h3 className="text-sm font-bold text-[#111111]">Municipal Fleet Readiness</h3>
            </div>
            <span className="text-[11px] font-mono text-[#8A8A8A]">{vehicles.length} Units Tracked</span>
          </div>

          <div className="divide-y divide-[#F0F0F0] text-xs">
            {vehicles.map((v: any) => (
              <div key={v.id} className="p-3.5 flex items-center justify-between hover:bg-[#FAFAFA]">
                <div>
                  <div className="font-semibold text-[#111111]">{v.model} ({v.type})</div>
                  <div className="text-[11px] font-mono text-[#8A8A8A]">
                    {v.department} &bull; Plate: {v.license_plate}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                    v.status === 'IN_SERVICE' ? 'bg-[#DCFCE7] text-[#166534]' :
                    v.status === 'DISPATCHED' ? 'bg-[#EFF6FF] text-[#1E40AF]' :
                    'bg-[#FEF3C7] text-[#92400E]'
                  }`}>
                    {v.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Materials Inventory & Low Stock Alerts */}
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="w-4 h-4 text-[#111111]" />
            <h3 className="text-sm font-bold text-[#111111]">Materials & Supplies Inventory</h3>
          </div>
          <span className="text-[11px] font-mono text-[#8A8A8A]">Automated Threshold Auditing</span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[11px] font-mono uppercase text-[#666666]">
            <tr>
              <th className="py-3 px-4">Material Name</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4 text-center">In Stock</th>
              <th className="py-3 px-4 text-center">Low Threshold</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {materials.map((m: any) => {
              const isLow = m.quantity <= m.threshold;
              return (
                <tr key={m.id} className="hover:bg-[#FAFAFA]">
                  <td className="py-3 px-4 font-semibold text-[#111111]">{m.name}</td>
                  <td className="py-3 px-4 font-mono text-[#666666]">{m.department}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-[#111111]">
                    {m.quantity} {m.unit}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-[#8A8A8A]">
                    {m.threshold} {m.unit}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {isLow ? (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#FEF2F2] text-[#DC2626] rounded border border-[#FCA5A5] inline-flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>LOW STOCK</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#DCFCE7] text-[#166534] rounded">
                        SUFFICIENT
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleExecuteTransfer} className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-[#111111]">Inter-Department Resource Transfer</h3>
            <p className="text-xs text-[#666666]">
              Authorize emergency mutual aid reallocation of vehicles, heavy machinery, or stockpiled supplies.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">Source Department</label>
                <select
                  value={fromDeptId}
                  onChange={(e) => setFromDeptId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">Target Department</label>
                <select
                  value={toDeptId}
                  onChange={(e) => setToDeptId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Resource Category</label>
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
              >
                <option value="EQUIPMENT">Heavy Equipment</option>
                <option value="VEHICLE">Fleet Vehicle</option>
                <option value="MATERIALS">Raw Materials / Supplies</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">Resource / Model Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Asph. Roller #02"
                  value={resourceId}
                  onChange={(e) => setResourceId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Authorization Justification</label>
              <textarea
                rows={2}
                placeholder="e.g. Ward 04 storm drainage emergency reinforcement"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                className="w-full p-2.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E5E5E5]">
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="px-3 py-1.5 border border-[#E5E5E5] text-xs font-semibold rounded-md text-[#666666]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-[#111111] text-[#FFFFFF] text-xs font-semibold rounded-md hover:bg-[#222222]"
              >
                Confirm Mutual Aid Transfer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
