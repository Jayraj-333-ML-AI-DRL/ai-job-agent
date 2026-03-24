import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import archiver from "archiver";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { validateInputs } from "../src/inputs/validateInputs";
import { runAgent } from "../src/agent";
import { ProgressEmitter, ProgressEvent } from "./progress";

const app = express();
const PORT = process.env.PORT ?? 3001;

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// File upload: store CV in temp dir
const upload = multer({ dest: path.join(__dirname, "../.tmp") });

// ── In-memory job store ───────────────────────────────────────
interface JobEntry {
  status: "running" | "complete" | "error";
  emitter: ProgressEmitter;
  outputDir?: string;
  error?: string;
}
const jobs = new Map<string, JobEntry>();

// ── POST /api/apply ───────────────────────────────────────────
app.post("/api/apply", upload.single("cv"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "CV file is required" });
    return;
  }

  // Rename uploaded file to keep original extension
  const originalExt = path.extname(req.file.originalname) || ".pdf";
  const cvPath = req.file.path + originalExt;
  fs.renameSync(req.file.path, cvPath);

  let inputs;
  try {
    inputs = validateInputs({
      role:         req.body.role,
      cvPath,
      count:        parseInt(req.body.count ?? "10", 10),
      targetSalary: req.body.salary,
      location:     req.body.location || undefined,
      remote:       req.body.remote || undefined,
      seniority:    req.body.seniority || undefined,
      stack:        req.body.stack ? req.body.stack.split(",").map((s: string) => s.trim()).filter(Boolean) : undefined,
      industry:     req.body.industry ? req.body.industry.split(",").map((s: string) => s.trim()).filter(Boolean) : undefined,
      excludeCompanies: req.body.exclude ? req.body.exclude.split(",").map((s: string) => s.trim()).filter(Boolean) : undefined,
    });
  } catch (err) {
    fs.unlinkSync(cvPath);
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    return;
  }

  const jobId = uuidv4();
  const emitter = new ProgressEmitter();
  jobs.set(jobId, { status: "running", emitter });

  // Run agent in background
  runAgent(inputs, emitter)
    .then((outputDir) => {
      const entry = jobs.get(jobId);
      if (entry) { entry.status = "complete"; entry.outputDir = outputDir; }
      fs.unlinkSync(cvPath);
    })
    .catch((err) => {
      const entry = jobs.get(jobId);
      if (entry) { entry.status = "error"; entry.error = String(err); }
      emitter.emitError(String(err));
      try { fs.unlinkSync(cvPath); } catch {}
    });

  res.json({ jobId });
});

// ── GET /api/progress/:jobId  (SSE) ──────────────────────────
app.get("/api/progress/:jobId", (req, res) => {
  const entry = jobs.get(req.params.jobId);
  if (!entry) { res.status(404).json({ error: "Job not found" }); return; }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (event: ProgressEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  // If already complete/error, send final event immediately
  if (entry.status === "complete") {
    send({ type: "complete", outputDir: entry.outputDir });
    res.end();
    return;
  }
  if (entry.status === "error") {
    send({ type: "error", message: entry.error });
    res.end();
    return;
  }

  const handler = (event: ProgressEvent) => {
    send(event);
    if (event.type === "complete" || event.type === "error") {
      entry.emitter.off("event", handler);
      res.end();
    }
  };

  entry.emitter.on("event", handler);
  req.on("close", () => entry.emitter.off("event", handler));
});

// ── GET /api/download/:jobId  (zip) ──────────────────────────
app.get("/api/download/:jobId", (req, res) => {
  const entry = jobs.get(req.params.jobId);
  if (!entry || entry.status !== "complete" || !entry.outputDir) {
    res.status(404).json({ error: "Output not ready" });
    return;
  }

  const folderName = path.basename(entry.outputDir);
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${folderName}.zip"`);

  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.on("error", (err) => { throw err; });
  archive.pipe(res);
  archive.directory(entry.outputDir, folderName);
  archive.finalize();
});

// ── GET /api/status/:jobId ────────────────────────────────────
app.get("/api/status/:jobId", (req, res) => {
  const entry = jobs.get(req.params.jobId);
  if (!entry) { res.status(404).json({ error: "Job not found" }); return; }
  res.json({ status: entry.status, outputDir: entry.outputDir ?? null });
});

// ── Serve built React app in production ───────────────────────
const clientDist = path.join(__dirname, "../web/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

app.listen(PORT, () => {
  console.log(`\n  AI Job Agent server running at http://localhost:${PORT}\n`);
});
