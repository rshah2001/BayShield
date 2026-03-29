import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SimulationProvider } from "./contexts/SimulationContext";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import AgentComms from "./pages/AgentComms";
import Infrastructure from "./pages/Infrastructure";
import MapViewPage from "./pages/MapView";
import Resources from "./pages/Resources";
import EvacuationPage from "./pages/Evacuation";
import DashboardLayout from "./components/DashboardLayout";

function DashboardRoutes() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/agents" component={AgentComms} />
        <Route path="/infrastructure" component={Infrastructure} />
        <Route path="/map" component={MapViewPage} />
        <Route path="/resources" component={Resources} />
        <Route path="/evacuation" component={EvacuationPage} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard" component={DashboardRoutes} />
      <Route path="/agents" component={DashboardRoutes} />
      <Route path="/infrastructure" component={DashboardRoutes} />
      <Route path="/map" component={DashboardRoutes} />
      <Route path="/resources" component={DashboardRoutes} />
      <Route path="/evacuation" component={DashboardRoutes} />
      <Route path="/404" component={NotFound} />
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
            <Toaster />
            <Router />
          </TooltipProvider>
        </SimulationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
