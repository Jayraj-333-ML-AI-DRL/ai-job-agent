import { callClaude } from "../integrations/anthropic";
import { CandidateProfile } from "./phase1_define";
import { ScoredJob } from "./phase4_search";
import { AgentInputs } from "../inputs/validateInputs";
import { logger } from "../utils/logger";

const SYSTEM = `You are an expert cover letter writer.
Rules:
- Do NOT open with "I am writing to express my interest in..."
- Be specific — reference something real about the company or product
- Para 1: Why this company (specific product/team reference)
- Para 2: Most relevant achievement mapped to a JD requirement (with numbers)
- Para 3: What you'd bring + forward-looking statement
- 3 paragraphs of plain text. No headers. No bullet points.
- Maximum 250 words total.`;

export async function generateCoverLetter(
  job: ScoredJob,
  profile: CandidateProfile,
  inputs: AgentInputs,
  companyResearch: string
): Promise<string> {
  logger.info(`Generating cover letter for ${job.company} (${job.title})`);

  const topAchievement = profile.experience[0]?.bullets[0] ?? "Led cross-functional initiatives delivering measurable business impact";
  const includeSalary = job.salaryFit === "match" || job.salaryFit === "over";

  const prompt = `
Write a cover letter for this application.

Candidate: ${profile.name}
Target Role: ${job.title} at ${job.company}
Location: ${job.location}
Key JD Requirements (inferred from description):
${job.description.slice(0, 800)}

Candidate's Most Relevant Achievement:
${topAchievement}

Company-specific detail to reference:
${companyResearch.slice(0, 400)}

${includeSalary ? `Include salary signal: mention "${inputs.targetSalary}" as the candidate's expected compensation.` : "Do NOT mention salary."}

Output: Three paragraphs of plain text only. No subject line. No greeting. No sign-off.`;

  return callClaude(SYSTEM, prompt, 1024);
}
