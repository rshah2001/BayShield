// ============================================================
// BAYSHIELD -- Simulation Engine v4
// - PHASE_INTERVAL_MS = 800ms (full pipeline in ~7s, was 21s)
// - All agents reach 100% confidence and 'complete' status
// - Auto-runs on mount in simulation mode
// - Accepts optional liveSeed to use real NOAA data as input
// ============================================================
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AgentState,
  AgentMessage,
  WeatherData,
  Alert,
  ActionPlan,
  InfrastructurePrediction,
  INITIAL_WEATHER,
  AGENT_MESSAGES_SEQUENCE,
  ALERTS,
  ACTION_PLANS,
  INFRASTRUCTURE_PREDICTIONS,
  ThreatLevel
} from '@/lib/stormData';
import { nanoid } from 'nanoid';

const PHASE_INTERVAL_MS = 800;
const TOTAL_PHASES = 9;

export interface LiveWeatherSeed {
  conditions: string;
  tempF: number | null;
  windSpeedMph: number | null;
  windDirectionText: string;
  activeStormName: string | null;
  activeStormType: string | null;
  activeStormWindMph: number | null;
  activeStormCategory: number | null;
  alertCount: number;
  threatLevel: 'NONE' | 'WATCH' | 'WARNING' | 'CRITICAL';
}

const INITIAL_AGENTS: AgentState[] = [
  { id: 'storm-watcher',       name: 'Storm Watcher',       role: 'Observer -- LoopAgent',               status: 'idle', lastAction: 'Awaiting activation...',           loopCount: 0, confidence: 0, processingTime: 0, color: '#F59E0B', glowClass: 'dot-idle', icon: '🌀' },
  { id: 'vulnerability-mapper',name: 'Vulnerability Mapper', role: 'Analyst -- ParallelAgent',            status: 'idle', lastAction: 'Awaiting Storm Watcher trigger...', loopCount: 0, confidence: 0, processingTime: 0, color: '#38BDF8', glowClass: 'dot-idle', icon: '🗺️' },
  { id: 'resource-coordinator',name: 'Resource Coordinator', role: 'Logistics -- ParallelAgent',          status: 'idle', lastAction: 'Standby mode...',                  loopCount: 0, confidence: 0, processingTime: 0, color: '#34D399', glowClass: 'dot-idle', icon: '📦' },
  { id: 'alert-commander',     name: 'Alert Commander',      role: 'Actor -- SelfCorrectingLoopAgent',    status: 'idle', lastAction: 'Waiting for analysis data...',      loopCount: 0, confidence: 0, processingTime: 0, color: '#F87171', glowClass: 'dot-idle', icon: '🚨' },
];

const INITIAL_LOG = [
  '[SYSTEM] BayShield v3.0 initialized',
  '[SYSTEM] Agent mesh network online -- 4/4 agents ready',
  '[SYSTEM] Connecting to NOAA NHC + NWS APIs...',
  '[SYSTEM] Tampa Bay region loaded -- 8 vulnerability zones mapped',
  '[SYSTEM] Ready. Auto-starting pipeline...',
];

