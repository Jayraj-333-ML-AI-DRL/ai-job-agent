import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../utils/logger";

export const MODEL = "claude-sonnet-4-20250514";

let _client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set in environment");
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096
): Promise<string> {
  const client = getClient();

  const response = await withRetry(() =>
    client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    })
  );

  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type from Claude");
  return block.text;
}

export async function callClaudeJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096
): Promise<T> {
  const raw = await callClaude(systemPrompt, userPrompt, maxTokens);

  // Strip markdown code fences if present
  const cleaned = raw
    .replace(/^```(?:json)?\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    logger.error("Failed to parse JSON from Claude response", { raw });
    throw new Error(`Claude did not return valid JSON: ${cleaned.slice(0, 200)}`);
  }
}

// Tool-use agent loop
export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "search_jobs",
    description: "Search job boards for openings matching the role and filters",
    input_schema: {
      type: "object" as const,
      properties: {
        query:     { type: "string" },
        location:  { type: "string" },
        salaryMin: { type: "number" },
        count:     { type: "number" },
      },
      required: ["query", "count"],
    },
  },
  {
    name: "score_job_fit",
    description: "Score a job's fit against the candidate profile (0–100)",
    input_schema: {
      type: "object" as const,
      properties: {
        jobId:          { type: "string" },
        jobDescription: { type: "string" },
      },
      required: ["jobId", "jobDescription"],
    },
  },
  {
    name: "generate_tailored_cv",
    description: "Generate a tailored CV diff for a specific job description",
    input_schema: {
      type: "object" as const,
      properties: {
        jobId:          { type: "string" },
        jobDescription: { type: "string" },
      },
      required: ["jobId", "jobDescription"],
    },
  },
  {
    name: "generate_cover_letter",
    description: "Write a tailored 3-paragraph cover letter for a specific job",
    input_schema: {
      type: "object" as const,
      properties: {
        jobId:           { type: "string" },
        companyName:     { type: "string" },
        roleTitle:       { type: "string" },
        keyRequirements: { type: "array", items: { type: "string" } },
      },
      required: ["jobId", "companyName", "roleTitle"],
    },
  },
  {
    name: "research_company",
    description: "Generate a 1-page research brief for a company",
    input_schema: {
      type: "object" as const,
      properties: {
        companyName:    { type: "string" },
        jobDescription: { type: "string" },
      },
      required: ["companyName"],
    },
  },
  {
    name: "create_prep_materials",
    description: "Generate tech prep checklist, STAR stories, and negotiation brief",
    input_schema: {
      type: "object" as const,
      properties: {
        topJobDescriptions: { type: "array", items: { type: "string" } },
      },
      required: ["topJobDescriptions"],
    },
  },
  {
    name: "create_calendar_reminder",
    description: "Create a Google Calendar reminder for a follow-up",
    input_schema: {
      type: "object" as const,
      properties: {
        title:       { type: "string" },
        description: { type: "string" },
        dateTime:    { type: "string" },
      },
      required: ["title", "dateTime"],
    },
  },
];

// Retry with exponential backoff
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isLast = attempt === maxRetries;
      const isRateLimit =
        err instanceof Error &&
        (err.message.includes("429") || err.message.includes("rate_limit"));

      if (!isLast) {
        const wait = isRateLimit ? delayMs * Math.pow(2, attempt) : delayMs;
        logger.warn(`Attempt ${attempt} failed, retrying in ${wait}ms...`);
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
