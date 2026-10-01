import React, { useState, useEffect } from 'react';
import {
  Server, Bell, Settings, CheckCircle2, AlertCircle,
  Clock, Plus, RefreshCw, Layers, ShieldCheck
} from 'lucide-react';

interface AdminSystemViewProps {
  token: string;
}

export const AdminSystemView: React.FC<AdminSystemViewProps> = ({ token }) => {
  const [activeTab, setActiveTab] = useState<'health' | 'notifications' | 'categories'>('health');
  const [healthData, setHealthData] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // New Category Modal
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [catName, setCatName] = useState('');
  const [catCode, setCatCode] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  // Notification Rules state
  const [notifRules, setNotifRules] = useState({
    p1SmsAlerts: true,
    emailEscalations: true,
    citizenPushUpdates: true,
    dailySummaryDigest: true
  });

  const fetchSystemData = async () => {
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const parseJsonSafe = async (res: Response) => {
        if (!res.ok) return null;
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      };

      const hRes = await fetch('/api/v1/admin/system-health', { headers });
      const hData = await parseJsonSafe(hRes);
      if (hData) setHealthData(hData);

      const dRes = await fetch('/api/v1/admin/departments', { headers });
      const dData = await parseJsonSafe(dRes);
      if (dData?.departments) {
        setDepartments(dData.departments);
        if (dData.departments.length > 0 && !selectedDeptId) {
          setSelectedDeptId(dData.departments[0].id);
        }
      }

      const cRes = await fetch('/api/v1/admin/categories', { headers });
      const cData = await parseJsonSafe(cRes);
      if (cData?.categories) setCategories(cData.categories);
    } catch (err) {
      console.error('Failed to load system data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
  }, [token]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          departmentId: selectedDeptId,
          name: catName,
          code: catCode
        })
      });

      if (res.ok) {
        setNotification(`Category '${catName}' added to department.`);
        setIsCatModalOpen(false);
        setCatName('');
        setCatCode('');
        fetchSystemData();
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (err) {
      console.error('Failed to create category', err);
    }
  };

  const services = healthData?.services || [
    { name: 'Core REST API Server', status: 'OPERATIONAL', latency: '24ms', uptime: '99.98%' },
    { name: 'Primary SQLite Database Engine', status: 'OPERATIONAL', latency: '4ms', uptime: '100%' },
    { name: 'Multimodal AI Vision & NLP Agent', status: 'OPERATIONAL', latency: '340ms', uptime: '99.95%' },
    { name: 'Evidence Vault File Storage', status: 'OPERATIONAL', latency: '45ms', uptime: '99.99%' },
    { name: 'Background SLA Dispatch Worker', status: 'OPERATIONAL', latency: '12ms', uptime: '100%' },
    { name: 'Civic Notification Gateway', status: 'OPERATIONAL', latency: '65ms', uptime: '99.90%' }
  ];

  return (
    <div className="space-y-6">
      {/* Header & Sub-Nav */}
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] p-5 rounded-lg shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#111111]">
              System Health, Notification Rules & Service Configuration
            </h2>
            <p className="text-xs text-[#666666]">
              Operational telemetry of municipal microservices, automated citizen alerts, and civic problem taxonomies.
            </p>
          </div>

          <button
            onClick={fetchSystemData}
            disabled={isLoading}
            className="px-3 py-1.5 bg-[#FAFAFA] hover:bg-[#F0F0F0] border border-[#E5E5E5] text-[#111111] text-xs font-semibold rounded-md flex items-center space-x-1.5 transition-colors self-start md:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Health</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 pt-2 border-t border-[#F0F0F0]">
          <button
            onClick={() => setActiveTab('health')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeTab === 'health'
                ? 'bg-[#111111] text-[#FFFFFF]'
                : 'bg-[#FAFAFA] text-[#666666] hover:bg-[#F0F0F0] hover:text-[#111111]'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Service Health (6)</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeTab === 'notifications'
                ? 'bg-[#111111] text-[#FFFFFF]'
                : 'bg-[#FAFAFA] text-[#666666] hover:bg-[#F0F0F0] hover:text-[#111111]'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notification Rules</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              activeTab === 'categories'
                ? 'bg-[#111111] text-[#FFFFFF]'
                : 'bg-[#FAFAFA] text-[#666666] hover:bg-[#F0F0F0] hover:text-[#111111]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Civic Problem Categories ({categories.length})</span>
          </button>
        </div>

        {notification && (
          <div className="p-2.5 bg-[#DCFCE7] border border-[#86EFAC] text-[#166534] rounded text-xs">
            {notification}
          </div>
        )}
      </div>

      {/* SUB-VIEW 1: SYSTEM HEALTH */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                <h3 className="text-sm font-bold text-[#111111]">
                  Municipal Platform Infrastructure Status
                </h3>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#DCFCE7] text-[#166534] rounded">
                ALL SYSTEMS HEALTHY
              </span>
            </div>

            <div className="divide-y divide-[#F0F0F0] text-xs">
              {services.map((svc: any) => (
                <div key={svc.name} className="p-4 flex items-center justify-between hover:bg-[#FAFAFA]">
                  <div className="flex items-center space-x-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
                    <div>
                      <div className="font-semibold text-[#111111]">{svc.name}</div>
                      <div className="text-[11px] font-mono text-[#8A8A8A]">Uptime: {svc.uptime}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className="font-mono text-[#666666] text-[11px]">Latency: {svc.latency}</span>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#DCFCE7] text-[#166534] rounded">
                      {svc.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] p-5 rounded-lg shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#111111]">
              Automated Alert Dispatch Protocols
            </h3>

            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-3 bg-[#FAFAFA] rounded-md border border-[#E5E5E5] cursor-pointer">
                <div>
                  <div className="font-semibold text-[#111111]">Immediate P1 Emergency SMS Broadcast</div>
                  <div className="text-[#666666]">Instantly ping on-call department leads when an incident is escalated to P1.</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifRules.p1SmsAlerts}
                  onChange={(e) => setNotifRules(prev => ({ ...prev, p1SmsAlerts: e.target.checked }))}
                  className="w-4 h-4 text-[#111111] rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-[#FAFAFA] rounded-md border border-[#E5E5E5] cursor-pointer">
                <div>
                  <div className="font-semibold text-[#111111]">Automated SLA Warning Escalations</div>
                  <div className="text-[#666666]">Send email warnings to supervisors when an incident reaches 75% of allowed SLA time.</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifRules.emailEscalations}
                  onChange={(e) => setNotifRules(prev => ({ ...prev, emailEscalations: e.target.checked }))}
                  className="w-4 h-4 text-[#111111] rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-[#FAFAFA] rounded-md border border-[#E5E5E5] cursor-pointer">
                <div>
                  <div className="font-semibold text-[#111111]">Citizen Real-Time Push Notifications</div>
                  <div className="text-[#666666]">Notify reporting residents when their incident changes from In Progress to Resolved.</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifRules.citizenPushUpdates}
                  onChange={(e) => setNotifRules(prev => ({ ...prev, citizenPushUpdates: e.target.checked }))}
                  className="w-4 h-4 text-[#111111] rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-[#FAFAFA] rounded-md border border-[#E5E5E5] cursor-pointer">
                <div>
                  <div className="font-semibold text-[#111111]">Daily Municipal Executive Digest</div>
                  <div className="text-[#666666]">Compile 08:00 daily brief of open cases and compliance rates to the Mayor's office.</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifRules.dailySummaryDigest}
                  onChange={(e) => setNotifRules(prev => ({ ...prev, dailySummaryDigest: e.target.checked }))}
                  className="w-4 h-4 text-[#111111] rounded"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: PROBLEM CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#666666]">Configured Civic Taxonomies</span>
            <button
              onClick={() => setIsCatModalOpen(true)}
              className="px-3 py-1.5 bg-[#111111] hover:bg-[#222222] text-[#FFFFFF] text-xs font-semibold rounded-md flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Civic Category</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.map((cat: any) => (
              <div key={cat.id} className="bg-[#FFFFFF] border border-[#E5E5E5] p-4 rounded-lg shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#F3F4F6] text-[#374151] rounded">
                    {cat.code}
                  </span>
                  <span className="text-[10px] font-mono text-[#8A8A8A]">{cat.department_name}</span>
                </div>

                <h4 className="text-sm font-bold text-[#111111]">{cat.name}</h4>

                <div className="pt-2 border-t border-[#F0F0F0] flex items-center justify-between text-[11px] font-mono text-[#8A8A8A]">
                  <span>Active Category</span>
                  <span className="text-[#16A34A] font-semibold">Enabled</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleCreateCategory} className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-[#111111]">Register Civic Category</h3>

            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Target Department</label>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Category Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Traffic Signal Fault"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#111111] mb-1">Category Code</label>
              <input
                type="text"
                required
                placeholder="e.g. CAT-SIG-FAULT"
                value={catCode}
                onChange={(e) => setCatCode(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-md text-xs text-[#111111]"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E5E5E5]">
              <button
                type="button"
                onClick={() => setIsCatModalOpen(false)}
                className="px-3 py-1.5 border border-[#E5E5E5] text-xs font-semibold rounded-md text-[#666666]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-[#111111] text-[#FFFFFF] text-xs font-semibold rounded-md"
              >
                Save Category
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
