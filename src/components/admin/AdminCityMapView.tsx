import React from 'react';
import { IncidentMapExplorer } from '../maps/IncidentMapExplorer';

interface AdminCityMapViewProps {
  token: string;
  onNavigateToIncident?: (incidentId: string) => void;
}

export const AdminCityMapView: React.FC<AdminCityMapViewProps> = ({ token, onNavigateToIncident }) => {
  return (
    <IncidentMapExplorer
      token={token}
      mode="admin"
      title="City-Wide Geospatial Operations Map"
      subtitle="Spatial distribution, critical incident clusters, and departmental jurisdiction mapping across all municipal wards."
      onViewIncidentDetail={(incidentId) => {
        if (onNavigateToIncident) {
          onNavigateToIncident(incidentId);
        }
      }}
    />
  );
};
