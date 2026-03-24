import { logger } from "../utils/logger";

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  postedDate?: string;
  source: string;
  score?: number;
}

interface AdzunaResult {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string;
  redirect_url: string;
  salary_min?: number;
  salary_max?: number;
  created: string;
}

interface SearchParams {
  role: string;
  location?: string;
  salaryMin?: number;
  count?: number;
}

export async function searchAdzuna(params: SearchParams): Promise<Job[]> {
  const appId  = process.env.ADZUNA_APP_ID;
  const apiKey = process.env.ADZUNA_API_KEY;
  const country = process.env.ADZUNA_COUNTRY ?? "gb";

  if (!appId || !apiKey) {
    logger.warn("Adzuna API keys not set, skipping Adzuna search");
    return [];
  }

  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", apiKey);
  url.searchParams.set("results_per_page", String(Math.min(params.count ?? 50, 50)));
  url.searchParams.set("what", params.role);
  if (params.location) url.searchParams.set("where", params.location);
  if (params.salaryMin) url.searchParams.set("salary_min", String(params.salaryMin));
  url.searchParams.set("content-type", "application/json");

  try {
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Adzuna HTTP ${res.status}`);
    const data = await res.json() as { results: AdzunaResult[] };
    return (data.results ?? []).map(normalise);
  } catch (err) {
    logger.error("Adzuna search failed", err);
    return [];
  }
}

function normalise(r: AdzunaResult): Job {
  return {
    id:          `adzuna_${r.id}`,
    title:       r.title,
    company:     r.company.display_name,
    location:    r.location.display_name,
    description: r.description,
    url:         r.redirect_url,
    salaryMin:   r.salary_min,
    salaryMax:   r.salary_max,
    postedDate:  r.created,
    source:      "adzuna",
  };
}
