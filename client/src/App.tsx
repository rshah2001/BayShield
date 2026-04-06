import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SimulationProvider } from "./contexts/SimulationContext";
import Dashboard from "./pages/Dashboard";
import AgentComms from "./pages/AgentComms";
import Infrastructure from "./pages/Infrastructure";
import MapViewPage from "./pages/MapView";
import Resources from "./pages/Resources";
import SystemMonitor from "./pages/SystemMonitor";
import StormSimulator from "./pages/StormSimulator";
import DashboardLayout from "./components/DashboardLayout";
import GlobalEarthBackdrop from "./components/GlobalEarthBackdrop";
import { useEffect } from "react";

function RootRedirect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/dashboard");
  }, [setLocation]);

  return null;
}

function DashboardRoutes() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/dashboard"      component={Dashboard} />
        <Route path="/agents"         component={AgentComms} />
        <Route path="/infrastructure" component={Infrastructure} />
        <Route path="/map"            component={MapViewPage} />
        <Route path="/resources"      component={Resources} />
        <Route path="/system"          component={SystemMonitor} />
        <Route path="/simulator"       component={StormSimulator} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/"               component={RootRedirect} />
      <Route path="/dashboard"      component={DashboardRoutes} />
      <Route path="/agents"         component={DashboardRoutes} />
      <Route path="/infrastructure" component={DashboardRoutes} />
      <Route path="/map"            component={DashboardRoutes} />
      <Route path="/resources"      component={DashboardRoutes} />
      <Route path="/system"          component={DashboardRoutes} />
      <Route path="/simulator"       component={DashboardRoutes} />
      <Route path="/404"            component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <SimulationProvider>
          <TooltipProvider>
            <div className="relative min-h-screen overflow-x-hidden bg-background">
              <GlobalEarthBackdrop />
              <div className="relative z-10">
                <Toaster />
                <Router />
              </div>
            </div>
          </TooltipProvider>
        </SimulationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
