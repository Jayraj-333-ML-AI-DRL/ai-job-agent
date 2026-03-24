import { EventEmitter } from "events";

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

export class ProgressEmitter extends EventEmitter {
  emitPhase(num: number, name: string): void {
    this.emit("event", { type: "phase", phase: num, phaseName: name } satisfies ProgressEvent);
  }
  emitInfo(message: string): void {
    this.emit("event", { type: "info", message } satisfies ProgressEvent);
  }
  emitJob(index: number, total: number, company: string, score: number): void {
    this.emit("event", { type: "job", jobIndex: index, jobTotal: total, jobCompany: company, jobScore: score } satisfies ProgressEvent);
  }
  emitComplete(outputDir: string): void {
    this.emit("event", { type: "complete", outputDir } satisfies ProgressEvent);
  }
  emitError(message: string): void {
    this.emit("event", { type: "error", message } satisfies ProgressEvent);
  }
}
