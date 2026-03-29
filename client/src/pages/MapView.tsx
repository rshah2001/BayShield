// ============================================================
// BAYSHIELD — Map View Page
// Full-screen Google Maps with Tampa Bay zones, resources, alerts
// ============================================================
import { useState, useCallback } from 'react';
import { useSimulation } from '@/contexts/SimulationContext';
import { VULNERABILITY_ZONES, RESOURCES } from '@/lib/stormData';
import { MapView } from '@/components/Map';
import { cn } from '@/lib/utils';
import { Layers, AlertTriangle } from 'lucide-react';

const ZONE_STATUS_COLORS: Record<string, { hex: string; text: string; bg: string; border: string }> = {
  evacuate: { hex: '#f87171', text: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/20' },
  warning:  { hex: '#fbbf24', text: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20' },
  watch:    { hex: '#38bdf8', text: 'text-sky-400',     bg: 'bg-sky-400/10',     border: 'border-sky-400/20' },
  safe:     { hex: '#34d399', text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
};

const RESOURCE_COLORS: Record<string, string> = {
  shelter: '#60a5fa', supply_depot: '#34d399', medical: '#f87171', evacuation_route: '#fbbf24',
};

export default function MapViewPage() {
  const { alerts, isRunning } = useSimulation();
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [showLayers, setShowLayers] = useState({ zones: true, resources: true, alerts: true });

  const handleMapReady = useCallback((map: google.maps.Map) => {
    map.setCenter({ lat: 27.9506, lng: -82.4572 });
    map.setZoom(10);
    map.setOptions({
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#0d1b2e' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1b2e' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#071428' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
        { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0f172a' }] },
        { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#1e3a5f' }] },
        { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0f1e30' }] },
        { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#0d1b2e' }] },
      ],
    });

    // Vulnerability zone markers
    VULNERABILITY_ZONES.forEach(zone => {
      const c = ZONE_STATUS_COLORS[zone.status] ?? ZONE_STATUS_COLORS.safe;
      const marker = new google.maps.Marker({
        position: { lat: zone.lat, lng: zone.lng },
        map,
        title: zone.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: c.hex,
          fillOpacity: 0.7,
          strokeColor: c.hex,
          strokeWeight: 2,
          scale: Math.max(10, zone.riskScore / 7),
        },
      });

      const iw = new google.maps.InfoWindow({
        content: `<div style="background:#0d1b2e;color:#e2e8f0;padding:12px;border-radius:8px;min-width:200px;font-family:system-ui,sans-serif;font-size:12px;border:1px solid rgba(255,255,255,0.1)">
          <div style="font-weight:600;font-size:14px;margin-bottom:4px">${zone.name}</div>
          <div style="color:${c.hex};font-weight:600;margin-bottom:8px;font-size:11px;text-transform:uppercase">${zone.status} · Zone ${zone.floodZone}</div>
          <div style="color:#94a3b8">Population: <strong style="color:#e2e8f0">${zone.population.toLocaleString()}</strong></div>
          <div style="color:#94a3b8">Risk Score: <strong style="color:${c.hex}">${zone.riskScore}/100</strong></div>
          <div style="color:#94a3b8">Elderly: ${zone.elderlyPct}% · Low-Income: ${zone.lowIncomePct}%</div>
        </div>`,
      });

      marker.addListener('click', () => {
        iw.open(map, marker);
        setSelectedZone(zone.id);
      });
    });

    // Resource markers
    RESOURCES.forEach(res => {
      const color = RESOURCE_COLORS[res.type] ?? '#64748b';
      const iconMap: Record<string, string> = {
        shelter: '🏠', supply_depot: '📦', medical: '🏥', evacuation_route: '🛣️',
      };
      const marker = new google.maps.Marker({
        position: { lat: res.lat, lng: res.lng },
        map,
        title: res.name,
        label: { text: iconMap[res.type] ?? '📍', fontSize: '16px' },
      });

      const iw = new google.maps.InfoWindow({
        content: `<div style="background:#0d1b2e;color:#e2e8f0;padding:12px;border-radius:8px;min-width:180px;font-family:system-ui,sans-serif;font-size:12px;border:1px solid rgba(255,255,255,0.1)">
          <div style="font-weight:600;font-size:14px;margin-bottom:4px">${res.name}</div>
          <div style="color:${color};font-weight:600;margin-bottom:8px;font-size:11px;text-transform:uppercase">${res.type.replace('_', ' ')}</div>
          ${res.type !== 'evacuation_route' ? `<div style="color:#94a3b8">Capacity: <strong style="color:#e2e8f0">${res.currentOccupancy.toLocaleString()}/${res.capacity.toLocaleString()}</strong></div>` : ''}
          <div style="color:#94a3b8">Status: <strong style="color:#e2e8f0">${res.status}</strong></div>
        </div>`,
      });

      marker.addListener('click', () => iw.open(map, marker));
    });
  }, []);

  return (
    <div className="flex flex-col h-full p-5 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold">Map View</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Tampa Bay threat zones, resources, and evacuation routes</p>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />LIVE
            </span>
          )}
          {(['zones', 'resources', 'alerts'] as const).map(layer => (
            <button
              key={layer}
              onClick={() => setShowLayers(prev => ({ ...prev, [layer]: !prev[layer] }))}
              className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors border',
                showLayers[layer] ? 'bg-primary/10 text-primary border-primary/20' : 'text-muted-foreground border-border/30 hover:text-foreground'
              )}
            >
              <Layers className="w-3 h-3" />
              {layer.charAt(0).toUpperCase() + layer.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Map + sidebar */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Map */}
        <div className="flex-1 rounded-xl overflow-hidden border border-border/50" style={{ minHeight: '500px' }}>
          <MapView onMapReady={handleMapReady} />
        </div>

        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 space-y-3 overflow-y-auto">
          {/* Legend */}
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Zone Status</h2>
            <div className="space-y-1.5">
              {Object.entries(ZONE_STATUS_COLORS).map(([status, c]) => (
                <div key={status} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.hex }} />
                  <span className={cn('text-xs font-mono uppercase', c.text)}>{status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Zones */}
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Vulnerability Zones</h2>
            <div className="space-y-1.5">
              {[...VULNERABILITY_ZONES].sort((a, b) => b.riskScore - a.riskScore).map(zone => {
                const c = ZONE_STATUS_COLORS[zone.status] ?? ZONE_STATUS_COLORS.safe;
                return (
                  <div
                    key={zone.id}
                    className={cn('p-2 rounded-lg cursor-pointer transition-colors border',
                      selectedZone === zone.id ? cn(c.bg, c.border) : 'bg-background/50 border-border/20 hover:border-border/40'
                    )}
                    onClick={() => setSelectedZone(zone.id)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium truncate">{zone.name}</span>
                      <span className={cn('text-[10px] font-mono ml-1 flex-shrink-0', c.text)}>{zone.riskScore}</span>
                    </div>
                    <div className="h-0.5 bg-border/40 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${zone.riskScore}%`, background: c.hex }} />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground font-mono">Zone {zone.floodZone}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{zone.population.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active alerts */}
          {alerts.length > 0 && (
            <div className="bg-card border border-border/50 rounded-xl p-4">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Active Alerts</h2>
              <div className="space-y-1.5">
                {alerts.slice(0, 4).map(alert => (
                  <div key={alert.id} className="flex items-start gap-1.5 p-2 rounded-lg bg-red-400/5 border border-red-400/15">
                    <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-semibold text-red-400">{alert.zone}</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
