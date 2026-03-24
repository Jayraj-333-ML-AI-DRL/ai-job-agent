# AI Job Application Agent

> **Fully autonomous job application agent** powered by the Anthropic API.
> Give it your CV, target role, and salary — it searches live job boards, tailors a CV and cover letter for every role, and delivers ready-to-send application packages.

---

## What It Does

```
Your CV + Role + Salary
        │
        ▼
┌─────────────────────────────────┐
│  Searches: Adzuna, The Muse,    │
│  Greenhouse, LinkedIn           │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  Scores each job 0–100 for fit  │
│  against your profile           │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  For each top job:              │
│  • Tailored CV (.docx)          │
│  • Cover letter (.docx)         │
│  • Company research brief (.md) │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  Shared prep materials:         │
│  • Tech prep checklist          │
│  • STAR behavioural stories     │
│  • Salary negotiation script    │
│  • tracker.xlsx (all phases)    │
└─────────────────────────────────┘
```

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/Jayraj-333-ML-AI-DRL/ai-job-agent
cd ai-job-agent
npm install
```

### 2. Configure API Keys

```bash
cp .env.example .env
```

Edit `.env` and add your keys:

```env
ANTHROPIC_API_KEY=sk-ant-...
ADZUNA_APP_ID=your_app_id
ADZUNA_API_KEY=your_api_key
ADZUNA_COUNTRY=gb
THE_MUSE_API_KEY=your_muse_key
```

> Get your keys:
> - **Anthropic:** https://console.anthropic.com
> - **Adzuna:** https://developer.adzuna.com/signup
> - **The Muse:** https://www.themuse.com/developers

### 3. Run

```bash
npx ts-node src/index.ts apply \
  --role "Software Engineer" \
  --cv ./my_cv.pdf \
  --count 10 \
  --salary "€75,000" \
  --location "Berlin, Germany" \
  --remote hybrid \
  --seniority mid \
  --stack "TypeScript,React,Node.js"
```

---

## CLI Options

| Flag | Required | Description | Example |
|---|---|---|---|
| `--role` | ✅ | Target job title | `"Software Engineer"` |
| `--cv` | ✅ | Path to your CV (PDF or .txt) | `./my_cv.pdf` |
| `--salary` | ✅ | Target salary | `"€75,000"` or `"$110k"` |
| `--count` | | Number of applications (1–50) | `15` |
| `--location` | | Location filter | `"Berlin, Germany"` |
| `--remote` | | `remote` / `hybrid` / `onsite` | `hybrid` |
| `--seniority` | | `junior` / `mid` / `senior` / `lead` | `mid` |
| `--stack` | | Comma-separated tech stack | `"TypeScript,React"` |
| `--industry` | | Comma-separated industries | `"FinTech,SaaS"` |
| `--exclude` | | Companies to skip | `"Amazon,Meta"` |

---

## Output Structure

```
output/
└── 2026-03-24_Software_Engineer/
    │
    ├── tracker.xlsx              ← Master tracker (all 11 phases, color-coded)
    │
    ├── prep/
    │   ├── candidate_profile.json
    │   ├── online_presence.md    ← LinkedIn/GitHub checklist
    │   ├── tech_prep_checklist.md
    │   ├── behavioral_stories.md ← 6 STAR stories
    │   └── negotiation_brief.md  ← Salary negotiation script
    │
    └── applications/
        ├── 01_Stripe/
        │   ├── cv_tailored.docx
        │   ├── cover_letter.docx
        │   └── research_brief.md
        ├── 02_N26/
        │   └── ...
        └── ...
