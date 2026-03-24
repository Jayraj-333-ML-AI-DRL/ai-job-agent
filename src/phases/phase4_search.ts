import { searchAdzuna, Job } from "../integrations/adzuna";
import { searchTheMuse } from "../integrations/theMuse";
import { searchLinkedIn } from "../integrations/linkedinJobs";
import { callClaudeJSON } from "../integrations/anthropic";
import { AgentInputs } from "../inputs/validateInputs";
import { CandidateProfile } from "./phase1_define";
import { parseSalary } from "../utils/salaryParser";
import { logger } from "../utils/logger";

export interface ScoredJob extends Job {
  score: number;
  matchedSkills: string[];
  gaps: string[];
  salaryFit: "under" | "match" | "over" | "unknown";
}

const SCORE_SYSTEM = `You are a job-fit scoring engine.
Return ONLY valid JSON — no markdown, no explanation.`;

export async function searchAndScoreJobs(
  inputs: AgentInputs,
  profile: CandidateProfile
): Promise<ScoredJob[]> {
  logger.phase(4, "Job Search & Scoring");

  const salary = parseSalary(inputs.targetSalary);

  // Parallel search across all boards
  const [adzunaJobs, museJobs, linkedinJobs] = await Promise.all([
    searchAdzuna({ role: inputs.role, location: inputs.location, salaryMin: salary.min, count: 50 }),
    searchTheMuse({ role: inputs.role, seniority: inputs.seniority }),
    searchLinkedIn({ role: inputs.role, location: inputs.location, remote: inputs.remote, count: 50 }),
  ]);

  // Deduplicate by title+company
  const all = deduplicateJobs([...adzunaJobs, ...museJobs, ...linkedinJobs]);
  logger.info(`Found ${all.length} unique jobs across all boards`);

  // Filter excluded companies
  const excluded = inputs.excludeCompanies?.map((c) => c.toLowerCase()) ?? [];
  const filtered = all.filter((j) => !excluded.includes(j.company.toLowerCase()));

  // Score in batches of 5 (to avoid rate limits)
  const scored: ScoredJob[] = [];
  const batchSize = 5;

  for (let i = 0; i < Math.min(filtered.length, inputs.count * 3); i += batchSize) {
    const batch = filtered.slice(i, i + batchSize);
    const batchScored = await Promise.all(
      batch.map((job) => scoreJob(job, profile, inputs.targetSalary))
    );
    scored.push(...batchScored);
  }

  // Sort by score descending, return top `count`
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, inputs.count);

  logger.info(`Top ${top.length} jobs selected (scores: ${top[0]?.score ?? 0}–${top[top.length - 1]?.score ?? 0})`);
  return top;
}

async function scoreJob(
  job: Job,
  profile: CandidateProfile,
  targetSalary: string
): Promise<ScoredJob> {
  const prompt = `
Score this job fit from 0–100.

Candidate Profile:
${JSON.stringify({ topSkills: profile.topSkills, yearsExperience: profile.yearsExperience, currentTitle: profile.currentTitle }, null, 2)}

Job: ${job.title} at ${job.company}
Description: ${job.description.slice(0, 1500)}
Target Salary: ${targetSalary}

Return JSON:
{
  "score": 0,
  "matchedSkills": [],
  "gaps": [],
  "salaryFit": "under|match|over|unknown"
}`;

  try {
    const result = await callClaudeJSON<{ score: number; matchedSkills: string[]; gaps: string[]; salaryFit: "under"|"match"|"over"|"unknown" }>(
      SCORE_SYSTEM, prompt, 512
    );
    return { ...job, ...result };
  } catch {
    return { ...job, score: 50, matchedSkills: [], gaps: [], salaryFit: "unknown" };
  }
}

function deduplicateJobs(jobs: Job[]): Job[] {
  const seen = new Set<string>();
  return jobs.filter((j) => {
    const key = `${j.title.toLowerCase()}_${j.company.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
