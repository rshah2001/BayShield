// ============================================================
// BAYSHIELD -- Resources Page
// Shelters, supply depots, medical, evacuation routes
// ============================================================
import { useState } from 'react';
import { useSimulation } from '@/contexts/SimulationContext';
import { RESOURCES, VULNERABILITY_ZONES } from '@/lib/stormData';
import { cn } from '@/lib/utils';
import { Building2, Package, Heart, Route, Users } from 'lucide-react';

const TYPE_META: Record<string, { label: string; icon: typeof Building2; text: string; bg: string; border: string }> = {
  shelter:          { label: 'Shelters',          icon: Building2, text: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/20' },
  supply_depot:     { label: 'Supply Depots',     icon: Package,   text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  medical:          { label: 'Medical',           icon: Heart,     text: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/20' },
  evacuation_route: { label: 'Evacuation Routes', icon: Route,     text: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20' },
};

const STATUS_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  available: { text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  filling:   { text: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20' },
  full:      { text: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/20' },
  closed:    { text: 'text-slate-400',   bg: 'bg-slate-400/10',   border: 'border-slate-400/20' },
  open:      { text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  active:    { text: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/20' },
};

const ZONE_STATUS: Record<string, { text: string; bg: string; border: string }> = {
  evacuate: { text: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/20' },
  warning:  { text: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20' },
  watch:    { text: 'text-sky-400',     bg: 'bg-sky-400/10',     border: 'border-sky-400/20' },
  safe:     { text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
};

export default function Resources() {
  const { isRunning } = useSimulation();
  const [filterType, setFilterType] = useState<string>('all');

  const filteredResources = filterType === 'all' ? RESOURCES : RESOURCES.filter(r => r.type === filterType);
  const shelters = RESOURCES.filter(r => r.type === 'shelter');
  const totalCap = shelters.reduce((s, r) => s + r.capacity, 0);
  const totalOcc = shelters.reduce((s, r) => s + r.currentOccupancy, 0);
  const shelterPct = Math.round((totalOcc / totalCap) * 100);

  return (
    <div className="min-h-full space-y-5 p-4 sm:p-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Resources</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Shelters, supply depots, medical facilities, and evacuation routes</p>
        </div>
        {isRunning && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />LIVE
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Shelters',    value: shelters.length,                                 icon: Building2, text: 'text-blue-400',    bg: 'bg-blue-400/10',    sub: `${totalCap.toLocaleString()} capacity` },
          { label: 'Shelter Occupancy', value: `${shelterPct}%`,                                icon: Users,     text: shelterPct > 80 ? 'text-red-400' : 'text-amber-400', bg: shelterPct > 80 ? 'bg-red-400/10' : 'bg-amber-400/10', sub: `${totalOcc.toLocaleString()} / ${totalCap.toLocaleString()}` },
          { label: 'Medical Facilities',value: RESOURCES.filter(r => r.type === 'medical').length, icon: Heart, text: 'text-red-400',     bg: 'bg-red-400/10',     sub: 'Active & staffed' },
          { label: 'Evac Routes',       value: RESOURCES.filter(r => r.type === 'evacuation_route').length, icon: Route, text: 'text-amber-400', bg: 'bg-amber-400/10', sub: 'Contraflow active' },
        ].map(({ label, value, icon: Icon, text, bg, sub }) => (
          <div key={label} className="bg-card border border-border/50 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                <p className={cn('text-2xl font-semibold', text)}>{value}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
              </div>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', bg)}>
                <Icon className={cn('w-4 h-4', text)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilterType('all')}
          className={cn('px-3 py-1.5 rounded-lg text-xs font-mono transition-colors border',
            filterType === 'all' ? 'bg-primary/10 text-primary border-primary/20' : 'text-muted-foreground border-border/30 hover:text-foreground'
          )}
        >All ({RESOURCES.length})</button>
        {Object.entries(TYPE_META).map(([type, meta]) => {
          const count = RESOURCES.filter(r => r.type === type).length;
          return (
            <button
              key={type}
              onClick={() => setFilterType(filterType === type ? 'all' : type)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-mono transition-colors border flex items-center gap-1.5',
                filterType === type ? cn(meta.bg, meta.text, meta.border) : 'text-muted-foreground border-border/30 hover:text-foreground'
              )}
            >
              <meta.icon className="w-3 h-3" />
              {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Shelter estimation notice */}
      {(filterType === 'all' || filterType === 'shelter') && (
        <div className="flex items-start gap-2.5 bg-amber-400/[0.06] border border-amber-400/15 rounded-xl px-4 py-3">
          <span className="text-amber-400 text-sm flex-shrink-0 mt-0.5">⚠</span>
          <div>
            <p className="text-xs font-medium text-amber-400/90">Shelter capacity is estimated</p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-relaxed">
              No public real-time API exists for Florida shelter occupancy — FL SERT shelter status is restricted to authorized emergency management agencies.
              Capacity figures are modeled using the <span className="text-foreground/60">FEMA Shelter Estimation Support Program (SESP)</span> baseline,
              scaled by current storm severity and Tampa Bay population density. Spaces remaining are updated every simulation cycle.
            </p>
          </div>
        </div>
      )}

      {/* Resource cards */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {filteredResources.map(res => {
          const meta = TYPE_META[res.type];
          const Icon = meta?.icon ?? Package;
          const ss = STATUS_STYLES[res.status] ?? STATUS_STYLES.available;
          const occupancyPct = res.capacity > 0 ? Math.round((res.currentOccupancy / res.capacity) * 100) : 0;

          return (
            <div key={res.id} className="bg-card border border-border/50 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', meta?.bg ?? 'bg-slate-400/10', meta?.border ?? 'border-slate-400/20', 'border')}>
                    <Icon className={cn('w-4 h-4', meta?.text ?? 'text-slate-400')} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold leading-tight">{res.name}</p>
                    <p className={cn('text-[10px] font-mono', meta?.text ?? 'text-slate-400')}>{meta?.label}</p>
                  </div>
                </div>
                <span className={cn('text-[9px] px-1.5 py-0.5 rounded border font-mono uppercase flex-shrink-0', ss.text, ss.bg, ss.border)}>
                  {res.status}
                </span>
              </div>

              {res.type !== 'evacuation_route' && res.capacity > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground">Capacity</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{res.currentOccupancy.toLocaleString()} / {res.capacity.toLocaleString()}</span>
                  </div>
                  <div className="h-1 bg-border/40 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500',
                        occupancyPct > 80 ? 'bg-red-400' : occupancyPct > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                      )}
                      style={{ width: `${occupancyPct}%` }}
                    />
                  </div>
                  <div className="text-right mt-0.5">
                    <span className={cn('text-[10px] font-mono', occupancyPct > 80 ? 'text-red-400' : 'text-muted-foreground')}>{occupancyPct}%</span>
                  </div>
                </div>
              )}

              {res.supplies && res.supplies.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1.5">Supplies</p>
                  <div className="flex flex-wrap gap-1">
                    {res.supplies.map(s => (
                      <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-background/60 border border-border/30 text-muted-foreground font-mono">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Vulnerability zones table */}
      <div className="bg-card border border-border/50 rounded-xl p-4">
        <h2 className="text-sm font-medium mb-3">Vulnerability Zone Assignments</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/30">
                {['Zone', 'Flood Zone', 'Population', 'Elderly %', 'Low-Income %', 'Risk Score', 'Status'].map(h => (
                  <th key={h} className="text-left py-2 px-2 text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...VULNERABILITY_ZONES].sort((a, b) => b.riskScore - a.riskScore).map(zone => {
                const zs = ZONE_STATUS[zone.status] ?? ZONE_STATUS.safe;
                const riskColor = zone.riskScore >= 80 ? '#f87171' : zone.riskScore >= 60 ? '#fbbf24' : '#34d399';
                return (
                  <tr key={zone.id} className="border-b border-border/20">
                    <td className="py-2 px-2 font-semibold text-foreground">{zone.name}</td>
                    <td className="py-2 px-2 font-mono text-muted-foreground">{zone.floodZone}</td>
                    <td className="py-2 px-2 font-mono text-muted-foreground">{zone.population.toLocaleString()}</td>
                    <td className={cn('py-2 px-2 font-mono', zone.elderlyPct > 30 ? 'text-amber-400' : 'text-muted-foreground')}>{zone.elderlyPct}%</td>
                    <td className={cn('py-2 px-2 font-mono', zone.lowIncomePct > 30 ? 'text-amber-400' : 'text-muted-foreground')}>{zone.lowIncomePct}%</td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-10 h-1 bg-border/40 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${zone.riskScore}%`, background: riskColor }} />
                        </div>
                        <span className="font-mono" style={{ color: riskColor }}>{zone.riskScore}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-mono uppercase', zs.text, zs.bg, zs.border)}>
                        {zone.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
