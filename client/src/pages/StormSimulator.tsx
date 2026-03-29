// ============================================================
// BAYSHIELD -- Storm Simulation Studio
// Draw a storm track on the map, configure parameters,
// and get LLM-powered infrastructure impact analysis.
// ============================================================
import { useState, useRef, useCallback, useEffect } from 'react';
import { MapView } from '@/components/Map';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  Plus, Trash2, Play, RotateCcw, ChevronDown, ChevronRight,
  Zap, AlertTriangle, Users, Building2, Car, Waves, DollarSign,
  Radio, Droplets, Plane, Ship, Hospital, Clock, MapPin,
  CheckCircle2, Loader2, History, X, Wind, Move
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface TrackPoint { lat: number; lng: number; label?: string; }

interface StormParams {
  name: string;
  stormType: 'hurricane' | 'tropical_storm' | 'tropical_depression' | 'tornado' | 'flood' | 'nor_easter';
  category: number;
  windSpeedKph: number;
  radiusKm: number;
  forwardSpeedKph: number;
}

type SimStatus = 'idle' | 'drawing' | 'analyzing' | 'complete' | 'error';

// ── Constants ────────────────────────────────────────────────────────────────

const STORM_TYPES = [
  { value: 'hurricane', label: 'Hurricane', icon: '🌀' },
  { value: 'tropical_storm', label: 'Tropical Storm', icon: '🌪️' },
  { value: 'tropical_depression', label: 'Tropical Depression', icon: '🌧️' },
  { value: 'tornado', label: 'Tornado', icon: '🌪️' },
  { value: 'flood', label: 'Flood Event', icon: '🌊' },
  { value: 'nor_easter', label: "Nor'easter", icon: '❄️' },
] as const;

const CATEGORY_COLORS: Record<number, { track: string; fill: string; label: string }> = {
  1: { track: '#22d3ee', fill: '#22d3ee33', label: 'Cat 1 — 119-153 km/h' },
  2: { track: '#a3e635', fill: '#a3e63533', label: 'Cat 2 — 154-177 km/h' },
  3: { track: '#facc15', fill: '#facc1533', label: 'Cat 3 — 178-208 km/h' },
  4: { track: '#f97316', fill: '#f9731633', label: 'Cat 4 — 209-251 km/h' },
  5: { track: '#ef4444', fill: '#ef444433', label: 'Cat 5 — 252+ km/h' },
};

const SEVERITY_COLORS: Record<string, string> = {
  catastrophic: 'text-red-400',
  major: 'text-orange-400',
  moderate: 'text-amber-400',
  minor: 'text-emerald-400',
};

const SEVERITY_BG: Record<string, string> = {
  catastrophic: 'bg-red-400/10 border-red-400/20',
  major: 'bg-orange-400/10 border-orange-400/20',
  moderate: 'bg-amber-400/10 border-amber-400/20',
  minor: 'bg-emerald-400/10 border-emerald-400/20',
};

const THREAT_COLORS: Record<string, string> = {
  CRITICAL: 'text-red-400 bg-red-400/10 border-red-400/30',
  HIGH: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  MODERATE: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  LOW: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={cn(
      'text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase',
      SEVERITY_BG[severity] ?? 'bg-slate-400/10 border-slate-400/20',
      SEVERITY_COLORS[severity] ?? 'text-slate-400'
    )}>
      {severity}
    </span>
  );
}

