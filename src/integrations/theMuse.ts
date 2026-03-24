import { Job } from "./adzuna";
import { logger } from "../utils/logger";

interface MuseJob {
  id: number;
  name: string;
  company: { name: string };
  locations: { name: string }[];
  contents: string;
  refs: { landing_page: string };
  levels: { name: string }[];
  publication_date: string;
}

function mapSeniority(seniority?: string): string {
  switch (seniority) {
    case "junior":       return "Entry Level";
    case "early-career": return "Entry Level";
    case "mid":          return "Mid Level";
    case "senior":       return "Senior Level";
    case "lead":         return "Senior Level";
    default:             return "Mid Level";
  }
}

export async function searchTheMuse(params: {
  role: string;
  seniority?: string;
}): Promise<Job[]> {
  const apiKey = process.env.THE_MUSE_API_KEY;
  if (!apiKey) {
    logger.warn("THE_MUSE_API_KEY not set, skipping The Muse search");
    return [];
  }

  const url = new URL("https://www.themuse.com/api/public/jobs");
  url.searchParams.set("category", params.role);
  url.searchParams.set("level", mapSeniority(params.seniority));
  url.searchParams.set("page", "1");
  url.searchParams.set("descending", "true");

  try {
    const res = await fetch(url.toString(), {
      headers: { "x-api-key": apiKey },
    });
    if (!res.ok) throw new Error(`The Muse HTTP ${res.status}`);
    const data = await res.json() as { results: MuseJob[] };
    return (data.results ?? []).map(normalise);
  } catch (err) {
    logger.error("The Muse search failed", err);
    return [];
  }
}

function normalise(r: MuseJob): Job {
  return {
    id:          `muse_${r.id}`,
    title:       r.name,
    company:     r.company.name,
    location:    r.locations.map((l) => l.name).join(", "),
    description: r.contents.replace(/<[^>]+>/g, " ").trim(),
    url:         r.refs.landing_page,
    postedDate:  r.publication_date,
    source:      "themuse",
  };
}
