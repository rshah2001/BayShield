// ============================================================
// BAYSHIELD -- Evacuation Routes Page
// Design: Full-screen split layout. Left: EvacuationRouter panel.
// Right: Full-bleed Google Maps with live route overlay.
// ============================================================

import { useState, useCallback } from 'react';
import { useSimulation } from '@/contexts/SimulationContext';
import { MapView } from '@/components/Map';
import EvacuationRouter, { EvacRoute } from '@/components/EvacuationRouter';
import { AlertTriangle, Shield, Info } from 'lucide-react';

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry',                           stylers: [{ color: '#0d1117' }] },
  { elementType: 'labels.text.stroke',                 stylers: [{ color: '#0d1117' }] },
  { elementType: 'labels.text.fill',                   stylers: [{ color: '#4a5568' }] },
  { featureType: 'water',        elementType: 'geometry', stylers: [{ color: '#0a1628' }] },
  { featureType: 'road',         elementType: 'geometry', stylers: [{ color: '#1a2035' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1e3a5f' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#3b82f6' }] },
  { featureType: 'poi',          elementType: 'geometry', stylers: [{ color: '#0f1923' }] },
  { featureType: 'transit',      elementType: 'geometry', stylers: [{ color: '#0f1923' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#1e3a5f' }] },
];

export default function EvacuationPage() {
  const { shelters, shelterFeedSource, vulnerabilityZones } = useSimulation();
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [activeRoute, setActiveRoute] = useState<EvacRoute | null>(null);
  const mapShelters = shelters.filter(shelter => shelter.type === 'shelter');

  const handleMapReady = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
    map.setOptions({
      styles: DARK_MAP_STYLES,
      center: { lat: 27.85, lng: -82.65 },
      zoom: 10,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
    });

    // Draw flood zone circles
    vulnerabilityZones
      .filter(z => z.floodZone === 'VE' || z.floodZone === 'AE')
      .forEach(zone => {
        const color = zone.floodZone === 'VE' ? '#ef4444' : '#f59e0b';
        new google.maps.Circle({
          map,
          center: { lat: zone.lat, lng: zone.lng },
          radius: zone.floodZone === 'VE' ? 2500 : 1800,
          fillColor: color,
          fillOpacity: 0.12,
          strokeColor: color,
          strokeOpacity: 0.4,
          strokeWeight: 1.5,
        });
      });

    // Shelter markers
    mapShelters.forEach(shelter => {
      const iw = new google.maps.InfoWindow({
        content: `<div style="background:#0d1117;color:#e2e8f0;padding:10px;border-radius:8px;font-family:monospace;min-width:180px">
          <div style="font-size:12px;font-weight:700;margin-bottom:4px">${shelter.name}</div>
          <div style="font-size:10px;color:#94a3b8">Capacity: ${shelter.currentOccupancy.toLocaleString()} / ${shelter.capacity.toLocaleString()}</div>
          <div style="font-size:10px;color:${shelter.status === 'available' ? '#34d399' : shelter.status === 'filling' ? '#fbbf24' : '#f87171'};font-weight:700;margin-top:4px">${shelter.status.toUpperCase()}</div>
        </div>`,
      });
      const marker = new google.maps.Marker({
        position: { lat: shelter.lat, lng: shelter.lng },
        map,
        title: shelter.name,
        label: { text: '🏟', fontSize: '20px' },
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 0, fillOpacity: 0, strokeOpacity: 0 },
        zIndex: 300,
      });
      marker.addListener('click', () => iw.open(map, marker));
    });
  }, [mapShelters, vulnerabilityZones]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left panel: EvacuationRouter ── */}
      <div
        className="w-96 shrink-0 flex flex-col border-r border-white/8"
        style={{ background: 'oklch(0.10 0.012 250)' }}
      >
        {/* Page header */}
        <div className="p-4 border-b border-white/8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">Evacuation Routes</h1>
              <p className="text-[10px] text-slate-500">GPS-based routing to nearest shelter</p>
            </div>
          </div>
        </div>

        {/* Info banner */}
        <div className="mx-3 mt-3 bg-blue-500/8 border border-blue-500/20 rounded-lg px-3 py-2.5">
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] text-blue-300 font-medium mb-0.5">How it works</p>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Share your location to get real-time routes to all {mapShelters.length} Tampa Bay shelters, ranked by safety score. Routes avoid storm surge zones and account for live traffic. Auto-refreshes every 2 minutes.
              </p>
              <p className="mt-2 text-[10px] text-slate-500">
                Shelter source: {shelterFeedSource === 'live_public' ? 'Florida public live feed' : 'BayShield fallback model'}
              </p>
            </div>
          </div>
        </div>

        {/* Flood zone warning */}
        <div className="mx-3 mt-2 bg-amber-500/8 border border-amber-500/20 rounded-lg px-3 py-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-amber-300/80">
              Red circles on the map show Zone VE (extreme surge risk). Amber circles show Zone AE (high risk). Routes crossing these zones receive a safety penalty.
            </p>
          </div>
        </div>

        {/* Router component */}
        <div className="flex-1 overflow-hidden mt-2">
          <EvacuationRouter
            map={mapInstance}
            shelters={mapShelters}
            zones={vulnerabilityZones}
            onRouteSelected={setActiveRoute}
          />
        </div>
      </div>

      {/* ── Right: Full-bleed map ── */}
      <div className="flex-1 relative">
        <MapView onMapReady={handleMapReady} className="w-full h-full" />

        {/* Active route info overlay */}
        {activeRoute && (
          <div
            className="absolute bottom-4 right-4 rounded-xl p-3 max-w-xs"
            style={{ background: 'rgba(13,17,23,0.92)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: activeRoute.safetyScore >= 75 ? '#34d399' : activeRoute.safetyScore >= 50 ? '#fbbf24' : '#f87171' }}
              />
              <span className="text-xs font-semibold text-white">{activeRoute.shelter.name}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[10px] text-slate-500 font-mono">ETA</div>
                <div className="text-xs font-semibold text-white">{activeRoute.duration.split(' ')[0]}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-mono">DIST</div>
                <div className="text-xs font-semibold text-white">{activeRoute.distance}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-mono">SAFETY</div>
                <div
                  className="text-xs font-semibold"
                  style={{ color: activeRoute.safetyScore >= 75 ? '#34d399' : activeRoute.safetyScore >= 50 ? '#fbbf24' : '#f87171' }}
                >
                  {activeRoute.safetyScore}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div
          className="absolute top-4 right-4 rounded-xl p-3"
          style={{ background: 'rgba(13,17,23,0.88)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <p className="text-[10px] text-slate-500 font-mono uppercase mb-2">Map Legend</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/60 border border-red-500" />
              <span className="text-[10px] text-slate-300">Zone VE (Extreme Surge)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500/60 border border-amber-500" />
              <span className="text-[10px] text-slate-300">Zone AE (High Risk)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">🏟</span>
              <span className="text-[10px] text-slate-300">Evacuation Shelter</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-1.5 rounded-full bg-blue-400" />
              <span className="text-[10px] text-slate-300">Your Route</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
