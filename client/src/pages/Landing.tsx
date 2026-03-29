// ============================================================
// STORMMESH — Landing Page
// ============================================================

import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { Zap, Eye, MapPin, Cpu, Radio, Shield, GitBranch, ArrowRight } from 'lucide-react';
import ParticleCanvas from '@/components/ParticleCanvas';
import LiveTicker from '@/components/LiveTicker';

const HERO_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663488949635/H8uV2jDz2ia2afExqjD23w/stormmesh-hero-bg_89bbeb97.png';
const AGENT_NETWORK_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663488949635/H8uV2jDz2ia2afExqjD23w/stormmesh-agent-network_dffd50bb.png';

const AGENTS = [
  { name: 'Storm Watcher', subtitle: 'The Observer', icon: '🌀', color: '#F59E0B', pattern: 'LoopAgent', desc: 'Continuously polls NOAA NHC and OpenWeatherMap APIs. Uses a LoopAgent to re-evaluate threat severity on every cycle.' },
  { name: 'Vulnerability Mapper', subtitle: 'The Analyst', icon: '🗺️', color: '#06B6D4', pattern: 'ParallelAgent', desc: 'Pulls FEMA flood zone data, cross-references with census vulnerability metrics. Runs in parallel with Agent 3.' },
  { name: 'Resource Coordinator', subtitle: 'The Logistics Brain', icon: '📦', color: '#10B981', pattern: 'ParallelAgent', desc: 'Inventories shelters, supply depots, and evacuation routes. Runs simultaneously with Vulnerability Mapper.' },
  { name: 'Alert Commander', subtitle: 'The Actor', icon: '🚨', color: '#EF4444', pattern: 'SelfCorrectingLoop', desc: 'Synthesizes all outputs, generates prioritized action plans. Self-correction loop reviews for logical errors.' }
];

const FEATURES = [
  { icon: Eye, title: 'Real-Time Monitoring', desc: 'Continuous weather API polling with automatic threat escalation', color: '#F59E0B' },
  { icon: GitBranch, title: 'A2A Protocol', desc: 'Structured agent-to-agent communication with typed messages', color: '#3B82F6' },
  { icon: Cpu, title: 'Parallel Execution', desc: 'Agents 2 & 3 run simultaneously, halving analysis time', color: '#10B981' },
  { icon: Radio, title: 'Self-Correction', desc: 'Alert Commander reviews its own plans and re-runs on conflicts', color: '#EF4444' },
  { icon: MapPin, title: 'Vulnerability Mapping', desc: 'FEMA flood zones cross-referenced with population demographics', color: '#06B6D4' },
  { icon: Shield, title: 'Action Plans', desc: 'Automated evacuation orders with resource allocation matrices', color: '#8B5CF6' }
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } })
};

