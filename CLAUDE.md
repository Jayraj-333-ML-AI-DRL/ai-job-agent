# CLAUDE.md — AI Job Application Agent

> **Full-stack AI agent** that takes a job role, current CV, number of applications, target salary, and filters — then autonomously researches openings, tailors a CV and cover letter for each role, tracks progress through 11 phases, and delivers ready-to-send application packages.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & APIs](#2-tech-stack--apis)
3. [Project Structure](#3-project-structure)
4. [Inputs Specification](#4-inputs-specification)
5. [Architecture & Data Flow](#5-architecture--data-flow)
6. [The 11-Phase Pipeline](#6-the-11-phase-pipeline)
7. [CV & Cover Letter Generation](#7-cv--cover-letter-generation)
8. [API Integrations](#8-api-integrations)
9. [MCP Server Connections](#9-mcp-server-connections)
10. [Environment Variables](#10-environment-variables)
11. [Implementation Guide](#11-implementation-guide)
12. [File Outputs](#12-file-outputs)
13. [Error Handling & Retries](#13-error-handling--retries)
14. [Running the Agent](#14-running-the-agent)

---

## 1. Project Overview

This software is a **fully autonomous job application agent** built on the Anthropic API. The user provides:

- A **job role** (e.g. "Software Engineer", "Product Manager")
- Their **current CV** (PDF or plain text)
- **Number of applications** to generate (e.g. 20)
- **Target salary** (e.g. €75,000 or $110,000)
- **Optional filters** (location, remote/hybrid, company size, industry, seniority level, tech stack)

The agent then:
1. Searches live job boards for matching openings
2. Scores and ranks each opening against the user's profile
3. Tailors the CV and writes a custom cover letter for every single role
4. Tracks everything through 11 structured phases
5. Outputs a ready-to-use application package per role (CV `.docx`, cover letter `.docx`, tracking spreadsheet `.xlsx`)

---

## 2. Tech Stack & APIs

| Layer | Technology |
|---|---|
| Language | Node.js 18+ (TypeScript) |
| AI Core | Anthropic API — `claude-sonnet-4-20250514` |
| Job Search | LinkedIn Jobs API, Adzuna API, The Muse API, Greenhouse API |
| CV Parsing | `pdf-parse` npm package |
| Document Generation | `docx` npm package (Word .docx output) |
| Spreadsheet Tracking | `exceljs` npm package (.xlsx output) |
| Orchestration | Anthropic Tool Use (function calling) |
| MCP Servers | Gmail MCP, Google Calendar MCP |
| Storage | Local filesystem (structured output folders) |
| CLI | `commander` npm package |

---

## 3. Project Structure

```
job-agent/
├── CLAUDE.md                  ← This file
├── package.json
├── tsconfig.json
├── .env                       ← All secrets (never commit)
├── .env.example
│
├── src/
│   ├── index.ts               ← CLI entry point
│   ├── agent.ts               ← Main orchestration loop
│   │
│   ├── inputs/
│   │   ├── parseCV.ts         ← PDF/text CV parser
│   │   └── validateInputs.ts  ← Input validation & defaults
│   │
│   ├── phases/
│   │   ├── phase1_define.ts       ← Role definition & target mapping
│   │   ├── phase2_resume.ts       ← CV analysis & gap scoring
│   │   ├── phase3_presence.ts     ← Online profile checklist
│   │   ├── phase4_search.ts       ← Job board search & scraping
│   │   ├── phase5_coverLetter.ts  ← Cover letter generation
│   │   ├── phase6_network.ts      ← Networking action items
│   │   ├── phase7_techPrep.ts     ← Technical prep checklist
│   │   ├── phase8_behavioral.ts   ← STAR story generator
│   │   ├── phase9_research.ts     ← Company research per role
│   │   ├── phase10_negotiate.ts   ← Salary negotiation brief
│   │   └── phase11_followup.ts    ← Follow-up email drafts
│   │
│   ├── generators/
│   │   ├── cvGenerator.ts         ← Tailored CV (.docx) builder
│   │   ├── coverLetterGenerator.ts← Cover letter (.docx) builder
│   │   └── trackerGenerator.ts    ← Excel tracker (.xlsx) builder
│   │
│   ├── integrations/
│   │   ├── anthropic.ts       ← Anthropic API client & tool use
│   │   ├── linkedinJobs.ts    ← LinkedIn Jobs API wrapper
│   │   ├── adzuna.ts          ← Adzuna job search API wrapper
│   │   ├── theMuse.ts         ← The Muse API wrapper
│   │   ├── greenhouse.ts      ← Greenhouse job board API
│   │   ├── gmailMCP.ts        ← Gmail MCP connector
│   │   └── calendarMCP.ts     ← Google Calendar MCP connector
│   │
│   └── utils/
│       ├── logger.ts
│       ├── fileSystem.ts
│       └── salaryParser.ts
│
└── output/
    └── {timestamp}_{jobRole}/
        ├── tracker.xlsx
        ├── applications/
        │   ├── 01_{CompanyName}/
        │   │   ├── cv_tailored.docx
        │   │   ├── cover_letter.docx
        │   │   └── research_brief.md
        │   └── 02_{CompanyName}/
        │       └── ...
        └── prep/
            ├── tech_prep_checklist.md
            ├── behavioral_stories.md
            └── negotiation_brief.md
```

---

## 4. Inputs Specification

### 4.1 CLI Interface

```bash
npx job-agent apply \
  --role "Software Engineer" \
  --cv ./my_cv.pdf \
  --count 20 \
  --salary "€75,000" \
  --location "Berlin, Germany" \
  --remote hybrid \
  --seniority "early-career" \
  --stack "TypeScript,React,Node.js" \
  --industry "FinTech,SaaS" \
  --company-size "50-500"
```

### 4.2 Input Schema (`inputs/validateInputs.ts`)

```typescript
export interface AgentInputs {
  // Required
  role: string;                    // e.g. "Software Engineer"
  cvPath: string;                  // path to PDF or .txt CV file
  count: number;                   // number of applications (1–50)
  targetSalary: string;            // e.g. "€75,000" or "$110k-$130k"

  // Optional filters
  location?: string;               // e.g. "Berlin, Germany"
  remote?: "remote" | "hybrid" | "onsite";
  seniority?: "junior" | "early-career" | "mid" | "senior" | "lead";
  stack?: string[];                // e.g. ["TypeScript", "React"]
  industry?: string[];             // e.g. ["FinTech", "SaaS"]
  companySize?: string;            // e.g. "50-500" employees
  excludeCompanies?: string[];     // blacklist
  language?: string;               // application language, default "English"
}
```

### 4.3 CV Parsing (`inputs/parseCV.ts`)

```typescript
import pdf from "pdf-parse";
import fs from "fs";

export async function parseCV(filePath: string): Promise<string> {
  if (filePath.endsWith(".pdf")) {
    const buffer = fs.readFileSync(filePath);
    const data = await pdf(buffer);
    return data.text;
  }
  // Plain text fallback
  return fs.readFileSync(filePath, "utf-8");
}
```

---

## 5. Architecture & Data Flow

```
User Input (CLI)
       │
       ▼
┌─────────────────────────────────────────┐
│  1. Parse & validate inputs             │
│  2. Parse CV → extract structured data  │
│     (name, skills, experience, edu)     │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Anthropic Tool Use Agent Loop          │
│  Model: claude-sonnet-4-20250514        │
│                                         │
│  Tools available:                       │
│  • search_jobs(query, filters)          │
│  • analyze_job_fit(job, cv)             │
│  • generate_tailored_cv(job, cv)        │
│  • generate_cover_letter(job, cv)       │
│  • research_company(name)               │
│  • create_prep_materials(jobs)          │
│  • draft_followup_email(job)            │
│  • send_calendar_reminder(date, job)    │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  For each job (up to `count`):          │
│  • cv_tailored.docx                     │
│  • cover_letter.docx                    │
│  • research_brief.md                    │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  tracker.xlsx  (all 11 phases tracked)  │
│  prep/ folder  (tech, behavioral, nego) │
└─────────────────────────────────────────┘
```

---

## 6. The 11-Phase Pipeline

Each phase maps directly to an agent action. The tracker `.xlsx` has one row per job, one column per phase.

### Phase 1 — Define Target Roles

**File:** `phases/phase1_define.ts`

**What it does:**
- Sends the user's raw CV text + role + seniority to Claude
- Asks Claude to extract: current title, years of experience, top 10 skills, seniority tier, salary band awareness
- Generates a "candidate profile" object used in all subsequent phases

**Claude prompt pattern:**
```typescript
const PHASE1_PROMPT = `
You are a career coach AI. Given this CV and target role, extract a structured candidate profile.

CV:
{{CV_TEXT}}

Target Role: {{ROLE}}
Seniority: {{SENIORITY}}
Target Salary: {{SALARY}}

Return JSON only:
{
  "name": "",
  "currentTitle": "",
  "yearsExperience": 0,
  "topSkills": [],
  "salaryBand": { "min": 0, "max": 0, "currency": "" },
  "strongPoints": [],
  "gaps": [],
  "suggestedTitles": []
}
`;
```

---

### Phase 2 — CV Optimisation

**File:** `phases/phase2_resume.ts`

**What it does:**
- For each job posting found in Phase 4, calls Claude with (CV + job description)
- Claude returns a JSON diff: which bullet points to reorder, rewrite, or add
- The generator at `generators/cvGenerator.ts` applies the diff and writes a `.docx`

**Key logic:**
```typescript
export async function optimiseCV(
  baseCV: string,
  jobDescription: string,
  candidateProfile: CandidateProfile
): Promise<CVDiff> {
  // Claude call with tool use
  // Returns: { reorderedSkills, rewrittenBullets, addedKeywords, removedWeakPoints }
}
```

**ATS rules Claude must follow** (injected in system prompt):
- Mirror keywords from the job description verbatim (for ATS scanners)
- Lead every bullet with a strong action verb (Built, Shipped, Reduced, Led)
- Every bullet must quantify impact where possible
- Keep to one page for <5 years experience

---

### Phase 3 — Online Presence Checklist

**File:** `phases/phase3_presence.ts`

**What it does:**
- Generates a static markdown checklist tailored to the role (e.g. for SWE: GitHub pinned repos; for PM: case study portfolio)
- Not automated — outputs actionable tasks for the human

**Output:** `prep/online_presence_checklist.md`

---

### Phase 4 — Job Search & Scoring

**File:** `phases/phase4_search.ts`

**What it does:**
- Calls Adzuna API, The Muse API, and optionally LinkedIn Jobs API
- Deduplicates results
- For each result, calls Claude to score fit (0–100) based on CV vs JD alignment
- Sorts by score, takes top `count` results

**Adzuna API call:**
```typescript
// Docs: https://developer.adzuna.com/
const response = await fetch(
  `https://api.adzuna.com/v1/api/jobs/${COUNTRY}/search/1` +
  `?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_API_KEY}` +
  `&results_per_page=50&what=${encodeURIComponent(role)}` +
  `&where=${encodeURIComponent(location)}&salary_min=${salaryMin}`
);
```

**The Muse API call:**
```typescript
// Docs: https://www.themuse.com/developers/api/v2
const response = await fetch(
  `https://www.themuse.com/api/public/jobs?` +
  `category=${encodeURIComponent(role)}&level=${seniority}&page=1`,
  { headers: { "x-api-key": THE_MUSE_API_KEY } }
);
```

**Claude fit scoring:**
```typescript
const SCORING_PROMPT = `
Score this job fit from 0–100. Consider: skill match, seniority alignment,
salary match, location match.

Candidate Profile: {{PROFILE_JSON}}
Job Description: {{JD_TEXT}}
Target Salary: {{SALARY}}

Return JSON: { "score": 0-100, "matchedSkills": [], "gaps": [], "salaryFit": "under|match|over" }
`;
```

---

### Phase 5 — Cover Letter Generation

**File:** `phases/phase5_coverLetter.ts`  
**Generator:** `generators/coverLetterGenerator.ts`

**What it does:**
- For each ranked job, calls Claude with (CV + JD + company research + candidate name + target salary)
- Generates a 3-paragraph cover letter:
  - Para 1: Why this company (specific product/team reference)
  - Para 2: Most relevant achievement from CV mapped to JD requirement
  - Para 3: What you'd bring + salary alignment signal (if appropriate)
- Outputs as `.docx` with the user's name in the header

**Claude prompt:**
```typescript
const COVER_LETTER_PROMPT = `
Write a cover letter for this application. Be specific, not generic.
Do NOT use "I am writing to express my interest in..."
Do NOT mention the salary unless instructed below.

Candidate: {{NAME}}
Target Role: {{ROLE}} at {{COMPANY}}
Key JD Requirements: {{JD_REQUIREMENTS}}
Candidate's Most Relevant Achievement: {{TOP_ACHIEVEMENT}}
Company-specific detail to reference: {{COMPANY_DETAIL}}
Include salary signal: {{INCLUDE_SALARY}} — if yes, mention "{{SALARY}}"

Output: Three paragraphs of plain text. No headers. No bullet points.
`;
```

---

### Phase 6 — Networking Action Items

**File:** `phases/phase6_network.ts`

**What it does:**
- For each target company, generates:
  - A LinkedIn connection request message (300 chars)
  - A referral ask message template
  - Suggested communities/meetups for the role + location

**Output:** Appended to `research_brief.md` for each company

---

### Phase 7 — Technical Interview Prep

**File:** `phases/phase7_techPrep.ts`

**What it does:**
- Analyses the top 10 job descriptions for recurring technical requirements
- Generates a focused study plan: topics ranked by frequency across all JDs
- Links to free resources (LeetCode tag, MDN, official docs) per topic

**Output:** `prep/tech_prep_checklist.md`

---

### Phase 8 — Behavioural Story Generator

**File:** `phases/phase8_behavioral.ts`

**What it does:**
- Reads the user's CV work history
- Generates 6 STAR-format stories mapped to common behavioural questions:
  - Tell me about a time you failed
  - Describe a conflict with a teammate
  - What's your biggest technical achievement
  - Tell me about a time you worked under pressure
  - Describe leading a project
  - Tell me about a time you disagreed with your manager

**Output:** `prep/behavioral_stories.md`

---

### Phase 9 — Company Research Brief

**File:** `phases/phase9_research.ts`

**What it does:**
- For each company, calls Claude with a web search tool (if enabled) or uses Anthropic's knowledge
- Generates a 1-page research brief:
  - Product overview
  - Tech stack (from job descriptions + engineering blog mentions)
  - Culture signals (from JD language)
  - 3 smart questions to ask in the interview
  - Recent news or blog posts to reference

**Output:** `applications/{n}_{Company}/research_brief.md`

---

### Phase 10 — Salary Negotiation Brief

**File:** `phases/phase10_negotiate.ts`

**What it does:**
- Takes target salary + role + location + years of experience
- Calls Claude to generate a negotiation brief:
  - Market rate range (based on training data + Adzuna salary data)
  - Recommended opening counter
  - Script for the negotiation call
  - Which benefits to negotiate if base salary is fixed (equity, remote days, training budget)

**Claude prompt:**
```typescript
const NEGOTIATION_PROMPT = `
Generate a salary negotiation brief.

Role: {{ROLE}}
Location: {{LOCATION}}
Experience: {{YEARS}} years
User's target: {{SALARY}}
Offer received (if any): {{OFFER}}
Market data from job search: {{SALARY_RANGE_FROM_JD_SCAN}}

Include: market range, recommended counter, negotiation call script (3 exchanges),
and 3 alternative benefits to negotiate. Be specific and direct.
`;
```

**Output:** `prep/negotiation_brief.md`

---

### Phase 11 — Follow-up Email Drafts

**File:** `phases/phase11_followup.ts`

**What it does:**
- For each application, generates 3 follow-up email templates:
  1. **24h post-interview thank you** (personalised per interviewer role)
  2. **1-week status check** (if no response)
  3. **Offer deadline extension request** (if needed)
- Optionally pushes calendar reminders via Google Calendar MCP

**Gmail MCP integration** (drafts, does NOT send automatically):
```typescript
// Creates a Gmail draft for each follow-up
await gmailMCP.createDraft({
  to: interviewerEmail,           // if known
  subject: `Thank you — ${role} interview at ${company}`,
  body: followUpText
});
```

**Calendar MCP integration:**
```typescript
// Adds "Send follow-up" reminder 24h after interview
await calendarMCP.createEvent({
  title: `Follow-up: ${role} @ ${company}`,
  dateTime: interviewDate + 24h,
  description: followUpEmailDraft,
  reminders: [{ method: "email", minutes: 30 }]
});
```

---

## 7. CV & Cover Letter Generation

### 7.1 CV Generator (`generators/cvGenerator.ts`)

Uses the `docx` npm package. Structure:

```typescript
import { Document, Paragraph, TextRun, HeadingLevel } from "docx";

export async function generateTailoredCV(
  originalCV: ParsedCV,
  diff: CVDiff,
  jobTitle: string,
  company: string
): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      children: [
        // Header: name, email, phone, LinkedIn, GitHub
        buildHeader(originalCV.personalInfo),
        // Summary: rewritten by Claude for this role
        buildSummary(diff.rewrittenSummary),
        // Experience: reordered + rewritten bullets
        ...buildExperience(originalCV.experience, diff.rewrittenBullets),
        // Skills: keywords mirrored from JD placed first
        buildSkills(diff.reorderedSkills),
        // Education
        buildEducation(originalCV.education),
        // Projects: top 2 most relevant to JD
        buildProjects(diff.selectedProjects)
      ]
    }],
    styles: cvStyles   // clean single-column ATS-safe style
  });

  return await Packer.toBuffer(doc);
}
```

### 7.2 Cover Letter Generator (`generators/coverLetterGenerator.ts`)

```typescript
export async function generateCoverLetter(
  text: string,
  candidateName: string,
  role: string,
  company: string,
  date: string
): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      children: [
        buildLetterHeader(candidateName, date),
        buildRecipientLine(role, company),
        buildBody(text),      // 3 paragraphs from Claude
        buildSignature(candidateName)
      ]
    }]
  });
  return await Packer.toBuffer(doc);
}
```

### 7.3 Tracker Generator (`generators/trackerGenerator.ts`)

Uses `exceljs`. One sheet = master tracker. Columns:

| # | Company | Role | Score | Location | Salary | Phase | Applied Date | Interview Date | Notes | CV File | CL File |
|---|---|---|---|---|---|---|---|---|---|---|---|

One sheet per phase for detailed notes. Color-coded status (green = done, amber = in progress, red = blocked).

---

## 8. API Integrations

### 8.1 Anthropic API

**Model:** `claude-sonnet-4-20250514`  
**Docs:** https://docs.claude.com/en/api/overview  
**SDK:** `npm install @anthropic-ai/sdk`

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Standard call
const message = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 4096,
  system: SYSTEM_PROMPT,
  messages: [{ role: "user", content: userPrompt }]
});

// Tool use call (for agent loop)
const toolResponse = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 4096,
  tools: AGENT_TOOLS,
  messages: conversationHistory
});
```

**Tool definitions** (subset):

```typescript
export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "search_jobs",
    description: "Search job boards for openings matching the role and filters",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        location: { type: "string" },
        salaryMin: { type: "number" },
        count: { type: "number" }
      },
      required: ["query", "count"]
    }
  },
  {
    name: "generate_tailored_cv",
    description: "Generate a tailored CV diff for a specific job description",
    input_schema: {
      type: "object",
      properties: {
        jobId: { type: "string" },
        jobDescription: { type: "string" }
      },
      required: ["jobId", "jobDescription"]
    }
  },
  {
    name: "generate_cover_letter",
    description: "Write a tailored cover letter for a specific job",
    input_schema: {
      type: "object",
      properties: {
        jobId: { type: "string" },
        companyName: { type: "string" },
        roleTitle: { type: "string" },
        keyRequirements: { type: "array", items: { type: "string" } }
      },
      required: ["jobId", "companyName", "roleTitle"]
    }
  }
];
```

---

### 8.2 Adzuna Jobs API

**Docs:** https://developer.adzuna.com/  
**Sign up:** https://developer.adzuna.com/signup  
**Free tier:** 250 requests/month  
**Env vars:** `ADZUNA_APP_ID`, `ADZUNA_API_KEY`

Countries supported: `gb`, `us`, `de`, `fr`, `au`, `ca`, `nl`, `pl`, `sg`, `za`

```typescript
const BASE = "https://api.adzuna.com/v1/api/jobs";

export async function searchAdzuna(params: SearchParams): Promise<Job[]> {
  const url = new URL(`${BASE}/${params.country}/search/1`);
  url.searchParams.set("app_id", process.env.ADZUNA_APP_ID!);
  url.searchParams.set("app_key", process.env.ADZUNA_API_KEY!);
  url.searchParams.set("results_per_page", "50");
  url.searchParams.set("what", params.role);
  url.searchParams.set("where", params.location ?? "");
  url.searchParams.set("salary_min", String(params.salaryMin ?? 0));
  url.searchParams.set("content-type", "application/json");

  const res = await fetch(url.toString());
  const data = await res.json();
  return data.results.map(normaliseAdzunaJob);
}
```

---

### 8.3 The Muse API

**Docs:** https://www.themuse.com/developers/api/v2  
**Sign up:** https://www.themuse.com/developers  
**Free tier:** Available  
**Env var:** `THE_MUSE_API_KEY`

```typescript
const MUSE_BASE = "https://www.themuse.com/api/public/jobs";

export async function searchTheMuse(params: SearchParams): Promise<Job[]> {
  const url = new URL(MUSE_BASE);
  url.searchParams.set("category", params.role);
  url.searchParams.set("level", mapSeniority(params.seniority));
  url.searchParams.set("page", "1");

  const res = await fetch(url.toString(), {
    headers: { "x-api-key": process.env.THE_MUSE_API_KEY! }
  });
  const data = await res.json();
  return data.results.map(normaliseMuseJob);
}
```

---

### 8.4 Greenhouse Job Board API

**Docs:** https://developers.greenhouse.io/job-board.html  
**Auth:** Public endpoints, no key required for job listings  
**Use case:** Pull jobs from specific companies on Greenhouse

```typescript
// No API key needed for public board
export async function getGreenhouseJobs(companySlug: string): Promise<Job[]> {
  const res = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${companySlug}/jobs?content=true`
  );
  const data = await res.json();
  return data.jobs.map(normaliseGreenhouseJob);
}
```

---

### 8.5 LinkedIn Jobs API

**Docs:** https://developer.linkedin.com/product-catalog  
**Auth:** OAuth 2.0, requires LinkedIn App approval  
**Note:** Full job search requires LinkedIn Marketing Solutions or Job Posting API access. For personal use, consider the unofficial `linkedin-jobs-api` npm package as a fallback.

**Official path:**
```typescript
// Requires approved LinkedIn App with r_liteprofile + w_member_social scopes
const res = await fetch(
  "https://api.linkedin.com/v2/jobSearch?keywords=" +
  encodeURIComponent(role) + "&location=" + encodeURIComponent(location),
  { headers: { Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}` } }
);
```

**Unofficial fallback** (for development):
```bash
npm install linkedin-jobs-api
```

```typescript
import linkedIn from "linkedin-jobs-api";

const jobs = await linkedIn.query({
  keyword: role,
  location: location,
  dateSincePosted: "past week",
  jobType: "full time",
  remoteFilter: remote,
  salary: targetSalaryMin,
  limit: "50"
});
```

---

## 9. MCP Server Connections

MCP (Model Context Protocol) servers allow the agent to act on the user's behalf in Gmail and Google Calendar.

### 9.1 Gmail MCP

**MCP URL:** `https://gmail.mcp.claude.com/mcp`  
**Purpose:** Create email drafts for follow-ups (does NOT auto-send — user reviews first)

```typescript
// In Anthropic API call
const response = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Create a draft follow-up email for my interview at Stripe" }],
  mcp_servers: [
    {
      type: "url",
      url: "https://gmail.mcp.claude.com/mcp",
      name: "gmail-mcp"
    }
  ]
});
```

**Actions used:**
- `gmail_create_draft` — Creates a draft (user sends manually)
- `gmail_search_messages` — Check if a reply was received from the company

### 9.2 Google Calendar MCP

**MCP URL:** `https://gcal.mcp.claude.com/mcp`  
**Purpose:** Add interview reminders and follow-up task events

```typescript
mcp_servers: [
  {
    type: "url",
    url: "https://gcal.mcp.claude.com/mcp",
    name: "google-calendar-mcp"
  }
]
```

**Actions used:**
- Create reminder events: "Send thank-you to Stripe interviewer"
- Create deadline events: "Application deadline — Shopify SWE"
- Create interview prep blocks: "Prep for technical screen — N26"

---

## 10. Environment Variables

Create a `.env` file at the project root. Never commit it.

```bash
# ─── Anthropic ──────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...

# ─── Job Board APIs ─────────────────────────────────
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_API_KEY=your_adzuna_api_key
ADZUNA_COUNTRY=de                    # de, gb, us, fr, nl, etc.

THE_MUSE_API_KEY=your_muse_api_key

LINKEDIN_ACCESS_TOKEN=               # OAuth token (optional)
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

# ─── MCP (auto-handled by Claude.ai OAuth) ──────────
# No extra env vars needed — MCP auth is handled by claude.ai session
# MCP endpoints:
#   Gmail:    https://gmail.mcp.claude.com/mcp
#   Calendar: https://gcal.mcp.claude.com/mcp

# ─── Output ─────────────────────────────────────────
OUTPUT_DIR=./output
```

---

## 11. Implementation Guide

### Step 1 — Install dependencies

```bash
npm init -y
npm install @anthropic-ai/sdk pdf-parse docx exceljs commander dotenv
npm install -D typescript @types/node ts-node
```

### Step 2 — Agent main loop (`agent.ts`)

The agent runs a tool-use loop until all `count` applications are complete:

```typescript
import Anthropic from "@anthropic-ai/sdk";

export async function runAgent(inputs: AgentInputs, cvText: string) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = buildSystemPrompt(inputs, cvText);
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: buildInitialPrompt(inputs) }
  ];

  let continueLoop = true;

  while (continueLoop) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      tools: AGENT_TOOLS,
      messages
    });

    // Push assistant response to history
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      continueLoop = false;
      break;
    }

    if (response.stop_reason === "tool_use") {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === "tool_use") {
          const result = await executeTool(block.name, block.input, inputs);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result)
          });
        }
      }

      // Push tool results back into conversation
      messages.push({ role: "user", content: toolResults });
    }
  }
}

async function executeTool(name: string, input: unknown, inputs: AgentInputs) {
  switch (name) {
    case "search_jobs":    return await searchAllBoards(input as SearchParams);
    case "score_job_fit":  return await scoreFit(input as ScoreParams);
    case "generate_tailored_cv":    return await generateCV(input as CVParams);
    case "generate_cover_letter":   return await generateCL(input as CLParams);
    case "research_company":        return await researchCompany(input as ResearchParams);
    case "create_prep_materials":   return await createPrepMaterials(input as PrepParams);
    case "create_calendar_reminder":return await createCalendarReminder(input as CalParams);
    default: throw new Error(`Unknown tool: ${name}`);
  }
}
```

### Step 3 — System prompt

```typescript
function buildSystemPrompt(inputs: AgentInputs, cvText: string): string {
  return `
You are an expert job application agent. Your job is to autonomously find,
score, and prepare job applications for the user.

## Candidate Profile
- Target Role: ${inputs.role}
- Experience Level: ${inputs.seniority ?? "early-career"}
- Target Salary: ${inputs.targetSalary}
- Location: ${inputs.location ?? "flexible"}
- Remote preference: ${inputs.remote ?? "hybrid"}
- Tech Stack: ${inputs.stack?.join(", ") ?? "not specified"}
- Industry preference: ${inputs.industry?.join(", ") ?? "any"}

## Current CV (parsed text)
${cvText}

## Your Mission
1. Search job boards for ${inputs.count} high-fit openings
2. Score each opening for fit (0-100)
3. For each of the top ${inputs.count} roles, generate a tailored CV and cover letter
4. Generate shared prep materials (tech prep, STAR stories, negotiation brief)
5. Track everything in the output directory
6. Create calendar reminders for follow-ups via MCP

## Rules
- Every CV must mirror keywords from the job description for ATS compliance
- Every cover letter must reference something specific about the company
- Never fabricate experience or skills not in the original CV
- If salary is not posted, estimate from Adzuna salary data
- All outputs go to the output directory in the specified folder structure
`.trim();
}
```

---

## 12. File Outputs

After the agent completes, the output directory contains:

```
output/
└── 2026-03-24_SoftwareEngineer/
    │
    ├── tracker.xlsx                   ← Master application tracker (all 11 phases)
    │
    ├── prep/
    │   ├── candidate_profile.json     ← Structured profile from Phase 1
    │   ├── online_presence.md         ← Phase 3 checklist
    │   ├── tech_prep_checklist.md     ← Phase 7: study topics + resources
    │   ├── behavioral_stories.md      ← Phase 8: 6 STAR stories
    │   └── negotiation_brief.md       ← Phase 10: salary negotiation script
    │
    └── applications/
        ├── 01_Stripe/
        │   ├── cv_tailored.docx       ← ATS-optimised CV
        │   ├── cover_letter.docx      ← 3-para cover letter
        │   └── research_brief.md      ← Phase 9: company brief + smart questions
        │
        ├── 02_N26/
        │   ├── cv_tailored.docx
        │   ├── cover_letter.docx
        │   └── research_brief.md
        │
        └── ...{up to count}
```

---

## 13. Error Handling & Retries

```typescript
// Retry wrapper for API calls
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isLast = attempt === maxRetries;
      const isRateLimit = err instanceof Error && err.message.includes("429");

      if (isRateLimit && !isLast) {
        // Exponential backoff for rate limits
        await sleep(delayMs * Math.pow(2, attempt));
        continue;
      }
      if (isLast) throw err;
      await sleep(delayMs);
    }
  }
  throw new Error("Max retries exceeded");
}

// Graceful partial failure: if one job's CV generation fails,
// log the error and continue to the next job
export async function safeGenerateApplication(job: Job, ...) {
  try {
    return await generateApplication(job, ...);
  } catch (err) {
    logger.warn(`Failed to generate application for ${job.company}: ${err}`);
    return null;  // Tracker marks this job as "error"
  }
}
```

---

## 14. Running the Agent

### Quick start

```bash
# 1. Clone and install
git clone https://github.com/your-org/job-agent
cd job-agent
npm install

# 2. Add secrets
cp .env.example .env
# Edit .env — add ANTHROPIC_API_KEY and ADZUNA keys at minimum

# 3. Run
npx ts-node src/index.ts apply \
  --role "Software Engineer" \
  --cv ./my_cv.pdf \
  --count 15 \
  --salary "€75,000" \
  --location "Berlin, Germany" \
  --remote hybrid \
  --seniority early-career \
  --stack "TypeScript,React,Node.js"
```

### Expected runtime

| Applications | Estimated Time | Anthropic API Calls |
|---|---|---|
| 5 | ~3 min | ~30 |
| 15 | ~8 min | ~90 |
| 30 | ~15 min | ~180 |
| 50 | ~25 min | ~300 |

### Cost estimate (claude-sonnet-4-20250514, March 2026 pricing)

Check current pricing at: https://www.anthropic.com/pricing  
Typical run of 15 applications: approximately $0.15–$0.40 depending on CV and JD lengths.

---

## Reference Links

| Resource | URL |
|---|---|
| Anthropic API docs | https://docs.claude.com/en/api/overview |
| Anthropic SDK (npm) | https://www.npmjs.com/package/@anthropic-ai/sdk |
| Tool use guide | https://docs.claude.com/en/docs/build-with-claude/tool-use/overview |
| MCP documentation | https://docs.claude.com/en/docs/build-with-claude/mcp |
| Adzuna API | https://developer.adzuna.com/ |
| The Muse API | https://www.themuse.com/developers/api/v2 |
| Greenhouse Job Board API | https://developers.greenhouse.io/job-board.html |
| LinkedIn Developer | https://developer.linkedin.com/product-catalog |
| docx npm package | https://www.npmjs.com/package/docx |
| exceljs npm package | https://www.npmjs.com/package/exceljs |
