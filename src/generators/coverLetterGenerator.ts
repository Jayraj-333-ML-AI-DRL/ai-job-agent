import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
} from "docx";

export async function generateCoverLetterDoc(
  text: string,
  candidateName: string,
  role: string,
  company: string,
  date: string,
  contactLine: string
): Promise<Buffer> {

  // Split the 3 paragraphs
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const children: Paragraph[] = [
    // Candidate name + contact
    new Paragraph({
      children: [new TextRun({ text: candidateName, bold: true, size: 28 })],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ text: contactLine, size: 18, color: "555555" })],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ text: date, size: 18, color: "555555" })],
      spacing: { after: 240 },
    }),

    // Recipient
    new Paragraph({
      children: [new TextRun({ text: `Hiring Team — ${role}`, bold: true, size: 20 })],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ text: company, size: 20 })],
      spacing: { after: 240 },
    }),

    // Body paragraphs
    ...paragraphs.map(
      (p) =>
        new Paragraph({
          children: [new TextRun({ text: p, size: 22 })],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200 },
        })
    ),

    // Sign-off
    new Paragraph({
      children: [new TextRun({ text: "Yours sincerely,", size: 22 })],
      spacing: { before: 240, after: 360 },
    }),
    new Paragraph({
      children: [new TextRun({ text: candidateName, bold: true, size: 22 })],
    }),
  ];

  const doc = new Document({
    sections: [{ properties: {}, children }],
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22 } },
      },
    },
  });

  return Packer.toBuffer(doc);
}
