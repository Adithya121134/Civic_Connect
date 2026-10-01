export interface CivicIncidentMapItem {
  id: string;
  trackingNumber: string;
  title: string;
  description?: string;
  status: string;
  category: string;
  priority: string;
  severity: string;
  latitude: number;
  longitude: number;
  address: string;
  wardCode?: string;
  departmentId?: string;
  departmentName?: string;
  departmentCode?: string;
  createdAt?: string;
  slaDeadline?: string;
  isSlaBreached?: boolean;
  assignedWorkerName?: string;
  assignedTeamName?: string;
  resolutionNotes?: string;
}

export interface MapFilterState {
  searchQuery: string;
  issueType: string;
  priority: string;
  status: string;
  departmentId?: string;
  wardCode?: string;
}

export type PortalMapMode = 'department' | 'resident' | 'admin';
