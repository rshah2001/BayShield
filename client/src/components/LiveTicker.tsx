// ============================================================
// STORMMESH -- LiveTicker Component
// Design: Scrolling emergency broadcast ticker at the bottom of hero
// ============================================================

import { useEffect, useRef } from 'react';

const TICKER_ITEMS = [
  '🌀 HURRICANE HELENA -- CATEGORY 4 -- 145 KT SUSTAINED WINDS',
  '⚠️ MANDATORY EVACUATION: PINELLAS POINT, ST. PETE BEACH, CLEARWATER BEACH',
  '📍 LANDFALL PROJECTED: TAMPA BAY -- 18-22 HOURS',
  '🏟️ SHELTERS OPEN: USF SUN DOME · YUENGLING CENTER · TROPICANA FIELD',
  '🛣️ CONTRAFLOW ACTIVE: I-75 NORTH · I-4 EAST -- DEPART NOW',
  '📞 SPECIAL NEEDS EVACUATION: HILLSBOROUGH 813-272-5900 · PINELLAS 727-464-3800',
  '🌊 STORM SURGE WARNING: 10-14 FT ABOVE GROUND LEVEL IN SURGE ZONES',
  '⚡ STORMMESH AGENTS ACTIVE: 4/4 ONLINE -- CONTINUOUS MONITORING',
];

export default function LiveTicker() {
  const trackRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: 'rgba(239, 68, 68, 0.08)',
        borderTop: '1px solid rgba(239, 68, 68, 0.2)',
        borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
        height: '36px'
      }}
    >
      {/* LIVE badge */}
      <div
        className="absolute left-0 top-0 bottom-0 z-10 flex items-center px-3 gap-2"
        style={{
          background: 'rgba(239, 68, 68, 0.9)',
          minWidth: '80px'
        }}
      >
        <div
          className="w-1.5 h-1.5 rounded-full bg-white"
          style={{ animation: 'agentPulse 0.8s ease-in-out infinite' }}
        />
        <span className="text-xs font-mono font-bold text-white">LIVE</span>
      </div>

      {/* Scrolling content */}
      <div
        className="flex items-center h-full"
        style={{ paddingLeft: '90px' }}
      >
        <div
          style={{
            display: 'flex',
            gap: '80px',
            animation: 'tickerScroll 60s linear infinite',
            whiteSpace: 'nowrap'
          }}
        >
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span
              key={i}
              className="text-xs font-mono"
              style={{ color: '#FCA5A5' }}
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes tickerScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
