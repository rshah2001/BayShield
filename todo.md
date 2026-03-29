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

## Bug Fixes
- [x] Fix SSE pipeline stream — Python ADK service was not running; added auto-start via concurrently in dev script

## Real-Time Shelter Feed
- [x] Research real-time Florida/Tampa Bay shelter capacity APIs — no public real-time API exists; FL SERT restricted to authorized agencies
- [x] Shelter feed: uses FEMA SESP baseline estimation (no public API available)
- [x] Shelter data served via existing ResourceCoordinator agent output (estimated)
- [x] Resources page shows shelter capacity bars with spaces remaining (estimated)
- [x] System Monitor shelter_feed status shows ESTIMATED with full methodology explanation

## Shelter Estimation Transparency
- [x] System Monitor shelter card note updated: FEMA SESP baseline × storm severity × population density
- [x] Resources page shelter section shows amber estimation banner with FEMA SESP methodology explanation

## Hurricane Simulation Studio
- [x] Add storm_simulations table to Drizzle schema
- [x] Build tRPC simulateStorm procedure with LLM infrastructure impact analysis
- [x] Build tRPC getSimulations / getSimulation procedures for history
- [x] Create StormSimulator page with Google Maps track drawing (polyline + markers)
- [x] Storm parameter panel: name, type (hurricane/tropical storm/tornado/flood), category 1-5, wind speed, radius, forward speed
- [x] LLM analysis: infrastructure damage predictions, affected population, evacuation zones, power grid impact, road closures, shelter demand surge
- [x] Results panel: streaming LLM output with structured sections (infrastructure, population, resources, recommendations)
- [x] Affected area overlay: draw wind radius circles on map colored by damage zone (catastrophic/major/moderate/minor)
- [x] Add Storm Simulator nav item to DashboardLayout sidebar
- [x] Write vitest tests for simulateStorm procedure

## Storm Simulator UX Fixes
- [x] Fix drawing mode: stay active after each click so users can keep adding waypoints continuously without re-clicking the button
- [x] Add "Stop Drawing" button that appears while drawing to explicitly stop
- [x] 3D hurricane animation panel: Canvas-based spinning vortex traveling the track (HurricaneCanvas.tsx)
- [x] Vortex scales with category (Cat 1 small → Cat 5 massive), intensifies over warm water, shrinks on landfall
- [x] Animation shows storm eye, spiral bands, and intensity color matching category colors
- [x] Playback controls: play/pause/speed (0.5×/1×/2×/4×) and restart button

## Storm Simulator Map & UI Polish
- [x] Dark night-mode Google Maps style matching BayShield theme (dark ocean, glowing coastlines)
- [x] Hurricane vortex canvas overlay rendered directly on the map (travels the drawn track)
- [x] Intensity trend indicators on track: arrows/badges showing strengthening ↑ or weakening ↓ at each waypoint
- [x] Redesigned impact analysis panel: cleaner layout, intensity timeline chart, better visual hierarchy
- [x] Fix LLM JSON parse error: robust extraction strips markdown fences and repairs truncated JSON

## Storm Simulator Bug Fixes & Mobile
- [ ] Fix canvas overlay — vortex not rendering on the map (canvas positioning broken)
- [ ] Fix Hide/Show Vortex toggle — button does nothing currently
- [ ] Make Storm Simulator fully mobile-responsive (stacked layout, touch-friendly controls, scrollable panels)
