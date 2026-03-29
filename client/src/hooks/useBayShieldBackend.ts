/**
 * useBayShieldBackend — React hook for the Python ADK backend
 *
 * Provides:
 * - adkHealth: health status of the Python ADK service
 * - runPipeline: trigger a full 4-agent pipeline run
 * - latestRun: most recent pipeline result from DB
 * - recentRuns: last 10 pipeline runs
 * - generateSummary: LLM-powered emergency briefing
 * - explainCorrection: LLM explanation of self-correction
 * - isAdkAvailable: whether the Python service is reachable
 */
import { useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc';

export interface BackendPipelineResult {
  run_id: string;
  threat_level: string;
  total_at_risk: number;
  self_correction_applied: boolean;
  correction_details: string | null;
  action_plans: Array<{
    id: string;
    title: string;
    priority: number;
    action: string;
    shelter: string;
    route: string;
    population: number;
    rationale: string;
    output_type: string;
    correction_applied: boolean;
  }>;
  agent_traces: Array<{
    agent_id: string;
    agent_name: string;
    status: string;
    confidence: number;
    loop_iteration: number;
    output_type: string;
    deterministic_rationale: string;
    execution_ms: number;
  }>;
  messages: Array<{
    id: string;
    from_agent: string;
    to_agent: string;
    event_type: string;
    content: string;
    payload: Record<string, unknown>;
    timestamp: string;
  }>;
  completed_at: string;
}

export function useBayShieldBackend() {
  const [lastPipelineResult, setLastPipelineResult] = useState<BackendPipelineResult | null>(null);
  const [isRunningPipeline, setIsRunningPipeline] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  // Health check — runs once on mount
  const { data: healthData } = trpc.bayshield.adkHealth.useQuery(undefined, {
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  // Latest run from DB
  const { data: latestRun, refetch: refetchLatestRun } = trpc.bayshield.latestRun.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 10_000,
  });

  // Recent runs
  const { data: recentRuns } = trpc.bayshield.recentRuns.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  // Pipeline mutation
  const runPipelineMutation = trpc.bayshield.runPipeline.useMutation({
    onSuccess: (result) => {
      if (result.ok && result.data) {
        setLastPipelineResult(result.data as unknown as BackendPipelineResult);
        setPipelineError(null);
        refetchLatestRun();
      } else if (!result.ok) {
        setPipelineError(result.error ?? 'Pipeline failed');
      }
      setIsRunningPipeline(false);
    },
    onError: (err) => {
      setPipelineError(err.message);
      setIsRunningPipeline(false);
    },
  });

  // LLM summary mutation
  const generateSummaryMutation = trpc.bayshield.generateSummary.useMutation();

  // LLM correction explanation
  const explainCorrectionMutation = trpc.bayshield.explainCorrection.useMutation();

  const runPipeline = useCallback(async (mode: 'live' | 'simulation' = 'live') => {
    setIsRunningPipeline(true);
    setPipelineError(null);
    await runPipelineMutation.mutateAsync({ mode });
  }, [runPipelineMutation]);

  const generateSummary = useCallback(async (params: {
    threatLevel: string;
    totalAtRisk: number;
    planCount: number;
    correctionApplied: boolean;
    zones?: Array<{ name: string; riskScore: number; status: string; population: number }>;
  }) => {
    const result = await generateSummaryMutation.mutateAsync(params);
    return result.summary;
  }, [generateSummaryMutation]);

  const explainCorrection = useCallback(async (params: {
    correctionDetails: string;
    planTitle: string;
    threatLevel: string;
  }) => {
    const result = await explainCorrectionMutation.mutateAsync(params);
    return result.explanation;
  }, [explainCorrectionMutation]);

  const isAdkAvailable = healthData?.ok === true;

  return {
    isAdkAvailable,
    healthData,
    lastPipelineResult,
    isRunningPipeline,
    pipelineError,
    latestRun,
    recentRuns,
    runPipeline,
    generateSummary,
    explainCorrection,
    isGeneratingSummary: generateSummaryMutation.isPending,
    isExplainingCorrection: explainCorrectionMutation.isPending,
  };
}
