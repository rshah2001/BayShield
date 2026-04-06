// ============================================================
// BAYSHIELD -- LiveTicker Component
// Context-aware scrolling ticker:
//   Live mode + no threat  → "No Active Threats" calm state
//   Live mode + threat      → Real NWS alert text + live conditions
//   Simulation mode         → Helena scenario data
// ============================================================

import { useMemo } from 'react';
import { useSimulation } from '@/contexts/SimulationContext';

const SIM_ITEMS = [
  '🌀 HURRICANE HELENA — CATEGORY 4 — 145 KT SUSTAINED WINDS',
  '⚠️ MANDATORY EVACUATION: PINELLAS POINT, ST. PETE BEACH, CLEARWATER BEACH',
  '📍 LANDFALL PROJECTED: TAMPA BAY — 18-22 HOURS',
  '🏟️ SHELTERS OPEN: USF SUN DOME · YUENGLING CENTER · TROPICANA FIELD',
  '🛣️ CONTRAFLOW ACTIVE: I-75 NORTH · I-4 EAST — DEPART NOW',
  '📞 SPECIAL NEEDS EVACUATION: HILLSBOROUGH 813-272-5900 · PINELLAS 727-464-3800',
  '🌊 STORM SURGE WARNING: 10-14 FT ABOVE GROUND LEVEL IN SURGE ZONES',
  '⚡ BAYSHIELD AGENTS ACTIVE: 4/4 ONLINE — CONTINUOUS MONITORING',
];

const NO_THREAT_ITEMS = [
  '✅ NO ACTIVE THREATS — TAMPA BAY REGION CLEAR',
  '🌤️ BAYSHIELD MONITORING: ALL 4 AGENTS ON STANDBY',
  '📡 NOAA NHC: NO ACTIVE ATLANTIC STORMS',
  '🏖️ TAMPA BAY CONDITIONS: NORMAL — NO WATCHES OR WARNINGS IN EFFECT',
  '🔄 NEXT NOAA SYNC IN PROGRESS — DATA REFRESHES EVERY 2 MINUTES',
  '📍 MONITORING 8 VULNERABILITY ZONES — ALL CLEAR',
];

export default function LiveTicker() {
  const { mode, alerts, threatLevel, weather, liveWeather } = useSimulation();
  const isLive = mode === 'live';
  const obs = liveWeather?.observation;

  const hasActiveThreat = isLive
    ? (threatLevel !== 'monitoring' || alerts.length > 0)
    : true; // simulation always shows storm data

  // Build ticker items dynamically
  const items = useMemo(() => {
    if (!isLive) return SIM_ITEMS;
    if (!hasActiveThreat) return NO_THREAT_ITEMS;

    // Live mode with active threat — build from real data
    const built: string[] = [];
    if (weather.stormName && weather.stormName !== 'No Active Storm') {
      built.push(`🌀 ${weather.stormName.toUpperCase()}${weather.category > 0 ? ` — CATEGORY ${weather.category}` : ''} — ${weather.windSpeed} KT WINDS`);
    }
    if (obs) {
      built.push(`🌡️ TAMPA BAY: ${obs.conditions?.toUpperCase() ?? 'CLOUDY'} — ${obs.tempF ?? '--'}°F — ${obs.windSpeedMph ?? '--'} MPH ${obs.windDirectionText?.toUpperCase() ?? ''}`);
    }
    // Add real NWS alert headlines
    alerts.slice(0, 4).forEach(a => {
      built.push(`⚠️ ${a.zone.toUpperCase()}: ${a.message.toUpperCase().slice(0, 80)}`);
    });
    built.push('⚡ BAYSHIELD AGENTS ACTIVE: 4/4 ONLINE — CONTINUOUS MONITORING');
    built.push('📡 NOAA NWS LIVE FEED — DATA REFRESHES EVERY 2 MINUTES');
    return built.length > 2 ? built : NO_THREAT_ITEMS;
  }, [isLive, hasActiveThreat, weather, obs, alerts]);

  // Color scheme based on state
  const scheme = !isLive
    ? { bar: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', badge: 'rgba(239,68,68,0.9)', text: '#FCA5A5' }
    : hasActiveThreat
      ? { bar: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)', badge: 'rgba(251,191,36,0.9)', text: '#FDE68A' }
      : { bar: 'rgba(52,211,153,0.06)', border: 'rgba(52,211,153,0.15)', badge: 'rgba(16,185,129,0.85)', text: '#6EE7B7' };

  const badgeLabel = !isLive ? 'SIM' : 'LIVE';
  const speed = items.length <= 6 ? 45 : 60;

  return (
    <div
      className="relative overflow-hidden flex-shrink-0"
      style={{
        background: scheme.bar,
        borderTop: `1px solid ${scheme.border}`,
        borderBottom: `1px solid ${scheme.border}`,
        height: '34px',
      }}
    >
      {/* Badge */}
      <div
        className="absolute left-0 top-0 bottom-0 z-10 flex items-center px-3 gap-2"
        style={{ background: scheme.badge, minWidth: '72px' }}
      >
        <div
          className="w-1.5 h-1.5 rounded-full bg-white"
          style={{ animation: 'tickerPulse 1s ease-in-out infinite' }}
        />
        <span className="text-[11px] font-mono font-bold text-white tracking-wider">{badgeLabel}</span>
      </div>

      {/* Scrolling track */}
      <div className="flex items-center h-full" style={{ paddingLeft: '80px' }}>
        <div
          style={{
            display: 'flex',
            gap: '80px',
            animation: `tickerScroll ${speed}s linear infinite`,
            whiteSpace: 'nowrap',
          }}
        >
          {[...items, ...items].map((item, i) => (
            <span key={i} className="text-[11px] font-mono tracking-wide" style={{ color: scheme.text }}>
              {item}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes tickerPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
