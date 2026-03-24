import { useEffect, useRef } from "react";
import { AppStatus } from "../types";

interface Props {
  log: string[];
  status: AppStatus;
  jobId: string | null;
}

export function ResultsPanel({ log, status, jobId }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  return (
    <div className="flex flex-col h-full">
      {/* Live log */}
      <div className="flex-1 overflow-y-auto bg-gray-900 rounded-lg p-4 font-mono text-xs space-y-1 min-h-0 max-h-80">
        {log.length === 0 ? (
          <p className="text-gray-600 italic">Waiting to start…</p>
        ) : (
          log.map((line, i) => (
            <div
              key={i}
              className={`leading-relaxed ${
                line.startsWith("ERROR") ? "text-red-400" :
                line.startsWith("Phase") ? "text-brand font-semibold" :
                line.startsWith("✓")     ? "text-green-400" :
                "text-gray-400"
              }`}
            >
              {line}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Status banner + download */}
      {status === "complete" && jobId && (
        <div className="mt-4 p-4 bg-green-900/30 border border-green-700 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-green-400 font-semibold">✓ All applications generated!</p>
            <p className="text-gray-400 text-sm mt-0.5">Click to download your complete package as a .zip</p>
          </div>
          <a
            href={`/api/download/${jobId}`}
            download
            className="px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 flex-shrink-0"
          >
            ⬇ Download
          </a>
        </div>
      )}

      {status === "error" && (
        <div className="mt-4 p-4 bg-red-900/30 border border-red-700 rounded-lg">
          <p className="text-red-400 font-semibold">Agent encountered an error</p>
          <p className="text-gray-400 text-sm mt-1">Check that your API keys are set in the server's .env file</p>
        </div>
      )}
    </div>
  );
}
