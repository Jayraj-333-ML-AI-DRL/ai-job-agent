import "dotenv/config";
import path from "path";
import { AgentInputs } from "./inputs/validateInputs";
import { parseCV } from "./inputs/parseCV";
import { ProgressEmitter } from "../server/progress";
import { defineProfile, CandidateProfile } from "./phases/phase1_define";
import { optimiseCV } from "./phases/phase2_resume";
import { generatePresenceChecklist } from "./phases/phase3_presence";
import { searchAndScoreJobs, ScoredJob } from "./phases/phase4_search";
import { generateCoverLetter } from "./phases/phase5_coverLetter";
import { generateNetworkingActions } from "./phases/phase6_network";
import { generateTechPrepChecklist } from "./phases/phase7_techPrep";
import { generateBehavioralStories } from "./phases/phase8_behavioral";
import { researchCompany } from "./phases/phase9_research";
import { generateNegotiationBrief } from "./phases/phase10_negotiate";
import { generateFollowUpEmails } from "./phases/phase11_followup";
import { generateTailoredCV } from "./generators/cvGenerator";
import { generateCoverLetterDoc } from "./generators/coverLetterGenerator";
import { generateTracker, TrackerRow } from "./generators/trackerGenerator";
import { buildOutputDir, buildAppDir, ensureDir, writeFile } from "./utils/fileSystem";
import { logger } from "./utils/logger";

export async function runAgent(inputs: AgentInputs, progress?: ProgressEmitter): Promise<string> {
  const emit = {
    phase: (n: number, name: string) => { logger.phase(n, name); progress?.emitPhase(n, name); },
    info:  (msg: string)             => { logger.info(msg);       progress?.emitInfo(msg); },
    job:   (i: number, t: number, c: string, s: number) => { progress?.emitJob(i, t, c, s); },
  };

  const startTime = Date.now();
  const outputDir = buildOutputDir(inputs.role, process.env.OUTPUT_DIR ?? "./output");
  ensureDir(path.join(outputDir, "prep"));
  ensureDir(path.join(outputDir, "applications"));

  emit.info(`Output directory: ${outputDir}`);

  // ── Parse CV ─────────────────────────────────────────────────
  emit.info(`Parsing CV from: ${inputs.cvPath}`);
  const cvText = await parseCV(inputs.cvPath);

  // ── Phase 1: Define Profile ──────────────────────────────────
  emit.phase(1, "Define Target Role & Extract Candidate Profile");
  const profile: CandidateProfile = await defineProfile(cvText, inputs);
  writeFile(path.join(outputDir, "prep", "candidate_profile.json"), JSON.stringify(profile, null, 2));
  emit.info(`Profile extracted for: ${profile.name}`);

  // ── Phase 3: Online Presence ─────────────────────────────────
  emit.phase(3, "Online Presence Checklist");
  const presenceChecklist = await generatePresenceChecklist(profile, inputs);
  writeFile(path.join(outputDir, "prep", "online_presence.md"), presenceChecklist);

  // ── Phase 4: Search & Score Jobs ─────────────────────────────
  emit.phase(4, "Job Search & Scoring");
  const scoredJobs: ScoredJob[] = await searchAndScoreJobs(inputs, profile);

  if (scoredJobs.length === 0) {
    logger.warn("No jobs found. Check your API keys and search filters.");
    progress?.emitError("No jobs found. Check your API keys and search filters.");
    return outputDir;
  }
  emit.info(`Found ${scoredJobs.length} matching jobs`);

  // ── Phase 7: Tech Prep ───────────────────────────────────────
  emit.phase(7, "Technical Interview Prep Checklist");
  const techPrep = await generateTechPrepChecklist(scoredJobs, inputs);
  writeFile(path.join(outputDir, "prep", "tech_prep_checklist.md"), techPrep);

  // ── Phase 8: Behavioural Stories ─────────────────────────────
  emit.phase(8, "Behavioural STAR Story Generator");
  const behavioralStories = await generateBehavioralStories(profile);
  writeFile(path.join(outputDir, "prep", "behavioral_stories.md"), behavioralStories);

  // ── Phase 10: Negotiation Brief ──────────────────────────────
  emit.phase(10, "Salary Negotiation Brief");
  const negotiationBrief = await generateNegotiationBrief(profile, inputs, scoredJobs);
  writeFile(path.join(outputDir, "prep", "negotiation_brief.md"), negotiationBrief);

  // ── Per-job application generation ───────────────────────────
  const trackerRows: TrackerRow[] = [];
  const contactLine = [profile.email, profile.phone, profile.linkedin].filter(Boolean).join("  |  ");
  const today = new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });

  for (let i = 0; i < scoredJobs.length; i++) {
    const job = scoredJobs[i];
    const appDir = buildAppDir(outputDir, i + 1, job.company);
    ensureDir(appDir);

    emit.job(i + 1, scoredJobs.length, job.company, job.score);
    emit.phase(2, `CV Optimisation — ${job.company}`);

    let status: TrackerRow["status"] = "done";

    try {
      const cvDiff = await optimiseCV(cvText, job.description, profile);

      emit.phase(5, `Cover Letter — ${job.company}`);
      const research = await researchCompany(job);
      const clText   = await generateCoverLetter(job, profile, inputs, research);

      emit.phase(6, `Networking Actions — ${job.company}`);
      const networkActions = await generateNetworkingActions(job, inputs);

      emit.phase(9, `Company Research — ${job.company}`);
      const fullResearchBrief = `${research}\n\n---\n\n## Networking Actions\n\n${networkActions}`;
      writeFile(path.join(appDir, "research_brief.md"), fullResearchBrief);

      const cvBuffer = await generateTailoredCV(profile, cvDiff);
      const clBuffer = await generateCoverLetterDoc(clText, profile.name, job.title, job.company, today, contactLine);

      const cvFile = path.join(appDir, "cv_tailored.docx");
      const clFile = path.join(appDir, "cover_letter.docx");
      writeFile(cvFile, cvBuffer);
      writeFile(clFile, clBuffer);

      emit.phase(11, `Follow-up Emails — ${job.company}`);
      await generateFollowUpEmails(job, profile);

      trackerRows.push({
        index: i + 1, company: job.company, role: job.title, score: job.score,
        location: job.location, salary: job.salaryMin ? `${job.salaryMin}–${job.salaryMax}` : inputs.targetSalary,
        url: job.url, status: "done", cvFile, clFile,
      });

    } catch (err) {
      logger.error(`Failed to generate application for ${job.company}`, err);
      status = "error";
      trackerRows.push({
        index: i + 1, company: job.company, role: job.title, score: job.score,
        location: job.location, salary: inputs.targetSalary, url: job.url, status, notes: String(err),
      });
    }

    void status;
  }

  // ── Generate tracker .xlsx ────────────────────────────────────
  const trackerBuffer = await generateTracker(trackerRows);
  writeFile(path.join(outputDir, "tracker.xlsx"), trackerBuffer);

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const done = trackerRows.filter((r) => r.status === "done").length;
  const failed = trackerRows.filter((r) => r.status === "error").length;

  emit.info(`Complete in ${elapsed}s — ${done} applications generated, ${failed} errors`);
  progress?.emitComplete(outputDir);
  return outputDir;
}
