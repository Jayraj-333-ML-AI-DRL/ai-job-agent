import { PhaseState, PHASE_DEFS } from "../types";

interface Props {
  phases: PhaseState[];
  jobIndex?: number;
  jobTotal?: number;
  jobCompany?: string;
  jobScore?: number;
}

export function PhaseTracker({ phases, jobIndex, jobTotal, jobCompany, jobScore }: Props) {
  return (
    <div className="space-y-3">
      {/* Job progress bar */}
      {jobTotal !== undefined && jobTotal > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>
              {jobIndex !== undefined
                ? `Processing ${jobIndex}/${jobTotal}: ${jobCompany ?? ""}`
                : "Searching jobs…"}
            </span>
            {jobScore !== undefined && (
              <span className={`font-bold ${jobScore >= 75 ? "text-green-400" : "text-yellow-400"}`}>
                Score {jobScore}
              </span>
            )}
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand transition-all duration-500 rounded-full"
              style={{ width: `${jobTotal > 0 ? ((jobIndex ?? 0) / jobTotal) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Phase list */}
      {PHASE_DEFS.map((def) => {
        const phase = phases.find((p) => p.num === def.num);
        const status = phase?.status ?? "pending";
        return (
          <div
            key={def.num}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              status === "running" ? "bg-brand/10 border border-brand/30" :
              status === "done"    ? "bg-green-900/20" : ""
            }`}
          >
            <span className="text-lg w-6 text-center flex-shrink-0">
              {status === "done"    ? "✅" :
               status === "running" ? <span className="animate-spin inline-block">⟳</span> :
               "○"}
            </span>
            <div className="flex-1 min-w-0">
              <span className={`text-sm font-medium ${
                status === "running" ? "text-brand" :
                status === "done"    ? "text-green-400" :
                "text-gray-500"
              }`}>
                Phase {def.num}
              </span>
              <span className={`text-sm ml-2 ${
                status === "pending" ? "text-gray-600" : "text-gray-300"
              }`}>
                {phase?.name ?? def.name}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
