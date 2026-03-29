import { useState, useCallback, useRef } from 'react';
import { MapView } from '@/components/Map';
import { useSimulation } from '@/contexts/SimulationContext';
import { VULNERABILITY_ZONES, RESOURCES } from '@/lib/stormData';
import EvacuationRouter from '@/components/EvacuationRouter';
import { cn } from '@/lib/utils';
import { AlertTriangle, MapPin, Building2, Route, Layers, Radar, Waves, ShieldAlert } from 'lucide-react';

const ZONE_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  evacuate: { fill: '#ff6b6b', stroke: '#d43f63', label: 'EVACUATE' },
  warning: { fill: '#ffb44d', stroke: '#f07a2b', label: 'WARNING' },
  watch: { fill: '#5cc8ff', stroke: '#2f7df6', label: 'WATCH' },
  safe: { fill: '#5de2b3', stroke: '#19b88a', label: 'SAFE' },
};

const RESOURCE_META: Record<string, { tint: string; label: string; glyph: string }> = {
  shelter: { tint: '#73b8ff', label: 'Shelter', glyph: 'S' },
  supply_depot: { tint: '#47d6a8', label: 'Depot', glyph: 'D' },
  medical: { tint: '#ff7f96', label: 'Medical', glyph: 'M' },
  evacuation_route: { tint: '#ffd166', label: 'Route', glyph: 'R' },
};

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#06111d' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#081523' }, { weight: 2 }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#88a2c2' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2c5578' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0a1a24' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#0c202a' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#11242e' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6d86a1' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#183044' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#23455d' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#90a7c0' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#204766' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#5cc8ff' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#b9ecff' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#1b3950' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#132430' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#315c76' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a2742' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#72ddff' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#081523' }] },
];

type SidebarTab = 'zones' | 'resources' | 'evacuation';

function createMarkerIcon(primary: string, secondary: string, text: string) {
  const svg = `
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pin" x1="16" y1="12" x2="48" y2="54" gradientUnits="userSpaceOnUse">
          <stop stop-color="${secondary}"/>
          <stop offset="1" stop-color="${primary}"/>
        </linearGradient>
      </defs>
      <path d="M32 6C21.507 6 13 14.507 13 25c0 13.797 16.965 29.465 18.035 30.447a1.5 1.5 0 0 0 1.93 0C34.035 54.465 51 38.797 51 25 51 14.507 42.493 6 32 6Z" fill="url(#pin)" stroke="rgba(226,232,240,0.75)" stroke-width="2"/>
      <circle cx="32" cy="25" r="10.5" fill="rgba(4,13,24,0.72)" stroke="rgba(255,255,255,0.18)"/>
      <text x="32" y="29.5" text-anchor="middle" font-size="11" font-family="Inter, Arial, sans-serif" font-weight="700" fill="white">${text}</text>
    </svg>
  `;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(32, 32),
    anchor: new google.maps.Point(16, 26),
  };
}

