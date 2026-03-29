// ============================================================
// STORMMESH — Dashboard Layout with Sidebar
// Persistent sidebar for command center pages
// ============================================================

import { ReactNode } from 'react';
import { useLocation, Link } from 'wouter';
import { useSimulation } from '@/contexts/SimulationContext';
import {
  LayoutDashboard,
  MessageSquare,
  Map,
  Building2,
  Shield,
  Zap,
  ChevronLeft,
  Activity
} from 'lucide-react';

const THREAT_COLORS: Record<string, string> = {
  monitoring: '#10B981',
  advisory: '#06B6D4',
  warning: '#F59E0B',
  critical: '#EF4444'
};

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/agents', label: 'Agent Comms', icon: MessageSquare },
  { path: '/infrastructure', label: 'Infrastructure', icon: Building2 },
  { path: '/map', label: 'Map View', icon: Map },
  { path: '/resources', label: 'Resources', icon: Shield },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { threatLevel, isRunning, agents, simulationPhase, startSimulation, resetSimulation } = useSimulation();
  const threatColor = THREAT_COLORS[threatLevel] || '#475569';
  const activeAgents = agents.filter(a => a.status === 'active' || a.status === 'processing').length;

  return (
    <div className="min-h-screen flex" style={{ background: '#020B18', fontFamily: "'Outfit', sans-serif" }}>
      {/* Sidebar */}
      <aside
        className="fixed top-0 left-0 bottom-0 w-[240px] z-50 flex flex-col"
        style={{
          background: 'rgba(5, 12, 28, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(59, 130, 246, 0.12)'
        }}
      >
        {/* Logo */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(59, 130, 246, 0.1)' }}>
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer group">
              <ChevronLeft className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#64748B' }} />
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(6,182,212,0.2))',
                  border: '1px solid rgba(59,130,246,0.4)',
                  boxShadow: '0 0 16px rgba(59,130,246,0.3)'
                }}
              >
                <Zap className="w-4 h-4" style={{ color: '#60A5FA' }} />
              </div>
              <div>
                <span className="text-sm font-bold" style={{ color: '#E2E8F0' }}>
                  Storm<span style={{ color: '#3B82F6' }}>Mesh</span>
                </span>
                <div className="text-xs font-mono" style={{ color: '#334155' }}>v2.4.1</div>
              </div>
            </div>
          </Link>
        </div>

        {/* Threat Status */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono" style={{ color: '#475569' }}>THREAT STATUS</span>
            {isRunning && (
              <div className="flex items-center gap-1.5">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#10B981', boxShadow: '0 0 6px #10B981', animation: 'agentPulse 1.5s ease-in-out infinite' }}
                />
                <span className="text-xs font-mono" style={{ color: '#10B981' }}>LIVE</span>
              </div>
            )}
          </div>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono font-semibold"
            style={{
              background: `${threatColor}12`,
              border: `1px solid ${threatColor}30`,
              color: threatColor
            }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: threatColor,
                animation: threatLevel !== 'monitoring' ? 'agentPulse 1s ease-in-out infinite' : 'none'
              }}
            />
            {threatLevel.toUpperCase()}
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs font-mono" style={{ color: '#334155' }}>Phase {simulationPhase}/9</span>
            <span className="text-xs font-mono" style={{ color: '#334155' }}>{activeAgents} active</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const isActive = location === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
                  style={{
                    background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent',
                    color: isActive ? '#60A5FA' : '#64748B',
                    border: isActive ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent'
                  }}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Simulation Control */}
        <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(59,130,246,0.1)' }}>
          {!isRunning ? (
            <button
              onClick={startSimulation}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
                color: '#fff',
                boxShadow: '0 0 20px rgba(59,130,246,0.3)',
                border: 'none'
              }}
            >
              <Activity className="w-4 h-4" />
              Run Simulation
            </button>
          ) : (
            <button
              onClick={resetSimulation}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: 'rgba(239,68,68,0.12)',
                color: '#EF4444',
                border: '1px solid rgba(239,68,68,0.3)'
              }}
            >
              Reset Simulation
            </button>
          )}
        </div>

        {/* Agent Mini Status */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-4 gap-1.5">
            {agents.map(agent => (
              <div
                key={agent.id}
                className="flex flex-col items-center gap-1 py-1.5 rounded"
                style={{
                  background: agent.status !== 'idle' ? `${agent.color}10` : 'transparent'
                }}
                title={`${agent.name}: ${agent.status}`}
              >
                <span className="text-xs">{agent.icon}</span>
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: agent.status === 'idle' ? '#334155' : agent.color,
                    boxShadow: agent.status !== 'idle' ? `0 0 4px ${agent.color}` : 'none'
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-[240px] min-h-screen">
        {children}
      </main>
    </div>
  );
}
