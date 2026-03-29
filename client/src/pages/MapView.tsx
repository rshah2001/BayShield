// ============================================================
// BAYSHIELD -- Map View Page
// Design: Full-bleed Google Maps with left sidebar tabs:
//   [Evacuation Routes] [Threat Zones] [Resources]
// Evacuation Routes tab shows the EvacuationRouter component.
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { MapView } from '@/components/Map';
import { useSimulation } from '@/contexts/SimulationContext';
import { VULNERABILITY_ZONES, RESOURCES } from '@/lib/stormData';
import EvacuationRouter from '@/components/EvacuationRouter';
import { cn } from '@/lib/utils';
import { AlertTriangle, MapPin, Building2, Route, Layers } from 'lucide-react';

// ── Zone / resource styling ───────────────────────────────────
const ZONE_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  evacuate: { fill: '#ef4444', stroke: '#dc2626', label: 'EVACUATE' },
  warning:  { fill: '#f59e0b', stroke: '#d97706', label: 'WARNING' },
  watch:    { fill: '#3b82f6', stroke: '#2563eb', label: 'WATCH' },
  safe:     { fill: '#34d399', stroke: '#10b981', label: 'SAFE' },
};

const RESOURCE_ICONS: Record<string, string> = {
  shelter:          '🏟',
  supply_depot:     '📦',
  medical:          '🏥',
  evacuation_route: '🛣',
};

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
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#3b82f6' }] },
];

type SidebarTab = 'zones' | 'resources' | 'evacuation';

