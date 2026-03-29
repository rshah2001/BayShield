// ============================================================
// BAYSHIELD — Storm Simulation Studio v4
// Fixes: map stored in state so overlay re-renders correctly
// Mobile: stacked responsive layout with bottom sheet panels
// ============================================================
import { useState, useRef, useCallback, useEffect } from 'react';
import { MapView } from '@/components/Map';
import { trpc } from '@/lib/trpc';
import HurricaneMapOverlay from '@/components/HurricaneMapOverlay';
import { cn } from '@/lib/utils';
import {
  Plus, Trash2, Play, RotateCcw, ChevronDown, ChevronUp,
  Zap, AlertTriangle, Users, Building2, Car, Waves, DollarSign,
  Radio, Droplets, Plane, Ship, Hospital, Clock,
  CheckCircle2, Loader2, History, X, Wind, Square,
  TrendingUp, TrendingDown, Minus, ArrowRight, Settings, Pause,
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
type SimStatus = 'idle' | 'analyzing' | 'complete' | 'error';
type MobileTab = 'config' | 'analysis';

// ── Constants ─────────────────────────────────────────────────────────────────
const STORM_TYPES = [
  { value: 'hurricane', label: 'Hurricane', icon: '🌀' },
  { value: 'tropical_storm', label: 'Tropical Storm', icon: '🌪️' },
  { value: 'tropical_depression', label: 'Tropical Dep.', icon: '🌧️' },
  { value: 'tornado', label: 'Tornado', icon: '🌪️' },
  { value: 'flood', label: 'Flood Event', icon: '🌊' },
  { value: 'nor_easter', label: "Nor'easter", icon: '❄️' },
] as const;

const CAT_COLORS: Record<number, { track: string; fill: string; label: string; bg: string }> = {
  1: { track: '#22d3ee', fill: '#22d3ee22', label: 'Cat 1', bg: 'bg-cyan-400/10 border-cyan-400/30 text-cyan-400' },
  2: { track: '#a3e635', fill: '#a3e63522', label: 'Cat 2', bg: 'bg-lime-400/10 border-lime-400/30 text-lime-400' },
  3: { track: '#facc15', fill: '#facc1522', label: 'Cat 3', bg: 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400' },
  4: { track: '#f97316', fill: '#f9731622', label: 'Cat 4', bg: 'bg-orange-400/10 border-orange-400/30 text-orange-400' },
  5: { track: '#ef4444', fill: '#ef444422', label: 'Cat 5', bg: 'bg-red-400/10 border-red-400/30 text-red-400' },
};

const SEVERITY_STYLE: Record<string, { text: string; bg: string; dot: string }> = {
  catastrophic: { text: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', dot: 'bg-red-400' },
  major:        { text: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20', dot: 'bg-orange-400' },
  moderate:     { text: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20', dot: 'bg-amber-400' },
  minor:        { text: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', dot: 'bg-emerald-400' },
};

const THREAT_STYLE: Record<string, string> = {
  CRITICAL: 'text-red-400 bg-red-400/10 border-red-400/30',
  HIGH:     'text-orange-400 bg-orange-400/10 border-orange-400/30',
  MODERATE: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  LOW:      'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
};

const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0a1628' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#020b18' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4a6fa5' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#061020' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#1e3a5f' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0d1f35' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#0f2340' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a3a5c' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0d2240' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1e4a7a' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#0d2a4a' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#3a7abf' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1a3a5c' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#2a5a8a' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#2a6a9a' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#0d2240' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#1e4a7a' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0a2030' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#0d2240' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#1e4a7a' }] },
];

// ── InfraRow ──────────────────────────────────────────────────────────────────
function InfraRow({ icon: Icon, title, data }: {
  icon: React.ElementType;
  title: string;
  data: Record<string, unknown>;
}) {
  const [open, setOpen] = useState(false);
  const sev = (data.severity as string) ?? 'minor';
  const style = SEVERITY_STYLE[sev] ?? SEVERITY_STYLE.minor;
  return (
    <div className="border border-border/40 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.03] transition-colors text-left"
      >
        <div className={cn('w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 border', style.bg)}>
          <Icon className={cn('w-3 h-3', style.text)} />
        </div>
        <span className="text-xs flex-1 text-foreground/80">{title}</span>
        <div className="flex items-center gap-1.5">
          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', style.dot)} />
          <span className={cn('text-[10px] font-mono capitalize', style.text)}>{sev}</span>
          {open ? <ChevronUp className="w-3 h-3 text-muted-foreground/30" /> : <ChevronDown className="w-3 h-3 text-muted-foreground/30" />}
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1.5 border-t border-white/[0.06]">
          {!!data.description && <p className="text-[11px] text-foreground/60 leading-relaxed pt-2">{String(data.description)}</p>}
          {!!data.outageEstimate && <p className="text-[10px] text-muted-foreground/50">Outage: <span className="text-foreground/60">{String(data.outageEstimate)}</span></p>}
          {!!data.specificClosures && <p className="text-[10px] text-muted-foreground/50">Closures: <span className="text-foreground/60">{String(data.specificClosures)}</span></p>}
        </div>
      )}
    </div>
  );
}

// ── IntensityTimeline ─────────────────────────────────────────────────────────
function IntensityTimeline({ track, category, stormType }: {
  track: TrackPoint[];
  category: number;
  stormType: string;
}) {
  if (track.length < 2) return null;
  const TAMPA_BAY_COAST = { lat: 27.9, lng: -82.55 };
  function isNearLand(pt: TrackPoint) {
    return pt.lat > TAMPA_BAY_COAST.lat - 0.3 && pt.lng > TAMPA_BAY_COAST.lng - 0.3;
  }
  const points = track.map((pt, i) => {
    const progress = track.length > 1 ? i / (track.length - 1) : 0;
    const onLand = isNearLand(pt);
    const landDecay = onLand ? Math.max(0.4, 1 - progress * 0.6) : 1;
    const cat = stormType === 'hurricane' ? Math.max(1, Math.round(category * landDecay)) : 0;
    return { cat, onLand, progress };
  });

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] text-muted-foreground/60 uppercase font-mono tracking-wider">Intensity Timeline</label>
      <div className="flex items-end gap-0.5 h-10 bg-white/[0.02] rounded-lg px-2 py-1.5">
        {points.map((p, i) => {
          const catColor = CAT_COLORS[p.cat]?.track ?? '#94a3b8';
          const barH = p.onLand ? 20 + p.cat * 8 : 20 + p.cat * 14;
          const trend = i === 0 ? 'flat' : (p.cat > points[i - 1].cat ? 'up' : p.cat < points[i - 1].cat ? 'down' : 'flat');
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5 relative group cursor-default">
              <div className="flex items-center gap-0.5">
                {trend === 'up' && <TrendingUp className="w-2 h-2 text-red-400" />}
                {trend === 'down' && <TrendingDown className="w-2 h-2 text-emerald-400" />}
                {trend === 'flat' && <Minus className="w-2 h-2 text-muted-foreground/40" />}
              </div>
              <div className="w-full rounded-sm transition-all" style={{ height: `${barH}%`, background: catColor, opacity: p.onLand ? 0.5 : 0.85 }} />
              <span className="text-[7px] font-mono" style={{ color: catColor }}>{p.onLand ? '⚡' : `C${p.cat}`}</span>
              <div className="absolute bottom-full mb-6 left-1/2 -translate-x-1/2 bg-black/90 border border-white/10 rounded px-2 py-1 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <span className="font-mono" style={{ color: catColor }}>Waypoint {i + 1}</span>
                <br />
                {p.onLand ? 'Landfall — weakening' : `Cat ${p.cat} · ${Math.round(p.progress * 100)}% along track`}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[9px] text-muted-foreground/40 font-mono px-1">
        <span>Origin</span>
        <span>Landfall</span>
      </div>
    </div>
  );
}

// ── ConfigPanel ───────────────────────────────────────────────────────────────
function ConfigPanel({
  params, setParams, isDrawing, track, simStatus,
  startDrawing, stopDrawing, resetTrack, runSimulation, onUndo,
}: {
  params: StormParams;
  setParams: React.Dispatch<React.SetStateAction<StormParams>>;
  isDrawing: boolean;
  track: TrackPoint[];
  simStatus: SimStatus;
  startDrawing: () => void;
  stopDrawing: () => void;
  resetTrack: () => void;
  runSimulation: () => void;
  onUndo: () => void;
}) {
  const catColor = CAT_COLORS[params.category]?.track ?? '#94a3b8';
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4">
      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-[10px] text-muted-foreground/60 uppercase font-mono tracking-wider">Storm Name</label>
        <input
          type="text"
          value={params.name}
          onChange={e => setParams(p => ({ ...p, name: e.target.value }))}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-cyan-400/40 transition-colors"
        />
      </div>

      {/* Type */}
      <div className="space-y-1.5">
        <label className="text-[10px] text-muted-foreground/60 uppercase font-mono tracking-wider">Type</label>
        <div className="grid grid-cols-2 gap-1">
          {STORM_TYPES.map(({ value, label, icon }) => (
            <button
              key={value}
              onClick={() => setParams(p => ({ ...p, stormType: value }))}
              className={cn(
                'flex items-center gap-1.5 text-[11px] py-1.5 px-2 rounded-lg border transition-all',
                params.stormType === value
                  ? 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20'
                  : 'text-muted-foreground/50 border-white/[0.06] hover:bg-white/[0.04]'
              )}
            >
              <span className="text-xs">{icon}</span>
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      {params.stormType === 'hurricane' && (
        <div className="space-y-1.5">
          <label className="text-[10px] text-muted-foreground/60 uppercase font-mono tracking-wider flex justify-between">
            <span>Category</span>
            <span style={{ color: catColor }}>{CAT_COLORS[params.category]?.label}</span>
          </label>
          <div className="flex gap-1">
            {[1,2,3,4,5].map(cat => (
              <button
                key={cat}
                onClick={() => setParams(p => ({ ...p, category: cat }))}
                className="flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all"
                style={params.category === cat
                  ? { background: CAT_COLORS[cat]?.track, color: '#000', borderColor: 'transparent' }
                  : { color: CAT_COLORS[cat]?.track, borderColor: CAT_COLORS[cat]?.track + '30', background: CAT_COLORS[cat]?.fill }
                }
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sliders */}
      {[
        { key: 'windSpeedKph', label: 'Wind Speed', unit: 'km/h', min: 50, max: 350, step: 5 },
        { key: 'radiusKm', label: 'Wind Radius', unit: 'km', min: 20, max: 300, step: 10 },
        { key: 'forwardSpeedKph', label: 'Forward Speed', unit: 'km/h', min: 5, max: 80, step: 1 },
      ].map(({ key, label, unit, min, max, step }) => (
        <div key={key} className="space-y-1.5">
          <label className="text-[10px] text-muted-foreground/60 uppercase font-mono tracking-wider flex justify-between">
            <span>{label}</span>
            <span className="text-foreground/70">{params[key as keyof StormParams]} {unit}</span>
          </label>
          <input
            type="range" min={min} max={max} step={step}
            value={params[key as keyof StormParams] as number}
            onChange={e => setParams(p => ({ ...p, [key]: +e.target.value }))}
            className="w-full h-1 rounded-full appearance-none bg-white/10 accent-cyan-400"
          />
        </div>
      ))}

      {/* Track controls */}
      <div className="space-y-2 pt-1">
        <label className="text-[10px] text-muted-foreground/60 uppercase font-mono tracking-wider flex justify-between">
          <span>Storm Track</span>
          <span className={cn('font-mono', isDrawing ? 'text-cyan-400 animate-pulse' : 'text-muted-foreground/40')}>
            {track.length} pt{track.length !== 1 ? 's' : ''}
          </span>
        </label>

        {!isDrawing ? (
          <button
            onClick={startDrawing}
            disabled={simStatus === 'analyzing'}
            className="w-full flex items-center justify-center gap-2 text-xs py-2.5 rounded-lg border text-cyan-400 bg-cyan-400/[0.08] border-cyan-400/20 hover:bg-cyan-400/15 transition-all disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            {track.length === 0 ? 'Start Drawing Track' : 'Add More Points'}
          </button>
        ) : (
          <button
            onClick={stopDrawing}
            className="w-full flex items-center justify-center gap-2 text-xs py-2.5 rounded-lg border text-amber-400 bg-amber-400/[0.08] border-amber-400/20 hover:bg-amber-400/15 transition-all animate-pulse"
          >
            <Square className="w-3.5 h-3.5 fill-amber-400" />
            Stop Drawing · {track.length} points
          </button>
        )}

        {isDrawing && (
          <p className="text-[10px] text-cyan-400/60 text-center">Click map to add waypoints — keep clicking</p>
        )}

        {track.length > 0 && (
          <div className="flex gap-1.5">
            <button
              onClick={onUndo}
              disabled={isDrawing}
              className="flex-1 flex items-center justify-center gap-1 text-[11px] py-1.5 rounded-lg border text-muted-foreground/50 border-white/[0.06] hover:bg-white/[0.03] disabled:opacity-30 transition-all"
            >
              <Trash2 className="w-3 h-3" />Undo
            </button>
            <button
              onClick={resetTrack}
              className="flex-1 flex items-center justify-center gap-1 text-[11px] py-1.5 rounded-lg border text-red-400/70 border-red-400/15 hover:bg-red-400/[0.06] transition-all"
            >
              <RotateCcw className="w-3 h-3" />Reset
            </button>
          </div>
        )}
      </div>

      {/* Intensity timeline */}
      <IntensityTimeline track={track} category={params.category} stormType={params.stormType} />

      {/* Run button */}
      <button
        onClick={runSimulation}
        disabled={track.length < 2 || simStatus === 'analyzing' || isDrawing}
        className={cn(
          'w-full flex items-center justify-center gap-2 text-sm py-3 rounded-xl font-medium transition-all',
          track.length >= 2 && simStatus !== 'analyzing' && !isDrawing
            ? 'text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20'
            : 'text-muted-foreground/30 bg-white/[0.03] border border-white/[0.06] cursor-not-allowed'
        )}
      >
        {simStatus === 'analyzing'
          ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing…</>
          : <><Play className="w-4 h-4" />Run Impact Analysis</>
        }
      </button>

      {track.length < 2 && !isDrawing && (
        <p className="text-[10px] text-muted-foreground/40 text-center">Add ≥ 2 waypoints to run analysis</p>
      )}
    </div>
  );
}

// ── AnalysisContent ───────────────────────────────────────────────────────────
function AnalysisContent({ simStatus, analysis, params }: {
  simStatus: SimStatus;
  analysis: Record<string, unknown> | null;
  params: StormParams;
}) {
  const infra = (analysis?.infrastructureImpacts as Record<string, unknown>) ?? {};
  const evac = (analysis?.evacuationZones as Record<string, unknown>) ?? {};
  const shelter = (analysis?.shelterDemand as Record<string, unknown>) ?? {};
  const surge = (analysis?.stormSurge as Record<string, unknown>) ?? {};
  const econ = (analysis?.economicImpact as Record<string, unknown>) ?? {};
  const agentRecs = (analysis?.agentRecommendations as Record<string, string>) ?? {};
  const actions = (analysis?.immediateActions as string[]) ?? [];

  if (simStatus === 'idle') return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
        <Wind className="w-6 h-6 text-muted-foreground/20" />
      </div>
      <p className="text-xs text-muted-foreground/40 max-w-48 leading-relaxed">
        Plot a storm track on the map, configure parameters, then run AI analysis
      </p>
    </div>
  );

  if (simStatus === 'analyzing') return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
      <div className="relative">
        <div className="w-14 h-14 rounded-full border-2 border-cyan-400/20 animate-ping absolute inset-0" />
        <div className="w-14 h-14 rounded-full bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center relative">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground/80">Analyzing Impact</p>
        <p className="text-xs text-muted-foreground/40 mt-1">Modeling infrastructure, evacuation zones, and resource demands</p>
      </div>
    </div>
  );

  if (simStatus === 'error') return (
    <div className="bg-red-400/5 border border-red-400/15 rounded-xl p-4 text-center">
      <AlertTriangle className="w-6 h-6 text-red-400/60 mx-auto mb-2" />
      <p className="text-xs text-red-400/80">Analysis failed. Please try again.</p>
    </div>
  );

  if (!analysis) return null;

  return (
    <div className="space-y-3">
      {/* Threat level */}
      <div className={cn('rounded-xl p-4 border', THREAT_STYLE[(analysis.threatLevel as string) ?? 'MODERATE'])}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider opacity-60">Threat Level</span>
          <span className="text-base font-bold tracking-tight">{analysis.threatLevel as string}</span>
        </div>
        <p className="text-xs leading-relaxed opacity-80">{analysis.summary as string}</p>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: Users, label: 'At Risk', value: `${((analysis.affectedPopulation as number ?? 0) / 1000).toFixed(0)}k`, color: 'text-amber-400', bg: 'bg-amber-400/10' },
          { icon: Waves, label: 'Max Surge', value: `${(surge.maxSurgeMeters as number)?.toFixed(1) ?? '?'}m`, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { icon: DollarSign, label: 'Damage Est.', value: (econ.estimatedDamageUSD as string) ?? '?', color: 'text-red-400', bg: 'bg-red-400/10' },
          { icon: Clock, label: 'Recovery', value: `${(econ.recoveryMonths as number) ?? '?'} mo`, color: 'text-purple-400', bg: 'bg-purple-400/10' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center mb-2', bg)}>
              <Icon className={cn('w-3.5 h-3.5', color)} />
            </div>
            <p className="text-sm font-semibold text-foreground/90">{value}</p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Infrastructure */}
      <div>
        <p className="text-[10px] text-muted-foreground/50 uppercase font-mono tracking-wider mb-2">Infrastructure</p>
        <div className="space-y-1">
          <InfraRow icon={Zap} title="Power Grid" data={(infra.power as Record<string, unknown>) ?? {}} />
          <InfraRow icon={Car} title="Roads & Highways" data={(infra.roads as Record<string, unknown>) ?? {}} />
          <InfraRow icon={Building2} title="Bridges" data={(infra.bridges as Record<string, unknown>) ?? {}} />
          <InfraRow icon={Plane} title="Airport" data={(infra.airports as Record<string, unknown>) ?? {}} />
          <InfraRow icon={Ship} title="Port Tampa Bay" data={(infra.port as Record<string, unknown>) ?? {}} />
          <InfraRow icon={Hospital} title="Hospitals" data={(infra.hospitals as Record<string, unknown>) ?? {}} />
          <InfraRow icon={Radio} title="Communications" data={(infra.communications as Record<string, unknown>) ?? {}} />
          <InfraRow icon={Droplets} title="Water & Sewer" data={(infra.waterSewer as Record<string, unknown>) ?? {}} />
        </div>
      </div>

      {/* Evacuation */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
        <p className="text-xs font-medium mb-3 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          Evacuation Zones
        </p>
        <div className="space-y-2.5">
          {((evac.mandatory as string[]) ?? []).map((z, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[10px] font-mono text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">MANDATORY</span>
              <span className="text-xs text-foreground/70 leading-relaxed">{z}</span>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/[0.06] text-xs">
            <div>
              <p className="text-[10px] text-muted-foreground/40">Evacuees</p>
              <p className="font-medium text-foreground/80">{(((evac.estimatedEvacuees as number) ?? 0) / 1000).toFixed(0)}k</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground/40">Lead Time</p>
              <p className="font-medium text-amber-400">{evac.timeToEvacuate as string}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Shelter demand */}
      {!!(shelter.estimatedShelterNeeds) && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
          <p className="text-xs font-medium mb-2 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            Shelter Demand
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-[10px] text-muted-foreground/40">Total Need</p>
              <p className="font-medium">{(((shelter.estimatedShelterNeeds as number) ?? 0) / 1000).toFixed(0)}k</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground/40">Special Needs</p>
              <p className="font-medium text-amber-400">{(((shelter.specialNeedsCount as number) ?? 0) / 1000).toFixed(0)}k</p>
            </div>
          </div>
        </div>
      )}

      {/* Immediate actions */}
      {actions.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
          <p className="text-xs font-medium mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Immediate Actions
          </p>
          <ol className="space-y-2">
            {actions.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">{i + 1}</span>
                <span className="text-foreground/70 leading-relaxed">{a}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Agent recommendations */}
      {Object.keys(agentRecs).length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
          <p className="text-xs font-medium mb-2 text-muted-foreground/60">Agent Recommendations</p>
          <div className="space-y-2.5">
            {[
              { key: 'stormWatcher', icon: '🌀', label: 'Storm Watcher' },
              { key: 'vulnerabilityMapper', icon: '🗺️', label: 'Vulnerability Mapper' },
              { key: 'resourceCoordinator', icon: '📦', label: 'Resource Coordinator' },
              { key: 'alertCommander', icon: '🚨', label: 'Alert Commander' },
            ].map(({ key, icon, label }) => agentRecs[key] ? (
              <div key={key}>
                <p className="text-[10px] text-muted-foreground/40 mb-0.5">{icon} {label}</p>
                <p className="text-xs text-foreground/65 leading-relaxed">{agentRecs[key]}</p>
              </div>
            ) : null)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StormSimulator() {
  // KEY FIX: store map in state so HurricaneMapOverlay re-renders when map is ready
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);

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
  const [showHistory, setShowHistory] = useState(false);
  const [selectedSimId, setSelectedSimId] = useState<string | null>(null);
  const [overlayActive, setOverlayActive] = useState(true);
  const [overlayPaused, setOverlayPaused] = useState(false);
  const [overlaySpeed, setOverlaySpeed] = useState(1);
  const [overlayRunKey, setOverlayRunKey] = useState(0);
  const [mobileTab, setMobileTab] = useState<MobileTab | null>(null);

  const createSim = trpc.simulator.create.useMutation();
  const { data: history, refetch: refetchHistory } = trpc.simulator.list.useQuery({ limit: 10 });
  const { data: selectedSim } = trpc.simulator.get.useQuery(
    { simId: selectedSimId ?? '' },
    { enabled: !!selectedSimId }
  );
  const deleteSim = trpc.simulator.delete.useMutation({ onSuccess: () => refetchHistory() });
  const cycleOverlaySpeed = useCallback(() => {
    const options = [0.5, 1, 1.5, 2];
    setOverlaySpeed(prev => options[(options.indexOf(prev) + 1) % options.length]);
  }, []);

  const trackColor = useCallback(() => {
    if (params.stormType === 'hurricane') return CAT_COLORS[params.category]?.track ?? '#ef4444';
    if (params.stormType === 'flood') return '#3b82f6';
    if (params.stormType === 'tornado') return '#a855f7';
    return '#94a3b8';
  }, [params.stormType, params.category]);

  const renderTrack = useCallback((pts: TrackPoint[]) => {
    if (!mapRef.current) return;
    const color = trackColor();
    markersRef.current.forEach(m => { m.map = null; });
    markersRef.current = [];
    if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }
    circlesRef.current.forEach(c => c.setMap(null));
    circlesRef.current = [];

    if (pts.length >= 2) {
      polylineRef.current = new window.google.maps.Polyline({
        path: pts,
        geodesic: true,
        strokeColor: color,
        strokeOpacity: 0.85,
        strokeWeight: 2.5,
        map: mapRef.current,
        icons: [{
          icon: { path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2.5, fillColor: color, fillOpacity: 1, strokeWeight: 0 },
          offset: '100%',
          repeat: '70px',
        }],
      });
      [pts[0], pts[pts.length - 1]].forEach(pt => {
        const c = new window.google.maps.Circle({
          center: pt,
          radius: params.radiusKm * 1000,
          strokeColor: color,
          strokeOpacity: 0.25,
          strokeWeight: 1,
          fillColor: color,
          fillOpacity: 0.06,
          map: mapRef.current!,
        });
        circlesRef.current.push(c);
      });
    }

    pts.forEach((pt, i) => {
      const isFirst = i === 0;
      const isLast = i === pts.length - 1;
      const el = document.createElement('div');
      const size = isFirst || isLast ? 16 : 9;
      el.style.cssText = `
        width:${size}px;height:${size}px;
        background:${color};border:2px solid rgba(255,255,255,0.8);
        border-radius:50%;box-shadow:0 0 10px ${color}66,0 0 20px ${color}33;
        display:flex;align-items:center;justify-content:center;
        font-size:7px;color:#000;font-weight:bold;
      `;
      if (!isFirst && !isLast) el.textContent = String(i + 1);
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current!,
        position: pt,
        content: el,
        title: isFirst ? 'Storm origin' : isLast ? 'Projected landfall' : `Waypoint ${i + 1}`,
      });
      markersRef.current.push(marker);
    });
  }, [trackColor, params.radiusKm]);

  useEffect(() => {
    if (track.length > 0) renderTrack(track);
  }, [params.category, params.stormType, params.radiusKm, renderTrack, track]);

  // KEY FIX: store map in both ref AND state so overlay component re-renders
  const onMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    map.setOptions({
      styles: DARK_MAP_STYLE,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControlOptions: { position: window.google.maps.ControlPosition.RIGHT_BOTTOM },
    });
    setMapInstance(map);
  }, []);

  const startDrawing = useCallback(() => {
    if (!mapRef.current || isDrawing) return;
    setIsDrawing(true);
    setMobileTab(null); // close sheet so map is visible on mobile
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
  }, [isDrawing, renderTrack]);

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
    markersRef.current.forEach(m => { m.map = null; });
    markersRef.current = [];
    if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }
    circlesRef.current.forEach(c => c.setMap(null));
    circlesRef.current = [];
    setSimStatus('idle');
    setAnalysis(null);
    setSelectedSimId(null);
  }, [stopDrawing]);

  const handleUndo = useCallback(() => {
    setTrack(prev => {
      const next = prev.slice(0, -1);
      renderTrack(next);
      return next;
    });
  }, [renderTrack]);

  useEffect(() => () => {
    if (clickListenerRef.current) window.google.maps.event.removeListener(clickListenerRef.current);
  }, []);

  const runSimulation = useCallback(async () => {
    if (track.length < 2 || simStatus === 'analyzing') return;
    stopDrawing();
    setSimStatus('analyzing');
    setAnalysis(null);
    setSelectedSimId(null);
    setOverlayPaused(false);
    setOverlayRunKey(v => v + 1);
    setMobileTab('analysis'); // show analysis on mobile
    try {
      const result = await createSim.mutateAsync({
        name: params.name,
        stormType: params.stormType,
        category: params.stormType === 'hurricane' ? params.category : undefined,
        windSpeedKph: params.windSpeedKph,
        radiusKm: params.radiusKm,
        forwardSpeedKph: params.forwardSpeedKph,
        track,
        landfall: track[track.length - 1],
      });
      if (result.status === 'complete' && result.analysis) {
        setAnalysis(result.analysis as Record<string, unknown>);
        setSimStatus('complete');
        refetchHistory();
      } else {
        setSimStatus('error');
      }
    } catch {
      setSimStatus('error');
    }
  }, [track, params, simStatus, stopDrawing, createSim, refetchHistory]);

  useEffect(() => {
    if (!selectedSim || !mapRef.current) return;
    const pts = selectedSim.track as TrackPoint[];
    setTrack(pts);
    setOverlayPaused(false);
    setOverlayRunKey(v => v + 1);
    renderTrack(pts);
    setAnalysis(selectedSim.analysis as Record<string, unknown> | null);
    setSimStatus(selectedSim.status === 'complete' ? 'complete' : 'idle');
    setShowHistory(false);
    if (pts.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      pts.forEach(p => bounds.extend(p));
      mapRef.current.fitBounds(bounds, 80);
    }
  }, [selectedSim, renderTrack]);

  const catColor = CAT_COLORS[params.category]?.track ?? '#94a3b8';

  const configPanelProps = {
    params, setParams, isDrawing, track, simStatus,
    startDrawing, stopDrawing, resetTrack, runSimulation,
    onUndo: handleUndo,
  };

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0 overflow-hidden bg-[#020b18]">

      {/* ── Desktop Left: Config panel ── */}
      <div className="hidden lg:flex w-64 flex-shrink-0 border-r border-white/[0.06] flex-col overflow-hidden bg-[#040f1e]">
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-foreground">Sim Studio</span>
            </div>
            <button
              onClick={() => setShowHistory(v => !v)}
              className={cn('p-1.5 rounded-lg border transition-colors', showHistory ? 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' : 'text-muted-foreground/50 border-white/[0.06] hover:border-white/10')}
            >
              <History className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <ConfigPanel {...configPanelProps} />
      </div>

      {/* ── Center: Map ── */}
      <div className="flex-1 relative min-w-0" style={{ minHeight: 0 }}>
        <div className="absolute inset-0 lg:bottom-0" style={{ bottom: '56px' }}>
          <MapView
            className="w-full h-full"
            initialCenter={{ lat: 27.9506, lng: -82.4572 }}
            initialZoom={8}
            onMapReady={onMapReady}
          />
        </div>

        {/* Vortex overlay — uses mapInstance (state) not mapRef.current (ref) */}
        <HurricaneMapOverlay
          map={mapInstance}
          track={track}
          category={params.category}
          stormType={params.stormType}
          windSpeedKph={params.windSpeedKph}
          radiusKm={params.radiusKm}
          isActive={overlayActive && track.length >= 1}
          isPaused={overlayPaused}
          movementSpeed={overlaySpeed}
          resetKey={overlayRunKey}
        />

        {/* Drawing banner */}
        {isDrawing && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md border border-cyan-400/30 rounded-xl px-4 py-2 flex items-center gap-3 text-xs pointer-events-none z-20">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-cyan-400 font-medium">Drawing Active</span>
            <span className="text-white/40">· {track.length} point{track.length !== 1 ? 's' : ''} placed</span>
          </div>
        )}

        {/* Bottom-left: track info */}
        {track.length > 0 && !isDrawing && (
          <div className="absolute bottom-16 lg:bottom-4 left-3 bg-black/70 backdrop-blur-sm border border-white/[0.08] rounded-xl px-3 py-2 flex items-center gap-3 text-xs z-10">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: catColor }} />
            <span className="text-foreground/70">{track.length} waypoints</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground/30" />
            <span className="text-muted-foreground/60">
              {track[track.length - 1].lat.toFixed(2)}°N {Math.abs(track[track.length - 1].lng).toFixed(2)}°W
            </span>
          </div>
        )}

        {/* Overlay toggle */}
        <div className="absolute bottom-16 lg:bottom-4 right-3 flex items-center gap-2 z-10">
          <button
            onClick={cycleOverlaySpeed}
            className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-xl border backdrop-blur-sm transition-all bg-black/55 border-white/[0.08] text-white/75 hover:text-cyan-300"
          >
            <Wind className="w-3.5 h-3.5" />
            {overlaySpeed.toFixed(1)}x
          </button>
          <button
            onClick={() => setOverlayPaused(v => !v)}
            disabled={!overlayActive || track.length < 2}
            className={cn(
              'flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-xl border backdrop-blur-sm transition-all',
              overlayPaused
                ? 'bg-amber-400/15 border-amber-400/25 text-amber-300'
                : 'bg-black/55 border-white/[0.08] text-white/75 hover:text-cyan-300',
              (!overlayActive || track.length < 2) && 'opacity-40 cursor-not-allowed'
            )}
          >
            {overlayPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {overlayPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={() => setOverlayActive(v => !v)}
            className={cn(
              'flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-xl border backdrop-blur-sm transition-all',
              overlayActive
                ? 'bg-cyan-400/15 border-cyan-400/25 text-cyan-400'
                : 'bg-black/50 border-white/[0.08] text-white/40 hover:text-white/70'
            )}
          >
            🌀 {overlayActive ? 'Hide Vortex' : 'Show Vortex'}
          </button>
        </div>
      </div>

      {/* ── Desktop Right: Analysis panel ── */}
      <div className="hidden lg:flex w-80 flex-shrink-0 border-l border-white/[0.06] flex-col overflow-hidden bg-[#040f1e]">
        {showHistory ? (
          <>
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" />Past Simulations
              </span>
              <button onClick={() => setShowHistory(false)} className="text-muted-foreground/50 hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {!history?.length && (
                <p className="text-xs text-muted-foreground/40 text-center py-8">No simulations yet</p>
              )}
              {history?.map(sim => (
                <div
                  key={sim.simId}
                  onClick={() => setSelectedSimId(sim.simId)}
                  className={cn(
                    'bg-white/[0.03] border rounded-xl p-3 cursor-pointer hover:border-cyan-400/25 transition-all group',
                    selectedSimId === sim.simId ? 'border-cyan-400/35 bg-cyan-400/[0.04]' : 'border-white/[0.06]'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate text-foreground/90">{sim.name}</p>
                      <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                        {sim.stormType.replace(/_/g, ' ')} {sim.category ? `· Cat ${sim.category}` : ''} · {sim.windSpeedKph} km/h
                      </p>
                      {(sim.affectedPopulation ?? 0) > 0 && (
                        <p className="text-[11px] text-amber-400/80 mt-0.5">{(((sim.affectedPopulation ?? 0)) / 1000).toFixed(0)}k at risk</p>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); deleteSim.mutate({ simId: sim.simId }); }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-red-400 transition-all"
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
            <div className="p-4 border-b border-white/[0.06]">
              <p className="text-sm font-medium text-foreground/90">Impact Analysis</p>
              <p className="text-[11px] text-muted-foreground/40 mt-0.5">
                {simStatus === 'idle' && 'Draw a track and run analysis'}
                {simStatus === 'analyzing' && 'AI modeling infrastructure impacts…'}
                {simStatus === 'complete' && `${params.name} · ${params.stormType.replace(/_/g, ' ')}`}
                {simStatus === 'error' && 'Analysis failed — try again'}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <AnalysisContent simStatus={simStatus} analysis={analysis} params={params} />
            </div>
          </>
        )}
      </div>

      {/* ── Mobile: bottom tab bar ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#040f1e]/95 backdrop-blur-md border-t border-white/[0.08]">
        <div className="flex items-center h-14 px-2 gap-1">
          <button
            onClick={() => setMobileTab(mobileTab === 'config' ? null : 'config')}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl transition-all text-[10px] font-mono',
              mobileTab === 'config' ? 'text-cyan-400 bg-cyan-400/10' : 'text-muted-foreground/50'
            )}
          >
            <Settings className="w-4 h-4" />
            Config
          </button>
          <button
            onClick={() => isDrawing ? stopDrawing() : startDrawing()}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl transition-all text-[10px] font-mono',
              isDrawing ? 'text-amber-400 bg-amber-400/10 animate-pulse' : 'text-muted-foreground/50'
            )}
          >
            <Plus className="w-4 h-4" />
            {isDrawing ? `Drawing (${track.length})` : 'Draw Track'}
          </button>
          <button
            onClick={runSimulation}
            disabled={track.length < 2 || simStatus === 'analyzing' || isDrawing}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl transition-all text-[10px] font-mono',
              track.length >= 2 && simStatus !== 'analyzing' && !isDrawing
                ? 'text-emerald-400 bg-emerald-400/10'
                : 'text-muted-foreground/30 opacity-40'
            )}
          >
            {simStatus === 'analyzing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {simStatus === 'analyzing' ? 'Analyzing' : 'Run'}
          </button>
          <button
            onClick={() => setMobileTab(mobileTab === 'analysis' ? null : 'analysis')}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl transition-all text-[10px] font-mono relative',
              mobileTab === 'analysis' ? 'text-cyan-400 bg-cyan-400/10' : 'text-muted-foreground/50'
            )}
          >
            <Zap className="w-4 h-4" />
            Analysis
            {simStatus === 'complete' && (
              <span className="absolute top-1.5 right-2.5 w-1.5 h-1.5 rounded-full bg-cyan-400" />
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile: sliding bottom sheet ── */}
      {mobileTab && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileTab(null)} />
          <div className="relative bg-[#040f1e] border-t border-white/[0.08] rounded-t-2xl max-h-[75vh] flex flex-col">
            <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0 border-b border-white/[0.06]">
              <div className="w-8 h-1 rounded-full bg-white/20 absolute left-1/2 -translate-x-1/2 top-2" />
              <span className="text-sm font-medium text-foreground/80">
                {mobileTab === 'config' ? '⚙️ Storm Configuration' : '⚡ Impact Analysis'}
              </span>
              <button onClick={() => setMobileTab(null)} className="text-muted-foreground/50 hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pb-4">
              {mobileTab === 'config' ? (
                <ConfigPanel {...configPanelProps} />
              ) : (
                <div className="p-4">
                  <AnalysisContent simStatus={simStatus} analysis={analysis} params={params} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
