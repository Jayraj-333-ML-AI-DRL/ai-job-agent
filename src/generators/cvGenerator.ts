import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType,
} from "docx";
import { CandidateProfile } from "../phases/phase1_define";
import { CVDiff } from "../phases/phase2_resume";

export async function generateTailoredCV(
  profile: CandidateProfile,
  diff: CVDiff
): Promise<Buffer> {

  const children: Paragraph[] = [
    // ── Name header ──────────────────────────────────────────────
    new Paragraph({
      children: [new TextRun({ text: profile.name, bold: true, size: 32 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),

    // ── Contact line ─────────────────────────────────────────────
    new Paragraph({
      children: [
        new TextRun({
          text: [profile.email, profile.phone, profile.linkedin, profile.github]
            .filter(Boolean)
            .join("  |  "),
          size: 18,
          color: "555555",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),

    // ── Summary ──────────────────────────────────────────────────
    sectionHeading("PROFESSIONAL SUMMARY"),
    new Paragraph({
      children: [new TextRun({ text: diff.rewrittenSummary, size: 20 })],
      spacing: { after: 200 },
    }),

    // ── Skills ───────────────────────────────────────────────────
    sectionHeading("SKILLS"),
    new Paragraph({
      children: [new TextRun({ text: diff.reorderedSkills.join("  •  "), size: 20 })],
      spacing: { after: 200 },
    }),

    // ── Experience ───────────────────────────────────────────────
    sectionHeading("EXPERIENCE"),
    ...buildExperience(profile, diff),

    // ── Projects ─────────────────────────────────────────────────
    sectionHeading("PROJECTS"),
    ...buildProjects(profile, diff.selectedProjects),

    // ── Education ────────────────────────────────────────────────
    sectionHeading("EDUCATION"),
    ...buildEducation(profile),
  ];

  const doc = new Document({
    sections: [{ properties: {}, children }],
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 20 },
        },
      },
    },
  });

  return Packer.toBuffer(doc);
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22, color: "1a1a2e" })],
    heading: HeadingLevel.HEADING_2,
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "cccccc", space: 4 } },
    spacing: { before: 240, after: 120 },
  });
}

function buildExperience(profile: CandidateProfile, diff: CVDiff): Paragraph[] {
  const rewriteMap = new Map(diff.rewrittenBullets.map((b) => [b.original, b.rewritten]));
  const paras: Paragraph[] = [];

  for (const exp of profile.experience) {
    paras.push(
      new Paragraph({
        children: [
          new TextRun({ text: exp.title, bold: true, size: 22 }),
          new TextRun({ text: `  —  ${exp.company}`, size: 20, color: "444444" }),
          new TextRun({ text: `  |  ${exp.period}`, size: 18, color: "888888" }),
        ],
        spacing: { before: 120, after: 60 },
      })
    );

    for (const bullet of exp.bullets) {
      const text = rewriteMap.get(bullet) ?? bullet;
      paras.push(
        new Paragraph({
          children: [new TextRun({ text: `• ${text}`, size: 20 })],
          indent: { left: 360 },
          spacing: { after: 40 },
        })
      );
    }
  }

  return paras;
}

function buildProjects(profile: CandidateProfile, selectedNames: string[]): Paragraph[] {
  const selected = selectedNames.length > 0
    ? profile.projects.filter((p) => selectedNames.includes(p.name))
    : profile.projects.slice(0, 2);

  return selected.flatMap((p) => [
    new Paragraph({
      children: [
        new TextRun({ text: p.name, bold: true, size: 20 }),
        new TextRun({ text: `  |  ${p.stack.join(", ")}`, size: 18, color: "888888" }),
      ],
      spacing: { before: 100, after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ text: p.description, size: 20 })],
      indent: { left: 360 },
      spacing: { after: 60 },
    }),
  ]);
}

function buildEducation(profile: CandidateProfile): Paragraph[] {
  return profile.education.map(
    (e) =>
      new Paragraph({
        children: [
          new TextRun({ text: e.degree, bold: true, size: 20 }),
          new TextRun({ text: `  —  ${e.institution}`, size: 20, color: "444444" }),
          e.year ? new TextRun({ text: `  (${e.year})`, size: 18, color: "888888" }) : new TextRun(""),
        ],
        spacing: { after: 80 },
      })
  );
}

// Suppress unused import warnings for Table/TableRow/TableCell/WidthType/ShadingType
void Table; void TableRow; void TableCell; void WidthType; void ShadingType;
