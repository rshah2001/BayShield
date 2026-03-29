// ============================================================
// STORMMESH — Dashboard Page
// Live stats, agent cards, map overview, activity feed
// ============================================================

import { useSimulation } from '@/contexts/SimulationContext';
import { VULNERABILITY_ZONES, RESOURCES } from '@/lib/stormData';
import { motion } from 'framer-motion';
import {
  AlertTriangle, Users, Building2, MapPin,
  Wind, Gauge, Droplets, Clock
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const THREAT_COLORS: Record<string, string> = {
  monitoring: '#10B981',
  advisory: '#06B6D4',
  warning: '#F59E0B',
  critical: '#EF4444'
};

const MAP_OVERLAY_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663488949635/H8uV2jDz2ia2afExqjD23w/stormmesh-map-overlay_d3cce59a.png';

const STORM_INTENSITY_DATA = [
  { time: 'T-72h', wind: 45, surge: 2, pressure: 995 },
  { time: 'T-48h', wind: 75, surge: 4, pressure: 980 },
  { time: 'T-36h', wind: 95, surge: 6, pressure: 968 },
  { time: 'T-24h', wind: 115, surge: 8, pressure: 955 },
  { time: 'T-18h', wind: 130, surge: 10, pressure: 948 },
  { time: 'T-12h', wind: 145, surge: 12, pressure: 942 },
  { time: 'T-6h', wind: 155, surge: 14, pressure: 935 },
  { time: 'Landfall', wind: 158, surge: 15, pressure: 932 },
];

export default function Dashboard() {
  const {
    agents, messages, weather, alerts, threatLevel,
    totalPopulationAtRisk, simulationPhase, systemLog, isRunning
  } = useSimulation();

  const threatColor = THREAT_COLORS[threatLevel] || '#475569';
  const shelters = RESOURCES.filter(r => r.type === 'shelter');
  const totalShelterCap = shelters.reduce((s, r) => s + r.capacity, 0);
  const totalOccupancy = shelters.reduce((s, r) => s + r.currentOccupancy, 0);
  const evacuateZones = VULNERABILITY_ZONES.filter(z => z.status === 'evacuate').length;

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#F1F5F9' }}>Command Dashboard</h1>
          <p className="text-sm" style={{ color: '#64748B' }}>Hurricane Helena — Tampa Bay Response Coordination</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono" style={{ background: `${threatColor}12`, border: `1px solid ${threatColor}30`, color: threatColor }}>
            <div className="w-2 h-2 rounded-full" style={{ background: threatColor, animation: isRunning ? 'agentPulse 1s ease-in-out infinite' : 'none' }} />
            {threatLevel.toUpperCase()}
          </div>
          <div className="text-xs font-mono px-3 py-1.5 rounded-lg" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60A5FA' }}>
            Phase {simulationPhase}/9
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Alerts', value: alerts.length, icon: AlertTriangle, color: '#EF4444', sub: `${alerts.filter(a => a.priority === 'critical').length} critical` },
          { label: 'Population at Risk', value: totalPopulationAtRisk > 0 ? totalPopulationAtRisk.toLocaleString() : '---', icon: Users, color: '#F59E0B', sub: `${evacuateZones} zones evacuating` },
          { label: 'Shelter Capacity', value: `${Math.round((totalOccupancy / totalShelterCap) * 100)}%`, icon: Building2, color: '#06B6D4', sub: `${totalOccupancy.toLocaleString()}/${totalShelterCap.toLocaleString()}` },
          { label: 'Zones Monitored', value: VULNERABILITY_ZONES.length, icon: MapPin, color: '#10B981', sub: 'Tampa Bay region' }
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="p-4 rounded-xl"
              style={{ background: 'rgba(10,22,40,0.7)', border: `1px solid ${stat.color}20` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono" style={{ color: '#475569' }}>{stat.label.toUpperCase()}</span>
                <Icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <div className="text-2xl font-black font-mono" style={{ color: stat.color, textShadow: `0 0 16px ${stat.color}40` }}>{stat.value}</div>
              <div className="text-xs font-mono mt-1" style={{ color: '#334155' }}>{stat.sub}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Grid: Storm Data + Agents + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Storm Data */}
        <div className="lg:col-span-2 space-y-5">
          {/* Weather Panel */}
          <div className="p-5 rounded-xl" style={{ background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(59,130,246,0.12)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-mono font-semibold" style={{ color: '#475569' }}>ACTIVE STORM DATA</div>
              <div className="text-xs font-mono" style={{ color: '#334155' }}>Source: NOAA NHC</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Storm', value: weather.stormName, sub: `Category ${weather.category}`, icon: Wind, color: '#F59E0B' },
                { label: 'Wind Speed', value: `${weather.windSpeed} kt`, sub: 'Sustained', icon: Wind, color: '#EF4444' },
                { label: 'Surge Height', value: `${weather.surgeHeight} ft`, sub: 'Storm surge', icon: Droplets, color: '#06B6D4' },
                { label: 'Landfall', value: weather.landfall, sub: weather.movement, icon: Clock, color: '#F59E0B' }
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className="w-3 h-3" style={{ color: item.color }} />
                      <span className="text-xs font-mono" style={{ color: '#475569' }}>{item.label.toUpperCase()}</span>
                    </div>
                    <div className="text-lg font-bold" style={{ color: '#E2E8F0' }}>{item.value}</div>
                    <div className="text-xs" style={{ color: '#475569' }}>{item.sub}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Storm Intensity Chart */}
          <div className="p-5 rounded-xl" style={{ background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(59,130,246,0.12)' }}>
            <div className="text-xs font-mono font-semibold mb-4" style={{ color: '#475569' }}>STORM INTENSITY TIMELINE</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={STORM_INTENSITY_DATA}>
                <defs>
                  <linearGradient id="windGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="surgeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 10 }} axisLine={{ stroke: '#1E293B' }} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0A1628', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', color: '#E2E8F0', fontSize: '12px' }} />
                <Area type="monotone" dataKey="wind" stroke="#EF4444" fill="url(#windGrad)" strokeWidth={2} name="Wind (kt)" />
                <Area type="monotone" dataKey="surge" stroke="#06B6D4" fill="url(#surgeGrad)" strokeWidth={2} name="Surge (ft)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Map Overview */}
          <div className="p-5 rounded-xl" style={{ background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(59,130,246,0.12)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-mono font-semibold" style={{ color: '#475569' }}>TAMPA BAY THREAT MAP</div>
              <a href="/map" className="text-xs font-mono" style={{ color: '#3B82F6' }}>Full Map View →</a>
            </div>
            <div className="relative rounded-lg overflow-hidden" style={{ height: '280px' }}>
              <img src={MAP_OVERLAY_IMG} alt="Tampa Bay map" className="w-full h-full object-cover" style={{ opacity: 0.7 }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 60%, rgba(10,22,40,0.9))' }} />
              {/* Zone markers */}
              <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
                {VULNERABILITY_ZONES.filter(z => z.status === 'evacuate' || z.status === 'warning').map(z => (
                  <div key={z.id} className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono" style={{ background: z.status === 'evacuate' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)', border: `1px solid ${z.status === 'evacuate' ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)'}`, color: z.status === 'evacuate' ? '#EF4444' : '#F59E0B' }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: z.status === 'evacuate' ? '#EF4444' : '#F59E0B' }} />
                    {z.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Agents + Activity */}
        <div className="space-y-5">
          {/* Agent Status */}
          <div className="p-5 rounded-xl" style={{ background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(59,130,246,0.12)' }}>
            <div className="text-xs font-mono font-semibold mb-4" style={{ color: '#475569' }}>AGENT STATUS</div>
            <div className="space-y-3">
              {agents.map(agent => (
                <div key={agent.id} className="p-3 rounded-lg" style={{ background: agent.status !== 'idle' ? `${agent.color}08` : 'rgba(0,0,0,0.2)', border: `1px solid ${agent.status !== 'idle' ? `${agent.color}25` : 'rgba(255,255,255,0.04)'}` }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{agent.icon}</span>
                      <span className="text-xs font-semibold" style={{ color: '#E2E8F0' }}>{agent.name}</span>
                    </div>
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: `${agent.color}15`, color: agent.color, fontSize: '10px' }}>{agent.status.toUpperCase()}</span>
                  </div>
                  <div className="text-xs" style={{ color: '#64748B' }}>{agent.lastAction}</div>
                  {agent.confidence > 0 && (
                    <div className="mt-2">
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: `${agent.color}15` }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${agent.confidence}%`, background: agent.color }} />
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-xs font-mono" style={{ color: '#334155' }}>Confidence</span>
                        <span className="text-xs font-mono" style={{ color: agent.color }}>{agent.confidence}%</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="p-5 rounded-xl" style={{ background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(59,130,246,0.12)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-mono font-semibold" style={{ color: '#475569' }}>ACTIVITY FEED</div>
              <a href="/agents" className="text-xs font-mono" style={{ color: '#3B82F6' }}>View All →</a>
            </div>
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1E293B transparent' }}>
              {messages.length === 0 ? (
                <div className="text-xs text-center py-8" style={{ color: '#334155' }}>Run simulation to see agent activity</div>
              ) : (
                messages.slice(0, 8).map(msg => {
                  const agentColor = msg.from === 'Storm Watcher' ? '#F59E0B' : msg.from === 'Vulnerability Mapper' ? '#06B6D4' : msg.from === 'Resource Coordinator' ? '#10B981' : '#EF4444';
                  return (
                    <div key={msg.id} className="p-2.5 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)', borderLeft: `2px solid ${agentColor}` }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold" style={{ color: agentColor }}>{msg.from}</span>
                        <span className="text-xs font-mono" style={{ color: '#334155' }}>{msg.timestamp.toLocaleTimeString()}</span>
                      </div>
                      <div className="text-xs" style={{ color: '#94A3B8' }}>{msg.content.slice(0, 100)}{msg.content.length > 100 ? '...' : ''}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* System Log */}
          <div className="p-5 rounded-xl" style={{ background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(59,130,246,0.12)' }}>
            <div className="text-xs font-mono font-semibold mb-3" style={{ color: '#475569' }}>SYSTEM LOG</div>
            <div className="font-mono text-xs space-y-1 max-h-[180px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1E293B transparent' }}>
              {systemLog.slice(-8).map((log, i) => (
                <div key={i} style={{ color: log.includes('ERROR') ? '#EF4444' : log.includes('SYSTEM') ? '#3B82F6' : log.includes('Agent-4') ? '#EF4444' : log.includes('Agent-3') ? '#10B981' : log.includes('Agent-2') ? '#06B6D4' : log.includes('Agent-1') ? '#F59E0B' : '#475569' }}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
