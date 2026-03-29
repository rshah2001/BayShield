// ============================================================
// STORMMESH — Map View Page
// Full-screen interactive Google Map with zones, resources, alerts
// ============================================================

import { useState, useCallback } from 'react';
import { useSimulation } from '@/contexts/SimulationContext';
import { VULNERABILITY_ZONES, RESOURCES } from '@/lib/stormData';
import { MapView } from '@/components/Map';
import { motion } from 'framer-motion';
import { Layers, AlertTriangle, Building2, MapPin, Route } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  evacuate: '#EF4444',
  warning: '#F59E0B',
  watch: '#06B6D4',
  safe: '#10B981',
};

const RESOURCE_COLORS: Record<string, string> = {
  shelter: '#3B82F6',
  supply_depot: '#10B981',
  medical: '#EF4444',
  evacuation_route: '#F59E0B',
};

export default function MapViewPage() {
  const { alerts, threatLevel, isRunning } = useSimulation();
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [showLayers, setShowLayers] = useState({ zones: true, resources: true, alerts: true });

  const handleMapReady = useCallback((map: google.maps.Map) => {
    // Center on Tampa Bay
    map.setCenter({ lat: 27.9506, lng: -82.4572 });
    map.setZoom(10);
    map.setMapTypeId('hybrid');
    map.setOptions({
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#0a1628' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#0a1628' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c1e3a' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
      ],
    });

    // Add vulnerability zone markers
    VULNERABILITY_ZONES.forEach(zone => {
      const color = STATUS_COLORS[zone.status] || '#475569';
      const marker = new google.maps.Marker({
        position: { lat: zone.lat, lng: zone.lng },
        map,
        title: zone.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 0.8,
          strokeColor: color,
          strokeWeight: 2,
          scale: Math.max(8, zone.riskScore / 8),
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="background:#0a1628;color:#e2e8f0;padding:12px;border-radius:8px;min-width:200px;font-family:monospace;font-size:12px;">
            <div style="font-weight:bold;font-size:14px;margin-bottom:4px;">${zone.name}</div>
            <div style="color:${color};font-weight:bold;margin-bottom:8px;">${zone.status.toUpperCase()} — Zone ${zone.floodZone}</div>
            <div>Population: ${zone.population.toLocaleString()}</div>
            <div>Risk Score: ${zone.riskScore}/100</div>
            <div>Elderly: ${zone.elderlyPct}% | Low-Income: ${zone.lowIncomePct}%</div>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
        setSelectedZone(zone.id);
      });
    });

    // Add resource markers
    RESOURCES.forEach(res => {
      const color = RESOURCE_COLORS[res.type] || '#475569';
      const iconMap: Record<string, string> = {
        shelter: '🏠',
        supply_depot: '📦',
        medical: '🏥',
        evacuation_route: '🛣️',
      };

      const marker = new google.maps.Marker({
        position: { lat: res.lat, lng: res.lng },
        map,
        title: res.name,
        label: {
          text: iconMap[res.type] || '📍',
          fontSize: '16px',
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="background:#0a1628;color:#e2e8f0;padding:12px;border-radius:8px;min-width:200px;font-family:monospace;font-size:12px;">
            <div style="font-weight:bold;font-size:14px;margin-bottom:4px;">${res.name}</div>
            <div style="color:${color};font-weight:bold;margin-bottom:8px;">${res.type.replace('_', ' ').toUpperCase()}</div>
            ${res.type !== 'evacuation_route' ? `<div>Capacity: ${res.currentOccupancy.toLocaleString()}/${res.capacity.toLocaleString()}</div>` : ''}
            <div>Status: ${res.status.toUpperCase()}</div>
            ${res.supplies ? `<div style="margin-top:4px;">Supplies: ${res.supplies.join(', ')}</div>` : ''}
          </div>
        `,
      });

      marker.addListener('click', () => infoWindow.open(map, marker));
    });
  }, []);

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#F1F5F9' }}>Map View</h1>
          <p className="text-sm" style={{ color: '#64748B' }}>Tampa Bay threat zones, resources, and evacuation routes</p>
        </div>
        <div className="flex items-center gap-2">
          {['zones', 'resources', 'alerts'].map(layer => (
            <button
              key={layer}
              onClick={() => setShowLayers(prev => ({ ...prev, [layer]: !prev[layer as keyof typeof prev] }))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
              style={{
                background: showLayers[layer as keyof typeof showLayers] ? 'rgba(59,130,246,0.12)' : 'rgba(0,0,0,0.3)',
                color: showLayers[layer as keyof typeof showLayers] ? '#60A5FA' : '#475569',
                border: `1px solid ${showLayers[layer as keyof typeof showLayers] ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.04)'}`,
              }}
            >
              <Layers className="w-3 h-3" />
              {layer.charAt(0).toUpperCase() + layer.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Map */}
        <div className="lg:col-span-3 rounded-xl overflow-hidden" style={{ height: 'calc(100vh - 180px)', border: '1px solid rgba(59,130,246,0.12)' }}>
          <MapView onMapReady={handleMapReady} />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Legend */}
          <div className="p-4 rounded-xl" style={{ background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(59,130,246,0.12)' }}>
            <div className="text-xs font-mono font-semibold mb-3" style={{ color: '#475569' }}>ZONE STATUS</div>
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                <span className="text-xs font-mono uppercase" style={{ color }}>{status}</span>
              </div>
            ))}
          </div>

          {/* Zones List */}
          <div className="p-4 rounded-xl" style={{ background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(59,130,246,0.12)' }}>
            <div className="text-xs font-mono font-semibold mb-3" style={{ color: '#475569' }}>VULNERABILITY ZONES</div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1E293B transparent' }}>
              {VULNERABILITY_ZONES.sort((a, b) => b.riskScore - a.riskScore).map(zone => (
                <div
                  key={zone.id}
                  className="p-2.5 rounded-lg cursor-pointer transition-all"
                  style={{
                    background: selectedZone === zone.id ? `${STATUS_COLORS[zone.status]}12` : 'rgba(0,0,0,0.2)',
                    border: `1px solid ${selectedZone === zone.id ? `${STATUS_COLORS[zone.status]}30` : 'rgba(255,255,255,0.04)'}`,
                  }}
                  onClick={() => setSelectedZone(zone.id)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold" style={{ color: '#E2E8F0' }}>{zone.name}</span>
                    <span className="text-xs font-mono" style={{ color: STATUS_COLORS[zone.status] }}>{zone.riskScore}</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full" style={{ width: `${zone.riskScore}%`, background: STATUS_COLORS[zone.status] }} />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-mono" style={{ color: '#334155' }}>Zone {zone.floodZone}</span>
                    <span className="text-xs font-mono" style={{ color: '#334155' }}>{zone.population.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div className="p-4 rounded-xl" style={{ background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(59,130,246,0.12)' }}>
            <div className="text-xs font-mono font-semibold mb-3" style={{ color: '#475569' }}>RESOURCES</div>
            <div className="space-y-2">
              {RESOURCES.filter(r => r.type !== 'evacuation_route').map(res => (
                <div key={res.id} className="p-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#E2E8F0' }}>{res.name}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono" style={{ color: RESOURCE_COLORS[res.type] }}>{res.type.replace('_', ' ')}</span>
                    <span className="text-xs font-mono" style={{ color: '#475569' }}>{res.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