function zoneInfoContent(zone: typeof VULNERABILITY_ZONES[number], cfg: { fill: string; stroke: string; label: string }) {
  return `
    <div style="min-width:220px;padding:14px;border-radius:16px;border:1px solid rgba(226,232,240,0.14);background:linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.03)),rgba(6,12,24,0.9);backdrop-filter:blur(16px);color:#e2e8f0;font-family:Inter,Arial,sans-serif;box-shadow:0 18px 45px rgba(2,6,23,0.35);">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;">
        <div>
          <div style="font-size:14px;font-weight:700;letter-spacing:0.01em;">${zone.name}</div>
          <div style="font-size:11px;color:#8aa0bf;margin-top:3px;">BayShield geospatial threat model</div>
        </div>
        <div style="padding:4px 8px;border-radius:999px;border:1px solid ${cfg.fill}44;background:${cfg.fill}1f;color:${cfg.fill};font-size:10px;font-weight:700;letter-spacing:0.14em;">${cfg.label}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 12px;font-size:11px;color:#b7c5d9;">
        <div>Flood zone <strong style="color:${cfg.fill};font-weight:700;">${zone.floodZone}</strong></div>
        <div>Risk <strong style="color:#f8fafc;font-weight:700;">${zone.riskScore}/100</strong></div>
        <div>Population <strong style="color:#f8fafc;font-weight:700;">${zone.population.toLocaleString()}</strong></div>
        <div>Elderly <strong style="color:#f8fafc;font-weight:700;">${zone.elderlyPct}%</strong></div>
        <div>Low-income <strong style="color:#f8fafc;font-weight:700;">${zone.lowIncomePct}%</strong></div>
        <div>Mobility impaired <strong style="color:#f8fafc;font-weight:700;">${zone.mobilityImpairedPct}%</strong></div>
      </div>
      <div style="margin-top:12px;height:6px;border-radius:999px;background:rgba(255,255,255,0.08);overflow:hidden;">
        <div style="width:${zone.riskScore}%;height:100%;border-radius:999px;background:linear-gradient(90deg,${cfg.stroke},${cfg.fill});"></div>
      </div>
    </div>
  `;
}

