import path from "path";
import fs from "fs";

export interface AgentInputs {
  // Required
  role: string;
  cvPath: string;
  count: number;
  targetSalary: string;

  // Optional filters
  location?: string;
  remote?: "remote" | "hybrid" | "onsite";
  seniority?: "junior" | "early-career" | "mid" | "senior" | "lead";
  stack?: string[];
  industry?: string[];
  companySize?: string;
  excludeCompanies?: string[];
  language?: string;
}

export function validateInputs(raw: Partial<AgentInputs>): AgentInputs {
  if (!raw.role?.trim()) throw new Error("--role is required");
  if (!raw.cvPath?.trim()) throw new Error("--cv path is required");
  if (!raw.targetSalary?.trim()) throw new Error("--salary is required");

  const cvPath = path.resolve(raw.cvPath);
  if (!fs.existsSync(cvPath)) throw new Error(`CV file not found: ${cvPath}`);

  const count = Number(raw.count ?? 10);
  if (isNaN(count) || count < 1 || count > 50) throw new Error("--count must be between 1 and 50");

  return {
    role: raw.role.trim(),
    cvPath,
    count,
    targetSalary: raw.targetSalary.trim(),
    location: raw.location,
    remote: raw.remote,
    seniority: raw.seniority ?? "mid",
    stack: raw.stack,
    industry: raw.industry,
    companySize: raw.companySize,
    excludeCompanies: raw.excludeCompanies ?? [],
    language: raw.language ?? "English",
  };
}
