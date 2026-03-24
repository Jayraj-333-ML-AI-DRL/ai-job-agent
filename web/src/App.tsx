import { useState, useCallback } from "react";
import { ApplyForm } from "./components/ApplyForm";
import { PhaseTracker } from "./components/PhaseTracker";
import { ResultsPanel } from "./components/ResultsPanel";
import { AppStatus, PhaseState, ProgressEvent, PHASE_DEFS } from "./types";

export default function App() {
  const [status, setStatus]       = useState<AppStatus>("idle");
  const [jobId, setJobId]         = useState<string | null>(null);
  const [phases, setPhases]       = useState<PhaseState[]>(
    PHASE_DEFS.map((d) => ({ ...d, status: "pending" }))
  );
  const [log, setLog]             = useState<string[]>([]);
  const [jobProgress, setJobProgress] = useState<{
    index?: number; total?: number; company?: string; score?: number;
  }>({});

  const appendLog = (line: string) => setLog((l) => [...l, line]);

  const handleEvent = useCallback((ev: ProgressEvent) => {
    switch (ev.type) {
      case "phase":
        appendLog(`Phase ${ev.phase}: ${ev.phaseName}`);
        setPhases((prev) =>
          prev.map((p) => {
            if (p.num === ev.phase) return { ...p, name: ev.phaseName ?? p.name, status: "running" };
            if (p.status === "running" && p.num !== ev.phase) return { ...p, status: "done" };
            return p;
          })
        );
        break;

      case "info":
        appendLog(ev.message ?? "");
        break;

      case "job":
        setJobProgress({ index: ev.jobIndex, total: ev.jobTotal, company: ev.jobCompany, score: ev.jobScore });
        appendLog(`[${ev.jobIndex}/${ev.jobTotal}] ${ev.jobCompany} — score ${ev.jobScore}`);
        break;

      case "complete":
        appendLog("✓ Complete! Output ready to download.");
        setStatus("complete");
        // Mark all phases done
        setPhases((prev) => prev.map((p) => ({ ...p, status: "done" })));
        break;

      case "error":
        appendLog(`ERROR: ${ev.message}`);
        setStatus("error");
        break;
    }
  }, []);

  const handleSubmit = async (formData: FormData) => {
    setStatus("running");
    setLog([]);
    setPhases(PHASE_DEFS.map((d) => ({ ...d, status: "pending" })));
    setJobProgress({});

    // POST to start the agent
    let id: string;
    try {
      const res = await fetch("/api/apply", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Server error");
      id = json.jobId;
    } catch (err) {
      appendLog(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
      setStatus("error");
      return;
    }

    setJobId(id);
    appendLog("Agent started — streaming progress…");

    // Open SSE stream
    const es = new EventSource(`/api/progress/${id}`);
    es.onmessage = (e) => {
      const event: ProgressEvent = JSON.parse(e.data);
      handleEvent(event);
      if (event.type === "complete" || event.type === "error") es.close();
    };
    es.onerror = () => {
      appendLog("ERROR: Lost connection to server");
      setStatus("error");
      es.close();
    };
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <span className="text-2xl">🤖</span>
        <div>
          <h1 className="text-lg font-bold text-white">AI Job Application Agent</h1>
          <p className="text-xs text-gray-500">Powered by Claude · Autonomous · End-to-end</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {status === "running" && (
            <span className="flex items-center gap-1.5 text-xs text-brand">
              <span className="w-2 h-2 bg-brand rounded-full animate-pulse" /> Running
            </span>
          )}
          {status === "complete" && (
            <span className="text-xs text-green-400">✓ Complete</span>
          )}
          {status === "error" && (
            <span className="text-xs text-red-400">✗ Error</span>
          )}
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Form */}
        <aside className="w-[420px] flex-shrink-0 border-r border-gray-800 overflow-y-auto p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">Configuration</h2>
          <ApplyForm onSubmit={handleSubmit} disabled={status === "running"} />
        </aside>

        {/* Right: Progress + Results */}
        <main className="flex-1 flex flex-col overflow-hidden p-6 gap-6 min-w-0">
          {/* Phase tracker */}
          <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">11-Phase Pipeline</h2>
            <PhaseTracker
              phases={phases}
              jobIndex={jobProgress.index}
              jobTotal={jobProgress.total}
              jobCompany={jobProgress.company}
              jobScore={jobProgress.score}
            />
          </div>

          {/* Live log + download */}
          <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-5 flex-1 flex flex-col min-h-0">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Live Output</h2>
            <ResultsPanel log={log} status={status} jobId={jobId} />
          </div>
        </main>
      </div>
    </div>
  );
}
