import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search, Navigation, X, Check } from 'lucide-react';
import { geocodingAPI } from '../services/api';

export default function MapPickerModal({ isOpen, onClose, onSelect, initialLat, initialLon, initialAddress }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [address, setAddress] = useState(initialAddress || '');
  const [coords, setCoords] = useState({
    lat: initialLat || 31.5204, // Default to Lahore
    lon: initialLon || 74.3587
  });

  // Reverse geocode lat/lon to get address via backend proxy
  const reverseGeocode = async (lat, lon) => {
    try {
      const res = await geocodingAPI.reverse(lat, lon);
      const data = res.data;
      if (data && data.display_name) {
        setAddress(data.display_name);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  };

  // Search address to get lat/lon via backend proxy
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await geocodingAPI.search(searchQuery);
      const data = res.data;
      if (data && data.length > 0) {
        const first = data[0];
        const newLat = parseFloat(first.lat);
        const newLon = parseFloat(first.lon);
        
        setCoords({ lat: newLat, lon: newLon });
        setAddress(first.display_name);
        
        if (mapRef.current) {
          mapRef.current.setView([newLat, newLon], 15);
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([newLat, newLon]);
        }
      } else {
        alert('Location not found. Please try a different query.');
      }
    } catch (error) {
      console.error('Error searching location:', error);
    } finally {
      setSearching(false);
    }
  };

  // Geolocation
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const newLat = position.coords.latitude;
        const newLon = position.coords.longitude;
        
        setCoords({ lat: newLat, lon: newLon });
        await reverseGeocode(newLat, newLon);
        
        if (mapRef.current) {
          mapRef.current.setView([newLat, newLon], 16);
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([newLat, newLon]);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Could not retrieve your location. Please check your browser permissions.');
      },
      { enableHighAccuracy: true }
    );
  };

  // Initialize Map
  useEffect(() => {
    if (!isOpen) return;

    // Timeout is required to let the modal animate and container to gain dimension
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      const L = window.L;
      if (!L) {
        console.error('Leaflet library not found on window object.');
        return;
      }

      // Create map instance if it doesn't exist
      if (!mapRef.current) {
        mapRef.current = L.map(mapContainerRef.current, {
          zoomControl: false // Move zoom control to bottom right
        }).setView([coords.lat, coords.lon], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapRef.current);

        L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

        // Custom pin icon using Leaflet raw marker
        const pinIcon = L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });

        // Add draggable marker
        markerRef.current = L.marker([coords.lat, coords.lon], {
          draggable: true,
          icon: pinIcon
        }).addTo(mapRef.current);

        // Update coordinates on dragend
        markerRef.current.on('dragend', async () => {
          const position = markerRef.current.getLatLng();
          setCoords({ lat: position.lat, lon: position.lng });
          await reverseGeocode(position.lat, position.lng);
        });

        // Click on map to move marker
        mapRef.current.on('click', async (e) => {
          const { lat, lng } = e.latlng;
          setCoords({ lat, lon: lng });
          markerRef.current.setLatLng([lat, lng]);
          await reverseGeocode(lat, lng);
        });

        // Initial geocode if address is blank
        if (!address) {
          reverseGeocode(coords.lat, coords.lon);
        }
      } else {
        // Map already exists, update view and marker
        mapRef.current.setView([coords.lat, coords.lon], 13);
        markerRef.current.setLatLng([coords.lat, coords.lon]);
        mapRef.current.invalidateSize();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen]);

  // Clean up map instance on close/unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden dark:bg-slate-900 border border-slate-100 dark:border-slate-800 transition-all scale-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-150/60 px-6 py-4 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Choose Location</h3>
            <p className="text-xs text-slate-400">Pin your location on the map to find nearby listings</p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Bar / Options Overlay */}
        <div className="flex flex-col sm:flex-row gap-3 border-b border-slate-150/60 p-4 dark:border-slate-800">
          <form onSubmit={handleSearch} className="relative flex-1">
            <input
              type="text"
              placeholder="Search for address, area, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-brand-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:focus:border-brand-500 text-slate-800 dark:text-slate-200"
            />
            <Search className="absolute left-4 top-3.5 h-4.5 w-4.5 text-slate-400" />
            <button
              type="submit"
              disabled={searching}
              className="absolute right-2 top-1.5 rounded-xl bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-55"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>

          <button
            type="button"
            onClick={handleUseMyLocation}
            className="flex items-center justify-center gap-2 rounded-2xl border border-brand-200 px-4 py-3 text-sm font-bold text-brand-600 hover:bg-brand-50/50 dark:border-brand-900/30 dark:text-brand-400 dark:hover:bg-brand-950/20"
          >
            <Navigation className="h-4.5 w-4.5 fill-current" />
            Locate Me
          </button>
        </div>

        {/* Map Container */}
        <div className="relative flex-1 bg-slate-100 dark:bg-slate-950 min-h-0">
          <div ref={mapContainerRef} className="h-full w-full z-0" />
        </div>

        {/* Selection Bar */}
        <div className="border-t border-slate-150/60 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-950/30 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-3 items-start flex-1 w-full min-w-0">
            <div className="rounded-xl bg-brand-50 p-2.5 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400 mt-0.5 shrink-0">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Selected Address</h4>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate w-full pr-4 leading-relaxed">
                {address || 'Fetching address...'}
              </p>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 md:flex-initial rounded-2xl border border-slate-200 px-6 py-3.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSelect({ address, latitude: coords.lat, longitude: coords.lon })}
              disabled={!address}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 py-3.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-55 dark:bg-brand-500 dark:hover:bg-brand-600"
            >
              <Check className="h-4.5 w-4.5 stroke-[3]" />
              Confirm Location
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
