import ExcelJS from "exceljs";
import { ScoredJob } from "../phases/phase4_search";

const PHASES = [
  "1_Profile", "2_CV", "3_Presence", "4_Search",
  "5_CoverLetter", "6_Network", "7_TechPrep",
  "8_Behavioral", "9_Research", "10_Negotiate", "11_Followup",
];

const STATUS_COLORS: Record<string, string> = {
  done:       "FF92C353",  // green
  inProgress: "FFFFC000",  // amber
  error:      "FFFF0000",  // red
  pending:    "FFDDDDDD",  // grey
};

export interface TrackerRow {
  index: number;
  company: string;
  role: string;
  score: number;
  location: string;
  salary: string;
  url: string;
  status: "done" | "inProgress" | "error" | "pending";
  appliedDate?: string;
  notes?: string;
  cvFile?: string;
  clFile?: string;
}

export async function generateTracker(rows: TrackerRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "AI Job Agent";

  // ── Master sheet ─────────────────────────────────────────────
  const ws = wb.addWorksheet("Applications");

  ws.columns = [
    { header: "#",            key: "index",       width: 5  },
    { header: "Company",      key: "company",     width: 22 },
    { header: "Role",         key: "role",        width: 30 },
    { header: "Score",        key: "score",       width: 8  },
    { header: "Location",     key: "location",    width: 20 },
    { header: "Salary",       key: "salary",      width: 18 },
    { header: "Status",       key: "status",      width: 14 },
    { header: "Applied Date", key: "appliedDate", width: 16 },
    { header: "URL",          key: "url",         width: 40 },
    { header: "CV File",      key: "cvFile",      width: 30 },
    { header: "CL File",      key: "clFile",      width: 30 },
    { header: "Notes",        key: "notes",       width: 40 },
    ...PHASES.map((p) => ({ header: p, key: p, width: 14 })),
  ];

  // Header styling
  ws.getRow(1).eachCell((cell) => {
    cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1a1a2e" } };
    cell.font   = { color: { argb: "FFFFFFFF" }, bold: true };
    cell.border = { bottom: { style: "thin" } };
  });
  ws.getRow(1).height = 20;

  // Data rows
  for (const row of rows) {
    const r = ws.addRow({
      ...row,
      appliedDate: row.appliedDate ?? new Date().toISOString().split("T")[0],
      ...Object.fromEntries(PHASES.map((p) => [p, row.status === "done" ? "✓" : ""])),
    });

    const color = STATUS_COLORS[row.status] ?? STATUS_COLORS.pending;
    r.getCell("status").fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    r.getCell("score").font  = { bold: true, color: { argb: row.score >= 75 ? "FF008000" : "FF000000" } };

    // Score colour coding
    if (row.score >= 75) {
      r.getCell("score").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD4EDDA" } };
    }
  }

  ws.autoFilter = { from: "A1", to: `L1` };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  // ── Phase detail sheets ──────────────────────────────────────
  for (const phase of PHASES) {
    const ps = wb.addWorksheet(phase);
    ps.columns = [
      { header: "Company", key: "company", width: 22 },
      { header: "Role",    key: "role",    width: 30 },
      { header: "Status",  key: "status",  width: 14 },
      { header: "Notes",   key: "notes",   width: 60 },
    ];
    ps.getRow(1).font = { bold: true };
    for (const row of rows) {
      ps.addRow({ company: row.company, role: row.role, status: row.status, notes: "" });
    }
  }

  return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}
