import React, { useEffect, useRef, useState, useCallback } from 'react';
import { loadGoogleMaps, forwardGeocode } from '../../lib/googleMapsLoader';
import { MapPin, Search, Loader2, X, Navigation } from 'lucide-react';

interface PlaceAutocompleteProps {
  value: string;
  onChange: (address: string, coords?: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

interface SuggestionItem {
  id: string;
  mainText: string;
  secondaryText: string;
  fullAddress: string;
  coords?: { lat: number; lng: number };
  source: 'places_new' | 'civic_catalog' | 'geocoded';
}

// Built-in civic landmark catalog for immediate autocomplete suggestions
const CIVIC_LANDMARKS: Array<{ name: string; street: string; ward: string; lat: number; lng: number }> = [
  { name: 'City Hall & Civic Center Plaza', street: '1 Dr Carlton B Goodlett Pl, San Francisco, CA 94102', ward: 'Ward 03 - Downtown Central', lat: 37.7792, lng: -122.4191 },
  { name: 'Mission District Transit Plaza', street: '2000 Mission St & 16th St, San Francisco, CA 94110', ward: 'Ward 04 - Mission Corridor', lat: 37.7651, lng: -122.4196 },
  { name: 'Potrero Recreation & Community Center', street: '801 Arkansas St, San Francisco, CA 94107', ward: 'Ward 04 - Mission Corridor', lat: 37.7578, lng: -122.3986 },
  { name: 'Market Street & 4th Street Hub', street: '785 Market St, San Francisco, CA 94103', ward: 'Ward 03 - Downtown Central', lat: 37.7865, lng: -122.4045 },
  { name: 'Embarcadero Ferry Terminal & Pier 1', street: '1 Ferry Building, The Embarcadero, San Francisco, CA 94111', ward: 'Ward 01 - North End', lat: 37.7955, lng: -122.3937 },
  { name: 'Marina Boulevard & Yacht Road', street: 'Marina Blvd & Scott St, San Francisco, CA 94123', ward: 'Ward 02 - Marina & Heights', lat: 37.8044, lng: -122.4414 },
  { name: 'Sunset Boulevard & Judah Crossing', street: 'Judah St & Sunset Blvd, San Francisco, CA 94122', ward: 'Ward 05 - Sunset West', lat: 37.7618, lng: -122.4947 },
  { name: 'Geary Boulevard & 25th Avenue', street: 'Geary Blvd & 25th Ave, San Francisco, CA 94121', ward: 'Ward 06 - Richmond North', lat: 37.7806, lng: -122.4849 },
  { name: 'Third Street Transit Corridor', street: '3rd St & Palou Ave, San Francisco, CA 94124', ward: 'Ward 07 - South Bayfront', lat: 37.7314, lng: -122.3892 },
  { name: 'Van Ness Avenue Municipal Line', street: 'Van Ness Ave & McAllister St, San Francisco, CA 94102', ward: 'Ward 03 - Downtown Central', lat: 37.7808, lng: -122.4206 }
];

export const PlaceAutocomplete: React.FC<PlaceAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'Enter street address, intersection, or civic landmark...',
  className = '',
  disabled = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionTokenRef = useRef<any>(null);
  
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [isPlacesNewAvailable, setIsPlacesNewAvailable] = useState(false);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Check if Places API (New) is available
  useEffect(() => {
    let isMounted = true;
    async function checkPlaces() {
      try {
        const maps = await loadGoogleMaps();
        if (maps?.importLibrary) {
          const placesLib = await maps.importLibrary('places');
          if (placesLib?.AutocompleteSuggestion && isMounted) {
            setIsPlacesNewAvailable(true);
            if (placesLib.AutocompleteSessionToken) {
              sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
            }
          }
        }
      } catch {
        // Fallback to civic autocomplete
      }
    }
    checkPlaces();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch suggestions with debounce
  useEffect(() => {
    if (!inputValue || inputValue.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      const query = inputValue.trim().toLowerCase();
      const results: SuggestionItem[] = [];

      // 1. Try Places API (New) AutocompleteSuggestion if available
      try {
        const maps = (window as any).google?.maps;
        if (maps?.importLibrary) {
          const placesLib = await maps.importLibrary('places');
          if (placesLib?.AutocompleteSuggestion) {
            if (!sessionTokenRef.current && placesLib.AutocompleteSessionToken) {
              sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
            }
            const request = {
              input: inputValue,
              sessionToken: sessionTokenRef.current,
              includedRegionCodes: ['us']
            };
            const res = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
            if (res.suggestions && res.suggestions.length > 0) {
              for (const s of res.suggestions.slice(0, 5)) {
                if (s.placePrediction) {
                  results.push({
                    id: s.placePrediction.placeId || `pred-${Math.random()}`,
                    mainText: s.placePrediction.mainText?.text || s.placePrediction.text?.text || inputValue,
                    secondaryText: s.placePrediction.secondaryText?.text || 'San Francisco, CA',
                    fullAddress: s.placePrediction.text?.text || inputValue,
                    source: 'places_new'
                  });
                }
              }
            }
          }
        }
      } catch {
        // Fallback to civic catalog & geocoding
      }

      // 2. Add matching civic catalog items
      const matchingCivic = CIVIC_LANDMARKS.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.street.toLowerCase().includes(query) ||
          item.ward.toLowerCase().includes(query)
      );

      for (const item of matchingCivic) {
        if (!results.some((r) => r.fullAddress.toLowerCase() === item.street.toLowerCase())) {
          results.push({
            id: `civic-${item.name.replace(/\s+/g, '-').toLowerCase()}`,
            mainText: item.name,
            secondaryText: `${item.ward} • ${item.street}`,
            fullAddress: item.street,
            coords: { lat: item.lat, lng: item.lng },
            source: 'civic_catalog'
          });
        }
      }

      setSuggestions(results);
      setIsOpen(results.length > 0);
      setIsLoading(false);
      setActiveIndex(-1);
    }, 250);

    return () => clearTimeout(timer);
  }, [inputValue]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = async (item: SuggestionItem) => {
    setInputValue(item.fullAddress);
    setIsOpen(false);

    if (item.coords) {
      onChange(item.fullAddress, item.coords);
    } else {
      // Forward geocode selected address
      const geocoded = await forwardGeocode(item.fullAddress);
      if (geocoded) {
        onChange(item.fullAddress, { lat: geocoded.lat, lng: geocoded.lng });
      } else {
        onChange(item.fullAddress);
      }
    }

    // Reset session token after selection
    try {
      const maps = (window as any).google?.maps;
      if (maps?.importLibrary) {
        const placesLib = await maps.importLibrary('places');
        if (placesLib?.AutocompleteSessionToken) {
          sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        }
      }
    } catch {
      sessionTokenRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        onChange(inputValue);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        handleSelectSuggestion(suggestions[activeIndex]);
      } else {
        onChange(inputValue);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative flex flex-col w-full ${className}`}>
      <div className="relative flex items-center w-full">
        <div className="absolute left-3 text-[#777777] pointer-events-none flex items-center justify-center">
          <MapPin className="w-4 h-4 text-[#8A8A8A]" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            onChange(e.target.value);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-9 pr-16 py-2.5 bg-[#FFFFFF] border border-[#CCCCCC] focus:border-[#111111] focus:ring-1 focus:ring-[#111111] rounded-md text-xs font-mono text-[#111111] outline-hidden placeholder:text-[#999999] transition-colors"
        />

        <div className="absolute right-2.5 flex items-center space-x-1.5">
          {isLoading && <Loader2 className="w-3.5 h-3.5 text-[#8A8A8A] animate-spin" />}
          {inputValue && (
            <button
              type="button"
              onClick={() => {
                setInputValue('');
                onChange('');
                setSuggestions([]);
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="p-1 hover:bg-[#F3F4F6] text-[#888888] hover:text-[#111111] rounded transition-colors"
              title="Clear address"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Floating Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto">
          <div className="px-2.5 py-1.5 bg-[#FAFAFA] border-b border-[#E5E5E5] flex items-center justify-between text-[10px] font-mono text-[#777777]">
            <span>MUNICIPAL LOCATION SUGGESTIONS</span>
            <span className="text-[9px] uppercase">{isPlacesNewAvailable ? 'Places API (New)' : 'Civic Directory'}</span>
          </div>

          <ul className="divide-y divide-[#F0F0F0]">
            {suggestions.map((item, idx) => (
              <li
                key={item.id}
                onClick={() => handleSelectSuggestion(item)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`px-3 py-2 text-left cursor-pointer flex items-start space-x-2.5 transition-colors ${
                  idx === activeIndex ? 'bg-[#F3F4F6]' : 'hover:bg-[#FAFAFA]'
                }`}
              >
                <Navigation className="w-3.5 h-3.5 text-[#666666] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-[#111111] truncate">{item.mainText}</div>
                  <div className="text-[11px] text-[#777777] truncate">{item.secondaryText}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

