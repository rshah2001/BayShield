// ============================================================
// STORMMESH — Infrastructure Predictions Page
// Predicted outages, damage estimates, recovery timeline
// ============================================================

import { useSimulation } from '@/contexts/SimulationContext';
import { motion } from 'framer-motion';
import { Zap, Car, Heart, DollarSign, Clock, Waves, Wind, TrendingUp } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const RISK_COLORS: Record<string, string> = {
  low: '#10B981',
  moderate: '#F59E0B',
  high: '#F97316',
  critical: '#EF4444',
  extreme: '#DC2626',
};

export default function Infrastructure() {
  const { infraPredictions, actionPlans, isRunning } = useSimulation();

  const chartData = infraPredictions.map(p => ({
    time: p.timeframe,
    power: p.powerOutagePct,
    roads: p.roadClosurePct,
    flood: p.floodDepthFt,
    recovery: p.recoveryDays,
  }));

  const latest = infraPredictions.length > 0 ? infraPredictions[infraPredictions.length - 1] : null;

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black" style={{ color: '#F1F5F9' }}>Infrastructure Predictions</h1>
        <p className="text-sm" style={{ color: '#64748B' }}>Predictive damage modeling and recovery timeline analysis</p>
      </div>

      {/* Current Predictions Summary */}
      {latest ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Power Outage', value: `${latest.powerOutagePct}%`, icon: Zap, color: '#F59E0B', sub: 'Grid failure' },
            { label: 'Road Closures', value: `${latest.roadClosurePct}%`, icon: Car, color: '#EF4444', sub: 'Impassable' },
            { label: 'Hospital Risk', value: latest.hospitalRisk.toUpperCase(), icon: Heart, color: RISK_COLORS[latest.hospitalRisk], sub: 'Surge capacity' },
            { label: 'Damage Estimate', value: latest.damageEstimate, icon: DollarSign, color: '#06B6D4', sub: `Recovery: ${latest.recoveryDays} days` },
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
      ) : (
        <div className="p-8 rounded-xl text-center" style={{ background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(59,130,246,0.12)' }}>
          <div className="text-4xl mb-4">📊</div>
          <div className="text-sm font-semibold mb-1" style={{ color: '#475569' }}>No Predictions Available</div>
          <div className="text-xs" style={{ color: '#334155' }}>Run the simulation to generate infrastructure impact predictions</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Power & Road Outage Chart */}
        <div className="p-5 rounded-xl" style={{ background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(59,130,246,0.12)' }}>
          <div className="text-xs font-mono font-semibold mb-4" style={{ color: '#475569' }}>INFRASTRUCTURE FAILURE TIMELINE</div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 10 }} axisLine={{ stroke: '#1E293B' }} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: '#0A1628', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', color: '#E2E8F0', fontSize: '12px' }} />
                <Area type="monotone" dataKey="power" stroke="#F59E0B" fill="url(#powerGrad)" strokeWidth={2} name="Power Outage %" />
                <Area type="monotone" dataKey="roads" stroke="#EF4444" fill="url(#roadGrad)" strokeWidth={2} name="Road Closure %" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-xs" style={{ color: '#334155' }}>Awaiting simulation data</div>
          )}
        </div>

        {/* Flood Depth & Recovery */}
        <div className="p-5 rounded-xl" style={{ background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(59,130,246,0.12)' }}>
          <div className="text-xs font-mono font-semibold mb-4" style={{ color: '#475569' }}>FLOOD DEPTH & RECOVERY TIMELINE</div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 10 }} axisLine={{ stroke: '#1E293B' }} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0A1628', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', color: '#E2E8F0', fontSize: '12px' }} />
                <Bar dataKey="flood" fill="#06B6D4" name="Flood Depth (ft)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="recovery" fill="#8B5CF6" name="Recovery (days)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-xs" style={{ color: '#334155' }}>Awaiting simulation data</div>
          )}
        </div>
      </div>

      {/* Detailed Predictions Table */}
      {infraPredictions.length > 0 && (
        <div className="p-5 rounded-xl" style={{ background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(59,130,246,0.12)' }}>
          <div className="text-xs font-mono font-semibold mb-4" style={{ color: '#475569' }}>DETAILED PREDICTIONS</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
                  {['Timeframe', 'Power Outage', 'Road Closure', 'Hospital Risk', 'Flood Depth', 'Wind Damage', 'Damage Est.', 'Recovery'].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-mono font-semibold" style={{ color: '#475569' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {infraPredictions.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td className="py-2.5 px-3 font-mono font-semibold" style={{ color: '#E2E8F0' }}>{p.timeframe}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(245,158,11,0.15)' }}>
                          <div className="h-full rounded-full" style={{ width: `${p.powerOutagePct}%`, background: '#F59E0B' }} />
                        </div>
                        <span className="font-mono" style={{ color: '#F59E0B' }}>{p.powerOutagePct}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(239,68,68,0.15)' }}>
                          <div className="h-full rounded-full" style={{ width: `${p.roadClosurePct}%`, background: '#EF4444' }} />
                        </div>
                        <span className="font-mono" style={{ color: '#EF4444' }}>{p.roadClosurePct}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono px-1.5 py-0.5 rounded" style={{ background: `${RISK_COLORS[p.hospitalRisk]}15`, color: RISK_COLORS[p.hospitalRisk], border: `1px solid ${RISK_COLORS[p.hospitalRisk]}25` }}>{p.hospitalRisk.toUpperCase()}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono" style={{ color: '#06B6D4' }}>{p.floodDepthFt} ft</td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono px-1.5 py-0.5 rounded" style={{ background: `${RISK_COLORS[p.windDamageRisk]}15`, color: RISK_COLORS[p.windDamageRisk], border: `1px solid ${RISK_COLORS[p.windDamageRisk]}25` }}>{p.windDamageRisk.toUpperCase()}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold" style={{ color: '#E2E8F0' }}>{p.damageEstimate}</td>
                    <td className="py-2.5 px-3 font-mono" style={{ color: '#8B5CF6' }}>{p.recoveryDays}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Plans */}
      {actionPlans.length > 0 && (
        <div className="space-y-4">
          <div className="text-xs font-mono font-semibold" style={{ color: '#475569' }}>ACTION PLANS</div>
          {actionPlans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-5 rounded-xl"
              style={{ background: 'rgba(10,22,40,0.7)', border: `1px solid ${plan.severity === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}` }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold" style={{ color: '#E2E8F0' }}>{plan.title}</h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: plan.severity === 'critical' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: plan.severity === 'critical' ? '#EF4444' : '#F59E0B', border: `1px solid ${plan.severity === 'critical' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}` }}>{plan.severity.toUpperCase()}</span>
              </div>
              <p className="text-sm mb-4" style={{ color: '#94A3B8' }}>{plan.summary}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {plan.zonesAffected.map(z => (
                  <span key={z} className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.08)', color: '#64748B', border: '1px solid rgba(59,130,246,0.15)' }}>{z}</span>
                ))}
                <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.08)', color: '#F59E0B' }}>{plan.populationCovered.toLocaleString()} residents</span>
              </div>
              <div className="space-y-2">
                {plan.recommendations.map((rec, j) => (
                  <div key={j} className="flex items-start gap-2 text-xs" style={{ color: '#CBD5E1' }}>
                    <TrendingUp className="w-3 h-3 mt-0.5 shrink-0" style={{ color: '#3B82F6' }} />
                    {rec}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
