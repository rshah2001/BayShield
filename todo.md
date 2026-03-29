# BayShield TODO

## Completed Frontend Features
- [x] Multi-page SaaS layout (Landing, Dashboard, AgentComms, Infrastructure, Map, Resources)
- [x] SimulationContext with dual-mode (Live/Simulation)
- [x] useLiveWeather hook with real NOAA/NWS APIs (5 endpoints)
- [x] Google Maps singleton fix (no duplicate script)
- [x] EvacuationRouter with GPS, Directions API, flood zone penalty scoring
- [x] Merge Map View + Evacuation into single page
- [x] Live mode agents complete to 100%
- [x] LiveSyncBadge countdown timer
- [x] Context-aware LiveTicker (NWS alerts in Live, Helena in Simulation, No Threats when clear)
- [x] Full-stack upgrade (web-db-user)

## Backend Architecture Upgrade
- [x] Resolve merge conflicts in Home.tsx and DashboardLayout.tsx after web-db-user upgrade
- [x] Design and push database schema (agent_runs, agent_messages, shelter_status, action_plans, vulnerability_zones, weather_snapshots)
- [x] Build Python ADK agent service (4 agents: StormWatcher LoopAgent, VulnerabilityMapper ParallelAgent, ResourceCoordinator ParallelAgent, AlertCommander SelfCorrectingLoopAgent)
- [x] Build tRPC backend routes for agent orchestration (runPipeline, latestRun, liveWeather, generateSummary, explainCorrection)
- [x] LLM integration: emergency briefing summaries and self-correction explanations via invokeLLM
- [x] Real shelter status adapter (live source + estimated fallback with clear labeling)
- [x] Backend-managed A2A orchestration with structured AgentTrace model stored in DB
- [x] Frontend: ADKPipelinePanel component on AgentComms page (agent traces, A2A messages, action plans, LLM briefing)
- [x] Frontend: deterministic vs estimated badges on all outputs
- [x] Frontend: backend execution timeline in Agent Comms page
- [x] Frontend: validation/correction event display when plans are recomputed
- [x] Create agent.json A2A discovery cards for all 4 agents + agent-registry.json
- [x] Write vitest tests for bayshield router (14 tests passing)

## Remaining / Future Work
- [x] Add SSE streaming endpoint from backend to frontend for live agent state updates (/api/pipeline/stream + /api/system/health-stream)
- [x] Frontend: consume backend SSE for live agent states (usePipelineStream + useSystemHealth hooks)
- [x] System Monitoring page showing all service health (frontend, backend, Python ADK, LLM, shelter feed, routing)