export default function MapViewPage() {
  const { alerts } = useSimulation();
  const [activeTab, setActiveTab] = useState<SidebarTab>('evacuation');
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

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

    infoWindowRef.current = new google.maps.InfoWindow();

    // ── Zone markers ──
    VULNERABILITY_ZONES.forEach(zone => {
      const cfg = ZONE_COLORS[zone.status] ?? ZONE_COLORS.safe;
      const marker = new google.maps.Marker({
        position: { lat: zone.lat, lng: zone.lng },
        map,
        title: zone.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: cfg.fill,
          fillOpacity: 0.75,
          strokeColor: cfg.stroke,
          strokeWeight: 2,
        },
        label: {
          text: zone.riskScore.toString(),
          color: '#fff',
          fontSize: '10px',
          fontWeight: 'bold',
        },
        zIndex: zone.riskScore,
      });
      marker.addListener('click', () => {
        infoWindowRef.current?.setContent(`
          <div style="background:#0d1117;color:#e2e8f0;padding:12px;border-radius:8px;font-family:monospace;min-width:200px">
            <div style="font-size:13px;font-weight:700;margin-bottom:6px">${zone.name}</div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:4px">Flood Zone: <strong style="color:${cfg.fill}">${zone.floodZone}</strong></div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:4px">Population: ${zone.population.toLocaleString()}</div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:4px">Elderly: ${zone.elderlyPct}% &nbsp; Low-Income: ${zone.lowIncomePct}%</div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:6px">Risk Score: <strong style="color:${cfg.fill}">${zone.riskScore}/100</strong></div>
            <div style="font-size:10px;padding:4px 8px;background:${cfg.fill}22;border:1px solid ${cfg.fill}44;border-radius:4px;color:${cfg.fill};text-align:center;font-weight:700">${cfg.label}</div>
          </div>
        `);
        infoWindowRef.current?.open(map, marker);
        setSelectedZone(zone.id);
      });
    });

    // ── Resource markers ──
    RESOURCES.filter(r => r.type !== 'evacuation_route').forEach(res => {
      const marker = new google.maps.Marker({
        position: { lat: res.lat, lng: res.lng },
        map,
        title: res.name,
        label: {
          text: RESOURCE_ICONS[res.type] ?? '📍',
          fontSize: '18px',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 0,
          fillOpacity: 0,
          strokeOpacity: 0,
        },
        zIndex: 200,
      });
      const pct = Math.round((res.currentOccupancy / res.capacity) * 100);
      marker.addListener('click', () => {
        infoWindowRef.current?.setContent(`
          <div style="background:#0d1117;color:#e2e8f0;padding:12px;border-radius:8px;font-family:monospace;min-width:200px">
            <div style="font-size:13px;font-weight:700;margin-bottom:6px">${res.name}</div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:4px">Type: ${res.type.replace('_', ' ')}</div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:4px">Capacity: ${res.currentOccupancy.toLocaleString()} / ${res.capacity.toLocaleString()} (${pct}%)</div>
            <div style="font-size:11px;padding:4px 8px;background:${res.status === 'available' ? '#34d39922' : '#f59e0b22'};border-radius:4px;color:${res.status === 'available' ? '#34d399' : '#f59e0b'};text-align:center;font-weight:700;margin-top:6px">${res.status.toUpperCase()}</div>
          </div>
        `);
        infoWindowRef.current?.open(map, marker);
      });
    });
  }, []);

  const TABS: { id: SidebarTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'evacuation', label: 'Evacuation', icon: <Route className="w-3.5 h-3.5" /> },
    { id: 'zones',      label: 'Zones',      icon: <Layers className="w-3.5 h-3.5" />, count: VULNERABILITY_ZONES.filter(z => z.status !== 'safe').length },
    { id: 'resources',  label: 'Resources',  icon: <Building2 className="w-3.5 h-3.5" />, count: RESOURCES.filter(r => r.type === 'shelter').length },
  ];

  return (
    <div className="flex min-h-full flex-col overflow-hidden xl:h-full xl:flex-row">
      {/* ── Left sidebar ── */}
      <div
        className="flex w-full shrink-0 flex-col border-b border-white/8 xl:w-80 xl:border-b-0 xl:border-r"
        style={{ background: 'oklch(0.10 0.012 250)' }}
      >
        {/* Sidebar header */}
        <div className="p-4 border-b border-white/8">
          <h1 className="text-sm font-semibold text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-400" />
            Tampa Bay Map
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">Live threat zones, resources &amp; evacuation routing</p>
        </div>

        {/* Active alerts banner */}
        {alerts.length > 0 && (
          <div className="mx-3 mt-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="text-[11px] text-red-300">{alerts.length} active NWS alert{alerts.length !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Tab bar */}
        <div className="mt-3 flex overflow-x-auto border-b border-white/8">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex min-w-24 flex-1 flex-col items-center gap-1 border-b-2 py-2.5 text-[10px] font-medium transition-colors',
                activeTab === tab.id
                  ? 'text-blue-400 border-blue-400'
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              )}
            >
              {tab.icon}
              <span className="leading-none">{tab.label}</span>
              {tab.count !== undefined && (
                <span className={cn(
                  'text-[9px] px-1 rounded font-mono',
                  activeTab === tab.id ? 'bg-blue-500/20 text-blue-400' : 'bg-white/8 text-slate-500'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="overflow-hidden xl:flex-1">
          {/* Evacuation Router tab */}
          {activeTab === 'evacuation' && (
            <div className="max-h-[70vh] overflow-y-auto xl:max-h-none xl:h-full">
              <EvacuationRouter map={mapInstance} />
            </div>
          )}

          {/* Zones tab */}
          {activeTab === 'zones' && (
            <div className="h-full max-h-[70vh] space-y-2 overflow-y-auto p-3 xl:max-h-none">
              {VULNERABILITY_ZONES.sort((a, b) => b.riskScore - a.riskScore).map(zone => {
                const cfg = ZONE_COLORS[zone.status] ?? ZONE_COLORS.safe;
                return (
                  <button
                    key={zone.id}
                    onClick={() => {
                      setSelectedZone(zone.id);
                      mapInstance?.panTo({ lat: zone.lat, lng: zone.lng });
                      mapInstance?.setZoom(13);
                    }}
                    className={cn(
                      'w-full text-left p-3 rounded-xl border transition-all',
                      selectedZone === zone.id
                        ? 'bg-white/8 border-white/20'
                        : 'bg-white/4 border-white/8 hover:bg-white/6'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-white">{zone.name}</span>
                      <span
                        className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                        style={{ background: `${cfg.fill}22`, color: cfg.fill, border: `1px solid ${cfg.fill}44` }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <span>Zone {zone.floodZone}</span>
                      <span>{zone.population.toLocaleString()} pop.</span>
                      <span>Risk: <strong style={{ color: cfg.fill }}>{zone.riskScore}</strong></span>
                    </div>
                    <div className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${zone.riskScore}%`, background: cfg.fill }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Resources tab */}
          {activeTab === 'resources' && (
            <div className="h-full max-h-[70vh] space-y-2 overflow-y-auto p-3 xl:max-h-none">
              {RESOURCES.filter(r => r.type !== 'evacuation_route').map(res => {
                const pct = Math.round((res.currentOccupancy / res.capacity) * 100);
                const statusColor = res.status === 'available' ? '#34d399' : res.status === 'filling' ? '#fbbf24' : '#f87171';
                return (
                  <button
                    key={res.id}
                    onClick={() => {
                      mapInstance?.panTo({ lat: res.lat, lng: res.lng });
                      mapInstance?.setZoom(14);
                    }}
                    className="w-full text-left p-3 rounded-xl bg-white/4 border border-white/8 hover:bg-white/6 transition-all"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">{RESOURCE_ICONS[res.type] ?? '📍'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{res.name}</div>
                        <div className="text-[10px] text-slate-500">{res.type.replace('_', ' ')}</div>
                      </div>
                      <span
                        className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0"
                        style={{ background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}44` }}
                      >
                        {res.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>{res.currentOccupancy.toLocaleString()} / {res.capacity.toLocaleString()}</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: statusColor }}
                      />
                    </div>
                    {res.supplies && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {res.supplies.slice(0, 3).map(s => (
                          <span key={s} className="text-[9px] px-1 py-0.5 rounded bg-white/6 text-slate-400 border border-white/8">{s}</span>
                        ))}
                        {res.supplies.length > 3 && (
                          <span className="text-[9px] text-slate-500">+{res.supplies.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Full-bleed Map ── */}
      <div className="relative min-h-[50vh] flex-1 xl:min-h-0">
        <MapView onMapReady={handleMapReady} className="h-full min-h-[50vh] w-full xl:min-h-0" />

        {/* Map legend overlay */}
        <div
          className="absolute right-3 top-3 rounded-xl p-3 sm:right-4 sm:top-4"
          style={{ background: 'rgba(13,17,23,0.88)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <p className="text-[10px] text-slate-500 font-mono uppercase mb-2">Zone Status</p>
          {Object.entries(ZONE_COLORS).map(([status, cfg]) => (
            <div key={status} className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ background: cfg.fill }} />
              <span className="text-[10px] text-slate-300">{cfg.label}</span>
            </div>
          ))}
        </div>

        {/* Evacuation route CTA when on other tabs */}
        {activeTab !== 'evacuation' && (
          <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4">
            <button
              onClick={() => setActiveTab('evacuation')}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-lg transition-colors"
            >
              <Route className="w-3.5 h-3.5" />
              Find Evacuation Route
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
