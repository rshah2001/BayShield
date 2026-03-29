// ============================================================
// STORMMESH — Resources Page
// Shelters, hospitals, supply depots, evacuation routes
// ============================================================

import { useState } from 'react';
import { useSimulation } from '@/contexts/SimulationContext';
import { RESOURCES, VULNERABILITY_ZONES } from '@/lib/stormData';
import { motion } from 'framer-motion';
import { Building2, Package, Heart, Route, Filter, Users, AlertTriangle } from 'lucide-react';

const TYPE_META: Record<string, { label: string; color: string; icon: typeof Building2 }> = {
  shelter: { label: 'Shelters', color: '#3B82F6', icon: Building2 },
  supply_depot: { label: 'Supply Depots', color: '#10B981', icon: Package },
  medical: { label: 'Medical', color: '#EF4444', icon: Heart },
  evacuation_route: { label: 'Evacuation Routes', color: '#F59E0B', icon: Route },
};

const STATUS_COLORS: Record<string, string> = {
  available: '#10B981',
  filling: '#F59E0B',
  full: '#EF4444',
  closed: '#64748B',
};

export default function Resources() {
  const { alerts, isRunning } = useSimulation();
  const [filterType, setFilterType] = useState<string>('all');

  const filteredResources = filterType === 'all' ? RESOURCES : RESOURCES.filter(r => r.type === filterType);

  const shelters = RESOURCES.filter(r => r.type === 'shelter');
  const totalCap = shelters.reduce((s, r) => s + r.capacity, 0);
  const totalOcc = shelters.reduce((s, r) => s + r.currentOccupancy, 0);

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black" style={{ color: '#F1F5F9' }}>Resources</h1>
        <p className="text-sm" style={{ color: '#64748B' }}>Shelters, supply depots, medical facilities, and evacuation routes</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Shelters', value: shelters.length, icon: Building2, color: '#3B82F6', sub: `${totalCap.toLocaleString()} capacity` },
          { label: 'Shelter Occupancy', value: `${Math.round((totalOcc / totalCap) * 100)}%`, icon: Users, color: '#F59E0B', sub: `${totalOcc.toLocaleString()} / ${totalCap.toLocaleString()}` },
          { label: 'Medical Facilities', value: RESOURCES.filter(r => r.type === 'medical').length, icon: Heart, color: '#EF4444', sub: 'Active' },
          { label: 'Evac Routes', value: RESOURCES.filter(r => r.type === 'evacuation_route').length, icon: Route, color: '#10B981', sub: 'Contraflow active' },
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
              <div className="text-2xl font-black font-mono" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-xs font-mono mt-1" style={{ color: '#334155' }}>{stat.sub}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilterType('all')}
          className="px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
          style={{
            background: filterType === 'all' ? 'rgba(59,130,246,0.12)' : 'rgba(0,0,0,0.3)',
            color: filterType === 'all' ? '#60A5FA' : '#475569',
            border: `1px solid ${filterType === 'all' ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.04)'}`,
          }}
        >
          All ({RESOURCES.length})
        </button>
        {Object.entries(TYPE_META).map(([type, meta]) => {
          const count = RESOURCES.filter(r => r.type === type).length;
          return (
            <button
              key={type}
              onClick={() => setFilterType(filterType === type ? 'all' : type)}
              className="px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
              style={{
                background: filterType === type ? `${meta.color}12` : 'rgba(0,0,0,0.3)',
                color: filterType === type ? meta.color : '#475569',
                border: `1px solid ${filterType === type ? `${meta.color}25` : 'rgba(255,255,255,0.04)'}`,
              }}
            >
              {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Resource Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.map((res, i) => {
          const meta = TYPE_META[res.type];
          const Icon = meta?.icon || Package;
          const statusColor = STATUS_COLORS[res.status] || '#475569';
          const occupancyPct = res.type !== 'evacuation_route' ? Math.round((res.currentOccupancy / res.capacity) * 100) : 0;

          return (
            <motion.div
              key={res.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-5 rounded-xl"
              style={{ background: 'rgba(10,22,40,0.7)', border: `1px solid ${meta?.color || '#475569'}20` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${meta?.color}15`, border: `1px solid ${meta?.color}30` }}>
                    <Icon className="w-4 h-4" style={{ color: meta?.color }} />
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ color: '#E2E8F0' }}>{res.name}</div>
                    <div className="text-xs font-mono" style={{ color: meta?.color }}>{meta?.label}</div>
                  </div>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}25` }}>{res.status.toUpperCase()}</span>
              </div>

              {res.type !== 'evacuation_route' && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono" style={{ color: '#475569' }}>CAPACITY</span>
                    <span className="text-xs font-mono" style={{ color: '#94A3B8' }}>{res.currentOccupancy.toLocaleString()} / {res.capacity.toLocaleString()}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${occupancyPct}%`,
                        background: occupancyPct > 80 ? '#EF4444' : occupancyPct > 50 ? '#F59E0B' : '#10B981',
                      }}
                    />
                  </div>
                  <div className="text-right mt-0.5">
                    <span className="text-xs font-mono" style={{ color: occupancyPct > 80 ? '#EF4444' : '#475569' }}>{occupancyPct}%</span>
                  </div>
                </div>
              )}

              {res.supplies && res.supplies.length > 0 && (
                <div>
                  <div className="text-xs font-mono mb-1.5" style={{ color: '#475569' }}>SUPPLIES</div>
                  <div className="flex flex-wrap gap-1">
                    {res.supplies.map(s => (
                      <span key={s} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.08)', color: '#64748B', border: '1px solid rgba(59,130,246,0.12)' }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Vulnerability Zones Table */}
      <div className="p-5 rounded-xl" style={{ background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(59,130,246,0.12)' }}>
        <div className="text-xs font-mono font-semibold mb-4" style={{ color: '#475569' }}>VULNERABILITY ZONE ASSIGNMENTS</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
                {['Zone', 'Flood Zone', 'Population', 'Elderly %', 'Low-Income %', 'Risk Score', 'Status'].map(h => (
                  <th key={h} className="text-left py-2 px-3 font-mono font-semibold" style={{ color: '#475569' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {VULNERABILITY_ZONES.sort((a, b) => b.riskScore - a.riskScore).map(zone => {
                const zoneStatusColor = zone.status === 'evacuate' ? '#EF4444' : zone.status === 'warning' ? '#F59E0B' : zone.status === 'watch' ? '#06B6D4' : '#10B981';
                return (
                  <tr key={zone.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td className="py-2.5 px-3 font-semibold" style={{ color: '#E2E8F0' }}>{zone.name}</td>
                    <td className="py-2.5 px-3 font-mono" style={{ color: '#94A3B8' }}>{zone.floodZone}</td>
                    <td className="py-2.5 px-3 font-mono" style={{ color: '#94A3B8' }}>{zone.population.toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-mono" style={{ color: zone.elderlyPct > 30 ? '#F59E0B' : '#94A3B8' }}>{zone.elderlyPct}%</td>
                    <td className="py-2.5 px-3 font-mono" style={{ color: zone.lowIncomePct > 30 ? '#F59E0B' : '#94A3B8' }}>{zone.lowIncomePct}%</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div className="h-full rounded-full" style={{ width: `${zone.riskScore}%`, background: zoneStatusColor }} />
                        </div>
                        <span className="font-mono" style={{ color: zoneStatusColor }}>{zone.riskScore}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono px-1.5 py-0.5 rounded" style={{ background: `${zoneStatusColor}15`, color: zoneStatusColor, border: `1px solid ${zoneStatusColor}25` }}>{zone.status.toUpperCase()}</span>
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
