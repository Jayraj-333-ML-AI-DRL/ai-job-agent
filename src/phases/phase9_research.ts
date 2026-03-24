import { callClaude } from "../integrations/anthropic";
import { ScoredJob } from "./phase4_search";
import { logger } from "../utils/logger";

const SYSTEM = `You are a company research analyst. Generate concise, interview-ready company briefs.
Base your response on what you know about the company. Be specific and factual.`;

export async function researchCompany(job: ScoredJob): Promise<string> {
  logger.info(`Researching ${job.company}`);

  const prompt = `
Generate a 1-page research brief for a job interview at ${job.company}.

Role I'm applying for: ${job.title}
Job Description excerpt:
${job.description.slice(0, 1000)}

Include these sections in markdown:

## Company Overview
2–3 sentences: what the company does, their main product, and their mission.

## Tech Stack & Engineering Culture
What technologies they use (infer from JD + what you know). Engineering blog culture.

## Culture Signals
3 observations about company culture inferred from JD language and public reputation.

## Recent News / Notable Events
1–2 things to mention naturally in the interview (product launches, funding, expansions).

## 3 Smart Interview Questions
Questions that show you've done research. Avoid generic questions like "What does success look like?"

## Networking Hook
One sentence you could open with to break the ice based on something specific about ${job.company}.`;

  return callClaude(SYSTEM, prompt, 2048);
}
