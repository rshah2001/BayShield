// ============================================================
// STORMMESH — Simulation Context
// Provides simulation state to all pages via React Context
// ============================================================

import { createContext, useContext, ReactNode } from 'react';
import { useStormSimulation } from '@/hooks/useStormSimulation';

type SimulationContextType = ReturnType<typeof useStormSimulation>;

const SimulationContext = createContext<SimulationContextType | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const simulation = useStormSimulation();
  return (
    <SimulationContext.Provider value={simulation}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation must be used within SimulationProvider');
  return ctx;
}
