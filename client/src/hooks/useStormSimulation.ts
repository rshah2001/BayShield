// ============================================================
// STORMMESH — Storm Simulation Hook
// Manages live agent states, message passing, threat escalation,
// action plans, and infrastructure predictions
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
    glowClass: 'glow-amber',
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
    color: '#06B6D4',
    glowClass: 'glow-cyan',
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
    color: '#10B981',
    glowClass: 'glow-green',
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
    color: '#EF4444',
    glowClass: 'glow-crimson',
    icon: '🚨'
  }
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
  const [systemLog, setSystemLog] = useState<string[]>([
    '[SYSTEM] StormMesh v2.4.1 initialized',
    '[SYSTEM] Agent mesh network online',
    '[SYSTEM] Connecting to NOAA NHC API...',
    '[SYSTEM] Tampa Bay Emergency Management linked',
    '[SYSTEM] Awaiting operator command to begin simulation'
  ]);

  const phaseRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addLog = useCallback((msg: string) => {
    setSystemLog(prev => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const updateAgent = useCallback((id: string, updates: Partial<AgentState>) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const addMessage = useCallback((msg: Omit<AgentMessage, 'id' | 'timestamp'>) => {
    const newMsg: AgentMessage = {
      ...msg,
      id: nanoid(),
      timestamp: new Date()
    };
    setMessages(prev => [newMsg, ...prev].slice(0, 30));
    return newMsg;
  }, []);

  const runSimulationPhase = useCallback((phase: number) => {
    switch (phase) {
      case 0:
        updateAgent('storm-watcher', { status: 'active', lastAction: 'Detecting Hurricane Helena — Category 4', loopCount: 1, confidence: 72, processingTime: 340 });
        setThreatLevel('advisory');
        addLog('[Agent-1] Storm Watcher: NOAA alert received — Hurricane Helena Cat-4');
        addMessage(AGENT_MESSAGES_SEQUENCE[0]);
        // Start infrastructure predictions early
        setInfraPredictions(INFRASTRUCTURE_PREDICTIONS.slice(0, 2));
        break;

      case 1:
        updateAgent('storm-watcher', { status: 'processing', lastAction: 'Escalating threat — sending A2A signals', loopCount: 2, confidence: 89, processingTime: 520 });
        setThreatLevel('warning');
        setWeather(prev => ({ ...prev, threatLevel: 'warning' }));
        addLog('[Agent-1] Storm Watcher: Threat escalated to WARNING. Sending A2A to Agents 2 & 3');
        addMessage(AGENT_MESSAGES_SEQUENCE[1]);
        addMessage(AGENT_MESSAGES_SEQUENCE[2]);
        setInfraPredictions(INFRASTRUCTURE_PREDICTIONS.slice(0, 3));
        break;

      case 2:
        updateAgent('vulnerability-mapper', { status: 'active', lastAction: 'Loading FEMA flood zone data...', loopCount: 1, confidence: 45, processingTime: 0 });
        updateAgent('resource-coordinator', { status: 'active', lastAction: 'Inventorying shelter capacity...', loopCount: 1, confidence: 40, processingTime: 0 });
        addLog('[Agent-2] Vulnerability Mapper: PARALLEL activation — analyzing flood zones');
        addLog('[Agent-3] Resource Coordinator: PARALLEL activation — inventorying resources');
        setInfraPredictions(INFRASTRUCTURE_PREDICTIONS.slice(0, 4));
        break;

      case 3:
        updateAgent('vulnerability-mapper', { status: 'processing', lastAction: 'Cross-referencing population vulnerability data', loopCount: 2, confidence: 68, processingTime: 1240 });
        updateAgent('resource-coordinator', { status: 'processing', lastAction: 'Calculating shelter capacity and routes', loopCount: 2, confidence: 74, processingTime: 980 });
        setTotalPopulationAtRisk(47520);
        addLog('[Agent-2] Vulnerability Mapper: 47,520 residents in surge zones identified');
        addLog('[Agent-3] Resource Coordinator: 30,000 shelter capacity confirmed');
        setInfraPredictions(INFRASTRUCTURE_PREDICTIONS.slice(0, 5));
        break;

      case 4:
        updateAgent('vulnerability-mapper', { status: 'complete', lastAction: 'Analysis complete — 6 high-risk zones mapped', loopCount: 3, confidence: 94, processingTime: 2100 });
        updateAgent('resource-coordinator', { status: 'complete', lastAction: 'Resources pre-positioned — 3 shelters active', loopCount: 3, confidence: 91, processingTime: 1870 });
        addMessage(AGENT_MESSAGES_SEQUENCE[3]);
        addMessage(AGENT_MESSAGES_SEQUENCE[4]);
        addLog('[Agent-2] Vulnerability Mapper: COMPLETE — transmitting to Alert Commander');
        addLog('[Agent-3] Resource Coordinator: COMPLETE — transmitting to Alert Commander');
        setInfraPredictions(INFRASTRUCTURE_PREDICTIONS.slice(0, 6));
        break;

      case 5:
        updateAgent('alert-commander', { status: 'active', lastAction: 'Receiving vulnerability + resource data...', loopCount: 1, confidence: 55, processingTime: 0 });
        addMessage(AGENT_MESSAGES_SEQUENCE[5]);
        addMessage(AGENT_MESSAGES_SEQUENCE[6]);
        addLog('[Agent-4] Alert Commander: Receiving A2A data from Agents 2 & 3');
        break;

      case 6:
        updateAgent('alert-commander', { status: 'processing', lastAction: 'Self-correction loop: reviewing action plan...', loopCount: 2, confidence: 78, processingTime: 1560 });
        addMessage(AGENT_MESSAGES_SEQUENCE[7]);
        addLog('[Agent-4] Alert Commander: SELF-CORRECTION — detected capacity conflict, re-routing 2,400 residents');
        // Generate first action plan
        setActionPlans([ACTION_PLANS[0]]);
        setInfraPredictions(INFRASTRUCTURE_PREDICTIONS.slice(0, 7));
        break;

      case 7:
        updateAgent('storm-watcher', { status: 'active', lastAction: 'Continuous monitoring — loop 4 active', loopCount: 4, confidence: 97, processingTime: 3400 });
        updateAgent('alert-commander', { status: 'complete', lastAction: 'Mandatory evacuation orders issued — all zones', loopCount: 3, confidence: 96, processingTime: 2890 });
        setThreatLevel('critical');
        setWeather(prev => ({ ...prev, threatLevel: 'critical' }));
        addMessage(AGENT_MESSAGES_SEQUENCE[8]);
        setAlerts(ALERTS);
        setActionPlans(ACTION_PLANS);
        setInfraPredictions(INFRASTRUCTURE_PREDICTIONS);
        addLog('[Agent-4] Alert Commander: MANDATORY EVACUATION issued for Zones A/AE/VE');
        addLog('[SYSTEM] All 4 agents operational. Continuous monitoring active.');
        break;

      case 8:
        updateAgent('storm-watcher', { status: 'active', lastAction: 'Helena strengthening — Cat-5 possible', loopCount: 5, confidence: 98, processingTime: 4100 });
        setWeather(prev => ({ ...prev, windSpeed: 158, pressure: 935, landfall: '14-18 hours', category: 5 }));
        addLog('[Agent-1] Storm Watcher: LOOP UPDATE — Helena may intensify to Cat-5');
        addLog('[Agent-4] Alert Commander: Re-evaluating action plan for Cat-5 scenario...');
        break;
    }
  }, [updateAgent, addMessage, addLog]);

  const startSimulation = useCallback(() => {
    if (isRunning) return;
    setIsRunning(true);
    setSimulationPhase(0);
    phaseRef.current = 0;
    addLog('[OPERATOR] Simulation started — Hurricane Helena scenario active');

    intervalRef.current = setInterval(() => {
      if (phaseRef.current <= 8) {
        runSimulationPhase(phaseRef.current);
        phaseRef.current += 1;
        setSimulationPhase(phaseRef.current);
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 2200);
  }, [isRunning, runSimulationPhase, addLog]);

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
      '[SYSTEM] StormMesh v2.4.1 initialized',
      '[SYSTEM] Agent mesh network online',
      '[SYSTEM] Connecting to NOAA NHC API...',
      '[SYSTEM] Tampa Bay Emergency Management linked',
      '[SYSTEM] Simulation reset — ready for next run'
    ]);
  }, []);

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
    threatLevel,
    totalPopulationAtRisk,
    systemLog,
    startSimulation,
    resetSimulation
  };
}
