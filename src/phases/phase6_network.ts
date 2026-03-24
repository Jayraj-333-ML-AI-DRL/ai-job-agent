import { callClaude } from "../integrations/anthropic";
import { ScoredJob } from "./phase4_search";
import { AgentInputs } from "../inputs/validateInputs";
import { logger } from "../utils/logger";

const SYSTEM = `You are a networking coach. Generate concise, genuine, non-spammy outreach messages.`;

export async function generateNetworkingActions(
  job: ScoredJob,
  inputs: AgentInputs
): Promise<string> {
  logger.info(`Generating networking actions for ${job.company}`);

  const prompt = `
Generate networking action items for applying to ${job.title} at ${job.company}.

Role: ${inputs.role}
Location: ${inputs.location ?? "flexible"}
Stack: ${inputs.stack?.join(", ") ?? ""}

Produce markdown with these three sections:

## LinkedIn Connection Request (max 300 characters)
A genuine, non-salesy message to send to a ${job.title} or Engineering Manager at ${job.company}.

## Referral Ask Message
A short message to send if you know someone at ${job.company}.

## Communities & Events
3–5 specific Slack groups, Discord servers, meetups, or newsletters relevant to this role and stack.
Include the actual names/URLs where known.`;

  return callClaude(SYSTEM, prompt, 1024);
}