export default function Landing() {
  return (
    <div className="min-h-screen" style={{ background: '#020B18', fontFamily: "'Outfit', sans-serif" }}>
      {/* ===== HERO ===== */}
      <section className="relative min-h-screen flex flex-col">
        <div className="absolute inset-0 overflow-hidden">
          <img src={HERO_BG} alt="" className="w-full h-full object-cover" style={{ opacity: 0.5 }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(2,11,24,0.3), rgba(2,11,24,0.1) 40%, rgba(2,11,24,0.8) 80%, #020B18)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(2,11,24,0.7), transparent 50%, rgba(2,11,24,0.3))' }} />
          <ParticleCanvas />
        </div>

        {/* Nav */}
        <nav className="relative z-20 flex items-center justify-between max-w-[1400px] mx-auto w-full px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(6,182,212,0.2))', border: '1px solid rgba(59,130,246,0.4)', boxShadow: '0 0 16px rgba(59,130,246,0.3)' }}>
              <Zap className="w-5 h-5" style={{ color: '#60A5FA' }} />
            </div>
            <span className="text-xl font-bold" style={{ color: '#E2E8F0' }}>Storm<span style={{ color: '#3B82F6' }}>Mesh</span></span>
            <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60A5FA' }}>v2.4.1</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#architecture" className="text-sm font-medium hidden md:block" style={{ color: '#94A3B8' }}>Architecture</a>
            <a href="#features" className="text-sm font-medium hidden md:block" style={{ color: '#94A3B8' }}>Features</a>
            <Link href="/dashboard">
              <span className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer" style={{ background: 'linear-gradient(135deg, #3B82F6, #06B6D4)', color: '#fff', boxShadow: '0 0 20px rgba(59,130,246,0.3)' }}>
                Launch Dashboard <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-[1400px] mx-auto w-full px-6 pb-24">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono mb-6" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', color: '#60A5FA' }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#3B82F6', boxShadow: '0 0 6px #3B82F6', animation: 'agentPulse 2s ease-in-out infinite' }} />
              MULTI-AGENT DISASTER RESPONSE SYSTEM
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-5 leading-none tracking-tight" style={{ color: '#F1F5F9' }}>
              Storm<span style={{ color: '#3B82F6', textShadow: '0 0 40px rgba(59,130,246,0.6)' }}>Mesh</span>
            </h1>
            <p className="text-lg md:text-xl font-light mb-8 leading-relaxed" style={{ color: '#94A3B8', maxWidth: '520px' }}>
              Four specialist AI agents that monitor weather threats, map vulnerable communities, coordinate resources, and issue targeted evacuation orders — <em style={{ color: '#CBD5E1' }}>autonomously</em>.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/dashboard">
                <span className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm cursor-pointer" style={{ background: 'linear-gradient(135deg, #3B82F6, #06B6D4)', color: '#fff', boxShadow: '0 0 24px rgba(59,130,246,0.4)' }}>
                  Launch Dashboard <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
              <a href="#architecture" className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: '#CBD5E1', border: '1px solid rgba(255,255,255,0.1)' }}>
                View Architecture
              </a>
            </div>
          </motion.div>

          {/* Agent pills */}
          <div className="flex flex-wrap gap-2 mt-10">
            {AGENTS.map(a => (
              <div key={a.name} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono" style={{ background: `${a.color}12`, border: `1px solid ${a.color}25`, color: a.color }}>
                <span>{a.icon}</span> {a.name}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10"><LiveTicker /></div>
      </section>

      {/* ===== ARCHITECTURE ===== */}
      <section id="architecture" className="py-24" style={{ background: 'linear-gradient(to bottom, #020B18, #030D1A)' }}>
        <div className="max-w-[1400px] mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
            <motion.div variants={fadeUp} custom={0}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono mb-4" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#A78BFA' }}>AGENT ARCHITECTURE</div>
              <h2 className="text-4xl font-black mb-3" style={{ color: '#F1F5F9' }}>How the Mesh Works</h2>
              <p className="text-base mb-12" style={{ color: '#64748B', maxWidth: '600px' }}>A pipeline of specialist agents communicating via the A2A protocol, with parallel execution and self-correction built in.</p>
            </motion.div>
          </motion.div>

          {/* Flow Diagram */}
          <div className="mb-16 p-6 rounded-2xl" style={{ background: 'rgba(10,22,40,0.6)', border: '1px solid rgba(59,130,246,0.15)' }}>
            <div className="text-xs font-mono font-semibold mb-6" style={{ color: '#475569' }}>AGENT COMMUNICATION FLOW</div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', boxShadow: '0 0 20px rgba(245,158,11,0.2)' }}>🌀</div>
                <div className="text-xs font-bold" style={{ color: '#F59E0B' }}>Storm Watcher</div>
                <div className="text-xs font-mono" style={{ color: '#475569' }}>LoopAgent</div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="text-xs font-mono" style={{ color: '#3B82F6' }}>A2A</div>
                <div className="flex items-center gap-1"><div className="w-8 md:w-16 h-px" style={{ background: 'rgba(59,130,246,0.4)' }} /><div style={{ color: '#3B82F6', fontSize: '10px' }}>▶</div></div>
                <div className="text-xs font-mono" style={{ color: '#475569' }}>broadcast</div>
              </div>
              <div className="flex flex-col gap-3">
                <div className="px-3 py-1.5 rounded-lg text-center" style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)' }}>
                  <div className="text-xs font-bold" style={{ color: '#06B6D4' }}>🗺️ Vulnerability Mapper</div>
                  <div className="text-xs font-mono" style={{ color: '#475569' }}>ParallelAgent</div>
                </div>
                <div className="text-center text-xs font-mono" style={{ color: '#334155' }}>⟵ PARALLEL ⟶</div>
                <div className="px-3 py-1.5 rounded-lg text-center" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <div className="text-xs font-bold" style={{ color: '#10B981' }}>📦 Resource Coordinator</div>
                  <div className="text-xs font-mono" style={{ color: '#475569' }}>ParallelAgent</div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="text-xs font-mono" style={{ color: '#3B82F6' }}>A2A</div>
                <div className="flex items-center gap-1"><div className="w-8 md:w-16 h-px" style={{ background: 'rgba(59,130,246,0.4)' }} /><div style={{ color: '#3B82F6', fontSize: '10px' }}>▶</div></div>
                <div className="text-xs font-mono" style={{ color: '#475569' }}>merged data</div>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', boxShadow: '0 0 20px rgba(239,68,68,0.2)' }}>🚨</div>
                <div className="text-xs font-bold" style={{ color: '#EF4444' }}>Alert Commander</div>
                <div className="text-xs font-mono" style={{ color: '#475569' }}>SelfCorrectingLoop</div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="text-xs font-mono" style={{ color: '#EF4444' }}>OUTPUT</div>
                <div className="flex items-center gap-1"><div className="w-8 md:w-16 h-px" style={{ background: 'rgba(239,68,68,0.4)' }} /><div style={{ color: '#EF4444', fontSize: '10px' }}>▶</div></div>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>📢</div>
                <div className="text-xs font-bold" style={{ color: '#F87171' }}>Targeted Alerts</div>
                <div className="text-xs font-mono" style={{ color: '#475569' }}>All Zones</div>
              </div>
            </div>
          </div>

          {/* Agent Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {AGENTS.map((agent, i) => (
              <motion.div key={agent.name} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i} className="p-6 rounded-2xl" style={{ background: 'rgba(10,22,40,0.7)', border: `1px solid ${agent.color}25` }}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="text-5xl font-black font-mono leading-none" style={{ color: `${agent.color}30` }}>0{i + 1}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold" style={{ color: '#F1F5F9' }}>{agent.name}</h3>
                      <span className="text-sm" style={{ color: '#64748B' }}>— {agent.subtitle}</span>
                    </div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: `${agent.color}15`, color: agent.color, border: `1px solid ${agent.color}30` }}>{agent.pattern}</span>
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{agent.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Agent Network Image */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(59,130,246,0.2)', height: '340px' }}>
            <img src={AGENT_NETWORK_IMG} alt="Agent network visualization" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="py-24" style={{ background: '#030D1A' }}>
        <div className="max-w-[1400px] mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
            <motion.div variants={fadeUp} custom={0} className="mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono mb-4" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34D399' }}>CAPABILITIES</div>
              <h2 className="text-4xl font-black mb-3" style={{ color: '#F1F5F9' }}>Built for Real Emergencies</h2>
              <p className="text-base" style={{ color: '#64748B', maxWidth: '600px' }}>Every feature designed for production-grade disaster response coordination.</p>
            </motion.div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div key={f.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i} className="p-6 rounded-2xl group" style={{ background: 'rgba(10,22,40,0.5)', border: `1px solid ${f.color}15` }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: `${f.color}15`, border: `1px solid ${f.color}30` }}>
                    <Icon className="w-5 h-5" style={{ color: f.color }} />
                  </div>
                  <h3 className="text-base font-bold mb-2" style={{ color: '#E2E8F0' }}>{f.title}</h3>
                  <p className="text-sm" style={{ color: '#64748B' }}>{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-24" style={{ background: '#020B18' }}>
        <div className="max-w-[1400px] mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-4xl font-black mb-4" style={{ color: '#F1F5F9' }}>Ready to Coordinate?</h2>
            <p className="text-lg mb-8" style={{ color: '#64748B', maxWidth: '500px', margin: '0 auto' }}>Enter the command center and run the full Hurricane Helena simulation.</p>
            <Link href="/dashboard">
              <span className="inline-flex items-center gap-2 px-8 py-4 rounded-lg font-bold text-base cursor-pointer" style={{ background: 'linear-gradient(135deg, #3B82F6, #06B6D4)', color: '#fff', boxShadow: '0 0 30px rgba(59,130,246,0.4)' }}>
                Enter Command Center <ArrowRight className="w-5 h-5" />
              </span>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-8" style={{ background: '#020B18', borderTop: '1px solid rgba(59,130,246,0.08)' }}>
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: '#3B82F6' }} />
            <span className="text-sm font-bold" style={{ color: '#475569' }}>StormMesh v2.4.1</span>
          </div>
          <div className="text-xs font-mono" style={{ color: '#334155' }}>Built with Google ADK + A2A Protocol + LoopAgent + ParallelAgent</div>
        </div>
      </footer>
    </div>
  );
}
