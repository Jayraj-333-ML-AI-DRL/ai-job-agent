import { callClaude } from "../integrations/anthropic";
import { CandidateProfile } from "./phase1_define";
import { logger } from "../utils/logger";

const SYSTEM = `You are a behavioural interview coach specialising in STAR-format stories.
Write stories that sound natural and human, not corporate or scripted.`;

const QUESTIONS = [
  "Tell me about a time you failed and what you learned",
  "Describe a conflict with a teammate and how you resolved it",
  "What's your biggest technical achievement?",
  "Tell me about a time you worked under significant pressure",
  "Describe a time you led a project or initiative",
  "Tell me about a time you disagreed with your manager",
];

export async function generateBehavioralStories(profile: CandidateProfile): Promise<string> {
  logger.phase(8, "Behavioural STAR Story Generator");

  const experienceSummary = profile.experience
    .map((e) => `${e.title} @ ${e.company} (${e.period}): ${e.bullets.join("; ")}`)
    .join("\n");

  const prompt = `
Generate 6 STAR-format interview stories for this candidate.

CANDIDATE WORK HISTORY:
${experienceSummary}

For each of the following questions, write a concise STAR story (Situation, Task, Action, Result).
Each story should be 150–200 words. Draw only from the candidate's actual experience above.
Use specific numbers/metrics where they appear in the work history.

QUESTIONS:
${QUESTIONS.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Format as markdown with ## headings for each question.`;

  return callClaude(SYSTEM, prompt, 4096);
}
