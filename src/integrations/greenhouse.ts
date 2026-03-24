import { Job } from "./adzuna";
import { logger } from "../utils/logger";

interface GHJob {
  id: number;
  title: string;
  location: { name: string };
  content: string;
  absolute_url: string;
  updated_at: string;
}

export async function getGreenhouseJobs(companySlug: string): Promise<Job[]> {
  try {
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${companySlug}/jobs?content=true`
    );
    if (!res.ok) throw new Error(`Greenhouse HTTP ${res.status}`);
    const data = await res.json() as { jobs: GHJob[] };
    return (data.jobs ?? []).map((j) => normalise(j, companySlug));
  } catch (err) {
    logger.error(`Greenhouse fetch failed for ${companySlug}`, err);
    return [];
  }
}

function normalise(r: GHJob, slug: string): Job {
  return {
    id:          `gh_${slug}_${r.id}`,
    title:       r.title,
    company:     slug,
    location:    r.location.name,
    description: r.content.replace(/<[^>]+>/g, " ").trim(),
    url:         r.absolute_url,
    postedDate:  r.updated_at,
    source:      "greenhouse",
  };
}
