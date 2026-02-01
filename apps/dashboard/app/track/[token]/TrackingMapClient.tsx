'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Use any to avoid TypeScript issues with Leaflet types
const LeafletMap: any = L;

// SVG icon for the delivery truck
const truckSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="1" y="3" width="15" height="13" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1.5"/>
  <polygon points="16 8 20 8 23 13 23 16 16 16 16 8" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1.5"/>
  <circle cx="5.5" cy="18.5" r="2.5" fill="#1d4ed8" stroke="white" stroke-width="1.5"/>
  <circle cx="18.5" cy="18.5" r="2.5" fill="#1d4ed8" stroke="white" stroke-width="1.5"/>
</svg>
`;

// Create custom truck icon
const createTruckIcon = () => {
  return LeafletMap.divIcon({
    className: 'truck-marker',
    html: `<div class="truck-icon-container">${truckSvg}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

interface RoutePoint {
  lat: number;
  lng: number;
  recordedAt: string;
}

interface TrackingMapProps {
  routePoints: RoutePoint[];
  courierLocation: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
}

export default function TrackingMapClient({
  routePoints,
  courierLocation,
  destination,
}: TrackingMapProps) {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const polylineRef = useRef<any>(null);
  const courierMarkerRef = useRef<any>(null);
  const destinationMarkerRef = useRef<any>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Default center: Panama City
    const defaultCenter: [number, number] = [9.0, -79.5];

    const map = LeafletMap.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 13,
      zoomControl: true,
    });

    // CARTO Voyager tiles (same as mobile app)
    LeafletMap.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update route polyline
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing polyline
    if (polylineRef.current) {
      polylineRef.current.remove();
    }

    if (routePoints.length > 0) {
      const latlngs = routePoints.map((p) => [p.lat, p.lng] as [number, number]);
      polylineRef.current = LeafletMap.polyline(latlngs, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.8,
      }).addTo(mapRef.current);
    }
  }, [routePoints]);

  // Update courier marker
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing marker
    if (courierMarkerRef.current) {
      courierMarkerRef.current.remove();
    }

    if (courierLocation) {
      const truckIcon = createTruckIcon();
      
      courierMarkerRef.current = LeafletMap.marker([courierLocation.lat, courierLocation.lng], {
        icon: truckIcon,
        zIndexOffset: 1000, // Keep truck above other markers
      })
        .bindPopup('📍 Ubicación del mensajero')
        .addTo(mapRef.current);
    }
  }, [courierLocation]);

  // Update destination marker
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing marker
    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
    }

    if (destination) {
      destinationMarkerRef.current = LeafletMap.circleMarker([destination.lat, destination.lng], {
        radius: 10,
        fillColor: '#ef4444',
        fillOpacity: 1,
        color: '#b91c1c',
        weight: 3,
      })
        .bindPopup('Destino')
        .addTo(mapRef.current);
    }
  }, [destination]);

  // Fit bounds to show all markers
  useEffect(() => {
    if (!mapRef.current) return;

    const points: [number, number][] = [];

    if (courierLocation) {
      points.push([courierLocation.lat, courierLocation.lng]);
    }
    if (destination) {
      points.push([destination.lat, destination.lng]);
    }
    routePoints.forEach((p) => points.push([p.lat, p.lng]));

    if (points.length > 0) {
      const bounds = LeafletMap.latLngBounds(points);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routePoints, courierLocation, destination]);

  return (
    <>
      <style jsx global>{`
        .truck-marker {
          background: transparent !important;
          border: none !important;
        }
        
        .truck-icon-container {
          width: 40px;
          height: 40px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .truck-icon-container svg {
          width: 32px;
          height: 32px;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
          z-index: 2;
          position: relative;
        }
        
        .truck-icon-container::before {
          content: '';
          position: absolute;
          width: 50px;
          height: 50px;
          background: rgba(59, 130, 246, 0.3);
          border-radius: 50%;
          animation: truck-pulse 2s ease-out infinite;
          z-index: 1;
        }
        
        .truck-icon-container::after {
          content: '';
          position: absolute;
          width: 40px;
          height: 40px;
          background: rgba(59, 130, 246, 0.5);
          border-radius: 50%;
          animation: truck-pulse 2s ease-out infinite 0.5s;
          z-index: 1;
        }
        
        @keyframes truck-pulse {
          0% {
            transform: scale(0.5);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        
        /* Animation for the truck icon */
        .truck-icon-container svg {
          animation: truck-bounce 1s ease-in-out infinite;
        }
        
        @keyframes truck-bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
        }
      `}</style>
      <div
        ref={mapContainerRef}
        className="w-full h-[400px] rounded-lg overflow-hidden"
      />
    </>
  );
}
