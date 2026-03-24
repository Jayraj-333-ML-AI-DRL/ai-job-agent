import { callClaude } from "../integrations/anthropic";
import { ScoredJob } from "./phase4_search";
import { AgentInputs } from "../inputs/validateInputs";
import { logger } from "../utils/logger";

const SYSTEM = `You are a technical interview coach. Generate a practical, prioritised study plan.`;

export async function generateTechPrepChecklist(
  topJobs: ScoredJob[],
  inputs: AgentInputs
): Promise<string> {
  logger.phase(7, "Technical Interview Prep Checklist");

  const combinedJDs = topJobs
    .slice(0, 10)
    .map((j) => `--- ${j.company}: ${j.title} ---\n${j.description.slice(0, 600)}`)
    .join("\n\n");

  const prompt = `
Analyse these ${topJobs.length} job descriptions and generate a focused technical prep checklist.

ROLE: ${inputs.role}
STACK: ${inputs.stack?.join(", ") ?? "general"}

JOB DESCRIPTIONS:
${combinedJDs}

Generate a markdown document with:

## Most Frequent Technical Topics (ranked by frequency across JDs)
For each topic:
- Topic name
- Frequency (e.g. "8/10 JDs")
- Why it matters
- Free resource link (LeetCode tag, MDN, official docs, YouTube)

## Coding Patterns to Practise
List the top 5 algorithm/data-structure patterns that appear most in these JDs.

## System Design Topics
Top 3 system design topics relevant to this seniority and role.

## Quick Wins (things you can do in < 2 hours)
3–5 specific, immediately actionable prep tasks.`;

  return callClaude(SYSTEM, prompt, 3000);
}
