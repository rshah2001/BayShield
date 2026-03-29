// ============================================================
// STORMMESH -- Main Home Page
// Design: Bioluminescent Storm -- deep ocean dark base
// Layout: Full-bleed hero → Agent Dashboard → Map/Alerts → Architecture
// ============================================================

import { useStormSimulation } from '@/hooks/useStormSimulation';
import HeroSection from '@/components/HeroSection';
import AgentDashboard from '@/components/AgentDashboard';
import MapAndAlerts from '@/components/MapAndAlerts';
import ArchitectureSection from '@/components/ArchitectureSection';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';

export default function Home() {
  const simulation = useStormSimulation();

  return (
    <div className="min-h-screen" style={{ background: '#020B18', fontFamily: "'Outfit', sans-serif" }}>
      <NavBar
        threatLevel={simulation.threatLevel}
        isRunning={simulation.isRunning}
      />
      <HeroSection
        weather={simulation.weather}
        threatLevel={simulation.threatLevel}
        isRunning={simulation.isRunning}
        onStart={simulation.startSimulation}
        onReset={simulation.resetSimulation}
        simulationPhase={simulation.simulationPhase}
        totalPopulationAtRisk={simulation.totalPopulationAtRisk}
      />
      <AgentDashboard
        agents={simulation.agents}
        messages={simulation.messages}
        systemLog={simulation.systemLog}
        isRunning={simulation.isRunning}
        simulationPhase={simulation.simulationPhase}
      />
      <MapAndAlerts
        alerts={simulation.alerts}
        weather={simulation.weather}
        threatLevel={simulation.threatLevel}
      />
      <ArchitectureSection />
      <Footer />
    </div>
  );
}
