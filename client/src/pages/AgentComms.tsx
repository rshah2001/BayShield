// ============================================================
// STORMMESH — Agent Communications Page
// Real-time message log, filter by agent, agent flow diagram
// ============================================================

import { useState } from 'react';
import { useSimulation } from '@/contexts/SimulationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, ArrowRight, RotateCcw } from 'lucide-react';

const AGENT_META: Record<string, { color: string; icon: string }> = {
  'Storm Watcher': { color: '#F59E0B', icon: '🌀' },
  'Vulnerability Mapper': { color: '#06B6D4', icon: '🗺️' },
  'Resource Coordinator': { color: '#10B981', icon: '📦' },
  'Alert Commander': { color: '#EF4444', icon: '🚨' },
  'System': { color: '#3B82F6', icon: '⚡' },
  'All Zones': { color: '#8B5CF6', icon: '📢' },
};

const TYPE_COLORS: Record<string, string> = {
  alert: '#EF4444',
  request: '#F59E0B',
  response: '#10B981',
  data: '#06B6D4',
};

export default function AgentComms() {
  const { messages, agents, isRunning } = useSimulation();
  const [filterAgent, setFilterAgent] = useState<string>('all');

  const filteredMessages = filterAgent === 'all'
    ? messages
    : messages.filter(m => m.from === filterAgent || m.to === filterAgent);

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#F1F5F9' }}>Agent Communications</h1>
          <p className="text-sm" style={{ color: '#64748B' }}>Real-time A2A message passing between specialist agents</p>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981' }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#10B981', animation: 'agentPulse 1s ease-in-out infinite' }} />
              LIVE
            </div>
          )}
          <span className="text-xs font-mono px-3 py-1.5 rounded-lg" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60A5FA' }}>
            {messages.length} messages
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Left: Agent Pipeline Diagram + Filter */}
        <div className="space-y-5">
          {/* Agent Pipeline */}
          <div className="p-5 rounded-xl" style={{ background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(59,130,246,0.12)' }}>
            <div className="text-xs font-mono font-semibold mb-4" style={{ color: '#475569' }}>AGENT PIPELINE</div>
            <div className="space-y-3">
              {agents.map((agent, i) => {
                const meta = AGENT_META[agent.name] || { color: '#475569', icon: '?' };
                return (
                  <div key={agent.id}>
                    <div
                      className="p-3 rounded-lg cursor-pointer transition-all"
                      style={{
                        background: filterAgent === agent.name ? `${meta.color}15` : 'rgba(0,0,0,0.2)',
                        border: `1px solid ${filterAgent === agent.name ? `${meta.color}40` : 'rgba(255,255,255,0.04)'}`,
                      }}
                      onClick={() => setFilterAgent(filterAgent === agent.name ? 'all' : agent.name)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{meta.icon}</span>
                        <span className="text-xs font-semibold" style={{ color: '#E2E8F0' }}>{agent.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono" style={{ color: meta.color }}>{agent.status.toUpperCase()}</span>
                        <span className="text-xs font-mono" style={{ color: '#334155' }}>Loop {agent.loopCount}</span>
                      </div>
                    </div>
                    {i < agents.length - 1 && (
                      <div className="flex justify-center py-1">
                        <div className="flex flex-col items-center">
                          <div className="w-px h-3" style={{ background: 'rgba(59,130,246,0.2)' }} />
                          <ArrowRight className="w-3 h-3 rotate-90" style={{ color: '#1E293B' }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filter */}
          <div className="p-5 rounded-xl" style={{ background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(59,130,246,0.12)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-3.5 h-3.5" style={{ color: '#475569' }} />
              <span className="text-xs font-mono font-semibold" style={{ color: '#475569' }}>FILTER</span>
            </div>
            <button
              onClick={() => setFilterAgent('all')}
              className="w-full text-left px-3 py-2 rounded-lg text-xs font-mono mb-1 transition-all"
              style={{
                background: filterAgent === 'all' ? 'rgba(59,130,246,0.12)' : 'transparent',
                color: filterAgent === 'all' ? '#60A5FA' : '#64748B',
                border: filterAgent === 'all' ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent'
              }}
            >
              All Messages
            </button>
            {Object.entries(AGENT_META).filter(([name]) => !['System', 'All Zones'].includes(name)).map(([name, meta]) => (
              <button
                key={name}
                onClick={() => setFilterAgent(filterAgent === name ? 'all' : name)}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-mono mb-1 transition-all"
                style={{
                  background: filterAgent === name ? `${meta.color}12` : 'transparent',
                  color: filterAgent === name ? meta.color : '#64748B',
                  border: filterAgent === name ? `1px solid ${meta.color}25` : '1px solid transparent'
                }}
              >
                {meta.icon} {name}
              </button>
            ))}
          </div>

          {/* Message Type Legend */}
          <div className="p-5 rounded-xl" style={{ background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(59,130,246,0.12)' }}>
            <div className="text-xs font-mono font-semibold mb-3" style={{ color: '#475569' }}>MESSAGE TYPES</div>
            <div className="space-y-2">
              {Object.entries(TYPE_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-xs font-mono uppercase" style={{ color }}>{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Message Feed */}
        <div className="lg:col-span-3">
          <div className="p-5 rounded-xl" style={{ background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(59,130,246,0.12)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-mono font-semibold" style={{ color: '#475569' }}>
                {filterAgent === 'all' ? 'ALL MESSAGES' : `MESSAGES: ${filterAgent.toUpperCase()}`}
              </div>
              {filterAgent !== 'all' && (
                <button onClick={() => setFilterAgent('all')} className="flex items-center gap-1 text-xs font-mono" style={{ color: '#3B82F6' }}>
                  <RotateCcw className="w-3 h-3" /> Clear Filter
                </button>
              )}
            </div>

            <div className="space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1E293B transparent' }}>
              {filteredMessages.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-4xl mb-4">📡</div>
                  <div className="text-sm font-semibold mb-1" style={{ color: '#475569' }}>No Messages Yet</div>
                  <div className="text-xs" style={{ color: '#334155' }}>Run the simulation to see real-time A2A communication</div>
                </div>
              ) : (
                <AnimatePresence>
                  {filteredMessages.map((msg, i) => {
                    const fromMeta = AGENT_META[msg.from] || { color: '#475569', icon: '?' };
                    const toMeta = AGENT_META[msg.to] || { color: '#475569', icon: '?' };
                    const typeColor = TYPE_COLORS[msg.type] || '#475569';
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="p-4 rounded-xl"
                        style={{ background: 'rgba(0,0,0,0.3)', borderLeft: `3px solid ${fromMeta.color}` }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">{fromMeta.icon}</span>
                              <span className="text-xs font-semibold" style={{ color: fromMeta.color }}>{msg.from}</span>
                            </div>
                            <ArrowRight className="w-3 h-3" style={{ color: '#334155' }} />
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">{toMeta.icon}</span>
                              <span className="text-xs font-semibold" style={{ color: toMeta.color }}>{msg.to}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}25` }}>{msg.type.toUpperCase()}</span>
                            <span className="text-xs font-mono" style={{ color: '#334155' }}>{msg.timestamp.toLocaleTimeString()}</span>
                          </div>
                        </div>
                        <div className="text-sm leading-relaxed" style={{ color: '#CBD5E1' }}>{msg.content}</div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.08)', color: '#475569' }}>
                            Status: {msg.status}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
