// ============================================================
// BAYSHIELD — Simulation Engine
// Auto-runs on mount. Proper agent lifecycle: triggered → running → completed.
// Structured A2A messages. Event-driven pipeline. No manual trigger required.
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

// ── Phase timing (ms between phases) ──
const PHASE_INTERVAL_MS = 2400;
const TOTAL_PHASES = 9;

// ── Initial agent states ──
const INITIAL_AGENTS: AgentState[] = [
  {
    id: 'storm-watcher',
    name: 'Storm Watcher',
    role: 'Observer — LoopAgent',
    status: 'idle',
    lastAction: 'Polling NOAA NHC API...',
    loopCount: 0,
    confidence: 0,
    processingTime: 0,
    color: '#F59E0B',
    glowClass: 'dot-idle',
    icon: '🌀'
  },
  {
    id: 'vulnerability-mapper',
    name: 'Vulnerability Mapper',
    role: 'Analyst — ParallelAgent',
    status: 'idle',
    lastAction: 'Awaiting threat signal...',
    loopCount: 0,
    confidence: 0,
    processingTime: 0,
    color: '#38BDF8',
    glowClass: 'dot-idle',
    icon: '🗺️'
  },
  {
    id: 'resource-coordinator',
    name: 'Resource Coordinator',
    role: 'Logistics — ParallelAgent',
    status: 'idle',
    lastAction: 'Standby mode...',
    loopCount: 0,
    confidence: 0,
    processingTime: 0,
    color: '#34D399',
    glowClass: 'dot-idle',
    icon: '📦'
  },
  {
    id: 'alert-commander',
    name: 'Alert Commander',
    role: 'Actor — SelfCorrectingLoopAgent',
    status: 'idle',
    lastAction: 'Waiting for analysis data...',
    loopCount: 0,
    confidence: 0,
    processingTime: 0,
    color: '#F87171',
    glowClass: 'dot-idle',
    icon: '🚨'
  }
];

const INITIAL_LOG = [
  '[SYSTEM] BayShield v3.0 initialized',
  '[SYSTEM] Agent mesh network online — 4/4 agents ready',
  '[SYSTEM] Connecting to NOAA NHC API...',
  '[SYSTEM] Tampa Bay Emergency Management System linked',
  '[SYSTEM] Auto-monitoring active — scanning for threats'
];

