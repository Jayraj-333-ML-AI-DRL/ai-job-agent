import { callClaudeJSON } from "../integrations/anthropic";
import { CandidateProfile } from "./phase1_define";
import { logger } from "../utils/logger";

export interface CVDiff {
  rewrittenSummary: string;
  reorderedSkills: string[];
  rewrittenBullets: { original: string; rewritten: string }[];
  addedKeywords: string[];
  removedWeakPoints: string[];
  selectedProjects: string[];   // project names from profile most relevant to JD
}

const SYSTEM = `You are an expert ATS-optimisation specialist.
Rules you MUST follow:
- Mirror keywords from the job description verbatim (ATS compliance)
- Lead every bullet point with a strong action verb (Built, Shipped, Reduced, Led, Designed, Automated)
- Quantify impact in every bullet where possible
- One page max for candidates with < 5 years experience
- Never fabricate skills or experience not in the original CV
Return ONLY valid JSON — no markdown, no explanation.`;

export async function optimiseCV(
  cvText: string,
  jobDescription: string,
  profile: CandidateProfile
): Promise<CVDiff> {
  logger.phase(2, "CV Optimisation");

  const prompt = `
Optimise this candidate's CV for the following job description.

CANDIDATE PROFILE:
${JSON.stringify(profile, null, 2)}

ORIGINAL CV TEXT:
${cvText}

JOB DESCRIPTION:
${jobDescription}

Return this JSON shape:
{
  "rewrittenSummary": "2-3 sentence professional summary tailored to this JD",
  "reorderedSkills": ["skill1", "skill2"],
  "rewrittenBullets": [
    { "original": "original bullet text", "rewritten": "ATS-optimised rewrite" }
  ],
  "addedKeywords": ["keyword1", "keyword2"],
  "removedWeakPoints": ["weak point to remove"],
  "selectedProjects": ["project name most relevant to JD"]
}`;

  return callClaudeJSON<CVDiff>(SYSTEM, prompt, 3000);
}
