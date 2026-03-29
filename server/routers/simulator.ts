/**
 * Storm Simulator tRPC Router
 *
 * Accepts a user-defined storm track + parameters, runs an LLM-powered
 * infrastructure impact analysis, and persists the result to the DB.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { stormSimulations } from "../../drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// ── Zod schemas ──────────────────────────────────────────────────────────────

const TrackPointSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  label: z.string().optional(),
});

const StormTypeEnum = z.enum([
  "hurricane",
  "tropical_storm",
  "tropical_depression",
  "tornado",
  "flood",
  "nor_easter",
]);

const CreateSimulationInput = z.object({
  name: z.string().min(1).max(128),
  stormType: StormTypeEnum.default("hurricane"),
  category: z.number().int().min(1).max(5).optional(),
  windSpeedKph: z.number().min(0).max(400).default(150),
  radiusKm: z.number().min(5).max(500).default(80),
  forwardSpeedKph: z.number().min(1).max(100).default(20),
  track: z.array(TrackPointSchema).min(2).max(20),
  landfall: TrackPointSchema.optional(),
});

// ── LLM prompt builder ───────────────────────────────────────────────────────

function buildAnalysisPrompt(input: z.infer<typeof CreateSimulationInput>): string {
  const categoryLabel = input.stormType === "hurricane"
    ? `Category ${input.category ?? 1} Hurricane`
    : input.stormType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  const trackSummary = input.track
    .map((p, i) => `  Point ${i + 1}: ${p.lat.toFixed(4)}°N, ${p.lng.toFixed(4)}°W${p.label ? ` (${p.label})` : ""}`)
    .join("\n");

  const landfallStr = input.landfall
    ? `Projected landfall: ${input.landfall.lat.toFixed(4)}°N, ${input.landfall.lng.toFixed(4)}°W${input.landfall.label ? ` (${input.landfall.label})` : ""}`
    : "Landfall point: not specified (use track endpoint)";

  return `You are BayShield's AI Infrastructure Impact Analyst for the Tampa Bay, Florida region.

A user has created a storm simulation with the following parameters:

STORM: ${input.name}
TYPE: ${categoryLabel}
WIND SPEED: ${input.windSpeedKph} km/h (${Math.round(input.windSpeedKph / 1.852)} knots)
WIND RADIUS: ${input.radiusKm} km from center
FORWARD SPEED: ${input.forwardSpeedKph} km/h
${landfallStr}

TRACK WAYPOINTS:
${trackSummary}

Tampa Bay Regional Context:
- Counties in impact zone: Hillsborough, Pinellas, Pasco, Manatee, Sarasota
- Total regional population: ~3.2 million
- Critical infrastructure: Port Tampa Bay (largest US Gulf port), MacDill Air Force Base, Tampa International Airport, 3 major hospitals (Tampa General, St. Joseph's, BayCare), I-275/I-75/I-4 interchange, Sunshine Skyway Bridge
- Vulnerable areas: Pinellas Peninsula (evacuation zones A-E), low-lying coastal communities, mobile home parks (~85,000 units), barrier islands (St. Pete Beach, Clearwater Beach, Anna Maria Island)

Provide a detailed infrastructure impact analysis in the following EXACT JSON format. Be specific, realistic, and data-driven based on the storm parameters and Tampa Bay geography:

{
  "summary": "2-3 sentence executive summary of the storm's expected impact",
  "affectedPopulation": <integer estimate of people in impact zone>,
  "threatLevel": "<CRITICAL|HIGH|MODERATE|LOW>",
  "infrastructureImpacts": {
    "power": {
      "severity": "<catastrophic|major|moderate|minor>",
      "estimatedOutages": "<number> customers",
      "restorationDays": <integer>,
      "details": "specific power grid impact description"
    },
    "roads": {
      "severity": "<catastrophic|major|moderate|minor>",
      "closures": ["list of specific roads/bridges likely to close"],
      "floodingRisk": "description of road flooding risk",
      "details": "overall road impact description"
    },
    "bridges": {
      "severity": "<catastrophic|major|moderate|minor>",
      "atRisk": ["list of bridges at risk"],
      "details": "bridge closure/damage assessment"
    },
    "airports": {
      "severity": "<catastrophic|major|moderate|minor>",
      "closureHours": <integer>,
      "details": "airport impact description"
    },
    "port": {
      "severity": "<catastrophic|major|moderate|minor>",
      "closureHours": <integer>,
      "details": "Port Tampa Bay impact description"
    },
    "hospitals": {
      "severity": "<catastrophic|major|moderate|minor>",
      "atRisk": ["list of hospitals at risk"],
      "details": "healthcare infrastructure impact"
    },
    "communications": {
      "severity": "<catastrophic|major|moderate|minor>",
      "details": "cell towers, internet, emergency comms impact"
    },
    "waterSewer": {
      "severity": "<catastrophic|major|moderate|minor>",
      "details": "water treatment and sewer system impact"
    }
  },
  "evacuationZones": {
    "mandatory": ["list of specific zones/areas requiring mandatory evacuation"],
    "recommended": ["list of zones with recommended evacuation"],
    "estimatedEvacuees": <integer>,
    "timeToEvacuate": "<X hours recommended lead time>"
  },
  "shelterDemand": {
    "estimatedShelterNeeds": <integer>,
    "recommendedShelters": ["list of shelter names/locations"],
    "specialNeedsCount": <integer>
  },
  "stormSurge": {
    "maxSurgeMeters": <float>,
    "affectedCoastlineKm": <float>,
    "highRiskAreas": ["list of highest surge risk areas"]
  },
  "economicImpact": {
    "estimatedDamageUSD": "<range in billions>",
    "recoveryMonths": <integer>,
    "details": "economic impact description"
  },
  "immediateActions": [
    "list of 5-7 specific, prioritized immediate response actions"
  ],
  "agentRecommendations": {
    "stormWatcher": "what the Storm Watcher agent should monitor",
    "vulnerabilityMapper": "which zones the Vulnerability Mapper should prioritize",
    "resourceCoordinator": "resource pre-positioning recommendations",
    "alertCommander": "alert issuance and escalation recommendations"
  }
}

Return ONLY the JSON object, no markdown fences, no extra text.`;
}

// ── Router ───────────────────────────────────────────────────────────────────

export const simulatorRouter = router({

  /**
   * Create a new storm simulation and run LLM analysis.
   * Returns the full simulation record including analysis.
   */
  create: publicProcedure
    .input(CreateSimulationInput)
    .mutation(async ({ input }) => {
      const db = await getDb();
      const simId = randomUUID();

      // Insert pending record
      if (db) {
        await db.insert(stormSimulations).values({
          simId,
          name: input.name,
          stormType: input.stormType,
          category: input.category ?? null,
          windSpeedKph: input.windSpeedKph,
          radiusKm: input.radiusKm,
          forwardSpeedKph: input.forwardSpeedKph,
          track: input.track,
          landfall: input.landfall ?? null,
          status: "analyzing",
        });
      }

      // Run LLM analysis
      let analysis: Record<string, unknown> | null = null;
      let analysisText = "";
      let affectedPopulation = 0;
      let status: "complete" | "error" = "complete";

      try {
        const prompt = buildAnalysisPrompt(input);
        const llmResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are BayShield's AI Infrastructure Impact Analyst. Always respond with valid JSON only.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        });

        const raw = (llmResponse as { choices: Array<{ message: { content: string } }> })
          .choices?.[0]?.message?.content ?? "{}";

        analysisText = raw;

        // Robust JSON extraction: strip markdown fences, find outermost {...}
        let jsonStr = raw.trim();
        // Remove ```json ... ``` or ``` ... ``` wrappers
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        // Find the first '{' and last '}' to extract the JSON object
        const firstBrace = jsonStr.indexOf('{');
        const lastBrace = jsonStr.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
        }

        // Attempt parse; on failure try to repair truncated JSON by closing open brackets
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(jsonStr) as Record<string, unknown>;
        } catch {
          // Count unmatched braces/brackets and close them
          let depth = 0;
          let inString = false;
          let escape = false;
          for (const ch of jsonStr) {
            if (escape) { escape = false; continue; }
            if (ch === '\\' && inString) { escape = true; continue; }
            if (ch === '"') { inString = !inString; continue; }
            if (inString) continue;
            if (ch === '{' || ch === '[') depth++;
            if (ch === '}' || ch === ']') depth--;
          }
          let repaired = jsonStr;
          // Remove trailing comma before closing
          repaired = repaired.replace(/,\s*$/, '');
          // Close any open arrays/objects
          while (depth > 0) { repaired += '}'; depth--; }
          try {
            parsed = JSON.parse(repaired) as Record<string, unknown>;
          } catch {
            // Last resort: return a minimal valid structure
            parsed = {
              summary: 'Analysis partially generated — please retry for full results.',
              affectedPopulation: 0,
              threatLevel: 'MODERATE',
              infrastructureImpacts: {},
              evacuationZones: { mandatory: [], recommended: [], estimatedEvacuees: 0, timeToEvacuate: 'Unknown' },
              shelterDemand: { estimatedShelterNeeds: 0, recommendedShelters: [], specialNeedsCount: 0 },
              stormSurge: { maxSurgeMeters: 0, affectedCoastlineKm: 0, highRiskAreas: [] },
              economicImpact: { estimatedDamageUSD: 'Unknown', recoveryMonths: 0, details: '' },
              immediateActions: [],
              agentRecommendations: {},
            };
          }
        }

        analysis = parsed;
        affectedPopulation = (analysis.affectedPopulation as number) ?? 0;
        status = "complete";
      } catch (err) {
        console.error("[Simulator] LLM analysis failed:", err);
        status = "error";
        analysisText = "LLM analysis failed. Please try again.";
      }

      // Update DB record with results
      if (db) {
        await db.update(stormSimulations)
          .set({ analysis, analysisText, affectedPopulation, status, updatedAt: new Date() })
          .where(eq(stormSimulations.simId, simId));
      }

      return {
        simId,
        name: input.name,
        stormType: input.stormType,
        category: input.category ?? null,
        windSpeedKph: input.windSpeedKph,
        radiusKm: input.radiusKm,
        forwardSpeedKph: input.forwardSpeedKph,
        track: input.track,
        landfall: input.landfall ?? null,
        analysis,
        analysisText,
        affectedPopulation,
        status,
        createdAt: new Date().toISOString(),
      };
    }),

  /**
   * List all past simulations (most recent first).
   */
  list: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const rows = await db
        .select({
          simId: stormSimulations.simId,
          name: stormSimulations.name,
          stormType: stormSimulations.stormType,
          category: stormSimulations.category,
          windSpeedKph: stormSimulations.windSpeedKph,
          radiusKm: stormSimulations.radiusKm,
          affectedPopulation: stormSimulations.affectedPopulation,
          status: stormSimulations.status,
          createdAt: stormSimulations.createdAt,
        })
        .from(stormSimulations)
        .orderBy(desc(stormSimulations.createdAt))
        .limit(input.limit);

      return rows;
    }),

  /**
   * Get a single simulation by simId (includes full analysis).
   */
  get: publicProcedure
    .input(z.object({ simId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const rows = await db
        .select()
        .from(stormSimulations)
        .where(eq(stormSimulations.simId, input.simId))
        .limit(1);

      if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Simulation not found" });
      return rows[0];
    }),

  /**
   * Delete a simulation by simId.
   */
  delete: publicProcedure
    .input(z.object({ simId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db.delete(stormSimulations).where(eq(stormSimulations.simId, input.simId));
      return { success: true };
    }),
});
