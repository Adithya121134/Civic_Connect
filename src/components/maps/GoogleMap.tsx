import React, { useEffect, useRef, useState, useMemo } from 'react';
import { loadGoogleMaps, civicMapStyle } from '../../lib/googleMapsLoader';
import { Loader2, MapPin, Navigation, ZoomIn, ZoomOut, Layers, AlertTriangle, CheckCircle2, ChevronRight, X } from 'lucide-react';

export interface MarkerData {
  id: string;
  lat: number;
  lng: number;
  title: string;
  category?: string;
  priority?: string;
  severity?: string;
  status?: string;
  address?: string;
  wardCode?: string;
  departmentCode?: string;
  departmentName?: string;
  color?: string;
  incident?: any;
  onClick?: () => void;
}

interface GoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: MarkerData[];
  selectedMarkerId?: string | null;
  onMarkerClick?: (marker: MarkerData) => void;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  interactive?: boolean;
  className?: string;
  showHeatmap?: boolean;
  height?: string;
  autoFitBounds?: boolean;
  onViewIncidentDetail?: (incidentId: string) => void;
  route?: {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
  } | null;
  hotspots?: Array<{ lat: number; lng: number; intensity: number; label: string }>;
}

export const GoogleMap: React.FC<GoogleMapProps> = ({
  center = { lat: 11.0168, lng: 76.9558 },
  zoom = 13,
  markers = [],
  selectedMarkerId = null,
  onMarkerClick,
  onMapClick,
  interactive = true,
  className = '',
  height = '100%',
  autoFitBounds = true,
  onViewIncidentDetail,
  route = null,
  hotspots = []
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const infoWindowRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const circlesRef = useRef<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [useFallbackCanvas, setUseFallbackCanvas] = useState(false);

  // Fallback vector map state
  const [vectorZoom, setVectorZoom] = useState(zoom);
  const [vectorCenter, setVectorCenter] = useState(center);

  // Filter valid markers
  const validMarkers = useMemo(() => {
    return markers.filter((m) => {
      const lat = Number(m.lat);
      const lng = Number(m.lng);
      return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    });
  }, [markers]);

  // Compute severity color
  const getMarkerColor = (m: MarkerData): string => {
    if (m.color) return m.color;
    const prio = (m.priority || m.severity || '').toUpperCase();
    if (prio.includes('CRITICAL') || prio === 'P1_CRITICAL' || prio === 'P1') return '#DC2626'; // Red
    if (prio.includes('HIGH') || prio === 'P2_HIGH' || prio === 'P2') return '#EA580C'; // Orange
    if (prio.includes('MEDIUM') || prio === 'P3_STANDARD' || prio === 'P3') return '#D97706'; // Amber
    if (prio.includes('LOW') || prio === 'P4_LOW' || prio === 'P4') return '#16A34A'; // Green
    if (m.status === 'RESOLVED' || m.status === 'VERIFIED' || m.status === 'CLOSED') return '#16A34A';
    return '#2563EB'; // Blue
  };

  // Initialize Google Maps
  useEffect(() => {
    let isMounted = true;

    async function init() {
      if (!mapContainerRef.current) return;
      try {
        const maps = await loadGoogleMaps();

        let MapConstructor = maps?.Map;
        if (!MapConstructor && maps?.importLibrary) {
          try {
            const lib = await maps.importLibrary('maps');
            MapConstructor = lib?.Map;
          } catch (e) {
            console.warn('[GoogleMap] importLibrary failed', e);
          }
        }

        if (!MapConstructor || typeof MapConstructor !== 'function') {
          if (isMounted) {
            setUseFallbackCanvas(true);
            setIsLoading(false);
          }
          return;
        }

        // Handle Google Maps authentication/authorization failures gracefully
        (window as any).gm_authFailure = () => {
          console.warn('[Google Maps] gm_authFailure received, seamlessly activating vector canvas.');
          if (isMounted) {
            setUseFallbackCanvas(true);
            setIsLoading(false);
          }
        };

        if (!mapInstanceRef.current && mapContainerRef.current) {
          const map = new MapConstructor(mapContainerRef.current, {
            center,
            zoom,
            mapId: "DEMO_MAP_ID",
            disableDefaultUI: !interactive,
            zoomControl: interactive,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: interactive,
            gestureHandling: interactive ? 'auto' : 'none'
          });

          if (interactive && onMapClick) {
            map.addListener('click', (e: any) => {
              if (e.latLng) {
                onMapClick({
                  lat: e.latLng.lat(),
                  lng: e.latLng.lng()
                });
              }
            });
          }

          mapInstanceRef.current = map;
        }

        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('[GoogleMap] Google Maps JS fallback activated:', err);
        if (isMounted) {
          setUseFallbackCanvas(true);
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  // Update center when center prop changes explicitly
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      if (typeof mapInstanceRef.current.panTo === 'function') {
        mapInstanceRef.current.panTo(center);
      }
    }
  }, [center.lat, center.lng]);

  // Sync Markers for Google Maps
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !(window as any).google?.maps?.Marker) return;
    const maps = (window as any).google.maps;

    // Clear existing markers
    markersRef.current.forEach((marker) => {
      if (typeof marker.setMap === 'function') marker.setMap(null);
    });
    markersRef.current.clear();

    if (validMarkers.length === 0) return;

    // Auto fit bounds if enabled
    if (autoFitBounds && validMarkers.length > 0) {
      const bounds = new maps.LatLngBounds();
      validMarkers.forEach((m) => {
        bounds.extend(new maps.LatLng(m.lat, m.lng));
      });

      if (validMarkers.length === 1) {
        map.panTo({ lat: validMarkers[0].lat, lng: validMarkers[0].lng });
        map.setZoom(15);
      } else {
        map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
      }
    }

    // Render Markers
    validMarkers.forEach((m) => {
      const isSelected = selectedMarkerId === m.id;
      const fillColor = getMarkerColor(m);

      const marker = new maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map,
        title: `${m.title} (${m.priority || m.severity || 'Standard'})`,
        zIndex: isSelected ? 999 : 10,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: isSelected ? 10 : 7,
          fillColor,
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: isSelected ? 3 : 2
        }
      });

      marker.addListener('click', () => {
        if (onMarkerClick) onMarkerClick(m);
        if (m.onClick) m.onClick();
      });

      markersRef.current.set(m.id, marker);
    });
  }, [validMarkers, selectedMarkerId, autoFitBounds, onMarkerClick]);

  // Center on selected marker when selectedMarkerId changes
  useEffect(() => {
    if (!selectedMarkerId) return;
    const selected = validMarkers.find((m) => m.id === selectedMarkerId);
    if (selected) {
      if (mapInstanceRef.current && typeof mapInstanceRef.current.panTo === 'function') {
        mapInstanceRef.current.panTo({ lat: selected.lat, lng: selected.lng });
        if (mapInstanceRef.current.getZoom() < 14) {
          mapInstanceRef.current.setZoom(15);
        }
      }
      setVectorCenter({ lat: selected.lat, lng: selected.lng });
    }
  }, [selectedMarkerId, validMarkers]);

  // Fallback Vector Map Coordinate Projection
  const projectCoordinates = (lat: number, lng: number) => {
    const minLat = vectorCenter.lat - 0.04;
    const maxLat = vectorCenter.lat + 0.04;
    const minLng = vectorCenter.lng - 0.05;
    const maxLng = vectorCenter.lng + 0.05;

    const x = Math.max(5, Math.min(95, ((lng - minLng) / (maxLng - minLng)) * 100));
    const y = Math.max(5, Math.min(95, (1 - (lat - minLat) / (maxLat - minLat)) * 100));

    return { x, y };
  };

  return (
    <div
      className={`relative w-full overflow-hidden select-none bg-[#F4F4F5] ${className}`}
      style={{ height }}
    >
      {/* 1. Real Google Maps Container */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full ${useFallbackCanvas ? 'hidden' : 'block'}`}
      />

      {/* 2. Interactive Municipal Vector Map Canvas */}
      {useFallbackCanvas && (
        <div className="relative w-full h-full bg-[#E5ECE5] overflow-hidden flex items-center justify-center">
          {/* GIS Geography & Street Matrix */}
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="civic-urban-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <rect width="60" height="60" fill="#F4F3EE" />
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#E3E1DA" strokeWidth="1" />
              </pattern>
            </defs>

            {/* Urban Base */}
            <rect width="100%" height="100%" fill="url(#civic-urban-grid)" />

            {/* Green Parks and Forests */}
            <path d="M 40 40 C 90 20, 180 30, 220 90 C 260 150, 180 220, 100 200 C 40 180, 20 100, 40 40 Z" fill="#C8E6C9" opacity="0.85" />
            <path d="M 620 180 C 720 150, 850 180, 880 280 C 900 360, 820 440, 740 420 C 660 400, 600 300, 620 180 Z" fill="#C8E6C9" opacity="0.8" />
            <path d="M 380 440 C 460 410, 540 450, 560 520 C 580 580, 510 650, 430 630 C 360 610, 330 520, 380 440 Z" fill="#D7ECD9" opacity="0.9" />

            {/* River & Water bodies */}
            <path d="M -20 280 C 150 260, 300 340, 480 310 C 660 280, 850 360, 1050 330 T 1400 360" fill="none" stroke="#AADAFF" strokeWidth="32" strokeLinecap="round" opacity="0.95" />
            <path d="M -20 280 C 150 260, 300 340, 480 310 C 660 280, 850 360, 1050 330 T 1400 360" fill="none" stroke="#84C5FF" strokeWidth="16" strokeLinecap="round" opacity="0.7" />
            <ellipse cx="280" cy="180" rx="60" ry="38" fill="#AADAFF" opacity="0.9" />
            <ellipse cx="820" cy="420" rx="75" ry="44" fill="#AADAFF" opacity="0.9" />

            {/* Secondary Residential Road Network */}
            <path d="M 0 100 H 1400 M 0 220 H 1400 M 0 460 H 1400 M 0 580 H 1400" stroke="#FFFFFF" strokeWidth="5" opacity="0.9" />
            <path d="M 120 0 V 800 M 240 0 V 800 M 420 0 V 800 M 580 0 V 800 M 740 0 V 800 M 920 0 V 800" stroke="#FFFFFF" strokeWidth="5" opacity="0.9" />

            {/* Primary State Highways & Arterials */}
            <path d="M 0 160 Q 300 240, 700 130 T 1400 210" fill="none" stroke="#FCE8B2" strokeWidth="14" />
            <path d="M 0 160 Q 300 240, 700 130 T 1400 210" fill="none" stroke="#FBBF24" strokeWidth="8" />

            <path d="M 320 0 Q 360 320, 290 800" fill="none" stroke="#FCE8B2" strokeWidth="14" />
            <path d="M 320 0 Q 360 320, 290 800" fill="none" stroke="#FBBF24" strokeWidth="8" />

            <path d="M 780 0 Q 720 280, 820 800" fill="none" stroke="#FCE8B2" strokeWidth="12" />
            <path d="M 780 0 Q 720 280, 820 800" fill="none" stroke="#FBBF24" strokeWidth="7" />
          </svg>

          {/* Interactive Markers */}
          {validMarkers.map((m) => {
            const { x, y } = projectCoordinates(m.lat, m.lng);
            const isSelected = selectedMarkerId === m.id;
            const markerColor = getMarkerColor(m);

            return (
              <div
                key={m.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setVectorCenter({ lat: m.lat, lng: m.lng });
                  if (onMarkerClick) onMarkerClick(m);
                  if (m.onClick) m.onClick();
                }}
                style={{ left: `${x}%`, top: `${y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-10"
              >
                {/* Active pulsating ripple if selected */}
                {isSelected && (
                  <div
                    className="absolute inset-0 rounded-full animate-ping opacity-75"
                    style={{ backgroundColor: markerColor }}
                  />
                )}

                <div
                  className={`relative w-4 h-4 rounded-full border-2 border-[#FFFFFF] shadow-sm flex items-center justify-center transition-all group-hover:scale-125 ${
                    isSelected ? 'ring-4 ring-[#18181B]/30 scale-125' : ''
                  }`}
                  style={{ backgroundColor: markerColor }}
                />

                {/* Marker Tooltip on Hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block whitespace-nowrap bg-[#18181B] text-[#FFFFFF] text-[10px] font-semibold px-2 py-1 rounded-sm shadow-md pointer-events-none z-20">
                  {m.title}
                </div>
              </div>
            );
          })}

          {/* Vector Map Controls */}
          <div className="absolute bottom-4 right-4 flex flex-col space-y-1 bg-[#FFFFFF] border border-[#E5E5E5] rounded-md shadow-2xs overflow-hidden z-20">
            <button
              onClick={() => setVectorZoom((z) => Math.min(18, z + 1))}
              className="p-1.5 hover:bg-[#F4F4F5] text-[#18181B] transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setVectorZoom((z) => Math.max(8, z - 1))}
              className="p-1.5 hover:bg-[#F4F4F5] text-[#18181B] transition-colors border-t border-[#E5E5E5]"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-[#FFFFFF]/70 backdrop-blur-2xs flex items-center justify-center z-30">
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#18181B]">
            <Loader2 className="w-4 h-4 animate-spin text-[#18181B]" />
            <span>Loading Map View...</span>
          </div>
        </div>
      )}
    </div>
  );
};
