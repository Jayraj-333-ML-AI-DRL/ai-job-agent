import { callClaude } from "../integrations/anthropic";
import { CandidateProfile } from "./phase1_define";
import { AgentInputs } from "../inputs/validateInputs";
import { logger } from "../utils/logger";

const SYSTEM = `You are a career coach generating a practical online presence checklist.
Be specific to the role and seniority. Output clean markdown only.`;

export async function generatePresenceChecklist(
  profile: CandidateProfile,
  inputs: AgentInputs
): Promise<string> {
  logger.phase(3, "Online Presence Checklist");

  const prompt = `
Generate an online presence checklist for this candidate.

Role: ${inputs.role}
Seniority: ${inputs.seniority}
Stack: ${inputs.stack?.join(", ") ?? "general"}
Current Profile: ${profile.name}, ${profile.currentTitle}

Create a markdown checklist with sections:
1. LinkedIn Profile Optimisation (5–7 specific actions)
2. GitHub / Portfolio (5–7 specific actions for this role)
3. Professional Communities to Join (3–5 specific communities/meetups)
4. Content to Publish (2–3 ideas that would demonstrate expertise)

Be role-specific. For example, SWEs: pin top GitHub repos, add README demos.
For PMs: write case studies, join Lenny's Newsletter community.`;

  return callClaude(SYSTEM, prompt, 2048);
}
