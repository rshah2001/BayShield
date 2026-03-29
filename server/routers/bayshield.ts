/**
 * BayShield tRPC Router
 * Handles agent pipeline orchestration, live weather data,
 * and SSE streaming for real-time frontend updates.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import {
  agentRuns, agentMessages, weatherSnapshots, actionPlans,
  vulnerabilityZones, shelterStatus
} from "../../drizzle/schema";
import { desc, eq } from "drizzle-orm";

const PYTHON_ADK_URL = process.env.PYTHON_ADK_URL || "http://localhost:8000";

// ── Helper: call the Python ADK service ──────────────────────────────────────
async function callADK(path: string, options: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`${PYTHON_ADK_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ADK service error ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Helper: serialize pipeline result to DB ───────────────────────────────────
async function savePipelineResult(result: Record<string, unknown>) {
  const db = await getDb();
  if (!db) return;

  const runId = result.run_id as string;
  const completedAt = new Date((result.completed_at as string) || new Date().toISOString());

  // Save agent run record
  await db.insert(agentRuns).values({
    runId,
    mode: "live",
    threatLevel: result.threat_level as string,
    totalAtRisk: result.total_at_risk as number,
    selfCorrectionApplied: (result.self_correction_applied as boolean) ? 1 : 0,
    correctionDetails: result.correction_details as string | null,
    completedAt,
  }).onDuplicateKeyUpdate({ set: { completedAt } });

  // Save A2A messages
  const messages = result.messages as Array<Record<string, unknown>>;
  if (messages?.length) {
    await db.insert(agentMessages).values(
      messages.map((m) => ({
        messageId: m.id as string,
        runId,
        fromAgent: m.from_agent as string,
        toAgent: m.to_agent as string,
        eventType: m.event_type as string,
        content: m.content as string,
        payload: JSON.stringify(m.payload),
        timestamp: new Date(m.timestamp as string),
      }))
    ).onDuplicateKeyUpdate({ set: { timestamp: new Date() } });
  }

  // Save action plans
  const plans = result.action_plans as Array<Record<string, unknown>>;
  if (plans?.length) {
    await db.insert(actionPlans).values(
      plans.map((p) => ({
        planId: p.id as string,
        runId,
        title: p.title as string,
        priority: p.priority as number,
        action: p.action as string,
        shelter: p.shelter as string,
        route: p.route as string,
        population: p.population as number,
        rationale: p.rationale as string,
        outputType: p.output_type as string,
        correctionApplied: (p.correction_applied as boolean) ? 1 : 0,
      }))
    ).onDuplicateKeyUpdate({ set: { createdAt: new Date() } });
  }
}

// ── BayShield Router ──────────────────────────────────────────────────────────
export const bayshieldRouter = router({
  // Health check for Python ADK service
  adkHealth: publicProcedure.query(async () => {
    try {
      const health = await callADK("/health");
      return { ok: true, data: health };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }),

  // Fetch live NOAA/NWS data without running the full pipeline
  liveWeather: publicProcedure.query(async () => {
    try {
      const data = await callADK("/live-data") as Record<string, unknown>;
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: String(e), data: null };
    }
  }),

  // Run the full 4-agent pipeline and persist results
  runPipeline: publicProcedure
    .input(z.object({ mode: z.enum(["live", "simulation"]).default("live") }))
    .mutation(async ({ input }) => {
      try {
        const result = await callADK("/run", {
          method: "POST",
          body: JSON.stringify({ mode: input.mode }),
        }) as Record<string, unknown>;

        // Persist to DB in background (don't block response)
        savePipelineResult(result).catch(console.error);

        return { ok: true, data: result };
      } catch (e) {
        return { ok: false, error: String(e), data: null };
      }
    }),

  // Get the most recent pipeline run from DB
  latestRun: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;

    const runs = await db.select().from(agentRuns)
      .orderBy(desc(agentRuns.completedAt))
      .limit(1);

    if (!runs.length) return null;
    const run = runs[0];

    const messages = await db.select().from(agentMessages)
      .where(eq(agentMessages.runId, run.runId))
      .orderBy(agentMessages.timestamp);

    const plans = await db.select().from(actionPlans)
      .where(eq(actionPlans.runId, run.runId))
      .orderBy(actionPlans.priority);

    return { run, messages, plans };
  }),

  // Get all recent runs (last 10)
  recentRuns: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    return db.select().from(agentRuns)
      .orderBy(desc(agentRuns.completedAt))
      .limit(10);
  }),

  // LLM-powered action plan summary
  generateSummary: publicProcedure
    .input(z.object({
      threatLevel: z.string(),
      totalAtRisk: z.number(),
      planCount: z.number(),
      correctionApplied: z.boolean(),
      zones: z.array(z.object({
        name: z.string(),
        riskScore: z.number(),
        status: z.string(),
        population: z.number(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const zonesText = input.zones
        ? input.zones.map(z => `${z.name} (risk: ${z.riskScore}, ${z.status})`).join(", ")
        : "Tampa Bay coastal zones";

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are BayShield, an AI emergency coordinator for Tampa Bay. 
Write a concise 2-3 sentence emergency briefing for emergency managers. 
Be specific, actionable, and professional. Do not use markdown formatting.`
            },
            {
              role: "user",
              content: `Current situation: Threat level ${input.threatLevel}. 
${input.totalAtRisk.toLocaleString()} people at risk. 
${input.planCount} action plans generated.
${input.correctionApplied ? "Self-correction was applied to improve plan accuracy." : ""}
High-risk zones: ${zonesText}.
Generate an emergency briefing.`
            }
          ]
        });

        const content = (response as { choices?: Array<{ message?: { content?: string } }> })
          ?.choices?.[0]?.message?.content ?? "Emergency assessment complete. Review action plans.";

        return { summary: content };
      } catch (e) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `LLM summary generation failed: ${String(e)}`,
        });
      }
    }),

  // LLM-powered self-correction explanation
  explainCorrection: publicProcedure
    .input(z.object({
      correctionDetails: z.string(),
      planTitle: z.string(),
      threatLevel: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are an AI agent explaining a self-correction in an emergency response system. Be concise (1-2 sentences) and technical."
            },
            {
              role: "user",
              content: `The Alert Commander self-correction loop detected: "${input.correctionDetails}" in plan "${input.planTitle}" during a ${input.threatLevel} threat scenario. Explain why this correction was necessary.`
            }
          ]
        });

        const content = (response as { choices?: Array<{ message?: { content?: string } }> })
          ?.choices?.[0]?.message?.content ?? "Correction applied to ensure plan accuracy.";

        return { explanation: content };
      } catch (e) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `LLM explanation generation failed: ${String(e)}`,
        });
      }
    }),
});