function resourceInfoContent(res: typeof RESOURCES[number], statusColor: string, pct: number) {
  return `
    <div style="min-width:220px;padding:14px;border-radius:16px;border:1px solid rgba(226,232,240,0.14);background:linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.03)),rgba(6,12,24,0.9);backdrop-filter:blur(16px);color:#e2e8f0;font-family:Inter,Arial,sans-serif;box-shadow:0 18px 45px rgba(2,6,23,0.35);">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;">
        <div>
          <div style="font-size:14px;font-weight:700;letter-spacing:0.01em;">${res.name}</div>
          <div style="font-size:11px;color:#8aa0bf;margin-top:3px;">${res.type.replace('_', ' ')}</div>
        </div>
        <div style="padding:4px 8px;border-radius:999px;border:1px solid ${statusColor}44;background:${statusColor}1f;color:${statusColor};font-size:10px;font-weight:700;letter-spacing:0.14em;">${res.status.toUpperCase()}</div>
      </div>
      <div style="font-size:11px;color:#b7c5d9;">Capacity <strong style="color:#f8fafc;font-weight:700;">${res.currentOccupancy.toLocaleString()} / ${res.capacity.toLocaleString()}</strong> (${pct}%)</div>
      <div style="margin-top:10px;height:6px;border-radius:999px;background:rgba(255,255,255,0.08);overflow:hidden;">
        <div style="width:${pct}%;height:100%;border-radius:999px;background:linear-gradient(90deg,${statusColor},#f8fafc);"></div>
      </div>
      ${res.supplies?.length ? `<div style="margin-top:12px;font-size:10px;color:#8aa0bf;line-height:1.5;">Supplies: <span style="color:#e2e8f0;">${res.supplies.slice(0, 4).join(' · ')}</span></div>` : ''}
    </div>
  `;
}

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
      backgroundColor: '#04101d',
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
    });

    infoWindowRef.current = new google.maps.InfoWindow();

    VULNERABILITY_ZONES.forEach(zone => {
      const cfg = ZONE_COLORS[zone.status] ?? ZONE_COLORS.safe;
      const marker = new google.maps.Marker({
        position: { lat: zone.lat, lng: zone.lng },
        map,
        title: zone.name,
        icon: createMarkerIcon(cfg.fill, cfg.stroke, String(zone.riskScore)),
        zIndex: zone.riskScore,
      });

      new google.maps.Circle({
        map,
        center: { lat: zone.lat, lng: zone.lng },
        radius: 500 + zone.riskScore * 14,
        strokeOpacity: 0,
        fillColor: cfg.fill,
        fillOpacity: zone.status === 'evacuate' ? 0.14 : zone.status === 'warning' ? 0.1 : 0.06,
        zIndex: zone.riskScore - 80,
      });

      marker.addListener('click', () => {
        infoWindowRef.current?.setContent(zoneInfoContent(zone, cfg));
        infoWindowRef.current?.open(map, marker);
        setSelectedZone(zone.id);
      });
    });

    RESOURCES.filter(resource => resource.type !== 'evacuation_route').forEach(resource => {
      const meta = RESOURCE_META[resource.type] ?? RESOURCE_META.supply_depot;
      const pct = Math.round((resource.currentOccupancy / resource.capacity) * 100);
      const marker = new google.maps.Marker({
        position: { lat: resource.lat, lng: resource.lng },
        map,
        title: resource.name,
        icon: createMarkerIcon(meta.tint, '#0b1220', meta.glyph),
        zIndex: 200,
      });

      new google.maps.Circle({
        map,
        center: { lat: resource.lat, lng: resource.lng },
        radius: resource.type === 'medical' ? 850 : 1050,
        strokeColor: meta.tint,
        strokeOpacity: 0.18,
        strokeWeight: 1,
        fillColor: meta.tint,
        fillOpacity: 0.04,
        zIndex: 60,
      });

      marker.addListener('click', () => {
        infoWindowRef.current?.setContent(resourceInfoContent(resource, meta.tint, pct));
        infoWindowRef.current?.open(map, marker);
      });
    });
  }, []);

  const tabs: { id: SidebarTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'evacuation', label: 'Evacuation', icon: <Route className="w-3.5 h-3.5" /> },
    { id: 'zones', label: 'Zones', icon: <Layers className="w-3.5 h-3.5" />, count: VULNERABILITY_ZONES.filter(zone => zone.status !== 'safe').length },
    { id: 'resources', label: 'Resources', icon: <Building2 className="w-3.5 h-3.5" />, count: RESOURCES.filter(resource => resource.type === 'shelter').length },
  ];

  return (
    <div className="flex min-h-full flex-col overflow-hidden xl:h-full xl:flex-row">
      <div
        className="flex w-full shrink-0 flex-col border-b border-white/8 xl:w-80 xl:border-b-0 xl:border-r"
        style={{ background: 'oklch(0.10 0.012 250)' }}
      >
        <div className="border-b border-white/8 p-4">
          <h1 className="flex items-center gap-2 text-sm font-semibold text-white">
            <MapPin className="w-4 h-4 text-blue-400" />
            Tampa Bay GeoScope
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-500">Thematic threat map, route intelligence, and coastal resource status</p>
        </div>

        {alerts.length > 0 && (
          <div className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" />
            <span className="text-[11px] text-red-300">{alerts.length} active NWS alert{alerts.length !== 1 ? 's' : ''}</span>
          </div>
        )}

        <div className="mt-3 flex overflow-x-auto border-b border-white/8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex min-w-24 flex-1 flex-col items-center gap-1 border-b-2 py-2.5 text-[10px] font-medium transition-colors',
                activeTab === tab.id ? 'border-blue-400 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'
              )}
            >
              {tab.icon}
              <span className="leading-none">{tab.label}</span>
              {tab.count !== undefined && (
                <span className={cn('rounded px-1 font-mono text-[9px]', activeTab === tab.id ? 'bg-blue-500/20 text-blue-400' : 'bg-white/8 text-slate-500')}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="overflow-hidden xl:flex-1">
          {activeTab === 'evacuation' && (
            <div className="max-h-[70vh] overflow-y-auto xl:h-full xl:max-h-none">
              <EvacuationRouter map={mapInstance} />
            </div>
          )}

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
                      'w-full rounded-xl border p-3 text-left transition-all',
                      selectedZone === zone.id ? 'border-white/20 bg-white/8' : 'border-white/8 bg-white/4 hover:bg-white/6'
                    )}
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">{zone.name}</span>
                      <span
                        className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold"
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
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${zone.riskScore}%`, background: cfg.fill }} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="h-full max-h-[70vh] space-y-2 overflow-y-auto p-3 xl:max-h-none">
              {RESOURCES.filter(resource => resource.type !== 'evacuation_route').map(resource => {
                const pct = Math.round((resource.currentOccupancy / resource.capacity) * 100);
                const statusColor = resource.status === 'available' ? '#34d399' : resource.status === 'filling' ? '#fbbf24' : '#f87171';
                return (
                  <button
                    key={resource.id}
                    onClick={() => {
                      mapInstance?.panTo({ lat: resource.lat, lng: resource.lng });
                      mapInstance?.setZoom(14);
                    }}
                    className="w-full rounded-xl border border-white/8 bg-white/4 p-3 text-left transition-all hover:bg-white/6"
                  >
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="text-base">{RESOURCE_META[resource.type]?.glyph ?? 'R'}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-white">{resource.name}</div>
                        <div className="text-[10px] text-slate-500">{resource.type.replace('_', ' ')}</div>
                      </div>
                      <span
                        className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold"
                        style={{ background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}44` }}
                      >
                        {resource.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="mb-1 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{resource.currentOccupancy.toLocaleString()} / {resource.capacity.toLocaleString()}</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: statusColor }} />
                    </div>
                    {resource.supplies && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {resource.supplies.slice(0, 3).map(supply => (
                          <span key={supply} className="rounded border border-white/8 bg-white/6 px-1 py-0.5 text-[9px] text-slate-400">{supply}</span>
                        ))}
                        {resource.supplies.length > 3 && <span className="text-[9px] text-slate-500">+{resource.supplies.length - 3} more</span>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="relative min-h-[50vh] flex-1 overflow-hidden xl:min-h-0 xl:rounded-l-[32px]">
        <MapView onMapReady={handleMapReady} className="h-full min-h-[50vh] w-full xl:min-h-0" />

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_32%,rgba(56,189,248,0.16),transparent_24%),radial-gradient(circle_at_28%_78%,rgba(16,185,129,0.1),transparent_24%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(110,168,221,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(110,168,221,0.16)_1px,transparent_1px)] [background-size:84px_84px]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,8,20,0.1),rgba(2,8,20,0.35)),linear-gradient(90deg,rgba(2,8,20,0.24),rgba(2,8,20,0)_34%,rgba(2,8,20,0)_68%,rgba(2,8,20,0.28))]" />

        <div className="pointer-events-none absolute left-4 top-4 hidden rounded-2xl border border-cyan-300/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)),rgba(4,10,20,0.44)] px-4 py-3 shadow-[0_18px_38px_rgba(2,6,23,0.3),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl lg:block">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.24em] text-cyan-200/85">
            <Radar className="h-3.5 w-3.5" />
            BayShield GeoScope
          </div>
          <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-300/90">
            <span className="flex items-center gap-1.5"><Waves className="h-3.5 w-3.5 text-cyan-300" /> Coastal exposure overlay</span>
            <span className="flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5 text-emerald-300" /> Priority routes</span>
          </div>
        </div>

        <div
          className="absolute right-3 top-3 rounded-2xl p-3 sm:right-4 sm:top-4"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03)), rgba(8,15,26,0.62)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 22px 44px rgba(2,6,23,0.28), inset 0 1px 0 rgba(255,255,255,0.08)' }}
        >
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">Zone Status</p>
          {Object.entries(ZONE_COLORS).map(([status, cfg]) => (
            <div key={status} className="mb-1 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ background: cfg.fill }} />
              <span className="text-[10px] text-slate-300">{cfg.label}</span>
            </div>
          ))}
        </div>

        {activeTab !== 'evacuation' && (
          <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4">
            <button
              onClick={() => setActiveTab('evacuation')}
              className="flex items-center gap-2 rounded-full border border-cyan-300/18 bg-[linear-gradient(180deg,rgba(56,189,248,0.24),rgba(37,99,235,0.12))] px-3 py-2 text-xs font-medium text-white shadow-[0_18px_38px_rgba(2,6,23,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] transition-colors hover:bg-[linear-gradient(180deg,rgba(56,189,248,0.3),rgba(37,99,235,0.15))]"
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
