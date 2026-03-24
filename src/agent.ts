import "dotenv/config";
import path from "path";
import { AgentInputs } from "./inputs/validateInputs";
import { parseCV } from "./inputs/parseCV";
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

export async function runAgent(inputs: AgentInputs): Promise<void> {
  const startTime = Date.now();
  const outputDir = buildOutputDir(inputs.role, process.env.OUTPUT_DIR ?? "./output");
  ensureDir(path.join(outputDir, "prep"));
  ensureDir(path.join(outputDir, "applications"));

  logger.info(`Output directory: ${outputDir}`);

  // ── Parse CV ─────────────────────────────────────────────────
  logger.info(`Parsing CV from: ${inputs.cvPath}`);
  const cvText = await parseCV(inputs.cvPath);

  // ── Phase 1: Define Profile ──────────────────────────────────
  const profile: CandidateProfile = await defineProfile(cvText, inputs);
  writeFile(path.join(outputDir, "prep", "candidate_profile.json"), JSON.stringify(profile, null, 2));

  // ── Phase 3: Online Presence ─────────────────────────────────
  const presenceChecklist = await generatePresenceChecklist(profile, inputs);
  writeFile(path.join(outputDir, "prep", "online_presence.md"), presenceChecklist);

  // ── Phase 4: Search & Score Jobs ─────────────────────────────
  const scoredJobs: ScoredJob[] = await searchAndScoreJobs(inputs, profile);

  if (scoredJobs.length === 0) {
    logger.warn("No jobs found. Check your API keys and search filters.");
    return;
  }

  // ── Phase 7: Tech Prep (shared across all jobs) ──────────────
  const techPrep = await generateTechPrepChecklist(scoredJobs, inputs);
  writeFile(path.join(outputDir, "prep", "tech_prep_checklist.md"), techPrep);

  // ── Phase 8: Behavioural Stories ─────────────────────────────
  const behavioralStories = await generateBehavioralStories(profile);
  writeFile(path.join(outputDir, "prep", "behavioral_stories.md"), behavioralStories);

  // ── Phase 10: Negotiation Brief ──────────────────────────────
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

    logger.info(`\n[${i + 1}/${scoredJobs.length}] Processing: ${job.title} @ ${job.company} (score: ${job.score})`);

    let status: TrackerRow["status"] = "done";

    try {
      // Phase 2: Optimise CV for this JD
      const cvDiff = await optimiseCV(cvText, job.description, profile);

      // Phase 5: Cover Letter
      const research = await researchCompany(job);
      const clText   = await generateCoverLetter(job, profile, inputs, research);

      // Phase 6: Networking actions (appended to research brief)
      const networkActions = await generateNetworkingActions(job, inputs);

      // Phase 9: Research brief
      const fullResearchBrief = `${research}\n\n---\n\n## Networking Actions\n\n${networkActions}`;
      writeFile(path.join(appDir, "research_brief.md"), fullResearchBrief);

      // Generate .docx files
      const cvBuffer = await generateTailoredCV(profile, cvDiff);
      const clBuffer = await generateCoverLetterDoc(clText, profile.name, job.title, job.company, today, contactLine);

      const cvFile = path.join(appDir, "cv_tailored.docx");
      const clFile = path.join(appDir, "cover_letter.docx");
      writeFile(cvFile, cvBuffer);
      writeFile(clFile, clBuffer);

      // Phase 11: Follow-up emails
      await generateFollowUpEmails(job, profile);

      trackerRows.push({
        index:    i + 1,
        company:  job.company,
        role:     job.title,
        score:    job.score,
        location: job.location,
        salary:   job.salaryMin ? `${job.salaryMin}–${job.salaryMax}` : inputs.targetSalary,
        url:      job.url,
        status:   "done",
        cvFile,
        clFile,
      });

    } catch (err) {
      logger.error(`Failed to generate application for ${job.company}`, err);
      status = "error";
      trackerRows.push({
        index:    i + 1,
        company:  job.company,
        role:     job.title,
        score:    job.score,
        location: job.location,
        salary:   inputs.targetSalary,
        url:      job.url,
        status,
        notes:    String(err),
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

  logger.info(`\n✓ Complete in ${elapsed}s — ${done} applications generated, ${failed} errors`);
  logger.info(`Output: ${outputDir}`);
}