function InfraCard({ icon: Icon, title, data }: {
  icon: React.ElementType;
  title: string;
  data: { severity?: string; details?: string; estimatedOutages?: string; restorationDays?: number; closures?: string[]; atRisk?: string[]; closureHours?: number; floodingRisk?: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
      >
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
          SEVERITY_BG[data.severity ?? 'minor'] ?? 'bg-slate-400/10'
        )}>
          <Icon className={cn('w-4 h-4', SEVERITY_COLORS[data.severity ?? 'minor'] ?? 'text-slate-400')} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">{title}</span>
            {data.severity && <SeverityBadge severity={data.severity} />}
          </div>
          {data.estimatedOutages && (
            <p className="text-[11px] text-muted-foreground truncate">{data.estimatedOutages} affected</p>
          )}
          {data.closureHours !== undefined && (
            <p className="text-[11px] text-muted-foreground">{data.closureHours}h closure expected</p>
          )}
        </div>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-2">
          {data.details && <p className="text-xs text-muted-foreground leading-relaxed">{data.details}</p>}
          {data.floodingRisk && <p className="text-xs text-amber-400/80">{data.floodingRisk}</p>}
          {data.closures?.length ? (
            <div>
              <p className="text-[10px] text-muted-foreground/60 uppercase font-mono mb-1">Closures</p>
              <ul className="space-y-0.5">
                {data.closures.map((c, i) => <li key={i} className="text-xs text-foreground/80 flex items-start gap-1"><span className="text-red-400 mt-0.5">•</span>{c}</li>)}
              </ul>
            </div>
          ) : null}
          {data.atRisk?.length ? (
            <div>
              <p className="text-[10px] text-muted-foreground/60 uppercase font-mono mb-1">At Risk</p>
              <ul className="space-y-0.5">
                {data.atRisk.map((a, i) => <li key={i} className="text-xs text-foreground/80 flex items-start gap-1"><span className="text-amber-400 mt-0.5">•</span>{a}</li>)}
              </ul>
            </div>
          ) : null}
          {data.restorationDays !== undefined && (
            <p className="text-xs text-muted-foreground">Est. restoration: <span className="text-foreground">{data.restorationDays} days</span></p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function StormSimulator() {
  // Map refs
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  // State
  const [track, setTrack] = useState<TrackPoint[]>([]);
  const [params, setParams] = useState<StormParams>({
    name: 'Hurricane Alpha',
    stormType: 'hurricane',
    category: 3,
    windSpeedKph: 185,
    radiusKm: 80,
    forwardSpeedKph: 22,
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [simStatus, setSimStatus] = useState<SimStatus>('idle');
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);
  const [analysisText, setAnalysisText] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>('summary');
  const [showHistory, setShowHistory] = useState(false);
  const [selectedSimId, setSelectedSimId] = useState<string | null>(null);

  // tRPC
  const createSim = trpc.simulator.create.useMutation();
  const { data: history, refetch: refetchHistory } = trpc.simulator.list.useQuery({ limit: 10 });
  const { data: selectedSim } = trpc.simulator.get.useQuery(
    { simId: selectedSimId ?? '' },
    { enabled: !!selectedSimId }
  );
  const deleteSim = trpc.simulator.delete.useMutation({ onSuccess: () => refetchHistory() });

  // ── Map helpers ──────────────────────────────────────────────────────────────

  const getTrackColor = useCallback(() => {
    if (params.stormType === 'hurricane') return CATEGORY_COLORS[params.category]?.track ?? '#ef4444';
    if (params.stormType === 'flood') return '#3b82f6';
    if (params.stormType === 'tornado') return '#a855f7';
    return '#94a3b8';
  }, [params.stormType, params.category]);

  const redrawTrack = useCallback((pts: TrackPoint[]) => {
    if (!mapRef.current) return;
    const color = getTrackColor();

    // Clear old polyline
    if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }

    if (pts.length < 2) return;
    polylineRef.current = new window.google.maps.Polyline({
      path: pts,
      geodesic: true,
      strokeColor: color,
      strokeOpacity: 0.9,
      strokeWeight: 3,
      map: mapRef.current,
      icons: [{
        icon: { path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3, fillColor: color, fillOpacity: 1, strokeWeight: 0 },
        offset: '100%',
        repeat: '120px',
      }],
    });
  }, [getTrackColor]);

  const redrawCircles = useCallback((pts: TrackPoint[]) => {
    if (!mapRef.current) return;
    circlesRef.current.forEach(c => c.setMap(null));
    circlesRef.current = [];

    if (pts.length === 0) return;
    const color = getTrackColor();
    const fillColor = params.stormType === 'hurricane'
      ? CATEGORY_COLORS[params.category]?.fill ?? '#ef444433'
      : '#94a3b833';

    // Draw wind radius circle on each waypoint
    pts.forEach(pt => {
      const circle = new window.google.maps.Circle({
        center: pt,
        radius: params.radiusKm * 1000,
        strokeColor: color,
        strokeOpacity: 0.3,
        strokeWeight: 1,
        fillColor,
        fillOpacity: 0.15,
        map: mapRef.current!,
      });
      circlesRef.current.push(circle);
    });
  }, [getTrackColor, params.radiusKm, params.category, params.stormType]);

  const addMarker = useCallback((pt: TrackPoint, index: number, total: number) => {
    if (!mapRef.current) return;
    const color = getTrackColor();
    const isFirst = index === 0;
    const isLast = index === total - 1;

    const el = document.createElement('div');
    el.style.cssText = `
      width: ${isFirst || isLast ? '20px' : '12px'};
      height: ${isFirst || isLast ? '20px' : '12px'};
      background: ${color};
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 0 8px ${color}88;
      cursor: pointer;
    `;
    if (isFirst) el.title = 'Storm origin';
    if (isLast) el.title = 'Projected landfall';

    const marker = new window.google.maps.marker.AdvancedMarkerElement({
      map: mapRef.current,
      position: pt,
      content: el,
      title: pt.label ?? `Waypoint ${index + 1}`,
    });
    markersRef.current.push(marker);
  }, [getTrackColor]);

  const clearMap = useCallback(() => {
    markersRef.current.forEach(m => { m.map = null; });
    markersRef.current = [];
    if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }
    circlesRef.current.forEach(c => c.setMap(null));
    circlesRef.current = [];
  }, []);

  const renderTrack = useCallback((pts: TrackPoint[]) => {
    clearMap();
    pts.forEach((pt, i) => addMarker(pt, i, pts.length));
    redrawTrack(pts);
    redrawCircles(pts);
  }, [clearMap, addMarker, redrawTrack, redrawCircles]);

  // Re-render track when params change (color/radius)
  useEffect(() => {
    if (track.length > 0) renderTrack(track);
  }, [params.category, params.stormType, params.radiusKm, renderTrack, track]);

  // ── Drawing mode ─────────────────────────────────────────────────────────────

  const startDrawing = useCallback(() => {
    if (!mapRef.current) return;
    setIsDrawing(true);
    mapRef.current.setOptions({ draggableCursor: 'crosshair' });

    clickListenerRef.current = mapRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const pt: TrackPoint = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setTrack(prev => {
        const next = [...prev, pt];
        renderTrack(next);
        return next;
      });
    });
  }, [renderTrack]);

  const stopDrawing = useCallback(() => {
    if (!mapRef.current) return;
    setIsDrawing(false);
    mapRef.current.setOptions({ draggableCursor: '' });
    if (clickListenerRef.current) {
      window.google.maps.event.removeListener(clickListenerRef.current);
      clickListenerRef.current = null;
    }
  }, []);

  const resetTrack = useCallback(() => {
    stopDrawing();
    setTrack([]);
    clearMap();
    setSimStatus('idle');
    setAnalysis(null);
    setAnalysisText('');
    setSelectedSimId(null);
  }, [stopDrawing, clearMap]);

  const removeLastPoint = useCallback(() => {
    setTrack(prev => {
      const next = prev.slice(0, -1);
      renderTrack(next);
      return next;
    });
  }, [renderTrack]);

  // ── Run simulation ────────────────────────────────────────────────────────────

  const runSimulation = useCallback(async () => {
    if (track.length < 2) return;
    stopDrawing();
    setSimStatus('analyzing');
    setAnalysis(null);
    setAnalysisText('');
    setSelectedSimId(null);

    const landfall = track[track.length - 1];

    try {
      const result = await createSim.mutateAsync({
        name: params.name,
        stormType: params.stormType,
        category: params.stormType === 'hurricane' ? params.category : undefined,
        windSpeedKph: params.windSpeedKph,
        radiusKm: params.radiusKm,
        forwardSpeedKph: params.forwardSpeedKph,
        track,
        landfall,
      });

      if (result.status === 'complete' && result.analysis) {
        setAnalysis(result.analysis as Record<string, unknown>);
        setAnalysisText(result.analysisText ?? '');
        setSimStatus('complete');
        setActiveSection('summary');
        refetchHistory();
      } else {
        setSimStatus('error');
        setAnalysisText(result.analysisText ?? 'Analysis failed.');
      }
    } catch {
      setSimStatus('error');
      setAnalysisText('Failed to run simulation. Please try again.');
    }
  }, [track, params, stopDrawing, createSim, refetchHistory]);

  // ── Load historical simulation ────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedSim || !mapRef.current) return;
    const pts = selectedSim.track as TrackPoint[];
    setTrack(pts);
    renderTrack(pts);
    setAnalysis(selectedSim.analysis as Record<string, unknown> | null);
    setAnalysisText(selectedSim.analysisText ?? '');
    setSimStatus(selectedSim.status === 'complete' ? 'complete' : 'idle');
    setActiveSection('summary');
    setShowHistory(false);
    // Fit map to track
    if (pts.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      pts.forEach(p => bounds.extend(p));
      mapRef.current.fitBounds(bounds, 80);
    }
  }, [selectedSim, renderTrack]);

  // ── Render ────────────────────────────────────────────────────────────────────

  const infra = (analysis?.infrastructureImpacts as Record<string, unknown>) ?? {};
  const evac = (analysis?.evacuationZones as Record<string, unknown>) ?? {};
  const shelter = (analysis?.shelterDemand as Record<string, unknown>) ?? {};
  const surge = (analysis?.stormSurge as Record<string, unknown>) ?? {};
  const econ = (analysis?.economicImpact as Record<string, unknown>) ?? {};
  const agentRecs = (analysis?.agentRecommendations as Record<string, string>) ?? {};
  const actions = (analysis?.immediateActions as string[]) ?? [];

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* ── Left panel: params + controls ── */}
      <div className="w-72 flex-shrink-0 border-r border-border/50 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold flex items-center gap-2">
              <Wind className="w-4 h-4 text-cyan-400" />
              Simulation Studio
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">Plot track → configure → analyze</p>
          </div>
          <button
            onClick={() => setShowHistory(v => !v)}
            className={cn(
              'p-1.5 rounded-lg border transition-colors',
              showHistory ? 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' : 'text-muted-foreground border-border/50 hover:bg-white/5'
            )}
            title="Simulation history"
          >
            <History className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Storm name */}
          <div>
            <label className="text-[11px] text-muted-foreground uppercase font-mono mb-1.5 block">Storm Name</label>
            <input
              value={params.name}
              onChange={e => setParams(p => ({ ...p, name: e.target.value }))}
              className="w-full bg-card border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400/50 transition-colors"
              placeholder="e.g. Hurricane Alpha"
            />
          </div>

          {/* Storm type */}
          <div>
            <label className="text-[11px] text-muted-foreground uppercase font-mono mb-1.5 block">Storm Type</label>
            <div className="grid grid-cols-2 gap-1.5">
              {STORM_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setParams(p => ({ ...p, stormType: t.value }))}
                  className={cn(
                    'flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg border transition-all',
                    params.stormType === t.value
                      ? 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30'
                      : 'text-muted-foreground border-border/50 hover:bg-white/5'
                  )}
                >
                  <span>{t.icon}</span>
                  <span className="truncate">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category (hurricanes only) */}
          {params.stormType === 'hurricane' && (
            <div>
              <label className="text-[11px] text-muted-foreground uppercase font-mono mb-1.5 block">
                Category — {CATEGORY_COLORS[params.category]?.label}
              </label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(c => (
                  <button
                    key={c}
                    onClick={() => setParams(p => ({ ...p, category: c, windSpeedKph: [120, 155, 185, 220, 260][c - 1] }))}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all',
                      params.category === c
                        ? 'border-current'
                        : 'border-border/50 text-muted-foreground hover:bg-white/5'
                    )}
                    style={params.category === c ? { color: CATEGORY_COLORS[c].track, backgroundColor: CATEGORY_COLORS[c].fill } : {}}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Wind speed */}
          <div>
            <label className="text-[11px] text-muted-foreground uppercase font-mono mb-1.5 flex items-center justify-between">
              <span>Wind Speed</span>
              <span className="text-foreground">{params.windSpeedKph} km/h</span>
            </label>
            <input type="range" min={50} max={400} step={5}
              value={params.windSpeedKph}
              onChange={e => setParams(p => ({ ...p, windSpeedKph: +e.target.value }))}
              className="w-full accent-cyan-400"
            />
          </div>

          {/* Wind radius */}
          <div>
            <label className="text-[11px] text-muted-foreground uppercase font-mono mb-1.5 flex items-center justify-between">
              <span>Wind Radius</span>
              <span className="text-foreground">{params.radiusKm} km</span>
            </label>
            <input type="range" min={20} max={400} step={10}
              value={params.radiusKm}
              onChange={e => setParams(p => ({ ...p, radiusKm: +e.target.value }))}
              className="w-full accent-cyan-400"
            />
          </div>

          {/* Forward speed */}
          <div>
            <label className="text-[11px] text-muted-foreground uppercase font-mono mb-1.5 flex items-center justify-between">
              <span>Forward Speed</span>
              <span className="text-foreground">{params.forwardSpeedKph} km/h</span>
            </label>
            <input type="range" min={5} max={80} step={1}
              value={params.forwardSpeedKph}
              onChange={e => setParams(p => ({ ...p, forwardSpeedKph: +e.target.value }))}
              className="w-full accent-cyan-400"
            />
          </div>

          {/* Track controls */}
          <div className="space-y-2 pt-1">
            <label className="text-[11px] text-muted-foreground uppercase font-mono block">
              Storm Track — {track.length} waypoint{track.length !== 1 ? 's' : ''}
            </label>

            {!isDrawing ? (
              <button
                onClick={startDrawing}
                disabled={simStatus === 'analyzing'}
                className="w-full flex items-center justify-center gap-2 text-xs py-2 rounded-lg border text-cyan-400 bg-cyan-400/10 border-cyan-400/20 hover:bg-cyan-400/20 transition-all disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                {track.length === 0 ? 'Start Drawing Track' : 'Add More Points'}
              </button>
            ) : (
              <button
                onClick={stopDrawing}
                className="w-full flex items-center justify-center gap-2 text-xs py-2 rounded-lg border text-amber-400 bg-amber-400/10 border-amber-400/20 hover:bg-amber-400/20 transition-all"
              >
                <Move className="w-3.5 h-3.5" />
                Click map to add points — Done
              </button>
            )}

            {track.length > 0 && (
              <div className="flex gap-1.5">
                <button
                  onClick={removeLastPoint}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg border text-slate-400 border-border/50 hover:bg-white/5 transition-all"
                >
                  <Trash2 className="w-3 h-3" />Undo Last
                </button>
                <button
                  onClick={resetTrack}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg border text-red-400 border-red-400/20 hover:bg-red-400/10 transition-all"
                >
                  <RotateCcw className="w-3 h-3" />Reset
                </button>
              </div>
            )}
          </div>

          {/* Run button */}
          <button
            onClick={runSimulation}
            disabled={track.length < 2 || simStatus === 'analyzing'}
            className={cn(
              'w-full flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl border font-medium transition-all',
              track.length >= 2 && simStatus !== 'analyzing'
                ? 'text-white bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-400/30 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20'
                : 'text-muted-foreground border-border/30 cursor-not-allowed opacity-50'
            )}
          >
            {simStatus === 'analyzing' ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Analyzing with AI…</>
            ) : (
              <><Play className="w-4 h-4" />Run Impact Analysis</>
            )}
          </button>

          {track.length < 2 && (
            <p className="text-[11px] text-muted-foreground/60 text-center">
              Add at least 2 waypoints to run analysis
            </p>
          )}
        </div>
      </div>

      {/* ── Center: Map ── */}
      <div className="flex-1 relative min-w-0">
        <MapView
          className="w-full h-full"
          initialCenter={{ lat: 27.9506, lng: -82.4572 }}
          initialZoom={8}
          onMapReady={map => { mapRef.current = map; }}
        />

        {/* Drawing mode overlay */}
        {isDrawing && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm border border-cyan-400/30 rounded-xl px-4 py-2 flex items-center gap-2 text-xs text-cyan-400 pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Click on the map to place storm track waypoints
          </div>
        )}

        {/* Track info overlay */}
        {track.length > 0 && !isDrawing && (
          <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm border border-border/50 rounded-xl px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3 text-cyan-400" />
              <span className="text-foreground">{track.length} waypoints</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">Landfall: {track[track.length - 1].lat.toFixed(3)}°N, {Math.abs(track[track.length - 1].lng).toFixed(3)}°W</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Right panel: Results or History ── */}
      <div className="w-80 flex-shrink-0 border-l border-border/50 flex flex-col overflow-hidden">
        {showHistory ? (
          <>
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <h2 className="text-sm font-medium flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" />
                Past Simulations
              </h2>
              <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {!history?.length && (
                <p className="text-xs text-muted-foreground text-center py-8">No simulations yet</p>
              )}
              {history?.map(sim => (
                <div
                  key={sim.simId}
                  className={cn(
                    'bg-card border rounded-xl p-3 cursor-pointer hover:border-cyan-400/30 transition-all group',
                    selectedSimId === sim.simId ? 'border-cyan-400/40 bg-cyan-400/5' : 'border-border/50'
                  )}
                  onClick={() => setSelectedSimId(sim.simId)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{sim.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {sim.stormType.replace(/_/g, ' ')} {sim.category ? `Cat ${sim.category}` : ''} · {sim.windSpeedKph} km/h
                      </p>
                      {(sim.affectedPopulation ?? 0) > 0 && (
                        <p className="text-[11px] text-amber-400">{((sim.affectedPopulation ?? 0) / 1000).toFixed(0)}k at risk</p>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); deleteSim.mutate({ simId: sim.simId }); }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="p-4 border-b border-border/50">
              <h2 className="text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                Impact Analysis
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">LLM-powered infrastructure predictions</p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Idle state */}
              {simStatus === 'idle' && (
                <div className="text-center py-12">
                  <Wind className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Draw a storm track on the map and run analysis to see AI-powered impact predictions</p>
                </div>
              )}

              {/* Analyzing */}
              {simStatus === 'analyzing' && (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-cyan-400 mx-auto mb-3 animate-spin" />
                  <p className="text-sm text-foreground font-medium">Analyzing storm impact…</p>
                  <p className="text-xs text-muted-foreground mt-1">AI is modeling infrastructure, evacuation zones, and resource demands</p>
                </div>
              )}

              {/* Error */}
              {simStatus === 'error' && (
                <div className="bg-red-400/5 border border-red-400/20 rounded-xl p-4">
                  <p className="text-xs font-medium text-red-400 mb-1">Analysis Failed</p>
                  <p className="text-xs text-muted-foreground">{analysisText}</p>
                </div>
              )}

              {/* Results */}
              {simStatus === 'complete' && analysis && (
                <>
                  {/* Threat level + summary */}
                  <div className={cn(
                    'rounded-xl p-3 border',
                    THREAT_COLORS[(analysis.threatLevel as string) ?? 'MODERATE']
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase">Threat Level</span>
                      <span className="text-sm font-bold">{analysis.threatLevel as string}</span>
                    </div>
                    <p className="text-xs leading-relaxed opacity-90">{analysis.summary as string}</p>
                  </div>

                  {/* Key stats */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: Users, label: 'At Risk', value: ((analysis.affectedPopulation as number) / 1000).toFixed(0) + 'k', color: 'text-amber-400' },
                      { icon: Waves, label: 'Max Surge', value: `${(surge.maxSurgeMeters as number)?.toFixed(1) ?? '?'}m`, color: 'text-blue-400' },
                      { icon: DollarSign, label: 'Est. Damage', value: econ.estimatedDamageUSD as string ?? '?', color: 'text-red-400' },
                      { icon: Clock, label: 'Recovery', value: `${econ.recoveryMonths as number ?? '?'} mo`, color: 'text-purple-400' },
                    ].map(({ icon: Icon, label, value, color }) => (
                      <div key={label} className="bg-card border border-border/50 rounded-xl p-3">
                        <Icon className={cn('w-4 h-4 mb-1', color)} />
                        <p className="text-xs font-semibold">{value}</p>
                        <p className="text-[10px] text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Infrastructure impacts */}
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase font-mono mb-2">Infrastructure Impacts</p>
                    <div className="space-y-1.5">
                      <InfraCard icon={Zap} title="Power Grid" data={infra.power as Record<string, unknown>} />
                      <InfraCard icon={Car} title="Roads & Highways" data={infra.roads as Record<string, unknown>} />
                      <InfraCard icon={Building2} title="Bridges" data={infra.bridges as Record<string, unknown>} />
                      <InfraCard icon={Plane} title="Airport" data={infra.airports as Record<string, unknown>} />
                      <InfraCard icon={Ship} title="Port Tampa Bay" data={infra.port as Record<string, unknown>} />
                      <InfraCard icon={Hospital} title="Hospitals" data={infra.hospitals as Record<string, unknown>} />
                      <InfraCard icon={Radio} title="Communications" data={infra.communications as Record<string, unknown>} />
                      <InfraCard icon={Droplets} title="Water & Sewer" data={infra.waterSewer as Record<string, unknown>} />
                    </div>
                  </div>

                  {/* Evacuation zones */}
                  <div className="bg-card border border-border/50 rounded-xl p-3">
                    <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      Evacuation Zones
                    </p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-[10px] text-red-400 uppercase font-mono mb-1">Mandatory</p>
                        <ul className="space-y-0.5">
                          {(evac.mandatory as string[] ?? []).map((z, i) => (
                            <li key={i} className="text-xs text-foreground/80 flex items-start gap-1">
                              <span className="text-red-400 mt-0.5 flex-shrink-0">•</span>{z}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/30">
                        <span className="text-muted-foreground">Estimated evacuees</span>
                        <span className="font-medium">{((evac.estimatedEvacuees as number) / 1000)?.toFixed(0)}k</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Lead time needed</span>
                        <span className="font-medium text-amber-400">{evac.timeToEvacuate as string}</span>
                      </div>
                    </div>
                  </div>

                  {/* Immediate actions */}
                  {actions.length > 0 && (
                    <div className="bg-card border border-border/50 rounded-xl p-3">
                      <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Immediate Actions
                      </p>
                      <ol className="space-y-1.5">
                        {actions.map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs">
                            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">{i + 1}</span>
                            <span className="text-foreground/80 leading-relaxed">{a}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Agent recommendations */}
                  {Object.keys(agentRecs).length > 0 && (
                    <div className="bg-card border border-border/50 rounded-xl p-3">
                      <p className="text-xs font-medium mb-2">Agent Recommendations</p>
                      <div className="space-y-2">
                        {[
                          { key: 'stormWatcher', icon: '🌀', label: 'Storm Watcher' },
                          { key: 'vulnerabilityMapper', icon: '🗺️', label: 'Vulnerability Mapper' },
                          { key: 'resourceCoordinator', icon: '📦', label: 'Resource Coordinator' },
                          { key: 'alertCommander', icon: '🚨', label: 'Alert Commander' },
                        ].map(({ key, icon, label }) => agentRecs[key] ? (
                          <div key={key} className="text-xs">
                            <p className="text-[11px] text-muted-foreground mb-0.5">{icon} {label}</p>
                            <p className="text-foreground/80 leading-relaxed">{agentRecs[key]}</p>
                          </div>
                        ) : null)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