export function useStormSimulation(liveSeed?: LiveWeatherSeed | null) {
  const [agents,                setAgents]                = useState<AgentState[]>(INITIAL_AGENTS);
  const [messages,              setMessages]              = useState<AgentMessage[]>([]);
  const [weather,               setWeather]               = useState<WeatherData>(INITIAL_WEATHER);
  const [alerts,                setAlerts]                = useState<Alert[]>([]);
  const [actionPlans,           setActionPlans]           = useState<ActionPlan[]>([]);
  const [infraPredictions,      setInfraPredictions]      = useState<InfrastructurePrediction[]>([]);
  const [isRunning,             setIsRunning]             = useState(false);
  const [simulationPhase,       setSimulationPhase]       = useState(0);
  const [threatLevel,           setThreatLevel]           = useState<ThreatLevel>('monitoring');
  const [totalPopulationAtRisk, setTotalPopulationAtRisk] = useState(0);
  const [systemLog,             setSystemLog]             = useState<string[]>(INITIAL_LOG);
  const [mode,                  setMode]                  = useState<'live' | 'simulation'>('simulation');

  const phaseRef         = useRef(0);
  const intervalRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAutoStarted   = useRef(false);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
    setSystemLog(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 80));
  }, []);

  const updateAgent = useCallback((id: string, updates: Partial<AgentState>) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const addMessage = useCallback((msg: Omit<AgentMessage, 'id' | 'timestamp'>) => {
    setMessages(prev => [{ ...msg, id: nanoid(), timestamp: new Date() }, ...prev].slice(0, 50));
  }, []);

  const runPhase = useCallback((phase: number) => {
    const hasStorm     = !!liveSeed?.activeStormName;
    const stormLabel   = hasStorm ? `${liveSeed!.activeStormType ?? 'Storm'} ${liveSeed!.activeStormName}` : 'Hurricane Helena';
    const windSpeed    = liveSeed?.activeStormWindMph ?? 145;
    const category     = liveSeed?.activeStormCategory ?? 4;

    switch (phase) {
      case 0:
        updateAgent('storm-watcher', { status: 'active', lastAction: `Detected ${stormLabel} -- Cat-${category}, ${windSpeed} mph`, loopCount: 1, confidence: 72, processingTime: 340, glowClass: 'dot-active' });
        addMessage({ ...AGENT_MESSAGES_SEQUENCE[0], status: 'sent' });
        addLog(`[Agent-1] Storm Watcher: LOOP-1 -- ${stormLabel} detected`);
        setWeather(prev => ({ ...prev, windSpeed, category }));
        setThreatLevel('advisory');
        break;

      case 1:
        updateAgent('storm-watcher', { status: 'active', lastAction: `Threat confirmed -- broadcasting A2A to parallel agents`, loopCount: 2, confidence: 88, processingTime: 680, glowClass: 'dot-active' });
        updateAgent('vulnerability-mapper', { status: 'processing', lastAction: 'Received A2A trigger -- loading flood zone data...', loopCount: 1, confidence: 30, processingTime: 120, glowClass: 'dot-processing' });
        updateAgent('resource-coordinator', { status: 'processing', lastAction: 'Received A2A trigger -- scanning shelter availability...', loopCount: 1, confidence: 25, processingTime: 95, glowClass: 'dot-processing' });
        addMessage({ ...AGENT_MESSAGES_SEQUENCE[1], status: 'sent' });
        addLog('[Agent-1] Storm Watcher: A2A broadcast to Vulnerability Mapper + Resource Coordinator');
        setThreatLevel('warning');
        break;

      case 2:
        // ParallelAgent showcase -- both running simultaneously
        updateAgent('vulnerability-mapper', { status: 'processing', lastAction: 'Mapping 8 zones -- FEMA flood data + census vulnerability...', loopCount: 1, confidence: 58, processingTime: 890, glowClass: 'dot-processing' });
        updateAgent('resource-coordinator', { status: 'processing', lastAction: 'Inventory: USF Sun Dome 78%, Yuengling 45%, Tropicana 31%...', loopCount: 1, confidence: 52, processingTime: 760, glowClass: 'dot-processing' });
        addMessage({ ...AGENT_MESSAGES_SEQUENCE[2], status: 'sent' });
        addLog('[ParallelAgent] Vulnerability Mapper + Resource Coordinator running simultaneously');
        setTotalPopulationAtRisk(12400);
        break;

      case 3:
        updateAgent('vulnerability-mapper', { status: 'complete', lastAction: '6 high-risk zones mapped -- 47,520 residents in flood zones A/AE/VE', loopCount: 1, confidence: 100, processingTime: 1240, glowClass: 'dot-complete' });
        addMessage({ ...AGENT_MESSAGES_SEQUENCE[3], status: 'sent' });
        addLog('[Agent-2] Vulnerability Mapper: COMPLETE -- 6 zones, 47,520 at risk');
        setTotalPopulationAtRisk(28000);
        break;

      case 4:
        updateAgent('resource-coordinator', { status: 'complete', lastAction: 'Resources pre-positioned -- 3 shelters activated, evacuation routes cleared', loopCount: 1, confidence: 100, processingTime: 1180, glowClass: 'dot-complete' });
        addMessage({ ...AGENT_MESSAGES_SEQUENCE[4], status: 'sent' });
        addLog('[Agent-3] Resource Coordinator: COMPLETE -- 3 shelters active, 30,000 capacity ready');
        setTotalPopulationAtRisk(47520);
        setInfraPredictions(INFRASTRUCTURE_PREDICTIONS.slice(0, 4));
        break;

      case 5:
        updateAgent('alert-commander', { status: 'processing', lastAction: 'Received Mapper + Coordinator outputs -- generating action plan...', loopCount: 1, confidence: 55, processingTime: 1120, glowClass: 'dot-processing' });
        addMessage({ ...AGENT_MESSAGES_SEQUENCE[5], status: 'sent' });
        addLog('[Agent-4] Alert Commander: Received A2A data from both parallel agents');
        setThreatLevel('critical');
        break;

      case 6:
        // Self-correction loop fires
        updateAgent('alert-commander', { status: 'processing', lastAction: 'SELF-CORRECTION loop-2: detected capacity conflict -- re-routing 2,400 residents', loopCount: 2, confidence: 81, processingTime: 1560, glowClass: 'dot-processing' });
        addMessage({ ...AGENT_MESSAGES_SEQUENCE[6] ?? AGENT_MESSAGES_SEQUENCE[5], status: 'processing' });
        addLog('[Agent-4] Alert Commander: SELF-CORRECTION -- re-routing Pinellas Point overflow to Yuengling Center');
        setActionPlans([ACTION_PLANS[0]]);
        setInfraPredictions(INFRASTRUCTURE_PREDICTIONS.slice(0, 7));
        break;

      case 7:
        // All agents reach 100% -- evacuation orders issued
        updateAgent('storm-watcher',   { status: 'active',    lastAction: `Continuous monitoring -- ${stormLabel} loop-3 active`, loopCount: 3, confidence: 100, processingTime: 3400, glowClass: 'dot-active' });
        updateAgent('alert-commander', { status: 'complete',  lastAction: 'Mandatory evacuation orders issued -- all zones. Self-correction verified.', loopCount: 3, confidence: 100, processingTime: 2890, glowClass: 'dot-complete' });
        addMessage({ ...AGENT_MESSAGES_SEQUENCE[7] ?? AGENT_MESSAGES_SEQUENCE[6], status: 'sent' });
        setAlerts(ALERTS);
        setActionPlans(ACTION_PLANS);
        setInfraPredictions(INFRASTRUCTURE_PREDICTIONS);
        addLog('[Agent-4] Alert Commander: MANDATORY EVACUATION issued for Zones A/AE/VE');
        addLog('[SYSTEM] All 4 agents operational. Continuous monitoring active.');
        break;

      case 8:
        updateAgent('storm-watcher', { status: 'active', lastAction: hasStorm ? `${stormLabel} -- loop-4 active, continuous monitoring` : 'Helena may intensify to Cat-5 -- loop-4 active', loopCount: 4, confidence: 100, processingTime: 4100, glowClass: 'dot-active' });
        setWeather(prev => ({ ...prev, windSpeed: hasStorm ? windSpeed + 10 : 158, pressure: prev.pressure - 5, landfall: '14-18 hours', category: hasStorm ? category : 5 }));
        addLog(`[Agent-1] Storm Watcher: LOOP-4 UPDATE -- ${hasStorm ? `${stormLabel} continuing` : 'Helena possible Cat-5 intensification'}`);
        addLog('[Agent-4] Alert Commander: Re-evaluating action plan for updated forecast...');
        break;
    }
  }, [updateAgent, addMessage, addLog, liveSeed]);

  const startSimulation = useCallback(() => {
    if (isRunning) return;
    setIsRunning(true);
    phaseRef.current = 0;
    setSimulationPhase(0);
    const label = liveSeed?.activeStormName
      ? `${liveSeed.activeStormType ?? 'Storm'} ${liveSeed.activeStormName} scenario`
      : 'Hurricane Helena scenario';
    addLog(`[SYSTEM] Pipeline activated -- ${label}`);

    intervalRef.current = setInterval(() => {
      if (phaseRef.current < TOTAL_PHASES) {
        runPhase(phaseRef.current);
        phaseRef.current += 1;
        setSimulationPhase(phaseRef.current);
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsRunning(false);
      }
    }, PHASE_INTERVAL_MS);
  }, [isRunning, runPhase, addLog, liveSeed]);

  const resetSimulation = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setSimulationPhase(0);
    phaseRef.current = 0;
    setAgents(INITIAL_AGENTS);
    setMessages([]);
    setAlerts([]);
    setActionPlans([]);
    setInfraPredictions([]);
    setThreatLevel('monitoring');
    setWeather(INITIAL_WEATHER);
    setTotalPopulationAtRisk(0);
    setSystemLog([...INITIAL_LOG, '[SYSTEM] Simulation reset -- ready for next run']);
    hasAutoStarted.current = false;
  }, []);

  // Auto-start on mount
  useEffect(() => {
    if (!hasAutoStarted.current && mode === 'simulation') {
      hasAutoStarted.current = true;
      const t = setTimeout(() => startSimulation(), 1200);
      return () => clearTimeout(t);
    }
  }, [mode, startSimulation]);

  // Auto-repeat every 5 minutes
  useEffect(() => {
    if (mode !== 'simulation') return;
    const t = setInterval(() => {
      if (!isRunning) {
        resetSimulation();
        setTimeout(() => { hasAutoStarted.current = false; }, 100);
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [mode, isRunning, resetSimulation]);

  useEffect(() => { return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; }, []);

  return { agents, messages, weather, alerts, actionPlans, infraPredictions, isRunning, simulationPhase, totalPhases: TOTAL_PHASES, threatLevel, totalPopulationAtRisk, systemLog, mode, setMode, startSimulation, resetSimulation };
}