```

---

## The 11-Phase Pipeline

| Phase | Name | What It Does |
|---|---|---|
| 1 | **Define Profile** | Extracts structured candidate profile from your CV |
| 2 | **CV Optimisation** | Rewrites bullets for ATS compliance per each JD |
| 3 | **Online Presence** | Generates LinkedIn/GitHub improvement checklist |
| 4 | **Job Search** | Searches all boards, deduplicates, scores fit 0–100 |
| 5 | **Cover Letter** | Writes a specific 3-paragraph cover letter per role |
| 6 | **Networking** | LinkedIn messages + referral templates per company |
| 7 | **Tech Prep** | Study plan ranked by frequency across all JDs |
| 8 | **Behavioural** | 6 STAR stories from your actual work history |
| 9 | **Company Research** | 1-page brief + 3 smart interview questions per company |
| 10 | **Negotiation** | Salary counter script + alternative benefits to negotiate |
| 11 | **Follow-ups** | 3 email templates + Gmail drafts + Calendar reminders |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | Node.js 18+ / TypeScript |
| AI Core | Anthropic API — `claude-sonnet-4-20250514` |
| Job Boards | Adzuna API, The Muse API, Greenhouse API, LinkedIn |
| Documents | `docx` npm package (.docx output) |
| Tracker | `exceljs` npm package (.xlsx output) |
| CV Parsing | `pdf-parse` npm package |
| MCP | Gmail MCP, Google Calendar MCP |
| CLI | `commander` npm package |

---

## Cost Estimate

| Applications | Est. Time | Est. Cost (Sonnet) |
|---|---|---|
| 5 | ~3 min | ~$0.05–$0.15 |
| 15 | ~8 min | ~$0.15–$0.40 |
| 30 | ~15 min | ~$0.30–$0.80 |

> Check current pricing: https://www.anthropic.com/pricing

---

## Project Structure

```
src/
├── index.ts                  ← CLI entry point
├── agent.ts                  ← Main orchestration loop
├── inputs/
│   ├── parseCV.ts            ← PDF/text CV parser
│   └── validateInputs.ts     ← Input validation
├── phases/
│   ├── phase1_define.ts      ← Candidate profile extraction
│   ├── phase2_resume.ts      ← CV diff & ATS optimisation
│   ├── phase3_presence.ts    ← Online presence checklist
│   ├── phase4_search.ts      ← Job search + fit scoring
│   ├── phase5_coverLetter.ts ← Cover letter generation
│   ├── phase6_network.ts     ← Networking action items
│   ├── phase7_techPrep.ts    ← Technical prep checklist
│   ├── phase8_behavioral.ts  ← STAR story generator
│   ├── phase9_research.ts    ← Company research brief
│   ├── phase10_negotiate.ts  ← Salary negotiation brief
│   └── phase11_followup.ts   ← Follow-up email drafts
├── generators/
│   ├── cvGenerator.ts        ← .docx CV builder
│   ├── coverLetterGenerator.ts← .docx cover letter builder
│   └── trackerGenerator.ts   ← .xlsx tracker builder
├── integrations/
│   ├── anthropic.ts          ← Anthropic API client
│   ├── adzuna.ts             ← Adzuna job search
│   ├── theMuse.ts            ← The Muse job search
│   ├── greenhouse.ts         ← Greenhouse job board
│   ├── linkedinJobs.ts       ← LinkedIn Jobs
│   ├── gmailMCP.ts           ← Gmail MCP connector
│   └── calendarMCP.ts        ← Google Calendar MCP
└── utils/
    ├── logger.ts
    ├── fileSystem.ts
    └── salaryParser.ts
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Your Anthropic API key |
| `ADZUNA_APP_ID` | ✅ | Adzuna App ID |
| `ADZUNA_API_KEY` | ✅ | Adzuna API key |
| `ADZUNA_COUNTRY` | | Country code (`gb`, `us`, `de`…) — default `gb` |
| `THE_MUSE_API_KEY` | | The Muse API key |
| `LINKEDIN_ACCESS_TOKEN` | | LinkedIn OAuth token (optional) |
| `OUTPUT_DIR` | | Output directory — default `./output` |

---

## License

MIT — built with the [Anthropic API](https://docs.anthropic.com) and Claude.
