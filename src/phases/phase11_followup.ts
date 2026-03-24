import { callClaude } from "../integrations/anthropic";
import { ScoredJob } from "./phase4_search";
import { CandidateProfile } from "./phase1_define";
import { createGmailDraft } from "../integrations/gmailMCP";
import { createCalendarEvent } from "../integrations/calendarMCP";
import { logger } from "../utils/logger";

const SYSTEM = `You are an expert at professional follow-up communication.
Be warm but professional. Be concise. Reference something specific from the interaction.`;

export interface FollowUpSet {
  thankYou: string;
  statusCheck: string;
  deadlineExtension: string;
}

export async function generateFollowUpEmails(
  job: ScoredJob,
  profile: CandidateProfile,
  interviewDate?: Date
): Promise<FollowUpSet> {
  logger.phase(11, `Follow-up Emails — ${job.company}`);

  const prompt = `
Generate 3 follow-up email templates for this job application.

Candidate: ${profile.name}
Role: ${job.title} at ${job.company}
${interviewDate ? `Interview Date: ${interviewDate.toDateString()}` : ""}

Generate:

## 1. 24-Hour Post-Interview Thank You
Subject line + email body (max 100 words). Reference the interview specifically.
Personalise for both a technical interviewer and an HR interviewer.

## 2. One-Week Status Check
Subject line + email body (max 80 words). Friendly, not desperate.

## 3. Offer Deadline Extension Request
Subject line + email body (max 100 words). Professional and confident.`;

  const text = await callClaude(SYSTEM, prompt, 2048);

  // Parse out the 3 sections
  const sections = text.split(/##\s+\d+\./);
  const thankYou        = sections[1]?.trim() ?? text;
  const statusCheck     = sections[2]?.trim() ?? "";
  const deadlineExt     = sections[3]?.trim() ?? "";

  // Try to create Gmail drafts (gracefully skips if MCP unavailable)
  await createGmailDraft({
    subject: `Thank you — ${job.title} interview at ${job.company}`,
    body: thankYou,
  });

  // Create calendar reminder if interview date provided
  if (interviewDate) {
    const followUpDate = new Date(interviewDate.getTime() + 24 * 60 * 60 * 1000);
    await createCalendarEvent({
      title: `Send follow-up: ${job.title} @ ${job.company}`,
      dateTime: followUpDate.toISOString(),
      description: thankYou,
    });
  }

  return { thankYou, statusCheck, deadlineExtension: deadlineExt };
}
