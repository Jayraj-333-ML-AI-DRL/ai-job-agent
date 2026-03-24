import { callClaudeJSON } from "../integrations/anthropic";
import { AgentInputs } from "../inputs/validateInputs";
import { logger } from "../utils/logger";

export interface CandidateProfile {
  name: string;
  currentTitle: string;
  yearsExperience: number;
  topSkills: string[];
  salaryBand: { min: number; max: number; currency: string };
  strongPoints: string[];
  gaps: string[];
  suggestedTitles: string[];
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  education: { degree: string; institution: string; year?: number }[];
  experience: {
    title: string;
    company: string;
    period: string;
    bullets: string[];
  }[];
  projects: { name: string; description: string; stack: string[] }[];
}

const SYSTEM = `You are a senior career coach AI. Extract structured candidate data from a CV.
Return ONLY valid JSON — no markdown, no explanation.`;

export async function defineProfile(
  cvText: string,
  inputs: AgentInputs
): Promise<CandidateProfile> {
  logger.phase(1, "Define Target Role & Extract Candidate Profile");

  const prompt = `
Given this CV and target job criteria, extract a structured candidate profile.

CV:
${cvText}

Target Role: ${inputs.role}
Seniority: ${inputs.seniority ?? "mid"}
Target Salary: ${inputs.targetSalary}
${inputs.location ? `Location: ${inputs.location}` : ""}
${inputs.stack ? `Preferred Stack: ${inputs.stack.join(", ")}` : ""}

Return this exact JSON shape (all fields required, use empty arrays/strings if unknown):
{
  "name": "",
  "email": "",
  "phone": "",
  "linkedin": "",
  "github": "",
  "currentTitle": "",
  "yearsExperience": 0,
  "topSkills": [],
  "salaryBand": { "min": 0, "max": 0, "currency": "USD" },
  "strongPoints": [],
  "gaps": [],
  "suggestedTitles": [],
  "education": [{ "degree": "", "institution": "", "year": 0 }],
  "experience": [{ "title": "", "company": "", "period": "", "bullets": [] }],
  "projects": [{ "name": "", "description": "", "stack": [] }]
}`;

  const profile = await callClaudeJSON<CandidateProfile>(SYSTEM, prompt, 2048);
  logger.info(`Profile extracted for: ${profile.name} (${profile.yearsExperience} yrs exp)`);
  return profile;
}
