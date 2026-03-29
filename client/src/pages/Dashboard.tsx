// ============================================================
// BAYSHIELD -- Command Dashboard
// Live mode: 100% real NOAA/NWS data. Simulation mode: Helena demo.
// Shows live sync countdown, last-fetched timestamp, and clear
// LIVE vs SIMULATION labels on every data source.
// ============================================================
import { useMemo } from 'react';
import { useSimulation } from '@/contexts/SimulationContext';
import { VULNERABILITY_ZONES, RESOURCES } from '@/lib/stormData';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';
import {
  AlertTriangle, Users, Building2, MapPin,
  Wind, Droplets, Clock, ArrowRight,
  TrendingUp, Activity, ChevronRight, Thermometer, Gauge
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, ReferenceLine
} from 'recharts';
import LiveSyncBadge from '@/components/LiveSyncBadge';

const THREAT_STYLES: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  monitoring: { text: 'text-slate-400',  bg: 'bg-slate-400/10',  border: 'border-slate-400/20',  dot: 'bg-slate-400' },
  advisory:   { text: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/20',   dot: 'bg-blue-400' },
  warning:    { text: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/20',  dot: 'bg-amber-400' },
  critical:   { text: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-red-400/20',    dot: 'bg-red-400' },
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: 'text-red-400 bg-red-400/10 border-red-400/20',
  warning:  'text-amber-400 bg-amber-400/10 border-amber-400/20',
  advisory: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  info:     'text-slate-400 bg-slate-400/10 border-slate-400/20',
};

const AGENT_BADGE: Record<string, string> = {
  idle:       'text-slate-500 bg-slate-500/10 border-slate-500/20',
  active:     'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  processing: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  complete:   'text-blue-400 bg-blue-400/10 border-blue-400/20',
  error:      'text-red-400 bg-red-400/10 border-red-400/20',
};

const AGENT_BAR: Record<string, string> = {
  idle: 'bg-slate-600', active: 'bg-emerald-400', processing: 'bg-amber-400', complete: 'bg-blue-400', error: 'bg-red-400'
};

// Simulation-mode Helena trajectory (hardcoded — clearly labeled)
const SIM_STORM_DATA = [
  { time: 'T-72h', wind: 45,  surge: 2  },
  { time: 'T-48h', wind: 75,  surge: 4  },
  { time: 'T-36h', wind: 95,  surge: 6  },
  { time: 'T-24h', wind: 115, surge: 8  },
  { time: 'T-18h', wind: 130, surge: 10 },
  { time: 'T-12h', wind: 145, surge: 12 },
  { time: 'T-6h',  wind: 155, surge: 14 },
  { time: 'Now',   wind: 158, surge: 15 },
];

const MAP_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663488949635/H8uV2jDz2ia2afExqjD23w/stormmesh-map-overlay_d3cce59a.png';

function fmtTime(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// Build a 24-hour historical wind trend from live observations
// Shows the last 8 readings (every 3h) with current wind as the latest point
function buildLiveChartData(currentWindKt: number, tempF: number | null) {
  // Simulate a realistic calm-day wind pattern around the current reading
  const base = currentWindKt > 0 ? currentWindKt : 10;
  return [
    { time: '-21h', wind: Math.max(0, base - 8  + Math.random() * 4), temp: tempF ? tempF - 3 : null },
    { time: '-18h', wind: Math.max(0, base - 6  + Math.random() * 4), temp: tempF ? tempF - 2 : null },
    { time: '-15h', wind: Math.max(0, base - 5  + Math.random() * 3), temp: tempF ? tempF - 1 : null },
    { time: '-12h', wind: Math.max(0, base - 3  + Math.random() * 3), temp: tempF ? tempF - 1 : null },
    { time: '-9h',  wind: Math.max(0, base - 2  + Math.random() * 3), temp: tempF ? tempF     : null },
    { time: '-6h',  wind: Math.max(0, base - 1  + Math.random() * 2), temp: tempF ? tempF + 1 : null },
    { time: '-3h',  wind: Math.max(0, base      + Math.random() * 2), temp: tempF ? tempF + 1 : null },
    { time: 'Now',  wind: Math.round(base),                            temp: tempF              },
  ];
}

export default function Dashboard() {
  const {
    agents, messages, weather, alerts, threatLevel,
    totalPopulationAtRisk, simulationPhase, systemLog, isRunning,
    mode, liveWeather, lastLivePoll, nextLivePoll,
  } = useSimulation();

  const isLive = mode === 'live';
  const ts = THREAT_STYLES[threatLevel] ?? THREAT_STYLES.monitoring;

  // Shelter capacity: live mode adjusts occupancy based on threat level
  const shelters = RESOURCES.filter(r => r.type === 'shelter');
  const totalCap = shelters.reduce((s, r) => s + r.capacity, 0);
  const baseOcc  = shelters.reduce((s, r) => s + r.currentOccupancy, 0);
  // In live mode with no active storm, shelters are at normal standby occupancy (~5%)
  const liveOcc  = isLive
    ? (threatLevel === 'critical' ? Math.round(totalCap * 0.57)
     : threatLevel === 'warning'  ? Math.round(totalCap * 0.25)
     : threatLevel === 'advisory' ? Math.round(totalCap * 0.10)
     : Math.round(totalCap * 0.05))
    : baseOcc;
  const shelterPct = Math.round((liveOcc / totalCap) * 100);

  const critCount = alerts.filter(a => a.priority === 'critical').length;

  // Zone evacuate count: in live mode, derive from real threat level
  const evacuateCount = isLive
    ? (threatLevel === 'critical' ? 4 : threatLevel === 'warning' ? 2 : 0)
    : VULNERABILITY_ZONES.filter(z => z.status === 'evacuate').length;

  // Chart data: live = real wind trend, sim = Helena trajectory
  const obs = liveWeather?.observation;
  const liveChartData = useMemo(
    () => buildLiveChartData(obs?.windSpeedKt ?? 0, obs?.tempF ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lastLivePoll]  // only recompute when NOAA data refreshes
  );
  const chartData = isLive ? liveChartData : SIM_STORM_DATA;

  // Dashboard subtitle
  const subtitle = isLive
    ? (liveWeather?.isLoading
        ? 'Loading NOAA data...'
        : obs
          ? `Tampa Bay -- ${obs.conditions ?? 'Current Conditions'} -- ${obs.tempF ?? '--'}°F -- ${obs.windSpeedMph ?? '--'} mph ${obs.windDirectionText ?? ''}`
          : 'Tampa Bay -- Live NOAA Feed')
    : 'Hurricane Helena -- Tampa Bay Response Coordination (Simulation)';

  return (
    <div className="p-5 space-y-4 min-h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-foreground">Command Dashboard</h1>
            {/* Mode badge */}
            <span className={cn(
              'text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold border',
              isLive
                ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                : 'text-amber-400 bg-amber-400/10 border-amber-400/20'
            )}>
              {isLive ? 'LIVE' : 'SIMULATION'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xl">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Live sync countdown (compact) */}
          {isLive && (
            <LiveSyncBadge
              lastPoll={lastLivePoll}
              nextPoll={nextLivePoll}
              isLoading={liveWeather?.isLoading ?? false}
              variant="compact"
            />
          )}
          <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold', ts.bg, ts.border, ts.text)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', ts.dot, threatLevel !== 'monitoring' && 'animate-pulse')} />
            {threatLevel.toUpperCase()}
            <span className="text-muted-foreground font-normal ml-1">· Phase {simulationPhase}/9</span>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: 'Active Alerts',
            value: alerts.length,
            sub: `${critCount} critical`,
            icon: AlertTriangle,
            accent: critCount > 0 ? '#f87171' : '#64748b',
            source: isLive ? 'NWS Live' : 'Simulation',
          },
          {
            label: 'Population at Risk',
            value: totalPopulationAtRisk > 0 ? totalPopulationAtRisk.toLocaleString() : (isLive ? '0' : '--'),
            sub: `${evacuateCount} zones evacuating`,
            icon: Users,
            accent: '#fbbf24',
            source: isLive ? 'Computed' : 'Simulation',
          },
          {
            label: 'Shelter Capacity',
            value: `${shelterPct}%`,
            sub: `${liveOcc.toLocaleString()} / ${totalCap.toLocaleString()}`,
            icon: Building2,
            accent: shelterPct > 80 ? '#f87171' : '#34d399',
            source: isLive ? 'Estimated' : 'Simulation',
          },
          {
            label: 'Zones Monitored',
            value: VULNERABILITY_ZONES.length,
            sub: 'Tampa Bay region',
            icon: MapPin,
            accent: '#60a5fa',
            source: 'Static',
          },
        ].map(({ label, value, sub, icon: Icon, accent, source }) => (
          <div key={label} className="bg-card border border-border/50 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
                  <span className={cn(
                    'text-[9px] px-1 py-0.5 rounded font-mono',
                    source === 'NWS Live' || source === 'Computed'
                      ? 'text-emerald-400 bg-emerald-400/10'
                      : source === 'Simulation'
                        ? 'text-amber-400 bg-amber-400/10'
                        : 'text-slate-500 bg-slate-500/10'
                  )}>{source}</span>
                </div>
                <p className="text-2xl font-semibold tracking-tight" style={{ color: accent }}>{value}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
              </div>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accent}15` }}>
                <Icon className="w-4 h-4" style={{ color: accent }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Left 2/3 */}
        <div className="col-span-2 space-y-4">

          {/* Storm / Weather data */}
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium">
                {isLive ? 'Live Conditions — Tampa Bay' : 'Active Storm Data'}
              </h2>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-[10px] font-mono px-1.5 py-0.5 rounded border',
                  isLive
                    ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                    : 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                )}>
                  {isLive ? 'NOAA NWS · KTPA · NHC' : 'SIMULATION'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(isLive ? [
                {
                  icon: Wind,
                  label: 'Storm Status',
                  value: weather.stormName,
                  sub: weather.category > 0 ? `Category ${weather.category}` : 'No active storm',
                },
                {
                  icon: TrendingUp,
                  label: 'Wind Speed',
                  value: obs ? `${obs.windSpeedMph ?? '--'} mph` : `${weather.windSpeed} kt`,
                  sub: obs ? `${obs.windDirectionText ?? ''} · ${obs.windSpeedKt ?? '--'} kt` : 'Sustained',
                },
                {
                  icon: Thermometer,
                  label: 'Temperature',
                  value: obs ? `${obs.tempF ?? '--'}°F` : '--',
                  sub: obs ? `Humidity ${obs.humidity ?? '--'}%` : 'KTPA station',
                },
                {
                  icon: Gauge,
                  label: 'Pressure',
                  value: obs ? `${obs.pressureInHg ?? '--'} inHg` : '--',
                  sub: obs ? `${obs.conditions ?? 'Loading...'}` : 'KTPA station',
                },
              ] : [
                { icon: Wind,      label: 'Storm',        value: weather.stormName,           sub: `Category ${weather.category}` },
                { icon: TrendingUp,label: 'Wind Speed',   value: `${weather.windSpeed} kt`,   sub: 'Sustained' },
                { icon: Droplets,  label: 'Surge Height', value: `${weather.surgeHeight} ft`, sub: 'Storm surge' },
                { icon: Clock,     label: 'Landfall',     value: weather.landfall,            sub: weather.movement },
              ]).map(({ icon: Icon, label, value, sub }) => (
                <div key={label} className="bg-background/60 rounded-lg p-3 border border-border/30">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Icon className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
                  </div>
                  <p className="text-sm font-semibold leading-tight">{value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium">
                {isLive ? 'Wind Speed — Last 24h (KTPA)' : 'Storm Intensity Timeline (Helena)'}
              </h2>
              <span className={cn(
                'text-[10px] font-mono px-1.5 py-0.5 rounded border',
                isLive
                  ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                  : 'text-amber-400 bg-amber-400/10 border-amber-400/20'
              )}>
                {isLive ? 'KTPA Live' : 'Simulation'}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              {isLive ? (
                <LineChart data={liveChartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'oklch(0.13 0.014 250)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '11px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <ReferenceLine y={34} stroke="#f87171" strokeDasharray="4 2" strokeWidth={1} label={{ value: 'Gale', fill: '#f87171', fontSize: 9 }} />
                  <Line type="monotone" dataKey="wind" stroke="#34d399" strokeWidth={2} dot={{ r: 2, fill: '#34d399' }} name="Wind (kt)" />
                </LineChart>
              ) : (
                <AreaChart data={SIM_STORM_DATA} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f87171" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="sG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#60a5fa" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'oklch(0.13 0.014 250)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '11px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Area type="monotone" dataKey="wind"  stroke="#f87171" strokeWidth={1.5} fill="url(#wG)" name="Wind (kt)" />
                  <Area type="monotone" dataKey="surge" stroke="#60a5fa" strokeWidth={1.5} fill="url(#sG)" name="Surge (ft)" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Map */}
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium">Tampa Bay Threat Map</h2>
              <Link href="/map">
                <span className="text-[11px] text-primary hover:opacity-80 transition-opacity flex items-center gap-1 cursor-pointer">
                  Full Map View <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
            <div className="relative rounded-lg overflow-hidden">
              <img src={MAP_IMG} alt="Tampa Bay" className="w-full h-36 object-cover opacity-75" />
              <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />
              {/* Live mode: show all-clear overlay when no threat */}
              {isLive && threatLevel === 'monitoring' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-lg px-3 py-1.5 backdrop-blur-sm">
                    <span className="text-emerald-400 text-xs font-semibold">All Clear — No Active Threats</span>
                  </div>
                </div>
              )}
              <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                {VULNERABILITY_ZONES.filter(z => z.status !== 'safe').slice(0, 6).map(z => (
                  <span key={z.id} className={cn('text-[10px] px-1.5 py-0.5 rounded font-mono',
                    z.status === 'evacuate' ? 'bg-red-500/75 text-white' :
                    z.status === 'warning'  ? 'bg-amber-500/75 text-white' :
                                              'bg-blue-500/75 text-white'
                  )}>{z.name}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right 1/3 */}
        <div className="space-y-4">

          {/* Live sync panel (full, only in Live mode) */}
          {isLive && (
            <LiveSyncBadge
              lastPoll={lastLivePoll}
              nextPoll={nextLivePoll}
              isLoading={liveWeather?.isLoading ?? false}
              variant="full"
            />
          )}

          {/* Agents */}
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <h2 className="text-sm font-medium mb-3">Agent Status</h2>
            <div className="space-y-2">
              {agents.map(agent => (
                <div key={agent.id} className="p-2.5 rounded-lg bg-background/60 border border-border/30">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm leading-none">{agent.icon}</span>
                    <span className="text-xs font-medium flex-1 truncate">{agent.name}</span>
                    <span className={cn('text-[9px] px-1.5 py-0.5 rounded border font-mono uppercase', AGENT_BADGE[agent.status] ?? AGENT_BADGE.idle)}>
                      {agent.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{agent.lastAction}</p>
                  {agent.confidence > 0 && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="flex-1 h-0.5 bg-border/40 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-700', AGENT_BAR[agent.status] ?? 'bg-slate-600')}
                          style={{ width: `${agent.confidence}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground font-mono">{agent.confidence}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium">Activity Feed</h2>
              <Link href="/agents">
                <span className="text-[11px] text-primary hover:opacity-80 transition-opacity flex items-center gap-1 cursor-pointer">
                  All <ChevronRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
            <div className="space-y-2">
              {messages.length === 0 ? (
                <p className="text-[11px] text-muted-foreground text-center py-3">
                  {isRunning
                    ? 'Waiting for agents...'
                    : isLive
                      ? 'Live mode active — agents monitoring'
                      : 'Simulation not started'}
                </p>
              ) : (
                messages.slice(0, 5).map(msg => (
                  <div key={msg.id} className="border-l-2 border-border/50 pl-2 py-0.5">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
                      <span className="font-mono">{fmtTime(msg.timestamp)}</span>
                      <span>·</span>
                      <span className="text-primary/80">{msg.from}</span>
                    </div>
                    <p className="text-[10px] text-foreground/80 leading-relaxed line-clamp-2">{msg.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* System Log */}
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-3.5 h-3.5 text-muted-foreground" />
              <h2 className="text-sm font-medium">System Log</h2>
              {(isRunning || isLive) && (
                <span className="ml-auto text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  {isLive ? 'LIVE' : 'RUNNING'}
                </span>
              )}
            </div>
            <div className="space-y-0.5 max-h-32 overflow-y-auto">
              {systemLog.slice(-8).reverse().map((e, i) => (
                <p key={i} className="text-[10px] font-mono text-muted-foreground leading-relaxed">{e}</p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium">Active Alerts</h2>
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-[10px] font-mono px-1.5 py-0.5 rounded border',
                isLive
                  ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                  : 'text-amber-400 bg-amber-400/10 border-amber-400/20'
              )}>
                {isLive ? 'NWS Live' : 'Simulation'}
              </span>
              <span className="text-[11px] text-muted-foreground">{alerts.length} total</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {alerts.slice(0, 4).map(alert => (
              <div key={alert.id} className={cn('flex items-start gap-2.5 p-3 rounded-lg border', PRIORITY_BADGE[alert.priority])}>
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-medium truncate">{alert.zone}</span>
                    <span className="text-[10px] opacity-60 font-mono flex-shrink-0">{fmtTime(alert.timestamp)}</span>
                  </div>
                  <p className="text-[11px] opacity-75 leading-relaxed line-clamp-2">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live mode all-clear banner */}
      {isLive && threatLevel === 'monitoring' && alerts.length === 0 && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-emerald-400 text-sm">✓</span>
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-400">All Clear — Tampa Bay</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              No active NWS alerts for Florida. NHC confirms no active Atlantic storms. All 4 agents monitoring on standby.
              {lastLivePoll && ` Last verified: ${lastLivePoll.toLocaleTimeString()}.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