export function useStormSimulation() {
  const [agents, setAgents] = useState<AgentState[]>(INITIAL_AGENTS);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [weather, setWeather] = useState<WeatherData>(INITIAL_WEATHER);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [infraPredictions, setInfraPredictions] = useState<InfrastructurePrediction[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [simulationPhase, setSimulationPhase] = useState(0);
  const [threatLevel, setThreatLevel] = useState<ThreatLevel>('monitoring');
  const [totalPopulationAtRisk, setTotalPopulationAtRisk] = useState(0);
  const [systemLog, setSystemLog] = useState<string[]>(INITIAL_LOG);
  const [mode, setMode] = useState<'live' | 'simulation'>('simulation');

  const phaseRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAutoStarted = useRef(false);

  // ── Helpers ──
  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
    setSystemLog(prev => [...prev.slice(-80), `[${ts}] ${msg}`]);
  }, []);

  const updateAgent = useCallback((id: string, updates: Partial<AgentState>) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const addMessage = useCallback((msg: Omit<AgentMessage, 'id' | 'timestamp'>) => {
    const newMsg: AgentMessage = { ...msg, id: nanoid(), timestamp: new Date() };
    setMessages(prev => [newMsg, ...prev].slice(0, 50));
  }, []);

  // ── Phase execution ──
  const runPhase = useCallback((phase: number) => {
    switch (phase) {
      case 0:
        // Storm Watcher: triggered → running
        updateAgent('storm-watcher', {
          status: 'active',
          lastAction: 'Detecting Hurricane Helena — Category 4',
          loopCount: 1,
          confidence: 72,
          processingTime: 340,
          glowClass: 'dot-active'
        });
        setThreatLevel('advisory');
        addLog('[Agent-1] Storm Watcher: NOAA alert received — Hurricane Helena Cat-4, 145kt');
        addMessage({ ...AGENT_MESSAGES_SEQUENCE[0], status: 'sent' });
        setInfraPredictions(INFRASTRUCTURE_PREDICTIONS.slice(0, 2));
        break;

      case 1:
        // Storm Watcher: escalating, sends A2A to Agents 2 & 3
        updateAgent('storm-watcher', {
          status: 'processing',
          lastAction: 'Escalating threat — broadcasting A2A signals',
          loopCount: 2,
          confidence: 89,
          processingTime: 520,
          glowClass: 'dot-processing'
        });
        setThreatLevel('warning');
        setWeather(prev => ({ ...prev, threatLevel: 'warning' }));
        addLog('[Agent-1] Storm Watcher: Threat escalated → WARNING. Broadcasting A2A to Agents 2 & 3');
        addMessage({ ...AGENT_MESSAGES_SEQUENCE[1], status: 'sent' });
        addMessage({ ...AGENT_MESSAGES_SEQUENCE[2], status: 'sent' });
        setInfraPredictions(INFRASTRUCTURE_PREDICTIONS.slice(0, 3));
        break;

      case 2:
        // Agents 2 & 3: triggered simultaneously (ParallelAgent)
        updateAgent('vulnerability-mapper', {
          status: 'active',
          lastAction: 'Loading FEMA flood zone data...',
          loopCount: 1,
          confidence: 45,
          processingTime: 0,
          glowClass: 'dot-active'
        });
        updateAgent('resource-coordinator', {
          status: 'active',
          lastAction: 'Inventorying shelter capacity...',
          loopCount: 1,
          confidence: 40,
          processingTime: 0,
          glowClass: 'dot-active'
        });
        addLog('[Agent-2] Vulnerability Mapper: PARALLEL triggered — analyzing flood zones');
        addLog('[Agent-3] Resource Coordinator: PARALLEL triggered — inventorying resources');
        setInfraPredictions(INFRASTRUCTURE_PREDICTIONS.slice(0, 4));
        break;

      case 3:
        // Agents 2 & 3: running in parallel
        updateAgent('vulnerability-mapper', {
          status: 'processing',
          lastAction: 'Cross-referencing population vulnerability data',
          loopCount: 2,
          confidence: 68,
          processingTime: 1240,
          glowClass: 'dot-processing'
        });
        updateAgent('resource-coordinator', {
          status: 'processing',
          lastAction: 'Calculating shelter capacity and routes',
          loopCount: 2,
          confidence: 74,
          processingTime: 980,
          glowClass: 'dot-processing'
        });
        setTotalPopulationAtRisk(47520);
        addLog('[Agent-2] Vulnerability Mapper: 47,520 residents in surge zones identified');
        addLog('[Agent-3] Resource Coordinator: 30,000 shelter capacity confirmed');
        setInfraPredictions(INFRASTRUCTURE_PREDICTIONS.slice(0, 5));
        break;

      case 4:
        // Agents 2 & 3: completed, transmitting to Agent 4
        updateAgent('vulnerability-mapper', {
          status: 'complete',
          lastAction: 'Analysis complete — 6 high-risk zones mapped',
          loopCount: 3,
          confidence: 94,
          processingTime: 2100,
          glowClass: 'dot-complete'
        });
        updateAgent('resource-coordinator', {
          status: 'complete',
          lastAction: 'Resources pre-positioned — 3 shelters active',
          loopCount: 3,
          confidence: 91,
          processingTime: 1870,
          glowClass: 'dot-complete'
        });
        addMessage({ ...AGENT_MESSAGES_SEQUENCE[3], status: 'received' });
        addMessage({ ...AGENT_MESSAGES_SEQUENCE[4], status: 'received' });
        addLog('[Agent-2] Vulnerability Mapper: COMPLETED — transmitting dataset to Alert Commander');
        addLog('[Agent-3] Resource Coordinator: COMPLETED — transmitting allocation matrix');
        setInfraPredictions(INFRASTRUCTURE_PREDICTIONS.slice(0, 6));
        break;

      case 5:
        // Alert Commander: triggered, receiving data
        updateAgent('alert-commander', {
          status: 'active',
          lastAction: 'Receiving vulnerability + resource data...',
          loopCount: 1,
          confidence: 55,
          processingTime: 0,
          glowClass: 'dot-active'
        });
        addMessage({ ...AGENT_MESSAGES_SEQUENCE[5], status: 'received' });
        addMessage({ ...AGENT_MESSAGES_SEQUENCE[6], status: 'received' });
        addLog('[Agent-4] Alert Commander: TRIGGERED — receiving A2A data from Agents 2 & 3');
        break;

      case 6:
        // Alert Commander: self-correction loop running
        updateAgent('alert-commander', {
          status: 'processing',
          lastAction: 'Self-correction loop: reviewing action plan...',
          loopCount: 2,
          confidence: 78,
          processingTime: 1560,
          glowClass: 'dot-processing'
        });
        addMessage({ ...AGENT_MESSAGES_SEQUENCE[7], status: 'processing' });
        addLog('[Agent-4] Alert Commander: SELF-CORRECTION — detected capacity conflict, re-routing 2,400 residents');
        setActionPlans([ACTION_PLANS[0]]);
        setInfraPredictions(INFRASTRUCTURE_PREDICTIONS.slice(0, 7));
        break;

      case 7:
        // All agents: critical state, evacuation orders issued
        updateAgent('storm-watcher', {
          status: 'active',
          lastAction: 'Continuous monitoring — loop 4 active',
          loopCount: 4,
          confidence: 97,
          processingTime: 3400,
          glowClass: 'dot-active'
        });
        updateAgent('alert-commander', {
          status: 'complete',
          lastAction: 'Mandatory evacuation orders issued — all zones',
          loopCount: 3,
          confidence: 96,
          processingTime: 2890,
          glowClass: 'dot-complete'
        });
        setThreatLevel('critical');
        setWeather(prev => ({ ...prev, threatLevel: 'critical' }));
        addMessage({ ...AGENT_MESSAGES_SEQUENCE[8], status: 'sent' });
        setAlerts(ALERTS);
        setActionPlans(ACTION_PLANS);
        setInfraPredictions(INFRASTRUCTURE_PREDICTIONS);
        addLog('[Agent-4] Alert Commander: MANDATORY EVACUATION issued for Zones A/AE/VE');
        addLog('[SYSTEM] All 4 agents operational. Continuous monitoring active.');
        break;

      case 8:
        // Storm Watcher: loop update — possible Cat-5 intensification
        updateAgent('storm-watcher', {
          status: 'active',
          lastAction: 'Helena strengthening — Cat-5 possible',
          loopCount: 5,
          confidence: 98,
          processingTime: 4100,
          glowClass: 'dot-active'
        });
        setWeather(prev => ({
          ...prev,
          windSpeed: 158,
          pressure: 935,
          landfall: '14-18 hours',
          category: 5
        }));
        addLog('[Agent-1] Storm Watcher: LOOP UPDATE — Helena may intensify to Cat-5');
        addLog('[Agent-4] Alert Commander: Re-evaluating action plan for Cat-5 scenario...');
        break;
    }
  }, [updateAgent, addMessage, addLog]);

  // ── Start simulation ──
  const startSimulation = useCallback(() => {
    if (isRunning) return;
    setIsRunning(true);
    phaseRef.current = 0;
    setSimulationPhase(0);
    addLog('[SYSTEM] Pipeline activated — Hurricane Helena scenario running');

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
  }, [isRunning, runPhase, addLog]);

  // ── Reset simulation ──
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
    setSystemLog([
      ...INITIAL_LOG,
      '[SYSTEM] Simulation reset — ready for next run'
    ]);
    hasAutoStarted.current = false;
  }, []);

  // ── Auto-start on mount (simulation mode) ──
  useEffect(() => {
    if (!hasAutoStarted.current && mode === 'simulation') {
      hasAutoStarted.current = true;
      const timer = setTimeout(() => {
        startSimulation();
      }, 1500); // 1.5s delay so UI renders first
      return () => clearTimeout(timer);
    }
  }, [mode, startSimulation]);

  // ── Auto-repeat simulation every 5 minutes (live mode feel) ──
  useEffect(() => {
    if (mode !== 'simulation') return;
    const repeatTimer = setInterval(() => {
      if (!isRunning) {
        resetSimulation();
        // After reset, auto-start fires via the hasAutoStarted ref reset above
        setTimeout(() => {
          hasAutoStarted.current = false;
        }, 100);
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(repeatTimer);
  }, [mode, isRunning, resetSimulation]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    agents,
    messages,
    weather,
    alerts,
    actionPlans,
    infraPredictions,
    isRunning,
    simulationPhase,
    totalPhases: TOTAL_PHASES,
    threatLevel,
    totalPopulationAtRisk,
    systemLog,
    mode,
    setMode,
    startSimulation,
    resetSimulation,
  };
}
