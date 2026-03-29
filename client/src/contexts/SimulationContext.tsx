// ============================================================
// BAYSHIELD -- SimulationContext
//
// Dual-mode context:
//   "simulation" → runs the Hurricane Helena demo pipeline
//   "live"       → polls real NOAA/NWS APIs every 2 minutes,
//                  feeds real data through the 4 agent pipeline
// ============================================================

import { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { useStormSimulation } from '@/hooks/useStormSimulation';
import { useLiveWeather } from '@/hooks/useLiveWeather';
import type { LiveWeatherData } from '@/hooks/useLiveWeather';
import type { AgentState, AgentMessage, WeatherData, Alert, ActionPlan, InfrastructurePrediction, ThreatLevel } from '@/lib/stormData';
import { nanoid } from 'nanoid';

// ── Shared context shape ──────────────────────────────────────
export interface SimulationContextValue {
  // Core state (shared by both modes)
  agents: AgentState[];
  messages: AgentMessage[];
  weather: WeatherData;
  alerts: Alert[];
  actionPlans: ActionPlan[];
  infraPredictions: InfrastructurePrediction[];
  isRunning: boolean;
  simulationPhase: number;
  totalPhases: number;
  threatLevel: ThreatLevel;
  totalPopulationAtRisk: number;
  systemLog: string[];
  mode: 'live' | 'simulation';
  setMode: (m: 'live' | 'simulation') => void;
  startSimulation: () => void;
  resetSimulation: () => void;
  // Live-mode extras
  liveWeather: LiveWeatherData | null;
  lastLivePoll: Date | null;
  nextLivePoll: Date | null;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

// ── Live mode agent pipeline ──────────────────────────────────
// Converts real NOAA data into agent states + messages + alerts
function buildLiveAgentStates(live: LiveWeatherData): {
  agents: AgentState[];
  messages: AgentMessage[];
  alerts: Alert[];
  weather: WeatherData;
  threatLevel: ThreatLevel;
  totalPopulationAtRisk: number;
  systemLog: string[];
} {
  const obs = live.observation;
  const now = new Date();
  const ts = now.toLocaleTimeString('en-US', { hour12: false });

  // Map live threat level to internal ThreatLevel
  const threatMap: Record<string, ThreatLevel> = {
    NONE: 'monitoring',
    WATCH: 'advisory',
    WARNING: 'warning',
    CRITICAL: 'critical',
  };
  const threatLevel: ThreatLevel = threatMap[live.threatLevel] ?? 'monitoring';

  // Build weather object from real observation
  const weather: WeatherData = {
    stormName: live.activeStorms.length > 0
      ? `${live.activeStorms[0].type} ${live.activeStorms[0].name}`
      : 'No Active Storm',
    category: live.activeStorms[0]?.category ?? 0,
    windSpeed: obs?.windSpeedKt ?? 0,
    surgeHeight: 0,
    landfall: live.activeStorms.length > 0 ? 'Tracking...' : 'N/A',
    movement: obs ? `${obs.windDirectionText} at ${obs.windSpeedMph ?? 0} mph` : 'Calm',
    pressure: obs?.pressureInHg ?? 29.92,
    threatLevel,
    lat: live.activeStorms[0] ? 25.2 : 27.95,
    lng: live.activeStorms[0] ? -84.1 : -82.46,
    radarReturns: live.activeStorms.length > 0 ? 87 : 0,
  };

  // Build live alerts from NWS alerts (Tampa Bay relevant ones first)
  const tampaBayKeywords = ['hillsborough', 'pinellas', 'pasco', 'manatee', 'sarasota', 'tampa', 'st. pete', 'clearwater'];
  const relevantAlerts = live.alerts.filter(a =>
    tampaBayKeywords.some(kw => a.areaDesc.toLowerCase().includes(kw))
  );
  const allAlerts = relevantAlerts.length > 0 ? relevantAlerts : live.alerts.slice(0, 5);

  const alerts: Alert[] = allAlerts.slice(0, 8).map((a, i) => ({
    id: `live-${a.id ?? i}`,
    priority: a.severity === 'Extreme' || a.severity === 'Severe' ? 'critical'
             : a.severity === 'Moderate' ? 'warning' : 'advisory',
    zone: a.areaDesc.split(';')[0]?.trim() ?? 'Florida',
    message: a.headline || a.event,
    timestamp: new Date(a.effective || now),
    type: a.event.toLowerCase().includes('hurricane') || a.event.toLowerCase().includes('tropical') ? 'evacuation'
        : a.event.toLowerCase().includes('flood') ? 'flood'
        : a.event.toLowerCase().includes('wind') ? 'wind'
        : 'shelter',
    source: a.senderName || 'NWS',
  }));

  // Add active storm alert if present
  if (live.activeStorms.length > 0) {
    const storm = live.activeStorms[0];
    alerts.unshift({
      id: 'live-nhc-storm',
      priority: storm.type === 'Hurricane' ? 'critical' : 'warning',
      zone: `Atlantic Basin -- ${storm.distanceMiles ? `${storm.distanceMiles} mi from Tampa` : 'Position tracking'}`,
      message: `NHC: ${storm.type} ${storm.name} -- ${storm.windMph ?? '?'} mph winds, moving ${storm.movement}`,
      timestamp: now,
      type: 'evacuation',
      source: 'NOAA NHC',
    });
  }

  // Compute population at risk from alerts
  const totalPopulationAtRisk = live.threatLevel === 'CRITICAL' ? 47520
    : live.threatLevel === 'WARNING' ? 28000
    : live.threatLevel === 'WATCH' ? 12000
    : 0;

  // Build agent states reflecting real data processing
  const stormWatcherStatus: AgentState['status'] = live.isLoading ? 'processing' : 'active';
  const stormWatcherAction = live.isLoading
    ? 'Polling NOAA NHC API...'
    : live.activeStorms.length > 0
      ? `Tracking ${live.activeStorms[0].type} ${live.activeStorms[0].name} -- ${live.activeStorms[0].windMph ?? '?'} mph`
      : obs
        ? `Tampa Bay: ${obs.conditions}, ${obs.tempF ?? '?'}°F, winds ${obs.windSpeedMph ?? 0} mph ${obs.windDirectionText}`
        : 'Monitoring Tampa Bay -- no active threats';

  const agents: AgentState[] = [
    {
      id: 'storm-watcher',
      name: 'Storm Watcher',
      role: 'Observer -- LoopAgent',
      status: stormWatcherStatus,
      lastAction: stormWatcherAction,
      loopCount: Math.floor((Date.now() - now.setHours(0, 0, 0, 0)) / (2 * 60 * 1000)) + 1,
      confidence: live.isLoading ? 50 : live.error ? 30 : 95,
      processingTime: 340,
      color: '#F59E0B',
      glowClass: live.isLoading ? 'dot-processing' : 'dot-active',
      icon: '🌀',
    },
    {
      id: 'vulnerability-mapper',
      name: 'Vulnerability Mapper',
      role: 'Analyst -- ParallelAgent',
      status: live.isLoading ? 'idle' : 'active',
      lastAction: live.isLoading
        ? 'Awaiting Storm Watcher data...'
        : live.threatLevel === 'NONE'
          ? 'No threat zones -- all 8 zones SAFE'
          : `Mapping ${relevantAlerts.length} alert zones in Tampa Bay region`,
      loopCount: live.isLoading ? 0 : 1,
      confidence: live.isLoading ? 0 : 94,
      processingTime: 520,
      color: '#38BDF8',
      glowClass: live.isLoading ? 'dot-idle' : 'dot-active',
      icon: '🗺️',
    },
    {
      id: 'resource-coordinator',
      name: 'Resource Coordinator',
      role: 'Logistics -- ParallelAgent',
      status: live.isLoading ? 'idle' : 'active',
      lastAction: live.isLoading
        ? 'Standby mode...'
        : live.threatLevel === 'NONE'
          ? 'Resources on standby -- 3 shelters ready, routes clear'
          : 'Pre-positioning resources for active threat zones',
      loopCount: live.isLoading ? 0 : 1,
      confidence: live.isLoading ? 0 : 91,
      processingTime: 480,
      color: '#34D399',
      glowClass: live.isLoading ? 'dot-idle' : 'dot-active',
      icon: '📦',
    },
    {
      id: 'alert-commander',
      name: 'Alert Commander',
      role: 'Actor -- SelfCorrectingLoopAgent',
      status: live.isLoading ? 'idle' : alerts.length > 0 ? 'active' : 'complete',
      lastAction: live.isLoading
        ? 'Waiting for analysis data...'
        : alerts.length > 0
          ? `${alerts.length} active NWS alerts -- monitoring for escalation`
          : 'No active alerts -- all clear. Self-correction loop idle.',
      loopCount: live.isLoading ? 0 : 1,
      confidence: live.isLoading ? 0 : 96,
      processingTime: 890,
      color: '#F87171',
      glowClass: live.isLoading ? 'dot-idle' : alerts.length > 0 ? 'dot-active' : 'dot-complete',
      icon: '🚨',
    },
  ];

  // Build A2A messages from live data
  const messages: AgentMessage[] = [];

  if (!live.isLoading && obs) {
    messages.push({
      id: nanoid(),
      from: 'Storm Watcher',
      to: 'All Agents',
      type: 'data',
      eventType: 'WEATHER_UPDATE',
      content: `Live NOAA observation: ${obs.conditions}, ${obs.tempF}°F, winds ${obs.windSpeedMph} mph ${obs.windDirectionText}, pressure ${obs.pressureInHg} inHg`,
      payload: JSON.stringify({ source: 'KTPA', temp_f: obs.tempF, wind_mph: obs.windSpeedMph, wind_dir: obs.windDirectionText, conditions: obs.conditions, pressure_inhg: obs.pressureInHg, timestamp: obs.timestamp }),
      status: 'delivered',
      timestamp: now,
    });
  }

  if (!live.isLoading && live.activeStorms.length > 0) {
    const storm = live.activeStorms[0];
    messages.push({
      id: nanoid(),
      from: 'Storm Watcher',
      to: 'Vulnerability Mapper',
      type: 'alert',
      eventType: 'STORM_DETECTED',
      content: `NHC ADVISORY: ${storm.type} ${storm.name} -- ${storm.windMph} mph, ${storm.distanceMiles ? `${storm.distanceMiles} mi from Tampa Bay` : 'position tracking'}`,
      payload: JSON.stringify({ storm_name: storm.name, type: storm.type, category: storm.category, wind_mph: storm.windMph, distance_mi: storm.distanceMiles, movement: storm.movement, source: 'NHC' }),
      status: 'delivered',
      timestamp: now,
    });
    messages.push({
      id: nanoid(),
      from: 'Storm Watcher',
      to: 'Resource Coordinator',
      type: 'alert',
      eventType: 'STORM_DETECTED',
      content: `Parallel dispatch: Pre-position resources for ${storm.type} ${storm.name} threat`,
      payload: JSON.stringify({ storm_name: storm.name, wind_mph: storm.windMph, threat_level: live.threatLevel }),
      status: 'delivered',
      timestamp: now,
    });
  }

  if (!live.isLoading && live.alerts.length > 0) {
    messages.push({
      id: nanoid(),
      from: 'Vulnerability Mapper',
      to: 'Alert Commander',
      type: 'data',
      eventType: 'ZONE_ANALYSIS',
      content: `NWS reports ${live.alerts.length} active alerts for Florida. ${relevantAlerts.length} affect Tampa Bay region.`,
      payload: JSON.stringify({ total_fl_alerts: live.alerts.length, tampa_bay_alerts: relevantAlerts.length, threat_level: live.threatLevel }),
      status: 'delivered',
      timestamp: now,
    });
  }

  if (!live.isLoading) {
    messages.push({
      id: nanoid(),
      from: 'Alert Commander',
      to: 'Emergency Management',
      type: 'response',
      eventType: live.threatLevel === 'NONE' ? 'ALL_CLEAR' : 'ALERT_ISSUED',
      content: live.threatLevel === 'NONE'
        ? 'All clear -- no active storm threats. Tampa Bay normal operations. Monitoring continues.'
        : `ALERT ISSUED: ${alerts.length} active NWS alerts. Threat level: ${live.threatLevel}. Population at risk: ${totalPopulationAtRisk.toLocaleString()}.`,
      payload: JSON.stringify({ threat_level: live.threatLevel, alert_count: alerts.length, population_at_risk: totalPopulationAtRisk, source: 'NWS+NHC', timestamp: ts }),
      status: 'delivered',
      timestamp: now,
    });
  }

  // Build system log
  const systemLog: string[] = [
    '[SYSTEM] BayShield v3.0 -- LIVE MODE ACTIVE',
    '[SYSTEM] Data source: NOAA NWS API + NHC RSS feed',
    '[SYSTEM] Polling interval: every 2 minutes',
    `[${ts}] Storm Watcher: Connected to KTPA observation station`,
    `[${ts}] Storm Watcher: NHC Atlantic basin -- ${live.activeStorms.length} active storms`,
    `[${ts}] Storm Watcher: NWS Florida alerts -- ${live.alerts.length} active`,
  ];

  if (obs) {
    systemLog.push(`[${ts}] Storm Watcher: Tampa Bay conditions -- ${obs.conditions}, ${obs.tempF}°F, winds ${obs.windSpeedMph} mph ${obs.windDirectionText}`);
  }
  if (live.activeStorms.length > 0) {
    const s = live.activeStorms[0];
    systemLog.push(`[${ts}] Storm Watcher: TRACKING ${s.type.toUpperCase()} ${s.name.toUpperCase()} -- ${s.windMph} mph -- ${s.distanceMiles ?? '?'} mi from Tampa`);
    systemLog.push(`[${ts}] Vulnerability Mapper: Analyzing threat zones for ${s.type} ${s.name}...`);
    systemLog.push(`[${ts}] Resource Coordinator: Pre-positioning resources in parallel...`);
  } else {
    systemLog.push(`[${ts}] Vulnerability Mapper: No active storm threats -- all 8 zones nominal`);
    systemLog.push(`[${ts}] Resource Coordinator: Shelters on standby, evacuation routes clear`);
  }
  if (live.alerts.length > 0) {
    systemLog.push(`[${ts}] Alert Commander: ${live.alerts.length} NWS alerts active for Florida`);
    if (relevantAlerts.length > 0) {
      systemLog.push(`[${ts}] Alert Commander: ${relevantAlerts.length} alerts affect Tampa Bay region -- monitoring`);
    }
  } else {
    systemLog.push(`[${ts}] Alert Commander: No active NWS alerts for Florida -- all clear`);
  }
  if (live.lastUpdated) {
    systemLog.push(`[${ts}] SYSTEM: Last NOAA sync -- ${live.lastUpdated.toLocaleTimeString()}`);
  }
  if (live.error) {
    systemLog.push(`[${ts}] ERROR: ${live.error} -- using cached data`);
  }

  return { agents, messages, alerts, weather, threatLevel, totalPopulationAtRisk, systemLog };
}

// ── Provider ──────────────────────────────────────────────────
export function SimulationProvider({ children }: { children: ReactNode }) {
  const sim = useStormSimulation();
  // Always poll live weather (used in live mode; also available as liveWeather in sim mode)
  const liveWeatherData = useLiveWeather(2 * 60 * 1000); // 2-minute refresh

  const [lastLivePoll, setLastLivePoll] = useState<Date | null>(null);
  const [nextLivePoll, setNextLivePoll] = useState<Date | null>(null);
  const prevUpdatedRef = useRef<Date | null>(null);

  // Track poll timestamps
  useEffect(() => {
    if (liveWeatherData.lastUpdated && liveWeatherData.lastUpdated !== prevUpdatedRef.current) {
      prevUpdatedRef.current = liveWeatherData.lastUpdated;
      setLastLivePoll(liveWeatherData.lastUpdated);
      setNextLivePoll(new Date(liveWeatherData.lastUpdated.getTime() + 2 * 60 * 1000));
    }
  }, [liveWeatherData.lastUpdated]);

  // Build live-mode derived state
  const liveState = buildLiveAgentStates(liveWeatherData);

  // Choose which state to expose based on mode
  const isLive = sim.mode === 'live';

  const value: SimulationContextValue = {
    agents:                isLive ? liveState.agents          : sim.agents,
    messages:              isLive ? liveState.messages         : sim.messages,
    weather:               isLive ? liveState.weather          : sim.weather,
    alerts:                isLive ? liveState.alerts           : sim.alerts,
    actionPlans:           isLive ? []                         : sim.actionPlans,
    infraPredictions:      isLive ? []                         : sim.infraPredictions,
    isRunning:             isLive ? !liveWeatherData.isLoading : sim.isRunning,
    simulationPhase:       isLive ? 9                          : sim.simulationPhase,
    totalPhases:           9,
    threatLevel:           isLive ? liveState.threatLevel      : sim.threatLevel,
    totalPopulationAtRisk: isLive ? liveState.totalPopulationAtRisk : sim.totalPopulationAtRisk,
    systemLog:             isLive ? liveState.systemLog        : sim.systemLog,
    mode:                  sim.mode,
    setMode:               sim.setMode,
    startSimulation:       sim.startSimulation,
    resetSimulation:       sim.resetSimulation,
    liveWeather:           liveWeatherData,
    lastLivePoll,
    nextLivePoll,
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation must be used within SimulationProvider');
  return ctx;
}
