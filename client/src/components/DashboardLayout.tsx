// ============================================================
// BAYSHIELD -- DashboardLayout
// Apple-level sidebar nav with glassmorphism, mode toggle, threat badge
// ============================================================
import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useSimulation } from '@/contexts/SimulationContext';
import LiveSyncBadge from '@/components/LiveSyncBadge';
import LiveTicker from '@/components/LiveTicker';
import {
  LayoutDashboard,
  MessageSquare,
  Building2,
  Map,
  Package,
  Activity,
  Shield,
  Radio,
  RotateCcw,
  ChevronLeft,
  Wind,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { path: '/dashboard',      label: 'Dashboard',       icon: LayoutDashboard },
  { path: '/agents',         label: 'Agent Comms',     icon: MessageSquare },
  { path: '/infrastructure', label: 'Infrastructure',  icon: Building2 },
  { path: '/map',            label: 'Map & Evacuation', icon: Map },
  { path: '/resources',      label: 'Resources',       icon: Package },
  { path: '/system',         label: 'System Monitor',  icon: Activity },
  { path: '/simulator',       label: 'Sim Studio',      icon: Wind },
];

const THREAT_STYLES: Record<string, { label: string; dotClass: string; textClass: string; bgClass: string }> = {
  monitoring: { label: 'MONITORING', dotClass: 'bg-slate-400',                                    textClass: 'text-slate-400',  bgClass: 'bg-slate-400/10 border-slate-400/20' },
  advisory:   { label: 'ADVISORY',   dotClass: 'bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.8)]',  textClass: 'text-blue-400',   bgClass: 'bg-blue-400/10 border-blue-400/20'  },
  warning:    { label: 'WARNING',    dotClass: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]', textClass: 'text-amber-400',  bgClass: 'bg-amber-400/10 border-amber-400/20' },
  critical:   { label: 'CRITICAL',   dotClass: 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.8)]',  textClass: 'text-red-400',    bgClass: 'bg-red-400/10 border-red-400/20'   },
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { threatLevel, simulationPhase, totalPhases, isRunning, agents, mode, setMode, startSimulation, resetSimulation, liveWeather, lastLivePoll, nextLivePoll } = useSimulation();
  const threat = THREAT_STYLES[threatLevel] ?? THREAT_STYLES.monitoring;

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* ── Sidebar ── */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-white/[0.06] bg-[oklch(0.11_0.013_250)]">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/[0.06]">
          <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-foreground">BayShield</div>
            <div className="text-[10px] text-muted-foreground font-mono">v3.0 · Tampa Bay</div>
          </div>
        </div>

        {/* Threat status */}
        <div className={cn('mx-3 mt-3 px-3 py-2 rounded-lg border', threat.bgClass)}>
          <div className="flex items-center gap-2">
            <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', threat.dotClass,
              threatLevel !== 'monitoring' && 'animate-pulse-live')} />
            <span className={cn('text-[10px] font-semibold tracking-widest font-mono', threat.textClass)}>
              {threat.label}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-mono">
              Phase {simulationPhase}/{totalPhases}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {agents.filter(a => a.status === 'active' || a.status === 'processing').length} active
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
            const active = location === path;
            return (
              <Link key={path} href={path}>
                <div className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 cursor-pointer',
                  active
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
                )}>
                  <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-primary' : '')} />
                  {label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Agent mini-status */}
        <div className="px-3 pb-2">
          <div className="grid grid-cols-4 gap-1">
            {agents.map(agent => (
              <div
                key={agent.id}
                title={`${agent.name}: ${agent.status}`}
                className="flex flex-col items-center gap-1 py-1.5 rounded-md bg-white/[0.02]"
              >
                <span className="text-xs leading-none">{agent.icon}</span>
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  agent.status === 'idle'       ? 'bg-slate-600' :
                  agent.status === 'active'     ? 'bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]' :
                  agent.status === 'processing' ? 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.8)] animate-pulse-live' :
                  agent.status === 'complete'   ? 'bg-blue-400 shadow-[0_0_4px_rgba(96,165,250,0.8)]' :
                                                  'bg-red-400'
                )} />
              </div>
            ))}
          </div>
        </div>

        {/* Mode toggle + controls */}
        <div className="px-3 pb-4 space-y-2 border-t border-white/[0.06] pt-3">
          {/* Mode toggle */}
          <div className="flex rounded-lg overflow-hidden border border-white/[0.08] text-[11px] font-medium">
            <button
              onClick={() => setMode('simulation')}
              className={cn(
                'flex-1 py-1.5 transition-colors',
                mode === 'simulation' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Simulation
            </button>
            <button
              onClick={() => setMode('live')}
              className={cn(
                'flex-1 py-1.5 transition-colors',
                mode === 'live' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Live
            </button>
          </div>

          {/* Run / Reset */}
          <div className="flex gap-1.5">
            <button
              onClick={startSimulation}
              disabled={isRunning}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all',
                isRunning
                  ? 'bg-primary/10 text-primary/50 cursor-not-allowed'
                  : 'bg-primary/15 text-primary hover:bg-primary/25 border border-primary/20'
              )}
            >
              <Radio className={cn('w-3 h-3', isRunning && 'animate-pulse')} />
              {isRunning ? 'Running...' : 'Run'}
            </button>
            <button
              onClick={resetSimulation}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors border border-white/[0.08]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Live sync indicator */}
          {mode === 'live' && (
            <div className="px-0.5">
              <LiveSyncBadge
                lastPoll={lastLivePoll}
                nextPoll={nextLivePoll}
                isLoading={liveWeather?.isLoading ?? false}
                variant="compact"
              />
            </div>
          )}

          {/* Back to landing */}
          <Link href="/">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer">
              <ChevronLeft className="w-3 h-3" />
              Back to Landing
            </div>
          </Link>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        {/* Ticker bar — pinned to bottom of content area */}
        <LiveTicker />
      </div>
    </div>
  );
}
