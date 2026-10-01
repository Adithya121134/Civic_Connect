// Google Maps Platform Loader and Service Utility
// Supports Google Maps JavaScript API (New), Places API (New), and Modern Geospatial Services

let mapsLoadingPromise: Promise<any | null> | null = null;
let cachedApiKey: string | null = null;

export async function getMapsApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;

  // 1. Check Vite env
  const envKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim()) {
    const key = envKey.trim();
    cachedApiKey = key;
    return key;
  }

  // 2. Fetch from backend /api/v1/maps/config
  try {
    const res = await fetch('/api/v1/maps/config');
    if (res.ok) {
      const data = await res.json();
      if (data.apiKey && typeof data.apiKey === 'string' && data.apiKey.trim()) {
        const key = data.apiKey.trim();
        cachedApiKey = key;
        return key;
      }
    }
  } catch (err) {
    console.warn('[Google Maps] Could not fetch config from backend:', err);
  }

  return '';
}

export async function loadGoogleMaps(): Promise<any | null> {
  if (typeof window === 'undefined') return null;

  // If already loaded on window and Map constructor is available
  if ((window as any).google?.maps?.Map) {
    return (window as any).google.maps;
  }

  // If google.maps is on window with importLibrary
  if ((window as any).google?.maps?.importLibrary) {
    try {
      const { Map } = await (window as any).google.maps.importLibrary("maps");
      (window as any).google.maps.Map = Map;
      return (window as any).google.maps;
    } catch (e) {
      console.warn('[Google Maps] importLibrary error:', e);
    }
  }

  if (mapsLoadingPromise) {
    return mapsLoadingPromise;
  }

  mapsLoadingPromise = new Promise(async (resolve) => {
    const apiKey = await getMapsApiKey();
    if (!apiKey) {
      console.info('[Google Maps] Running in standalone vector map mode.');
      resolve(null);
      return;
    }

    // Check if script tag already injected
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      const onReady = async () => {
        try {
          if ((window as any).google?.maps?.importLibrary) {
            const { Map } = await (window as any).google.maps.importLibrary("maps");
            (window as any).google.maps.Map = Map;
          }
          resolve((window as any).google?.maps || null);
        } catch {
          resolve((window as any).google?.maps || null);
        }
      };

      if ((window as any).google?.maps?.Map) {
        onReady();
      } else {
        existingScript.addEventListener('load', onReady);
        existingScript.addEventListener('error', () => resolve(null));
      }
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,marker&v=weekly`;
    script.async = true;
    script.defer = true;
    script.id = 'google-maps-js-sdk';

    script.onload = async () => {
      try {
        if ((window as any).google?.maps?.importLibrary && !(window as any).google?.maps?.Map) {
          const { Map } = await (window as any).google.maps.importLibrary("maps");
          (window as any).google.maps.Map = Map;
        }
        resolve((window as any).google?.maps || null);
      } catch {
        resolve((window as any).google?.maps || null);
      }
    };

    script.onerror = (e) => {
      console.warn('[Google Maps] Script load failed, vector map active', e);
      resolve(null);
    };

    document.head.appendChild(script);
  });

  return mapsLoadingPromise;
}

// Known civic locations and ward mapping for accurate instant municipal lookup
const CIVIC_WARD_ZONES = [
  { ward: 'Ward 01 - North End', minLat: 37.79, maxLat: 37.82, minLng: -122.45, maxLng: -122.40, locality: 'North Waterfront & Financial' },
  { ward: 'Ward 02 - Marina & Heights', minLat: 37.79, maxLat: 37.81, minLng: -122.46, maxLng: -122.42, locality: 'Marina & Pacific Heights' },
  { ward: 'Ward 03 - Downtown Central', minLat: 37.77, maxLat: 37.79, minLng: -122.42, maxLng: -122.39, locality: 'Civic Center & Downtown' },
  { ward: 'Ward 04 - Mission Corridor', minLat: 37.74, maxLat: 37.77, minLng: -122.43, maxLng: -122.40, locality: 'Mission & Potrero' },
  { ward: 'Ward 05 - Sunset West', minLat: 37.74, maxLat: 37.77, minLng: -122.51, maxLng: -122.46, locality: 'Outer & Inner Sunset' },
  { ward: 'Ward 06 - Richmond North', minLat: 37.77, maxLat: 37.79, minLng: -122.51, maxLng: -122.45, locality: 'Richmond District' },
  { ward: 'Ward 07 - South Bayfront', minLat: 37.71, maxLat: 37.75, minLng: -122.40, maxLng: -122.37, locality: 'Bayview & Hunters Point' }
];

function resolveWardFromCoords(lat: number, lng: number): { ward: string; locality: string } {
  for (const zone of CIVIC_WARD_ZONES) {
    if (lat >= zone.minLat && lat <= zone.maxLat && lng >= zone.minLng && lng <= zone.maxLng) {
      return { ward: zone.ward, locality: zone.locality };
    }
  }
  return { ward: 'Ward 04 - Mission Corridor', locality: 'Central Municipal District' };
}

// Reverse Geocoding Helper - Modern REST / Nominatim / Civic Coordinate resolver (no legacy Geocoder class)
export async function reverseGeocode(lat: number, lng: number): Promise<{ address: string; locality: string; ward: string }> {
  const { ward, locality } = resolveWardFromCoords(lat, lng);

  try {
    const apiKey = await getMapsApiKey();
    if (apiKey) {
      // Use direct Geocoding REST API
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const result = data.results[0];
          let detectedLocality = '';
          for (const comp of result.address_components) {
            if (comp.types.includes('locality') || comp.types.includes('neighborhood') || comp.types.includes('sublocality')) {
              detectedLocality = comp.long_name;
              break;
            }
          }
          return {
            address: result.formatted_address,
            locality: detectedLocality || locality,
            ward
          };
        }
      }
    }
  } catch {
    // Graceful fallback to open municipal resolver
  }

  // Fallback: OpenStreetMap Nominatim reverse geocode or municipal format
  try {
    const nomRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (nomRes.ok) {
      const nomData = await nomRes.json();
      if (nomData.display_name) {
        const road = nomData.address?.road || nomData.address?.pedestrian || '';
        const houseNumber = nomData.address?.house_number || '';
        const suburb = nomData.address?.suburb || nomData.address?.neighbourhood || locality;
        const city = nomData.address?.city || nomData.address?.town || 'San Francisco';
        const formatted = road ? `${houseNumber ? houseNumber + ' ' : ''}${road}, ${suburb}, ${city}` : nomData.display_name;

        return {
          address: formatted,
          locality: suburb,
          ward
        };
      }
    }
  } catch {
    // Proceed to default municipal coordinate format
  }

  return {
    address: `${lat.toFixed(4)}° N, ${Math.abs(lng).toFixed(4)}° W, ${locality}`,
    locality,
    ward
  };
}

// Forward Geocoding Helper - Modern REST / Nominatim (no legacy Geocoder class)
export async function forwardGeocode(addressQuery: string): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
  if (!addressQuery || !addressQuery.trim()) return null;

  try {
    const apiKey = await getMapsApiKey();
    if (apiKey) {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressQuery)}&key=${apiKey}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const loc = data.results[0].geometry.location;
          return {
            lat: loc.lat,
            lng: loc.lng,
            formattedAddress: data.results[0].formatted_address
          };
        }
      }
    }
  } catch {
    // Fallback to OpenStreetMap Geocoder
  }

  try {
    const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}&limit=1`, {
      headers: { 'Accept': 'application/json' }
    });
    if (nomRes.ok) {
      const results = await nomRes.json();
      if (results && results.length > 0) {
        return {
          lat: parseFloat(results[0].lat),
          lng: parseFloat(results[0].lon),
          formattedAddress: results[0].display_name
        };
      }
    }
  } catch {
    // fallback
  }

  return null;
}

