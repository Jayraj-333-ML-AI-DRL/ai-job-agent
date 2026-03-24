import { callClaude } from "../integrations/anthropic";
import { CandidateProfile } from "./phase1_define";
import { AgentInputs } from "../inputs/validateInputs";
import { ScoredJob } from "./phase4_search";
import { logger } from "../utils/logger";

const SYSTEM = `You are a salary negotiation expert. Give direct, tactical advice.
Be specific with numbers and scripts. Don't hedge or be vague.`;

export async function generateNegotiationBrief(
  profile: CandidateProfile,
  inputs: AgentInputs,
  topJobs: ScoredJob[]
): Promise<string> {
  logger.phase(10, "Salary Negotiation Brief");

  // Collect salary data from job search
  const salaryData = topJobs
    .filter((j) => j.salaryMin || j.salaryMax)
    .map((j) => `${j.company} (${j.title}): ${j.salaryMin ?? "?"} – ${j.salaryMax ?? "?"} ${j.currency ?? ""}`)
    .join("\n");

  const prompt = `
Generate a salary negotiation brief.

Role: ${inputs.role}
Location: ${inputs.location ?? "flexible"}
Seniority: ${inputs.seniority}
Years Experience: ${profile.yearsExperience}
Candidate's Target: ${inputs.targetSalary}

Market data from live job search:
${salaryData || "No salary data collected from job boards"}

Generate a markdown document with:

## Market Rate Analysis
Current market range for this role/location/experience level with confidence level.

## Recommended Opening Counter
Specific number to counter with and why. Be direct.

## Negotiation Call Script
A realistic 3-exchange script:
- Exchange 1: They make an offer
- Exchange 2: Your counter
- Exchange 3: They respond, you close

## Alternative Benefits to Negotiate
If base salary is fixed, these 3 benefits are worth negotiating (specific to this role):
1. ...
2. ...
3. ...

## Red Flags
2–3 warning signs of a below-market offer for this role.`;

  return callClaude(SYSTEM, prompt, 3000);
}
