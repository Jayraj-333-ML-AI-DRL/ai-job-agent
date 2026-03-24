export interface ProgressEvent {
  type: "phase" | "info" | "job" | "complete" | "error";
  phase?: number;
  phaseName?: string;
  message?: string;
  jobIndex?: number;
  jobTotal?: number;
  jobCompany?: string;
  jobScore?: number;
  outputDir?: string;
}

export type AppStatus = "idle" | "running" | "complete" | "error";

export interface PhaseState {
  num: number;
  name: string;
  status: "pending" | "running" | "done";
}

export const PHASE_DEFS: { num: number; name: string }[] = [
  { num: 1,  name: "Define Profile" },
  { num: 2,  name: "CV Optimisation" },
  { num: 3,  name: "Online Presence" },
  { num: 4,  name: "Job Search & Scoring" },
  { num: 5,  name: "Cover Letter" },
  { num: 6,  name: "Networking Actions" },
  { num: 7,  name: "Tech Prep Checklist" },
  { num: 8,  name: "Behavioural Stories" },
  { num: 9,  name: "Company Research" },
  { num: 10, name: "Salary Negotiation" },
  { num: 11, name: "Follow-up Emails" },
];
