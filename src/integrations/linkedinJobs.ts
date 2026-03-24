import { Job } from "./adzuna";
import { logger } from "../utils/logger";

interface LinkedInJob {
  position: string;
  company: string;
  location: string;
  date: string;
  agoTime: string;
  salary: string;
  jobUrl: string;
  companyLogo: string;
}

export async function searchLinkedIn(params: {
  role: string;
  location?: string;
  remote?: string;
  count?: number;
}): Promise<Job[]> {
  try {
    // Using the unofficial linkedin-jobs-api package (optional dependency)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const linkedIn = (await import("linkedin-jobs-api" as any)).default as {
      query: (opts: Record<string, string>) => Promise<LinkedInJob[]>;
    };

    const results = await linkedIn.query({
      keyword:      params.role,
      location:     params.location ?? "",
      dateSincePosted: "past week",
      jobType:      "full time",
      remoteFilter: params.remote === "remote" ? "remote" : "",
      limit:        String(params.count ?? 50),
    });

    return results.map(normalise);
  } catch {
    logger.warn("LinkedIn Jobs search unavailable (package not installed or rate-limited)");
    return [];
  }
}

function normalise(r: LinkedInJob): Job {
  const encoded = encodeURIComponent(r.jobUrl);
  return {
    id:          `linkedin_${encoded.slice(-20)}`,
    title:       r.position,
    company:     r.company,
    location:    r.location,
    description: "",   // LinkedIn API doesn't return full JD in free tier
    url:         r.jobUrl,
    postedDate:  r.date,
    source:      "linkedin",
  };
}