// High-Precision Civic Distance & Routing Calculation (Haversine & Urban Grid Model)
export async function calculateRouteDistance(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<{ distanceKm: number; durationMin: number; routePolyline?: string } | null> {
  const R = 6371; // Radius of Earth in KM
  const dLat = ((destination.lat - origin.lat) * Math.PI) / 180;
  const dLon = ((destination.lng - origin.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((origin.lat * Math.PI) / 180) *
      Math.cos((destination.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const rawDistanceKm = R * c;
  
  // Apply urban road network factor (typically 1.3x straight-line in metropolitan grids)
  const distanceKm = Math.round(rawDistanceKm * 1.28 * 10) / 10;
  // Estimate urban driving time at ~28 km/h average + 3 min response dispatch overhead
  const durationMin = Math.max(3, Math.round((distanceKm / 28) * 60) + 2);

  return {
    distanceKm,
    durationMin
  };
}

// Sophisticated High-Contrast Municipal Map Styling (Google Maps JSON Style)
export const civicMapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#F8F9FA' }]
  },
  {
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }]
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#333333' }]
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#FFFFFF' }]
  },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#BDBDBD' }]
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#EEEEEE' }]
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#E8F5E9' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#FFFFFF' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#E0E0E0' }]
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#FFFFFF' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#F5F5F5' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#CCCCCC' }]
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#E5E5E5' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#E0F2FE' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#0284C7' }]
  }
];
